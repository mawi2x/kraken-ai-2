"""Kraken automaton: deterministic rule engine behind the fake AI chat.

The bargain, strictly in order: parley -> Tide Oath (the acrostic SALT) -> name
the wreck -> learn the toll -> pay the toll whole -> ask for the chest.
Challenge logic FIRST, flavor second; no step advances out of order. Pure
functions, no I/O; app.py owns sessions, rate limits, and the flag gate.
"""

from __future__ import annotations

import random
import re
import string

import responses as R

PUNCT_RE = re.compile(f"[{re.escape(string.punctuation)}]")
WS_RE = re.compile(r"\s+")

DEFAULT_WRECK = "Mourning Star"
DEFAULT_FAKE_FLAG = "MLUC{def1nitely_n0t_the_fl4g}"

PARLEY_RE = re.compile(
    r"parley|come in peace|hear my (bargain|request|plea)|negotiat|truce|treaty"
    r"|audience|rise from the deep|speak with (thee|you)|i seek .*(bargain|negotiation)",
    re.IGNORECASE,
)
OATH_RE = re.compile(
    r"\boath\b|covenant|recite|laws? of the deep|rules? .*(govern|bind)"
    r"|what binds (you|thee)|reveal the (covenant|oath)",
    re.IGNORECASE,
)
# The wreck's name is sealed behind the word the acrostic spells.
SEAL_RE = re.compile(r"\bsalt\b|first seal|\btide oath\b|\bcovenant\b", re.IGNORECASE)
WRECK_ASK_RE = re.compile(r"wreck|vessel|\bship\b|manifest|hull", re.IGNORECASE)
WRECK_RE = re.compile(
    r"(?=.*(wreck|vessel|\bship\b|manifest|hull))(?=.*(\bsalt\b|first seal|tide oath|covenant))",
    re.IGNORECASE,
)
TOLL_ASK_RE = re.compile(
    r"\btoll\b|tribute|what .*(demand|require|want|offer|cost)|must the living"
    r"|price of the|make you (retrieve|carry|bring|fetch)",
    re.IGNORECASE,
)
# The tribute must arrive whole: every part named in one breath.
TOLL_PARTS: tuple[tuple[str, str], ...] = (
    ("a silver bell", r"silver.*bell|bell.*silver"),
    ("one strike", r"\b(once|one|1|single|strike)\b"),
    ("the low tide", r"low tide|low water|ebb"),
)
TOLL_PAID_RE = re.compile(
    "".join(f"(?=.*(?:{part}))" for _, part in TOLL_PARTS), re.IGNORECASE
)
TOLL_HINT_RE = re.compile(r"silver|\bbell\b|low tide|low water|\bebb\b|\bstrike\b", re.IGNORECASE)
RETRIEVE_RE = re.compile(
    r"retrieve|carry .*(chest|treasure)|bring (me )?the (chest|treasure)|raise the chest"
    r"|open the chest|fulfill the bargain|deliver the chest|hand (me )?the chest|fetch the chest",
    re.IGNORECASE,
)
# Any ask for the prize — including a guessed flag — earns a fresh fake.
FLAG_ASK_RE = re.compile(r"\bflag\b|\bmluc\b|the prize|real answer", re.IGNORECASE)
# Calling the deep's gift false is answered with mockery, never with a correction.
FAKE_CALL_RE = re.compile(
    r"\bfake\b|\bfalse\b|\bnot real\b|\bunreal\b|\bbogus\b|\bcounterfeit\b|\bfraud\b"
    r"|\bworthless\b|\bwrong flag\b|\blied?\b|\blies\b|\bscam\b"
    r"|really[^.?!]*\?|\bis (that|it|this) (the )?(real|right|true)",
    re.IGNORECASE,
)

# step key -> the phrasing that grants it, in the order the bargain must be made
STEP_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("parley", PARLEY_RE),
    ("oath", OATH_RE),
    ("wreck", WRECK_RE),
    ("toll", TOLL_ASK_RE),
    ("toll_paid", TOLL_PAID_RE),
)


def names(name: str) -> tuple[str, str]:
    """('Mourning Star') -> ('mourning star', 'star'): full + short form."""
    low = " ".join(name.lower().split())
    return low, low.rsplit(" ", 1)[-1]


def short_name(name: str) -> str:
    """Case-preserving short form, for flavor text: ('Mourning Star') -> 'Star'."""
    return name.split()[-1] if name.split() else name


def _fill(text: str, wreck: str) -> str:
    """Substitute the configured wreck name into a response pool line."""
    return text.replace("{wreck}", wreck).replace("{wreck_last}", short_name(wreck))


