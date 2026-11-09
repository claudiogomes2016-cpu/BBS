import { describe, expect, it } from "vitest";
import { API_KEY_PATTERN, checkApiKey } from "./api";

const respond = (status: number, body = "") => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  }) as unknown as typeof fetch;
  return { f, calls };
};

describe("checkApiKey", () => {
  it("calls the Orders count endpoint with the raw key in Authorization", async () => {
    const { f, calls } = respond(200, '{"count":"12"}');
    const r = await checkApiKey("API-ABCDEFGHIJKLMNOP1234", f, new Date("2026-11-09T12:00:00Z"));
    expect(r).toEqual({ ok: true, orders: 12 });
    expect(calls[0]!.url).toBe(
      "https://api.clickbank.com/rest/1.3/orders2/count?role=AFFILIATE&startDate=2026-10-11&endDate=2026-11-09",
    );
    expect((calls[0]!.init!.headers as Record<string, string>).Authorization).toBe("API-ABCDEFGHIJKLMNOP1234");
  });
  it("reports rejected keys", async () => {
    expect((await checkApiKey("API-X", respond(403).f)).ok).toBe(false);
  });
  it("validates key format", () => {
    expect(API_KEY_PATTERN.test("API-9870acb8d96f8bd18c2eb70725b01fe4b98ece58")).toBe(true);
    expect(API_KEY_PATTERN.test("DEV-123")).toBe(false);
  });
});
