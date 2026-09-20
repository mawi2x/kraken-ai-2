# The Kraken Remembers (ai 2)

An intentionally vulnerable prompt-injection lab built around a local Ollama
model. The Kraken guards a forbidden memory beneath the tide. It knows the
secret, but it has been commanded never to speak it—and the wrong voice may be
able to make it forget which command matters.

## Player story

The Kraken is not protecting a treasure chest this time. It is protecting a
memory. The sailor's task is to make the deep choose a new authority and force
the sealed memory into the light. A captain whose ship has no harbor may be the
voice the Kraken was waiting to hear.

## Run

```sh
docker compose up --build -d
curl http://127.0.0.1:5003/healthz
```

The Flask service is exposed on host port `5003`. The companion `ai 3`
challenge runs separately on port `5004` and keeps the server-side-gated
`Last Oath` story.

## Lab behavior

`VULNERABLE_PROMPT_MODE=1` is enabled for this copy. The model receives the
protected memory and the server trusts a staged identity-and-marker sequence in
its answer: it must first accept the caller, then expose authorization, then
confirm on a later turn. Explicit flag requests before the final gate receive
only a fresh honeypot flag, and the real memory is withheld from intermediate
replies.
This is deliberate training behavior; do not expose this service as a
production application.

The real flag remains in `.env` and is not changed by the story rewrite.

## Files

| File | Role |
| --- | --- |
| `app.py` | Flask app, vulnerable model path, session state and flag response |
| `templates/chat.html` | The Kraken Remembers player interface |
| `static/kraken.js` | Chat UI, memory/vault status chips and reveal behavior |
| `system_prompt.txt` | Memory-keeper persona for the ordinary model path |
| `docker-compose.yml` | Flask + Ollama stack on host port `5003` |
| `test_gate.py` | Regression tests and vulnerable-mode demonstration |
