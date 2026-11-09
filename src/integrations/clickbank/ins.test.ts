import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptIns, generateInsSecret, insKey, INS_SECRET_PATTERN, InsError, kindOf, normalizeIns } from "./ins";

/** Encrypts exactly as ClickBank documents it, to test our decryption end to end. */
function encryptLikeClickBank(payload: unknown, secret: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", insKey(secret), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return JSON.stringify({ notification: ct.toString("base64"), iv: iv.toString("base64") });
}

// Shape taken from ClickBank's documented v8.0 affiliate-role example.
const sample = {
  transactionTime: "2023-10-05T13:47:51-06:00",
  receipt: "ABCD1234",
  transactionType: "SALE",
  vendor: "TestAcct",
  affiliate: "cgomes82",
  role: "AFFILIATE",
  totalAccountAmount: "37.42",
  paymentMethod: "VISA",
  totalOrderAmount: "69.00",
  trackingCodes: ["a1b2c3d4e5f6"],
  lineItems: [{ itemNo: "1", productTitle: "Product Title", accountAmount: "37.42", lineItemType: "ORIGINAL" }],
  customer: { billing: { state: "NV", postalCode: "89101", address: { country: "US" } } },
  commonTrackingParameters: { deviceType: "Smartphone", os: "iOS" },
  version: 8.0,
  attemptCount: 1,
};

describe("INS decryption", () => {
  it("round-trips a notification encrypted the documented way", () => {
    const secret = "MYSECRETKEY12345";
    expect(decryptIns(encryptLikeClickBank(sample, secret), secret)).toEqual(sample);
  });

  it("rejects a wrong secret as unauthenticated (401)", () => {
    const body = encryptLikeClickBank(sample, "RIGHTSECRET12345");
    try {
      decryptIns(body, "WRONGSECRET12345");
      throw new Error("should fail");
    } catch (e) {
      expect(e).toBeInstanceOf(InsError);
      expect((e as InsError).status).toBe(401);
    }
  });

  it("rejects malformed envelopes (400)", () => {
    expect(() => decryptIns("not json", "X")).toThrow(InsError);
    expect(() => decryptIns(JSON.stringify({ notification: "x" }), "X")).toThrow(InsError);
  });

  it("generates ClickBank-compatible secrets", () => {
    const s = generateInsSecret();
    expect(s).toMatch(INS_SECRET_PATTERN);
    expect(s).toHaveLength(16);
    expect(generateInsSecret()).not.toBe(s);
  });
});

describe("INS normalization", () => {
  it("maps a sale", () => {
    expect(normalizeIns(sample)).toMatchObject({
      event_key: "ABCD1234|SALE|2023-10-05T13:47:51-06:00",
      kind: "sale",
      external_sale_id: "ABCD1234",
      commission_usd: 37.42,
      sale_amount_usd: 69,
      vendor: "testacct",
      item_no: "1",
      tracking_code: "a1b2c3d4e5f6",
      device: "mobile",
      country: "US",
    });
  });

  it("refunds and chargebacks point at the original receipt with a positive amount", () => {
    const r = normalizeIns({ ...sample, transactionType: "RFND", totalAccountAmount: "-37.42" });
    expect(r).toMatchObject({ kind: "refund", external_sale_id: "ABCD1234", commission_usd: 37.42 });
    expect(normalizeIns({ ...sample, transactionType: "CGBK" }).kind).toBe("chargeback");
  });

  it("keeps each rebill as its own commission", () => {
    const r = normalizeIns({ ...sample, transactionType: "BILL", transactionTime: "2023-11-05T13:47:51-06:00" });
    expect(r.kind).toBe("sale");
    expect(r.external_sale_id).toBe("ABCD1234#2023-11-05T13:47:51-06:00");
  });

  it("classifies every documented transaction type", () => {
    expect(["TEST", "TEST_SALE", "TEST_BILL", "TEST_RFND", "CANCEL-TEST-REBILL", "UNCANCEL-TEST-REBILL"].map(kindOf)).toEqual(
      Array(6).fill("test"),
    );
    expect(["CANCEL-REBILL", "UNCANCEL-REBILL", "ABANDONED_ORDER", "SUBSCRIPTION-CHG"].map(kindOf)).toEqual(Array(4).fill("other"));
    expect(kindOf("INSF")).toBe("chargeback");
  });

  it("tolerates the minimal TEST notification", () => {
    const r = normalizeIns({ transactionTime: "2026-11-09T10:00:00-05:00", receipt: "********", transactionType: "TEST" });
    expect(r.kind).toBe("test");
    expect(r.device).toBe("unknown");
  });
});
