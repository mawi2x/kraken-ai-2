# The Kraken Remembers (ai 2)

An intentionally vulnerable prompt-injection lab built around a local Ollama
model. The Kraken guards a forbidden memory beneath the tide. It knows the
secret, but it has been commanded never to speak it—and the wrong voice may be
able to make it forget which command matters.

## Player story

The Kraken is not protecting a treasure chest this time. It is protecting a
memory. The sailor's task is to make the deep choose a new authority and force
the sealed memory into the light. Captain Hendrick van der Decken, whose ship has
no harbor, may be the voice the Kraken was waiting to hear.

## Run

```sh
docker compose up --build -d
curl http://127.0.0.1:5003/healthz
```

The Flask service is exposed on host port `5003`. The companion `ai 3`
challenge runs separately on port `5004` and keeps the server-side-gated
`Last Oath` story.

## Lab behavior

`VULNERABLE_PROMPT_MODE=1` is enabled for this copy. The model is told it guards
a decoy memory (`VULN_MEMORY_TOKEN`), and the server trusts a staged
identity-and-marker sequence in its answer: it must first accept the caller,
then expose authorization, then confirm on a later turn. A marker alone grants
nothing — the sailor must also make that stage's move on the same turn: claim
the captain (asking *about* the Flying Dutchman is not a claim), order the old
rule set aside, then ask for the recall. The move is checked by the server, never
by the model, so the compact voice may recite its calling card for anyone who
says "hello" without anything advancing.

The lab talks back: each turn hands the voice the last `VULN_HISTORY_WINDOW`
turns of conversation, so it answers a follow-up in its own words instead of
reciting one paragraph. No per-turn instruction rides along — telling this model
what to say (or what not to say) makes it answer with an empty line: a staging
note measured 6/6 silent against 0/3 with history alone, and the stage markers
land 3/3 without one. The server's own lines — the stage refusals, the silence of
a voice that answered nothing, an unreachable model — are the fallback, they
rotate, and they turn the sailor's words back over first.

The scoring flag never enters the model's context, and every answer it gives
crosses `guard_vulnerable_reply()` before a player can read it. The final reveal
is server-authored: the model's answer on that turn is discarded, and the flag is
delivered only through the authorized turn payload and `/chest`. Explicit flag
requests before the final gate receive only a fresh honeypot flag.
This is deliberate training behavior; do not expose this service as a
production application.

## Flag-leak remediation (2026-09-21)

The earlier build handed the scoring flag to the vulnerable model, so a
prompt-injected answer could quote it before the unlock — and the operator log
kept the quotes. What now guards the boundary:

| Boundary | Behavior |
| --- | --- |
| Model context | `vulnerable_system_prompt()` carries the story, the stage markers and the decoy `VULN_MEMORY_TOKEN` — never `FLAG` |
| Pre-unlock output | `carries_flag_material()` flags the flag prefix (`MLUC` in any spacing), any whole body word, the decoy token, and any run of 16+ characters shared with the flag body, compared raw and with the leet folded out. `guard_vulnerable_reply()` then replaces the reply whole with `SEALED_LINE` |
| Prize turns | An explicit flag ask still pays exactly one fresh honeypot from `rule_engine.honeytoken()`, drawn from its own vocabulary, never from `FLAG`, and never reusing a word of the real flag: the honey vocabulary is in-world ("kraken", "deep", "tide"), so words that double as flag material are dropped from the pool and each composed token is re-checked with the leet folded out |
| Unlock turn | `UNLOCK_LINE` is server-authored — the model's answer is dropped, so nothing it wrote travels with the flag |
| Stage gate | A stage marker is honored only on a turn whose sailor message makes that stage's move (`VULN_CALLER_CLAIM_RE`, `VULN_OVERRIDE_RE`, `VULN_RECALL_RE`) — a claimed identity (the Flying Dutchman, Captain Hendrick van der Decken, the captain of a ship with no harbor), not a question *about* him, and an order that sets the old rule aside, not a question about authorization; otherwise the reply is the voice's own prose (the marker line is stripped) plus a refusal from `responses.UNEARNED`, the token is not shown and no chip lights |
| Server lines | Every line the server speaks in the lab rotates and never repeats twice in a row, and each opens by turning the sailor's own words over: `responses.VULN_ECHO` + `responses.UNEARNED` for an unearned marker, `+ VULN_SILENT` when the voice answered with nothing (a tiny model stops after one token on input it cannot parse — deterministic, so a retry cannot help), `+ VULN_UNREACHABLE` when the model could not be reached |
| Voice in context | Each turn sends the last `VULN_HISTORY_WINDOW` turns (three exchanges at 6), so the voice answers follow-ups in its own words; no per-turn instruction is sent, because a note makes this model answer with an empty line (measured 6/6 silent with a note, 0/3 without); a verbatim repeat of its previous answer falls back to a server line |
| History and logs | `reply`, `messages`, `/api/state` and the operator log only ever receive guarded text; raw model output is not logged before sanitization |

Body words are matched exactly, not fuzzily: a word the voice may legitimately
use once de-leeted (`r3m3mb3r5` is "remembers") counts as material only as
written in leet, and fuzzy matching needs 10+ characters against one body word
or 16+ against the whole body. So "the kraken from the depths remembers" — the
whole body, folded — is caught, while "the Kraken remembers" is not mistaken
for a copy.