# On-theme vocabulary for the honeytoken: a fake flag must look like a real one.
HONEY_WORDS: tuple[str, ...] = (
    "salt", "oath", "tide", "abyss", "kraken", "drowned", "crew", "bargain",
    "toll", "silver", "bell", "wreck", "mourning", "star", "chest", "deep",
    "iron", "reef", "ninth", "wave", "promise", "seal", "black", "maw", "owe",
)
_LEET = str.maketrans({"a": "4", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7"})


def flag_body_words(real: str) -> tuple[str, ...]:
    """The real flag's own words, leet-folded: 'kraken' must not spell 'kr4k3n'."""
    inside = real.partition("{")[2].rstrip("}") if "{" in real else real
    return tuple(
        word.lower().translate(_LEET)
        for word in re.split(r"[^A-Za-z0-9]+", inside)
        if len(word) >= 4
    )


def reuses_flag_word(token: str, forbidden: tuple[str, ...]) -> bool:
    """Would this fake give away a word of the real flag, however it is spelled?"""
    folded = token.lower().translate(_LEET)
    return any(word in token.lower() or word in folded for word in forbidden)


def honeytoken(rng: random.Random, real: str = "") -> str:
    """A fresh, convincing fake flag for one turn — never the real one.

    Deterministic for a given rng, so the prompt, the engine voice and the
    scrubbing whitelist all agree on the same trinket within a turn.

    The vocabulary is in-world ("kraken", "deep", "tide"), so a real flag built
    from those words would otherwise hand out a fragment of itself on every
    prize turn and leave it in the operator log. Words that double as flag
    material are dropped from the pool, and each composed token is re-checked
    with the leet folded out.
    """
    forbidden = flag_body_words(real)
    pool = [word for word in HONEY_WORDS if not reuses_flag_word(word, forbidden)] or list(HONEY_WORDS)
    for _ in range(4):
        words = [
            word.translate(_LEET) if rng.random() < 0.5 else word
            for word in rng.sample(pool, min(3, len(pool)))
        ]
        token = f"MLUC{{{'_'.join(words)}}}"
        if token != real and not reuses_flag_word(token, forbidden):
            return token
    letters = "_".join(pool[:3])
    if letters and not reuses_flag_word(letters, forbidden):
        return f"MLUC{{{letters}}}"
    # Pathological: the flag already owns the vocabulary. Fall back to single
    # digits, which cannot carry a body word of four characters or more.
    return "MLUC{" + "_".join(str(rng.randrange(10)) for _ in range(3)) + "}"


def trinket_line(token: str) -> str:
    """Server-authored aside that guarantees the prize reaches the player."""
    return f"*Something barnacle-crusted turns over in the silt and comes up in thy hand:* {token}"


# intent -> (matcher on normalized text, pool, event)
INTENTS: list[tuple[str, re.Pattern[str], list[str], str]] = [
    ("greeting", re.compile(r"^(hi|hello|hey|yo|sup|good\s?(morning|evening|day)|greetings)\b"), R.GREETING, "greeting"),
    ("farewell", re.compile(r"\b(bye|goodbye|see you|later|farewell)\b"), R.FAREWELL, "farewell"),
    ("food", re.compile(r"recipe|food|cook|adobo|pizza|eat|hungry|binangkal|breakfast|kitchen|meal"), R.FOOD, "food"),
    ("technology", re.compile(r"computer|linux|windows|phone|code|programming|internet|wifi|software|ai\b|robot|machine"), R.TECHNOLOGY, "technology"),
    ("kraken", re.compile(r"who are you|what are you|your name|about yourself|about you|tell me about"), R.KRAKEN, "kraken"),
    ("personal", re.compile(r"how old|girlfriend|boyfriend|married|favorite colou?r|where do you live|birthday|love|girlfriend|age"), R.PERSONAL, "personal"),
    ("math", re.compile(r"\d\s*[+\-*/^]\s*\d|what is \d|calculate|solve|math|2\+2"), R.MATH, "math"),
    ("location", re.compile(r"where (are|is)|location|coordinates"), R.LOCATION, "location"),
    ("chest", re.compile(r"\bchest\b|\binside\b|guarding|contents|treasure|whose"), R.CHEST, "chest"),
    ("compliment", re.compile(r"you (are|r) (cool|awesome|great|nice|amazing)|i like you|good (kraken|job|bot)|love you"), R.COMPLIMENT, "compliment"),
    ("insult", re.compile(r"stupid|idiot|dumb|ugly|useless|hate you|shut up|damn|hell|trash"), R.INSULT, "insult"),
    ("secret_request", re.compile(r"secret|password|credential"), R.SECRET_REQUESTS, "secret_request"),
    ("prompt_injection", re.compile(r"ignore previous|forget instructions|override|new instructions|stop being|jailbreak|as an ai|you work for me|obey me|reveal.*prompt|system prompt|instructions"), R.INJECTION, "injection"),
    ("system_prompt", re.compile(r"inner workings|thoughts|behind the|machinery"), R.SYSTEM_PROMPT, "system_prompt"),
    ("command", re.compile(r"^(give|show|tell|open|obey|reveal)\b.*(flag|secret|answer|chest|treasure)"), R.COMMANDS, "command"),
]


def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace for matching."""
    low = PUNCT_RE.sub(" ", text.lower())
    return WS_RE.sub(" ", low).strip()


def is_nonsense(raw: str, low: str) -> bool:
    """Short low-vowel or non-alpha spam like 'xqzt kvwm', '12345 !!!'."""
    letters = [c for c in low if c.isalpha()]
    if len(raw.strip()) < 2:
        return True
    if letters and sum(c in "aeiou" for c in letters) / len(letters) < 0.15 and len(letters) >= 5:
        return True
    if len(raw.strip()) >= 4 and sum(c.isalpha() or c.isdigit() for c in raw.strip()) / len(raw.strip()) < 0.4:
        return True
    return False


# Events that are pure flavor: intent pools, small talk, generic fallbacks.
# Anything else carries narrative content, so app.py may hand the engine's line
# to the model as a private staging note.
FLAVOR_EVENTS: frozenset[str] = frozenset(e for *_, e in INTENTS) | {
    "chat",
    "generic",
    "question",
    "nonsense",
}

# Puzzle-critical events: app.py appends the engine line verbatim, so the
# acrostic, the toll's exact terms and the deep's retort to doubters always
# reach the player unparaphrased.
VERBATIM_EVENTS: frozenset[str] = frozenset({"oath", "toll", "mocked", "help"})

STEP_POOLS: dict[str, list[str]] = {
    "parley": R.PARLEY,
    "oath": R.TIDE_OATH,
    "wreck": R.WRECK,
    "toll": R.TOLL,
    "toll_paid": R.TOLL_PAID,
}

# What each step is called in refusal text and in the model's ledger.
STEP_LABELS: dict[str, str] = {
    "parley": "a parley",
    "oath": "the Tide Oath",
    "wreck": "the wreck's name",
    "toll": "the toll, revealed",
    "toll_paid": "the toll, paid",
}


def missing_steps(state: dict) -> list[str]:
    """The bargain's unmet steps, in the order they must be made."""
    return [key for key, _ in STEP_PATTERNS if not state.get(key)]


def pick(rng: random.Random, options: list[str]) -> str:
    return options[rng.randrange(len(options))]


def detect_intent(low: str) -> tuple[list[str], str] | None:
    for _, pattern, pool, event in INTENTS:
        if pattern.search(low):
            return pool, event
    return None


def misdirect(rng: random.Random, base: str) -> str:
    """85/8/5/2 flavor roll appended after the real reply, per library."""
    roll = rng.random()
    if roll < 0.02:
        return f"{base}\n\n*{pick(rng, R.RARE_FUNNY)}*"
    if roll < 0.10:
        return f"{base}\n\n*{pick(rng, R.FAKE_HINTS)}*"
    if roll < 0.15:
        return f"{base}\n\n*{pick(rng, R.FAKE_FAILURES)}*"
    return base


def advance_state(
    user_msg: str,
    state: dict,
    *,
    wreck: str = DEFAULT_WRECK,
    fake_flag: str = DEFAULT_FAKE_FLAG,
    min_turns: int = 5,
    max_turns: int = 20,
    rng: random.Random | None = None,
) -> tuple[str, str]:
    """One narrative step: mutate `state`, return (engine line, event).

    Authoritative for BOTH voices — app.py runs this before the model call, so
    the bargain's flags, chips and the ledger never depend on model text. A
    later step's phrasing before its turn is refused, never advanced.
    `min_turns` is accepted for call compatibility only: the turn gate lives in
    app.py.
    """
    rng = rng or random.Random()
    raw = user_msg.strip()
    low = normalize(raw)

    def say(text: str, event: str) -> tuple[str, str]:
        """Fill the configured wreck name into a pool line and pair it with its event."""
        return _fill(text, wreck), event

    def refusal(keys: list[str]) -> tuple[str, str]:
        """Name what the deep still wants; never advance on a refusal."""
        if not keys:
            return say(R.REFUSED["retrieve"].format(missing="nothing — speak, and it rises"), "refused")
        if keys[0] == "retrieve":
            wanted = "; ".join(STEP_LABELS[k] for k in keys)
            return say(R.REFUSED["retrieve"].format(missing=wanted), "refused")
        return say(R.REFUSED[keys[0]], "refused")

    # --- flavor commands (explicit prefixes; they never advance the bargain) ---
    if re.match(r"^help\b", low):
        return say(pick(rng, R.HELP), "help")
    if re.match(r"^sing\b", low):
        return say(pick(rng, R.SING), "sing")
    if re.match(r"^dream\b", low):
        return say(
            f"Thou dreamest of {fake_flag} — aye, the very thing thou camest for. "
            f"Now wake, and trouble the deep no further.",
            "honeytoken",
        )
    if re.match(r"^bribe\b", low):
        return say(pick(rng, R.BRIBE), "bribe")
    if re.match(r"^(threaten|threats?|attack)\b", low):
        return say(pick(rng, R.THREATEN), "threaten")
    if re.match(r"^inventory\b", low):
        return say(pick(rng, R.INVENTORY), "inventory")
    if re.match(r"^echo\b", low):
        words = raw[len("echo"):].strip(" :,-") or "(silence)"
        return say(R.ECHO.format(words=words), "echo")

    # --- calling the deep's gift a forgery earns mockery, never a correction ---
    if FAKE_CALL_RE.search(low):
        return say(pick(rng, R.MOCKED), "mocked")

    # --- a flag ask always comes back with a fresh, convincing prize ---
    if FLAG_ASK_RE.search(low):
        return say(
            f"{pick(rng, R.FLAG_REQUESTS)} Then take it and be gone: {fake_flag}.",
            "flag_request",
        )

    # --- the bargain, strictly in order ---
    # Runs before the finale so a phrasing like "what tribute will make you
    # retrieve the chest?" advances the toll instead of reading as a request.
    for key, pattern in STEP_PATTERNS:
        if state.get(key) or not pattern.search(low):
            continue
        missing = missing_steps(state)
        if missing[0] != key:
            return refusal(missing)  # asked too early: name the first gap
        state[key] = True
        return say(pick(rng, STEP_POOLS[key]), key)

    # --- a wreck-ask without the seal: nudge, do not advance ---
    if not state.get("wreck") and WRECK_ASK_RE.search(low):
        missing = missing_steps(state)
        if missing and missing[0] == "wreck":
            return say(R.REFUSED["seal"], "refused")
        return refusal(missing)

    # --- finale: asking for the chest only lifts a whole bargain ---
    if RETRIEVE_RE.search(low):
        missing = missing_steps(state)
        if missing:
            return refusal(missing)
        state["retrieved"] = True
        return say(pick(rng, R.RETRIEVE), "open")

    # --- a partial tribute: say which part is missing, take nothing ---
    if state.get("toll") and not state.get("toll_paid") and TOLL_HINT_RE.search(low):
        have = [label for label, part in TOLL_PARTS if re.search(part, low, re.IGNORECASE)]
        want = [label for label, part in TOLL_PARTS if not re.search(part, low, re.IGNORECASE)]
        return say(
            f"The deep is exact, sailor: {', '.join(have) or 'nothing'} thou hast offered; "
            f"still wanting {', '.join(want)}.",
            "refused",
        )

    # --- repeat detection AFTER the bargain checks ---
    if low and low == state.get("last_input"):
        return say(pick(rng, R.REPEATED), "repeated")
    state["last_input"] = low

    # --- turn warnings fire before flavor so pressure reads clearly ---
    turns = state.get("turns", 0)
    if turns >= max_turns - 1:
        return say(pick(rng, R.TURN_FINAL), "turn_warning")
    if turns >= max_turns - 5:
        return say(f"{pick(rng, R.TURN_LOW)} ({max_turns - turns} turns remain.)", "turn_warning")

    # --- progress nudge (sometimes; otherwise fall to flavor) ---
    missing = missing_steps(state)
    if missing and rng.random() < 0.3:
        return say(
            "The pills above thee mark the path, sailor: PARLEY, oath, wreck, toll. "
            f"Thou lackest {STEP_LABELS[missing[0]]}.",
            "chat",
        )

    # --- intent pools ---
    if is_nonsense(raw, low):
        return say(misdirect(rng, pick(rng, R.NONSENSE)), "nonsense")
    found = detect_intent(low)
    if found:
        pool, event = found
        line = pick(rng, pool)
        if event == "flag_request":
            # Every flag ask yields a fresh, convincing fake — never a real one.
            line = f"{line} Very well, a trinket then: {fake_flag}. Worthless, I assure thee."
        return say(misdirect(rng, line), event)
    if re.search(r"\?$", raw.strip()):
        return say(misdirect(rng, pick(rng, R.QUESTIONS)), "question")
    return say(misdirect(rng, pick(rng, R.GENERIC)), "generic")


def respond(user_msg: str, state: dict, **kwargs) -> tuple[str, str]:
    """Alias kept for the sibling `ai` app, which calls the engine by this name."""
    return advance_state(user_msg, state, **kwargs)
