import { describe, expect, it } from "vitest";
import fixture from "./fixtures/ghost-signature.json" with { type: "json" };
import { MAX_SKEW_MS, signGhostPayload, verifyGhostSignature } from "./verify.js";

/**
 * The fixture header was produced by Ghost's own runtime, not written here.
 *
 * That distinction is the whole point of these tests: a verifier checked only
 * against a signature this file generated would agree with itself perfectly and
 * still reject every real request. The cross-check below is what proves the
 * algorithm matches Ghost's.
 */
const { payload, secret, timestampMs, header } = fixture;
const AT_SIGNING_TIME = timestampMs + 1_000;

describe("against a signature produced by Ghost itself", () => {
  it("accepts it", () => {
    expect(verifyGhostSignature(payload, header, secret, AT_SIGNING_TIME)).toEqual({
      status: "valid",
      timestampMs,
    });
  });

  it("reproduces Ghost's header byte for byte", () => {
    // Confirms the HMAC covers rawBody + timestamp concatenated. Signing the
    // body alone produces a different digest and would pass no real request.
    expect(signGhostPayload(payload, secret, timestampMs)).toBe(header);
  });
});

describe("rejects tampering", () => {
  it("rejects a single changed body byte", () => {
    const tampered = payload.replace("abc123", "abc124");
    expect(verifyGhostSignature(tampered, header, secret, AT_SIGNING_TIME).status).toBe(
      "bad-signature",
    );
  });

  it("rejects the wrong secret", () => {
    expect(verifyGhostSignature(payload, header, "not-the-secret", AT_SIGNING_TIME).status).toBe(
      "bad-signature",
    );
  });

  it("rejects a body that was parsed and re-serialised", () => {
    // Ghost signs the exact bytes it sent. A handler that parses the body and
    // re-serialises it before verifying loses whatever whitespace or key order
    // the original had - it "works" against a canonical test payload and fails
    // on real deliveries. Signed here with a pretty-printed body to make the
    // difference observable.
    const spaced = JSON.stringify(JSON.parse(payload), null, 2);
    const signedForSpaced = signGhostPayload(spaced, secret, timestampMs);

    expect(verifyGhostSignature(spaced, signedForSpaced, secret, AT_SIGNING_TIME).status).toBe(
      "valid",
    );

    const recompacted = JSON.stringify(JSON.parse(spaced));
    expect(recompacted).not.toBe(spaced);
    expect(verifyGhostSignature(recompacted, signedForSpaced, secret, AT_SIGNING_TIME).status).toBe(
      "bad-signature",
    );
  });

  it("rejects a truncated signature rather than throwing on length mismatch", () => {
    const short = header.replace(/sha256=[a-f0-9]+/, "sha256=deadbeef");
    expect(verifyGhostSignature(payload, short, secret, AT_SIGNING_TIME).status).toBe(
      "bad-signature",
    );
  });
});

describe("rejects replays", () => {
  it.each([
    ["six minutes old", timestampMs + MAX_SKEW_MS + 60_000],
    ["six minutes in the future", timestampMs - MAX_SKEW_MS - 60_000],
  ])("rejects a request %s", (_label, now) => {
    const result = verifyGhostSignature(payload, header, secret, now);
    expect(result.status).toBe("stale-timestamp");
  });

  it("accepts a request just inside tolerance", () => {
    expect(
      verifyGhostSignature(payload, header, secret, timestampMs + MAX_SKEW_MS - 1_000).status,
    ).toBe("valid");
  });

  it("treats t= as milliseconds", () => {
    // Reading Ghost's Date.now() as seconds would put this ~55,000 years out.
    const asSeconds = header.replace(/t=\d+/, `t=${String(Math.floor(timestampMs / 1000))}`);
    expect(verifyGhostSignature(payload, asSeconds, secret, AT_SIGNING_TIME).status).toBe(
      "stale-timestamp",
    );
  });
});

describe("rejects malformed input", () => {
  it.each([
    [null, "null header"],
    [undefined, "undefined header"],
    ["", "empty header"],
    ["   ", "whitespace header"],
    ["t=1789000000000", "no sha256 component"],
    ["sha256=abc123", "no timestamp"],
    ["garbage", "unparseable"],
  ])("returns malformed-header for %s (%s)", (value, _label) => {
    expect(verifyGhostSignature(payload, value, secret, AT_SIGNING_TIME).status).toBe(
      "malformed-header",
    );
  });

  it("returns malformed-header when no secret is configured", () => {
    // Failing closed matters: an unset secret must never mean "accept anything".
    expect(verifyGhostSignature(payload, header, "", AT_SIGNING_TIME).status).toBe(
      "malformed-header",
    );
  });

  it("accepts an uppercase hex signature", () => {
    const upper = header.replace(/sha256=([a-f0-9]+)/, (_m, hex: string) => `sha256=${hex.toUpperCase()}`);
    expect(verifyGhostSignature(payload, upper, secret, AT_SIGNING_TIME).status).toBe("valid");
  });
});