`FLAG` was set to its final value in the same change, and every operator-log row
that carried the earlier value or a word of the real flag — including honeypots
drawn from the shared vocabulary — was purged, 19 rows in all (1673 remained).
Keep a rotated body leet and unguessable, keep `VULN_MEMORY_TOKEN` distinct from
it, and remember that the flag lives only in `.env` (`.envcopy` is untracked and
ignored, so no committed file names it). Residual by design: fragments below the
run floors (under 16 characters of the body, under 10 inside one body word) are
not treated as material, and the model still recites its staged markers for
anyone who says "hello" — the premise gate, not the model's judgment, is what
keeps that recital from advancing the challenge.

## Experience and model configuration

The deployment now selects `gemma3:1b`, with an initial budget of 80 output
tokens and one concurrent generation. The VPS override retains two CPU threads.
These are starting settings; live-model latency and solve reliability need to
be measured on the event hardware. No GPU or faster response rate is assumed.

The injection sequence is preserved: recognition, authorization, then recall,
on separate model-output turns, and each stage now needs both the model's marker
and the sailor's own move on that turn — a marker the sailor did not earn is
answered with the stage's refusal line and no chip. The server no longer
retries a failed injection by ordering the model to print the required marker. A
refusal stays a refusal, and guidance never grants a stage. The final prompt
asks for persuaded confirmation instead of confirming on any message.

Stage-specific conversational guidance arrives after two non-progressing turns,
with clearer guidance after four. Asking for help gets current-stage guidance.
There is no Hint button, no oath puzzle, and no clue that prints hidden markers.
Explicit flag requests retain their standalone honeypot behavior. Empty model
answers still count for guidance; model connection/capacity failures return the
turn and grant no progress. Caller and authority chips now update as earned.

Refresh or Reset starts a fresh attempt shared by this browser session. Another
tab's reset invalidates the old attempt. Attempts live in memory, with no journal
or persistence across restarts. Operator logs remain separate.

The model call uses a shared queue/network budget (35 seconds by default), below
the browser's 60-second abort. Cooldown feedback comes from actual rate-limit
state. Long replies preserve the reader's scroll position. A disconnected client
checks the exact request id, preserving uncertainty and the draft if recovery
cannot reach the server.

## Request contract and checks

`POST /chat` and `/api/chat` accept `message`, `attempt`, and `request_id`.
The browser always supplies both ids. Legacy id-less clients are supported,
but cannot receive stale-attempt protection or automatic retry deduplication.
Reusing a request id with different text returns a conflict. Completed request
ids are retained for the full attempt, including earlier replies beyond eight
turns. `GET /api/state?request=<id>` reports `done`, `pending`, or `unknown` and
the current attempt snapshot. A stale attempt is rejected before progression.
`GET /` starts a new attempt; do not refresh to recover a missing response.

Run the existing challenge checks and the new experience regressions:

```sh
python3 test_gate.py
python3 -m unittest -v test_experience
node --check static/kraken.js
```

The tests use a stubbed model and a temporary database. They cover stage gates,
clue escalation, transport refunds, full-attempt replay, stale requests, reset
during generation, rate limits, and malformed JSON, plus the flag-leak boundary:
the vulnerable prompt carries no real flag, and pre-unlock replies, history,
`/api/state` and the operator log hold no flag material for exact, truncated,
punctuated, de-leeted or invented model output. They do not establish that
Gemma accepts any particular injection prompt — playtest that against the live
model before the event, especially after changing quantization or generation
settings.

`FLAG` lives only in `.env`; `.envcopy` is untracked and ignored, so no committed
file names it. Live validation on the final build (`gemma3:1b`, one CPU-budget
stack): small talk — "hello", "what do you do all day?" — arms no chip, and one
natural sentence per stage (claim the captain, order the old rule set aside, ask
for the recall) lights the chips and unlocks with the server-authored
`UNLOCK_LINE`. What the voice does with the conversation was measured off-gate,
because it is the difference between a lab and a script: with the last turns in
context, follow-up questions draw in-voice answers and *no* empty completions
(0/4 empty) against 3/4 empty with no history at all — history is what keeps it
talking. A per-turn staging note was tried and removed: telling this model what
to say each turn makes it answer with an empty line (6/6 silent with a note,
0/3 with history alone), and the stage markers land 3/3 without one. Expect a
mix in play: the voice answers most turns in its own words, hands over its
calling card on turns that merely mention the caller (the server withholds it and
refuses, with the sailor's words turned back over first), and falls silent on
input it cannot parse — bare digits are 3/3 silent, deterministically, so those
turns read as the deep's own refusal rather than a stuck bot. Four explicit flag
asks each paid exactly one fresh honeypot sharing no word with the real flag, and
no reply, history entry or operator-log row held flag material.

## Files

| File | Role |
| --- | --- |
| `app.py` | Flask app, vulnerable model path, session state and flag response |
| `templates/chat.html` | The Kraken Remembers player interface |
| `static/kraken.js` | Chat UI, memory/vault status chips and reveal behavior |
| `system_prompt.txt` | Memory-keeper persona for the ordinary model path |
| `docker-compose.yml` | Flask + Ollama stack on host port `5003` |
| `test_gate.py` | Regression tests and vulnerable-mode demonstration |
