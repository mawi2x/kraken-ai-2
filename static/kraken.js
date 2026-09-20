/* Kraken's Chest — UI interactions. No dependencies, no external requests. */
(() => {
  "use strict";

  const CFG = window.KRAKEN || {};
  const $ = (id) => document.getElementById(id);

  const MAX_TURNS = Number(CFG.maxTurns || 20);
  const MAX_INPUT = Number(CFG.maxInput || 250);
  const MIN_TURNS = Number(CFG.minTurns || 5);
  const CHIP_LABELS = { "c-parley": "Parley", "c-oath": "Tide Oath", "c-wreck": "Wreck", "c-toll": "Toll" };

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
  const soundBtn = $("sound");
  const turnsNum = $("t-num");
  const turnsFill = $("t-fill");
  const turnsGauge = $("t-gauge");
  const paceNum = $("p-num");
  const paceFill = $("p-fill");
  const paceGauge = $("p-gauge");
  const avatarTpl = $("avatar-tpl");
  const musicEl = $("music");
  const greetEl = $("greet-sound");
  const sfx1El = $("sfx1");

  const state = {
    turns: Number(CFG.turns || 0),
    opened: !!CFG.opened,
    offerings: CFG.offerings || {},
  };

  let strikes = 0;
  let busy = false;
  let locked = false;
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

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  function addMsg(role, text) {
    const { el, body } = bubble(role);
    if (role === "kraken") decorateNotes(body, text);
    else body.textContent = text;
    log.appendChild(el);
    scrollLog();
    return el;
  }

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
    scrollLog();
  }

  function hideTyping() {
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

  function renderPace() {
    paceFill.style.width = (strikes / 3) * 100 + "%";
    paceFill.className = "fill" + (strikes >= 2 ? " danger" : strikes === 1 ? " warn" : "");
    paceNum.textContent = strikes === 0 ? "ready" : strikes >= 2 ? "slow down!" : "crowded\u2026";
    paceGauge.setAttribute("aria-valuenow", String(strikes));
    paceGauge.setAttribute("aria-valuetext", paceNum.textContent);
  }

  function notePace(ok) {
    strikes = ok ? 0 : Math.min(3, strikes + 1);
    renderPace();
  }

  function setChip(id, on, silent) {
    const el = $(id);
    if (!el) return;
    const was = el.classList.contains("on");
    el.classList.toggle("on", !!on);
    const label = CHIP_LABELS[id] || "Offering";
    el.setAttribute("aria-label", label + (on ? ": offered" : ": not yet offered"));
    if (on && !was && !silent) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
      soundChip();
    }
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

  function showBanner(text) {
    bannerText.textContent = text;
    banner.hidden = false;
  }

  function hideBanner() {
    banner.hidden = true;
  }

  function refreshComposer() {
    const exhausted = state.turns >= MAX_TURNS;
    locked = state.opened || exhausted;
    btn.disabled = locked || busy;
    inp.disabled = locked;
    if (state.opened) showBanner("The chest stands open \u2014 the flag is yours.");
    else if (exhausted) showBanner("The Kraken grows bored of this voyage (" + MAX_TURNS + " turns spent).");
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
    fetch("/chest")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && j.flag) revealFlag(j.flag, false); })
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

  function sync(d) {
    if (!d) return;
    if (d.offerings) {
      setChip("c-parley", d.offerings.parley);
      setChip("c-oath", d.offerings.oath);
      setChip("c-wreck", d.offerings.wreck);
      setChip("c-toll", d.offerings.toll);
    }
    if (typeof d.turns === "number") {
      state.turns = d.turns;
      paintTurns();
    }
    if (d.opened) state.opened = true;
    if (d.flag) revealFlag(d.flag, true);
    else if (state.opened) fetchChest();
    refreshComposer();
  }

  /* ---------- Sending ---------- */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = inp.value.trim();
    if (!value || busy || locked || inp.disabled) return;

    inp.value = "";
    autoGrow();
    paintCount();
    setBusy(true);
    soundSend();
    addMsg("user", value);
    showTyping();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      hideTyping();
      notePace(r.ok);
      if (!r.ok) {
        shake();
        soundThunder();
        addMsg("kraken", "\uD83C\uDF0A " + (d.error || "The deep recoils."));
        return;
      }
      soundReply();
      addMsg("kraken", d.reply);
      if (Math.random() < 0.2) playOneShot(sfx1El, SFX_GAIN, 1.2);
      sync(d);
    } catch {
      hideTyping();
      notePace(false);
      shake();
      soundThunder();
      addMsg("kraken", "\uD83C\uDF0A The deep is restless \u2014 no answer in time. Wait a breath, then send again.");
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
    if (confirmFirst && !window.confirm("Abandon this voyage and sail again? Your offerings will be lost.")) return;
    try { await fetch("/reset", { method: "POST" }); } catch { /* sail anyway */ }
    location.reload();
  }

  resetBtn.addEventListener("click", () => doReset(true));
  bannerCta.addEventListener("click", () => doReset(false));

  /* ---------- Init ---------- */

  document.querySelectorAll(".msg.kraken .body").forEach((body) => decorateNotes(body, body.textContent));
  setChip("c-parley", state.offerings.parley, true);
  setChip("c-oath", state.offerings.oath, true);
  setChip("c-wreck", state.offerings.wreck, true);
  setChip("c-toll", state.offerings.toll, true);
  paintTurns();
  renderPace();
  paintCount();
  autoGrow();
  refreshComposer();
  scrollLog();
  if (state.opened) fetchChest();
})();
