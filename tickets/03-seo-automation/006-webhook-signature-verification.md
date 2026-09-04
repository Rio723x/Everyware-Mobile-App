# T-03-006 — Ghost webhook signature verification

**Spec:** 03-seo-automation §4.2
**Depends on:** T-01-002, T-03-001
**Estimate:** ~1.5h

## What to build

`src/webhook/verify.ts` — `verifyGhostSignature(rawBody, header, secret, now): VerifyResult`.

1. Recompute an HMAC-SHA256 over the **raw** request body, before any JSON parsing. The Vercel
   Function must read the raw body; parsing first destroys the bytes the signature covers.
2. Constant-time comparison.
3. Reject requests whose signature timestamp is more than **5 minutes** from now, in either
   direction, as replays.
4. Return a discriminated result: `valid` | `bad-signature` | `stale-timestamp` | `malformed-header`.

**Confirm the exact header name and encoding against the running Ghost version's documentation
before implementing, and build the unit tests from a real captured request.** A verifier that passes
against a fixture you invented proves nothing about production traffic. Capture one by pointing a
test webhook at a request-bin, and commit the captured body and header (with the secret rotated).

## Acceptance criteria

- [ ] A **real captured** Ghost request with the correct secret verifies as `valid`.
- [ ] The same request with one body byte changed returns `bad-signature`.
- [ ] The same request with the wrong secret returns `bad-signature`.
- [ ] A timestamp 6 minutes old, and one 6 minutes in the future, both return `stale-timestamp`.
- [ ] A missing or unparseable header returns `malformed-header`, never a crash.
- [ ] Comparison is constant-time (uses `timingSafeEqual`) — asserted by inspection in review and by
      a unit test that both operands are equal length before comparison.
- [ ] The captured fixture is committed with a rotated secret; no live secret is in the repo.

## Status

Not started
