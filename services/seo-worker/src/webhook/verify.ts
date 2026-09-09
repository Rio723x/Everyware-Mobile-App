import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Ghost webhook signature verification.
 *
 * The format is not guessed. It was read out of the running instance's own
 * source, `core/server/services/webhooks/WebhookTrigger.js` in Ghost 5.130.6:
 *
 *   headers['X-Ghost-Signature'] =
 *     `sha256=${crypto.createHmac('sha256', secret)
 *        .update(`${reqPayload}${ts}`).digest('hex')}, t=${ts}`;
 *
 * Two details a plausible-looking implementation gets wrong:
 *
 * 1. The HMAC covers **the raw body concatenated with the timestamp**, not the
 *    body alone. Signing only the body verifies nothing that Ghost signed.
 * 2. `t` is `Date.now()` - **milliseconds**, not seconds. Treating it as
 *    seconds puts every request ~55,000 years out of tolerance.
 *
 * The body must also be the exact bytes Ghost sent. Parsing to JSON and
 * re-serialising changes key order and whitespace, and the signature will never
 * match again.
 */

export const SIGNATURE_HEADER = "x-ghost-signature";

/** Ghost retries for up to a few minutes; five minutes of tolerance covers that. */
export const MAX_SKEW_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { readonly status: "valid"; readonly timestampMs: number }
  | { readonly status: "bad-signature"; readonly reason: string }
  | { readonly status: "stale-timestamp"; readonly skewMs: number }
  | { readonly status: "malformed-header"; readonly reason: string };

interface ParsedHeader {
  readonly signatureHex: string;
  readonly timestampMs: number;
}

const parseHeader = (header: string): ParsedHeader | string => {
  const signature = /sha256=([a-f0-9]+)/i.exec(header)?.[1];
  const timestamp = /\bt=(\d+)/.exec(header)?.[1];

  if (signature === undefined) {
    return "header carries no sha256= component";
  }
  if (timestamp === undefined) {
    return "header carries no t= timestamp";
  }
  return { signatureHex: signature.toLowerCase(), timestampMs: Number(timestamp) };
};

/**
 * Verifies a webhook.
 *
 * `rawBody` must be the request body exactly as received.
 */
export const verifyGhostSignature = (
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowMs: number = Date.now(),
): VerifyResult => {
  if (header === null || header === undefined || header.trim() === "") {
    return { status: "malformed-header", reason: "no X-Ghost-Signature header" };
  }
  if (secret === "") {
    return { status: "malformed-header", reason: "no webhook secret is configured" };
  }

  const parsed = parseHeader(header);
  if (typeof parsed === "string") {
    return { status: "malformed-header", reason: parsed };
  }

  const skewMs = Math.abs(nowMs - parsed.timestampMs);
  if (skewMs > MAX_SKEW_MS) {
    return { status: "stale-timestamp", skewMs };
  }

  const expected = createHmac("sha256", secret)
    .update(`${rawBody}${String(parsed.timestampMs)}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(parsed.signatureHex, "hex");

  // timingSafeEqual throws on a length mismatch, so the lengths are compared
  // first - and a wrong length is itself a failed signature.
  if (expectedBuffer.length !== providedBuffer.length) {
    return { status: "bad-signature", reason: "signature length does not match" };
  }
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return { status: "bad-signature", reason: "signature does not match the body and timestamp" };
  }

  return { status: "valid", timestampMs: parsed.timestampMs };
};

/** Builds a header the way Ghost does. Used by tests and by the capture script. */
export const signGhostPayload = (rawBody: string, secret: string, timestampMs: number): string =>
  `sha256=${createHmac("sha256", secret)
    .update(`${rawBody}${String(timestampMs)}`)
    .digest("hex")}, t=${String(timestampMs)}`;
