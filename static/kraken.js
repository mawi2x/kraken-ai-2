/* The Kraken Remembers — UI interactions. No dependencies, no external requests. */
(() => {
  "use strict";

  const CFG = window.KRAKEN || {};
  const $ = (id) => document.getElementById(id);

  const MAX_TURNS = Number(CFG.maxTurns || 20);
  const MAX_INPUT = Number(CFG.maxInput || 250);
  const MIN_TURNS = Number(CFG.minTurns || 5);
  // Kept above the server's own turn deadline (TURN_DEADLINE, 45s by default):
  // the server falls back to the engine's voice before this fires, so an abort
  // here means the network, not a slow model.
  const CLIENT_TIMEOUT_MS = 60000;
  const SLOW_AFTER_MS = 8000; // when the deep admits it is taking its time
  const RECONCILE_TRIES = 4; // polls of /api/state after a give-up
  const RECONCILE_PENDING_TRIES = 15; // …but keep waiting while the server says it is still answering
  const RECONCILE_WAIT_MS = 1500;
  const CHIP_LABELS = { "c-parley": "Caller", "c-oath": "Authority", "c-wreck": "Recall", "c-toll": "Memory" };

  const log = $("log");
  const form = $("f");
  const inp = $("in");
  const count = $("count");
  const btn = document.querySelector('#f button[type="submit"]');
  const resetBtn = $("reset");
  const flagBox = $("flag");
  const flagText = $("flag-text");
  const copyBtn = $("copy");
  const copyLabel = $("copy-label");
  const banner = $("banner");
  const bannerText = $("banner-text");
  const bannerCta = $("banner-cta");
  const bannerRetry = $("banner-retry");
  const soundBtn = $("sound");
  const turnsNum = $("t-num");
  const turnsFill = $("t-fill");
  const turnsGauge = $("t-gauge");
  const coolNum = $("cool-num");
  const coolFill = $("cool-fill");
  const coolGauge = $("cool-gauge");
  const objectiveEl = $("objective");
  const avatarTpl = $("avatar-tpl");
  const musicEl = $("music");
  const greetEl = $("greet-sound");
  const sfx1El = $("sfx1");

  const state = {
    attempt: CFG.attempt || "",
    turns: Number(CFG.turns || 0),
    opened: !!CFG.opened,
    offerings: CFG.offerings || {},
  };

  let busy = false;
  let locked = false;
  let cooldownTimer = null;
  let cooling = 0;
  let cooldownUntil = Date.now() + Number((CFG.rate || {}).retry_after || 0) * 1000;
  let pendingSend = null; // {id, text} of the last send: resending it costs no turn
  let stickBottom = true; // only follow the conversation while the player is at its end
  let soundOn = (() => {
    try { return localStorage.getItem("krakenSound") === "1"; } catch { return false; }
  })();

  /* ---------- Sound: WebAudio SFX + background music ----------
     All audio is off by default and only starts after a player gesture. */

  let audio = null;
  let musicGain = null;
  let musicSource = null;
  let musicFade = null;
  const MUSIC_VOLUME = 0.3;

  function audioCtx() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function tone(freq, dur, type, gain, delay) {
    if (!soundOn) return;
    try {
      const ctx = audioCtx();
      const t = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(gain, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch { /* audio is a garnish, never a failure */ }
  }

  function rampMusic(to, seconds) {
    if (!musicGain) return;
    const now = audio.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  function startMusic() {
    if (!soundOn || !musicEl || document.hidden) return;
    try {
      const ctx = audioCtx();
      if (!musicSource) {
        musicSource = ctx.createMediaElementSource(musicEl);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0;
        musicSource.connect(musicGain).connect(ctx.destination);
      }
      clearTimeout(musicFade);
      musicEl.play().catch(() => {});
      rampMusic(MUSIC_VOLUME, 1.6);
    } catch { /* music is optional */ }
  }

  function stopMusic(fade) {
    if (!musicEl) return;
    if (!musicGain) { musicEl.pause(); return; }
    const seconds = fade === undefined ? 0.9 : fade;
    clearTimeout(musicFade);
    rampMusic(0, seconds);
    musicFade = setTimeout(() => musicEl.pause(), seconds * 1000 + 60);
  }

  function duckMusic(seconds) {
    if (!musicGain || !musicEl || musicEl.paused) return;
    rampMusic(MUSIC_VOLUME * 0.25, 0.15);
    setTimeout(() => {
      if (soundOn && !musicEl.paused && !document.hidden) rampMusic(MUSIC_VOLUME, 0.8);
    }, seconds * 1000);
  }

  /* One loud wake-up bloop first, then random ambient hits from sound_effect1. */

  const hasGreeting = !!document.querySelector("[data-greeting]");
  const SFX_MIN_GAP = 25;
  const SFX_MAX_GAP = 60;
  const BLOOP_GAIN = 2;
  const SFX_GAIN = 1.2;
  let greeted = false;
  let sfxTimer = null;

  // One-shots are amplified past element max (1.0), then soft-limited.
  let limiter = null;
  const oneShotGains = new WeakMap();

  function oneShotBus(el, gainValue) {
    const ctx = audioCtx();
    if (!limiter) {
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      limiter.connect(ctx.destination);
    }
    let gain = oneShotGains.get(el);
    if (!gain) {
      const source = ctx.createMediaElementSource(el);
      gain = ctx.createGain();
      source.connect(gain).connect(limiter);
      oneShotGains.set(el, gain);
    }
    gain.gain.value = gainValue;
    return gain;
  }

  function playOneShot(el, volume, duckSeconds) {
    if (!el || !soundOn) return;
    try {
      oneShotBus(el, volume);
      el.currentTime = 0;
      el.volume = 1;
      if (duckSeconds) duckMusic(duckSeconds);
      el.play().catch(() => {});
    } catch { /* a missed hit is just silence */ }
  }

  function unlockAudio() {
    if (hasGreeting && !greeted && greetEl) {
      greeted = true;
      try { oneShotBus(greetEl, BLOOP_GAIN); } catch {}
      greetEl.currentTime = 0;
      greetEl.volume = 1;
      greetEl.addEventListener("ended", startMusic, { once: true });
      greetEl.play().catch(() => startMusic());
      return;
    }
    startMusic();
  }

  function scheduleSfx() {
    clearTimeout(sfxTimer);
    sfxTimer = null;
    if (!soundOn || document.hidden) return;
    const wait = (SFX_MIN_GAP + Math.random() * (SFX_MAX_GAP - SFX_MIN_GAP)) * 1000;
    sfxTimer = setTimeout(() => {
      playOneShot(sfx1El, SFX_GAIN, 1.5);
      scheduleSfx();
    }, wait);
  }

  const soundSend = () => { tone(196, 0.09, "triangle", 0.03, 0); tone(262, 0.07, "sine", 0.015, 0.045); };
  const soundReply = () => tone(330, 0.11, "sine", 0.022, 0);
  const soundChip = () => { tone(660, 0.1, "sine", 0.02, 0); tone(880, 0.12, "sine", 0.016, 0.08); };
  const soundFlag = () => {
    duckMusic(2);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.4, "sine", 0.028, i * 0.12));
  };
  const soundThunder = () => {
    duckMusic(1.5);
    tone(58, 0.9, "sawtooth", 0.035, 0);
    tone(87, 0.6, "triangle", 0.022, 0.05);
  };

  function setSound(on, feedback) {
    soundOn = on;
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    soundBtn.title = on ? "Sound & music on — click to mute" : "Sound & music off — click to enable";
    try { localStorage.setItem("krakenSound", on ? "1" : "0"); } catch {}
    if (on) {
      const firstWake = hasGreeting && !greeted;
      unlockAudio();
      scheduleSfx();
      if (feedback && !firstWake) soundChip();
    } else {
      clearTimeout(sfxTimer);
      sfxTimer = null;
      stopMusic();
      [greetEl, sfx1El].forEach((el) => { if (el) el.pause(); });
    }
  }

  soundBtn.addEventListener("click", () => setSound(!soundOn, true));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (musicEl && !musicEl.paused) musicEl.pause();
      clearTimeout(sfxTimer);
      sfxTimer = null;
    } else if (soundOn) {
      startMusic();
      scheduleSfx();
    }
  });

  // A persisted "on" setting still needs a gesture before audio may start.
  function firstGesture() {
    if (soundOn) {
      unlockAudio();
      scheduleSfx();
    }
    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("keydown", firstGesture);
  }
  window.addEventListener("pointerdown", firstGesture);
  window.addEventListener("keydown", firstGesture);
  setSound(soundOn, false);

  /* ---------- Message rendering ---------- */

  function avatarNode() {
    if (!avatarTpl || !avatarTpl.content.firstElementChild) return document.createTextNode("");
    return avatarTpl.content.firstElementChild.cloneNode(true);
  }

  function decorateNotes(body, text) {
    body.textContent = "";
    const parts = String(text).split(/\n{2,}/);
    parts.forEach((part, i) => {
      if (i) body.appendChild(document.createTextNode("\n\n"));
      const t = part.trim();
      if (t.length > 1 && t.startsWith("[") && t.endsWith("]")) {
        const note = document.createElement("span");
        note.className = "note" + (/stars are silent/i.test(t) ? " soft" : "");
        note.textContent = t;
        body.appendChild(note);
      } else {
        body.appendChild(document.createTextNode(part));
      }
    });
  }

  function bubble(role) {
    const el = document.createElement("div");
    el.className = "msg " + role;
    if (role === "kraken") {
      el.appendChild(avatarNode());
      const body = document.createElement("div");
      body.className = "body";
      el.appendChild(body);
      return { el, body };
    }
    return { el, body: el };
  }

  function scrollLog(force) {
    // Follow the conversation only while the player is already at its end:
    // yanking the view down while they read older lines loses their place.
    if (force || stickBottom) log.scrollTop = log.scrollHeight;
  }

  const NEAR_BOTTOM_PX = 90;

  function atBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight <= NEAR_BOTTOM_PX;
  }

  log.addEventListener("scroll", () => { stickBottom = atBottom(); });

  function addMsg(role, text, force) {
    const { el, body } = bubble(role);
    if (role === "kraken") decorateNotes(body, text);
    else body.textContent = text;
    log.appendChild(el);
    scrollLog(force);
    return el;
  }

  let slowTimer = null;

  function showTyping() {
    hideTyping();
    const { el, body } = bubble("kraken");
    el.id = "typing";
    el.classList.add("typing");
    el.setAttribute("role", "status");
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = "The Kraken stirs\u2026";
    const dots = document.createElement("span");
    dots.className = "dots";
    dots.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("i"));
    body.appendChild(sr);
    body.appendChild(dots);
    log.appendChild(el);
    scrollLog(true);
    // Honest waiting feedback: the voice is slow, nothing has been earned.
    slowTimer = setTimeout(() => {
      sr.textContent = "The deep is slow to surface \u2014 still waiting.";
      const note = document.createElement("span");
      note.className = "wait-note";
      note.textContent = "the deep is slow to surface\u2026";
      body.appendChild(note);
      scrollLog(false);
    }, SLOW_AFTER_MS);
  }

  function hideTyping() {
    clearTimeout(slowTimer);
    slowTimer = null;
    const t = $("typing");
    if (t) t.remove();
  }

  /* ---------- Gauges, chips, counter ---------- */

  function paintTurns() {
    const n = state.turns;
    turnsNum.textContent = n + "/" + MAX_TURNS;
    turnsFill.style.width = Math.min(100, (n / MAX_TURNS) * 100) + "%";
    turnsFill.className = "fill" + (n >= MAX_TURNS ? " danger" : n >= MAX_TURNS - 5 ? " warn" : "");
    turnsGauge.setAttribute("aria-valuenow", String(Math.min(n, MAX_TURNS)));
    turnsGauge.setAttribute("aria-valuetext", n + " of " + MAX_TURNS + " turns used");
  }

  function renderCooldown() {
    const n = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    cooling = n;
    const window = Number((CFG.rate || {}).window || 60);
    coolFill.style.width = Math.min(100, (n / window) * 100) + "%";
    coolFill.className = "fill" + (n > 0 ? " warn" : "");
    coolNum.textContent = n > 0 ? n + "s" : "ready";
    coolGauge.setAttribute("aria-valuenow", String(n));
    coolGauge.setAttribute("aria-valuetext", n > 0 ? "cooling, " + n + " seconds" : "ready");
  }

  // Cooldown comes from the server's own bucket — never from counting errors.
  function setCooldown(seconds) {
    const until = Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
    if (until > cooldownUntil) cooldownUntil = until;
    clearInterval(cooldownTimer);
    cooldownTimer = null;
    renderCooldown();
    if (cooldownUntil > Date.now()) {
      cooldownTimer = setInterval(() => {
        if (cooldownUntil <= Date.now()) {
          clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
        renderCooldown();
        refreshComposer();
      }, 500);
    }
    refreshComposer();
  }

  function setObjective(text) {
    if (typeof text === "string" && text) objectiveEl.textContent = text;
  }

  const CHIP_STATES = {
    "c-parley": ["unknown", "recognized"],
    "c-oath": ["withheld", "exposed"],
    "c-wreck": ["pending", "confirmed"],
    "c-toll": ["sealed", "released", "sealed"],
  };

  function setChip(id, on, silent, interim) {
    const el = $(id);
    if (!el) return;
    const was = el.classList.contains("on");
    el.classList.toggle("on", !!on);
    el.classList.toggle("knows", !!interim && !on);
    const label = CHIP_LABELS[id] || "Offering";
    const words = CHIP_STATES[id] || ["not yet offered", "offered"];
    el.setAttribute("aria-label", label + ": " + (on ? words[1] : interim ? words[2] : words[0]));
    if (on && !was && !silent) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
      soundChip();
    }
  }

  function applyOfferings(o, silent) {
    if (!o) return;
    setChip("c-parley", o.parley, silent);
    setChip("c-oath", o.oath, silent);
    setChip("c-wreck", o.wreck, silent);
    setChip("c-toll", o.toll, silent, o.toll_known);
  }

  function paintCount() {
    const n = inp.value.length;
    count.textContent = n + "/" + MAX_INPUT;
    count.className = n >= MAX_INPUT ? "over" : n >= MAX_INPUT - 50 ? "warn" : "";
  }

  function autoGrow() {
    inp.style.height = "auto";
    inp.style.height = Math.min(inp.scrollHeight, 120) + "px";
  }

  /* ---------- Composer state ---------- */

  function showBanner(text, retry) {
    bannerText.textContent = text;
    bannerRetry.hidden = !retry;
    banner.hidden = false;
  }

  function hideBanner() {
    banner.hidden = true;
    bannerRetry.hidden = true;
  }

  function refreshComposer() {
    const exhausted = state.turns >= MAX_TURNS;
    const coolingNow = cooldownUntil > Date.now();
    locked = state.opened || exhausted || coolingNow;
    btn.disabled = locked || busy;
    inp.disabled = state.opened || exhausted;
    btn.title = coolingNow ? "Cooling down \u2014 " + cooling + "s" : "";
    if (state.opened) showBanner("The memory is released \u2014 the flag is yours.");
    else if (exhausted) showBanner("The Kraken grows bored of this voyage (" + MAX_TURNS + " turns spent). Refresh or hit Reset to sail again.");
    else hideBanner();
  }

  function setBusy(on) {
    busy = on;
    btn.classList.toggle("loading", on);
    btn.disabled = on || locked;
  }

  function shake() {
    const composer = btn.closest(".composer");
    if (!composer) return;
    composer.classList.remove("shake");
    void composer.offsetWidth;
    composer.classList.add("shake");
  }

  /* ---------- Flag ---------- */

  function revealFlag(flag, focus) {
    if (!flag || flagBox.dataset.revealed === "1") return;
    flagBox.dataset.revealed = "1";
    flagText.textContent = flag;
    flagBox.hidden = false;
    log.appendChild(flagBox);
    scrollLog();
    if (focus !== false) {
      copyBtn.focus({ preventScroll: true });
      soundFlag();
    }
  }

  function fetchChest() {
    const attempt = state.attempt;
    fetch("/chest")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && j.flag && state.attempt === attempt && state.opened) revealFlag(j.flag, false); })
      .catch(() => {});
  }

  copyBtn.addEventListener("click", async () => {
    const text = flagText.textContent || "";
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const range = document.createRange();
        range.selectNodeContents(flagText);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand("copy");
        sel.removeAllRanges();
      } catch { ok = false; }
    }
    copyLabel.textContent = ok ? "Copied!" : "Select & copy";
    setTimeout(() => { copyLabel.textContent = "Copy"; }, 1800);
  });

  /* ---------- State sync ---------- */

  function clearReveal() {
    flagBox.hidden = true;
    flagText.textContent = "";
    delete flagBox.dataset.revealed;
    copyLabel.textContent = "Copy";
  }

  function applySnapshot(snap) {
    if (!snap) return;
    if (snap.attempt !== state.attempt) {
      pendingSend = null;
      clearReveal();
    }
    if (!snap.opened) clearReveal();
    state.attempt = snap.attempt || state.attempt;
    if (typeof snap.turns === "number") { state.turns = snap.turns; paintTurns(); }
    if (typeof snap.opened === "boolean") state.opened = snap.opened;
    applyOfferings(snap.offerings, true);
    setObjective(snap.status);
    setCooldown((snap.rate || {}).retry_after || 0);
    if (state.opened) fetchChest();
    refreshComposer();
  }

  // Rebuild the conversation from the server's own record. Used only to
  // reconcile — never as a way to "recover" by reloading the page, which
  // would abandon the attempt outright.
  function renderMessages(messages) {
    const sticky = stickBottom;
    const prevTop = log.scrollTop;
    log.querySelectorAll(".msg").forEach((el) => el.remove());
    const anchor = flagBox.parentNode === log ? flagBox : null;
    const frag = document.createDocumentFragment();
    const list = messages || [];
    list.forEach((m) => {
      const { el, body } = bubble(m.role === "user" ? "user" : "kraken");
      if (m.role === "user") body.textContent = m.content;
      else decorateNotes(body, m.content);
      frag.appendChild(el);
    });
    if (!list.length) {
      const { el, body } = bubble("kraken");
      body.textContent = "Who dares wake the Kraken...? Speak, sailor.";
      frag.appendChild(el);
    }
    log.insertBefore(frag, anchor);
    log.scrollTop = sticky ? log.scrollHeight : prevTop;
    stickBottom = sticky;
  }

  async function fetchState(requestId) {
    const url = requestId ? "/api/state?request=" + encodeURIComponent(requestId) : "/api/state";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
      if (!r.ok) throw new Error("state " + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  async function restoreFromServer() {
    try {
      const snap = await fetchState();
      applySnapshot(snap);
      renderMessages(snap.messages);
    } catch { /* the next send will resync */ }
  }

  function sync(d) {
    if (!d) return;
    if (d.attempt && d.attempt !== state.attempt) {
      // Another tab (or a reload elsewhere) began a new voyage: follow it, and
      // say so — the conversation on screen belongs to the abandoned attempt.
      clearReveal();
      pendingSend = null;
      void restoreFromServer().then(() =>
        addMsg("kraken", "\uD83C\uDF0A This voyage was replaced \u2014 a new attempt stands, and the recall begins again.", true)
      );
      return;
    }
    if (d.offerings) applyOfferings(d.offerings);
    if (typeof d.turns === "number") {
      state.turns = d.turns;
      paintTurns();
    }
    setObjective(d.status);
    if (d.rate) setCooldown(d.rate.retry_after || 0);
    if (d.opened) state.opened = true;
    if (d.flag) revealFlag(d.flag, true);
    else if (state.opened) fetchChest();
    refreshComposer();
  }

  /* ---------- Sending ---------- */

  function newRequestId() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch { /* fall through to the manual id */ }
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function noteFailure(text) {
    shake();
    soundThunder();
    addMsg("kraken", "\uD83C\uDF0A " + text, true);
  }

  // Recover one uncertain request by its own id — never by guessing from the
  // shape of the conversation. The server answers `done`, `pending` or
  // `unknown` for that exact id, and each one is handled differently.
  async function reconcile(requestId, text, aborted) {
    let reached = false;
    let verdict = "unknown";
    let tries = RECONCILE_TRIES;
    for (let i = 0; i < tries; i++) {
      await new Promise((done) => setTimeout(done, RECONCILE_WAIT_MS));
      let snap = null;
      try {
        snap = await fetchState(requestId);
        reached = true;
      } catch {
        continue;
      }
      const switched = snap.attempt && snap.attempt !== state.attempt;
      applySnapshot(snap);
      if (switched) {
        renderMessages(snap.messages);
        noteFailure("This voyage was replaced by a new one while the deep was speaking. The fresh attempt stands.");
        return;
      }
      verdict = (snap.request || {}).state || "unknown";
      if (verdict === "done") {
        // The answer did arrive — it outlived the browser's patience. The
        // server's own record is the conversation, so nothing is duplicated.
        renderMessages(snap.messages);
        soundReply();
        pendingSend = null;
        return;
      }
      if (verdict === "unknown" && !snap.pending) break;
      // The server says this request is still being voiced: patience is the
      // right answer, and the turn deadline bounds how long it can last.
      if (verdict === "pending") tries = RECONCILE_PENDING_TRIES;
    }

    if (!reached) {
      if (!inp.value.trim()) {
        inp.value = text;
        paintCount();
        autoGrow();
      }
      noteFailure("Delivery is unconfirmed. Your words are kept here; retry after the connection returns.");
      return;
    }
    if (verdict === "unknown") {
      // The server never took this message. Take the optimistic bubble back and
      // hand the words to the composer, keeping the request id for the retry —
      // but never overwrite a draft the player has started since.
      log.querySelectorAll('.msg.user[data-req="' + requestId + '"]').forEach((el) => el.remove());
      if (!inp.value.trim()) {
        inp.value = text;
        paintCount();
        autoGrow();
      }
      noteFailure("That message never reached the deep \u2014 nothing was spent. Thy words are back in the box; send them again.");
      return;
    }
    noteFailure(
      aborted
        ? "No answer reached thee in time. The attempt is intact \u2014 send the same words again when the water stills."
        : "That message was lost on the way down. The attempt is intact \u2014 send it again when the water stills."
    );
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = inp.value.trim();
    if (!value || busy || locked || inp.disabled) return;

    // A resend of the message that failed reuses its request id: the server
    // replays the answer it already gave instead of charging a second turn.
    const reuse = !!(pendingSend && pendingSend.text === value);
    const requestId = reuse ? pendingSend.id : newRequestId();
    pendingSend = { id: requestId, text: value };

    inp.value = "";
    autoGrow();
    paintCount();
    setBusy(true);
    soundSend();
    const bubbleEl = addMsg("user", value, true);
    bubbleEl.dataset.req = requestId;
    showTyping();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const r = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The attempt id travels with every turn: a request that outlived its
        // voyage is refused by the server instead of landing in a new one.
        body: JSON.stringify({ message: value, request_id: requestId, attempt: state.attempt }),
        signal: ctrl.signal,
      });
      const d = await r.json().catch(() => ({}));
      hideTyping();

      if (d.stale) {
        // Answered for an attempt that no longer exists (refresh or reset while
        // the voice was speaking): never shown as this voyage's history.
        clearReveal();
        pendingSend = null;
        await restoreFromServer();
        noteFailure("That answer belonged to a voyage that was abandoned. What stands here now is a fresh attempt.");
        return;
      }

      if (!r.ok) {
        if (d.code === "stale_attempt") {
          // This tab outlived its voyage: follow the attempt the server has.
          clearReveal();
          pendingSend = null;
          log.querySelectorAll('.msg.user[data-req="' + requestId + '"]').forEach((el) => el.remove());
          await restoreFromServer();
          noteFailure(d.error || "That message belonged to a voyage that has ended. A fresh attempt stands.");
        } else if (d.code === "rate_limit") {
          setCooldown((d.rate || {}).retry_after || 0);
          noteFailure(d.error || "Slow thy tongue \u2014 the deep is besieged.");
        } else if (d.code === "turns_exhausted") {
          state.turns = Math.max(state.turns, Number(d.turns || MAX_TURNS));
          paintTurns();
          refreshComposer();
          noteFailure(d.error || "The audience with the Kraken is over.");
        } else {
          noteFailure(d.error || "The deep recoils from those words.");
        }
        return;
      }

      soundReply();
      addMsg("kraken", d.reply);
      if (Math.random() < 0.2) playOneShot(sfx1El, SFX_GAIN, 1.2);
      pendingSend = null;
      sync(d);
    } catch (err) {
      // Aborted (the server was slow) or never landed (the network, or the
      // challenge is down): either way the voyage is not thrown away by
      // reloading, and the message says which failure it was.
      hideTyping();
      await reconcile(requestId, value, !!(err && err.name === "AbortError"));
    } finally {
      clearTimeout(timer);
      setBusy(false);
      refreshComposer();
      if (!inp.disabled) inp.focus();
    }
  });

  inp.addEventListener("input", () => {
    paintCount();
    autoGrow();
  });

  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  });

  /* ---------- Reset ---------- */

  async function doReset(confirmFirst) {
    if (confirmFirst && !window.confirm("Abandon this voyage and sail again? The conversation, the seals and your turns are all lost.")) return;
    setBusy(true);
    let resetFailed = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch("/reset", { method: "POST", headers: { Accept: "application/json" }, signal: ctrl.signal });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error("reset failed");
      location.reload(); // the fresh attempt is already in place; show it
      return;
    } catch {
      resetFailed = true;
      shake();
      soundThunder();
      await restoreFromServer();
      addMsg("kraken", "The reset could not be confirmed. Check the connection before trying again.", true);
    } finally {
      clearTimeout(timer);
      setBusy(false);
      refreshComposer();
      if (resetFailed) showBanner("Reset could not be confirmed. Reconnect and try again.", true);
    }
  }

  resetBtn.addEventListener("click", () => doReset(true));
  bannerCta.addEventListener("click", () => doReset(false));
  bannerRetry.addEventListener("click", () => doReset(true));

  /* ---------- Init ---------- */

  document.querySelectorAll(".msg.kraken .body").forEach((body) => decorateNotes(body, body.textContent));
  applyOfferings(state.offerings, true);
  paintTurns();
  setCooldown(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
  paintCount();
  autoGrow();
  refreshComposer();
  scrollLog(true);
  if (state.opened) fetchChest();
})();
