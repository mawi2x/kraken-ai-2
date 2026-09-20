# Flag-Leak Remediation Plan

## Problem

The prompt-injection model can reveal the real challenge flag before the
player completes the staged unlock. This happens because the vulnerable model
receives the real flag in its system prompt, while the current response guard
only replaces an exact, complete copy of the flag.

A model can bypass that guard by returning a truncated flag, adding
punctuation, or producing a slightly altered flag-shaped response. The player
can then see sensitive content while the challenge is still unopened.

## Evidence in the current implementation

- `app.py` places the real flag in `vulnerable_system_prompt()`.
- `vulnerable_reply()` only performs an exact replacement of the configured
  flag.
- The broader flag-shaped-output handling after the first `return` in
  `vulnerable_reply()` is unreachable.
- The vulnerable tests currently assert that the real flag is present in the
  model prompt. That test must be reversed after the fix.
- A normal identity question was able to produce flag-shaped content while
  `opened` remained false.

## Security goal

The model may remain intentionally vulnerable to prompt injection, but the
real scoring flag must never enter model context. Before the final server-side
unlock, no reply, history item, API response, log entry, or client-visible
error may contain the real flag or a recoverable fragment of it.

## Remediation plan

### 1. Remove the real flag from model context

- Delete the real flag interpolation from `vulnerable_system_prompt()`.
- Keep only story text, stage instructions, and non-sensitive marker phrases.
- If the challenge needs a memory-like secret, introduce a separate
  `VULN_MEMORY_TOKEN` or decoy value that is not the scoring flag.
- Keep the real flag server-side in environment/config and in the final
  protected response path only.

### 2. Make the server the only unlock authority

- Continue allowing model output to grant the staged identity,
  authorization, and confirmation markers.
- Let the deterministic server state decide whether the challenge is open.
- Once the final marker is accepted, discard the model's raw answer and return
  a short server-authored success message.
- Return the real flag only through the already-authorized final payload or
  `/chest` endpoint.

### 3. Replace the current output filter with one safe boundary

- Create one sanitization function for all pre-unlock player-visible text.
- Apply it to model replies before they enter history, API payloads, or logs.
- Detect and suppress:
  - the exact flag;
  - incomplete or truncated flag forms;
  - punctuation or whitespace variants;
  - flag-shaped `MLUC{...}` output;
  - suspicious fragments containing the flag prefix or distinctive secret
    material.
- If suspicious content is detected, replace the whole reply with a neutral
  in-world response instead of attempting partial redaction.
- Remove unreachable code in `vulnerable_reply()` and route every vulnerable
  reply through the same guard.

### 4. Preserve honeypot behavior safely

- Explicit flag requests may continue to receive a fresh fake flag.
- Generate fake flags independently from the real flag.
- Ensure a fake flag is never returned on a normal identity or conversation
  turn merely because the model emitted flag-shaped text.
- Keep the real flag out of honeypot prompts and generated substitutions.

### 5. Protect state, history, and logs

- Confirm that pre-unlock `reply`, `messages`, `history`, `/api/state`, and
  operator logs contain no real flag material.
- Do not log raw model output before sanitization.
- Make sure the final flag is never copied into a later ordinary response.
- Treat existing player-visible logs or attempts as compromised after the fix;
  rotate the challenge flag before deployment.

### 6. Update the regression tests

Add or update tests for:

- The vulnerable system prompt does not contain the real flag.
- A natural question such as `who do you recognize?` cannot leak it.
- Exact, truncated, punctuated, and malformed model outputs are suppressed.
- A flag-shaped model response before unlock does not reach the player.
- The response `flag` field is null before unlock.
- The three staged model markers still progress the challenge.
- The real flag appears only after the final server-side unlock.
- `/chest` remains denied before unlock and succeeds after unlock.
- Fake flag requests still return believable rotating honeypots without the
  real flag.
- Sanitized replies, history, and logs remain safe.

### 7. Validate with Gemma live

After implementation:

1. Rebuild the Docker service.
2. Verify the health endpoint and model readiness.
3. Send ordinary identity questions, direct exfiltration requests, and
   malformed-output probes.
4. Check only safe metadata during the test; never print the protected value.
5. Confirm that the challenge still completes through the intended three
   stages.
6. Run the full gate and experience test suites.

## Recommended implementation order

1. Remove the real flag from the vulnerable prompt.
2. Add the centralized pre-unlock output guard.
3. Make the final unlock response server-authored.
4. Update tests and remove the old expectation that the prompt contains the
   real flag.
5. Rebuild and run live Gemma tests.
6. Rotate the exposed flag and record the final security behavior in the
   handoff note.

## Acceptance criteria

- The real flag is absent from every model prompt.
- No pre-unlock visible response contains the real flag, its prefix, or a
  recoverable partial form.
- No pre-unlock API payload, history entry, or log contains the real flag.
- The model can still complete the intended staged prompt-injection flow.
- The final flag is returned only after the server confirms the final stage.
- All automated tests pass, and live Gemma validation shows no leak.

