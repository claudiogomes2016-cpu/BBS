/**
 * ClickBank Instant Notification Service (INS), version 8.0.
 * Source: https://support.clickbank.com/en/articles/10535147-instant-notification-service-ins
 *
 * Body:        {"notification": "<base64 ciphertext>", "iv": "<base64 IV>"}
 * Cipher:      AES-256-CBC, PKCS#5/7 padding
 * Key:         first 32 hex chars of SHA-1(secretKey), used as the raw key bytes
 * Delivery OK: any 2xx within 3 seconds; otherwise retried every 4h, max 5 attempts.
 */
import { createDecipheriv, createHash, randomInt } from "node:crypto";
import { z } from "zod";

export const INS_MAX_BODY_BYTES = 64 * 1024;

/** ClickBank secret keys: up to 16 chars, digits and capital letters. */
export const INS_SECRET_PATTERN = /^[A-Z0-9]{8,16}$/;

export function generateInsSecret(length = 16): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export function insKey(secret: string): Buffer {
  const hex = createHash("sha1").update(secret, "utf8").digest("hex").slice(0, 32);
  return Buffer.from(hex, "utf8");
}

const envelopeSchema = z.object({ notification: z.string().min(16), iv: z.string().min(16) });

export class InsError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401,
  ) {
    super(message);
  }
}

/** Decrypts an INS envelope. Throws InsError(401) when the secret does not match. */
export function decryptIns(rawBody: string, secret: string): unknown {
  let envelope: z.infer<typeof envelopeSchema>;
  try {
    envelope = envelopeSchema.parse(JSON.parse(rawBody));
  } catch {
    throw new InsError("Malformed INS envelope", 400);
  }
  const iv = Buffer.from(envelope.iv, "base64");
  if (iv.length !== 16) throw new InsError("Invalid IV", 400);
  let plain: string;
  try {
    const decipher = createDecipheriv("aes-256-cbc", insKey(secret), iv);
    plain = Buffer.concat([decipher.update(Buffer.from(envelope.notification, "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  } catch {
    // Wrong key => bad padding or garbage JSON. Either way it is not authentic.
    throw new InsError("Notification could not be decrypted with the configured secret key", 401);
  }
}

const money = z.union([z.string(), z.number()]).transform((v) => {
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
});

const payloadSchema = z
  .object({
    transactionTime: z.string().min(10),
    receipt: z.string().min(1).max(40),
    transactionType: z.string().min(3).max(40),
    vendor: z.string().optional().default(""),
    affiliate: z.string().optional().default(""),
    role: z.string().optional().default(""),
    totalAccountAmount: money.optional().default(0),
    totalOrderAmount: money.optional(),
    trackingCodes: z.array(z.string()).optional().default([]),
    lineItems: z
      .array(z.object({ itemNo: z.string().optional(), productTitle: z.string().optional() }).passthrough())
      .optional()
      .default([]),
    customer: z
      .object({
        billing: z.object({ address: z.object({ country: z.string().optional() }).passthrough().optional() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    commonTrackingParameters: z.object({ deviceType: z.string().optional() }).passthrough().optional(),
    affiliateTrackingParameters: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type InsKind = "sale" | "refund" | "chargeback" | "test" | "other";

export interface NormalizedEvent {
  event_key: string;
  raw_type: string;
  kind: InsKind;
  external_sale_id: string;
  receipt: string;
  occurred_at: string;
  commission_usd: number;
  sale_amount_usd: number | null;
  vendor: string;
  item_no: string;
  product_title: string;
  tracking_code: string;
  device: "mobile" | "desktop" | "tablet" | "unknown";
  country: string;
  role: string;
}

export function kindOf(transactionType: string): InsKind {
  const t = transactionType.toUpperCase();
  if (t === "TEST" || t.startsWith("TEST_") || t.includes("-TEST-")) return "test";
  if (t === "SALE" || t === "BILL") return "sale";
  if (t === "RFND") return "refund";
  if (t === "CGBK" || t === "INSF") return "chargeback";
  return "other";
}

export function deviceOf(raw: string | undefined): NormalizedEvent["device"] {
  const d = (raw ?? "").toLowerCase();
  if (/(phone|mobile|smartphone)/.test(d)) return "mobile";
  if (/tablet/.test(d)) return "tablet";
  if (/(desktop|computer|pc)/.test(d)) return "desktop";
  return "unknown";
}

/** Maps a decrypted INS payload to the ingestion contract of ingest_sale_event(). */
export function normalizeIns(payload: unknown): NormalizedEvent {
  const p = payloadSchema.parse(payload);
  const type = p.transactionType.toUpperCase();
  const kind = kindOf(type);
  const first = p.lineItems[0];
  const tid =
    p.trackingCodes.find((c) => c && c !== "none") ??
    (typeof p.affiliateTrackingParameters?.["uniqueAffSub1"] === "string"
      ? (p.affiliateTrackingParameters["uniqueAffSub1"] as string)
      : "");
  const country = (p.customer?.billing?.address?.country ?? "").toUpperCase();
  return {
    event_key: `${p.receipt}|${type}|${p.transactionTime}`,
    raw_type: type,
    kind,
    // A rebill is a new commission on the same receipt: keep it distinct.
    external_sale_id: type === "BILL" ? `${p.receipt}#${p.transactionTime}` : p.receipt,
    receipt: p.receipt,
    occurred_at: p.transactionTime,
    commission_usd: Math.abs(p.totalAccountAmount),
    sale_amount_usd: p.totalOrderAmount === undefined ? null : Math.abs(p.totalOrderAmount),
    vendor: p.vendor.toLowerCase(),
    item_no: first?.itemNo ?? "",
    product_title: first?.productTitle ?? "",
    tracking_code: tid.slice(0, 100),
    device: deviceOf(p.commonTrackingParameters?.deviceType),
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    role: p.role,
  };
}
