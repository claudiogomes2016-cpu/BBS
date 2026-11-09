import { describe, expect, it } from "vitest";
import { fetchUsdBrl } from "./fx";

const mockFetch = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("fetchUsdBrl", () => {
  it("parses a valid ECB quote", async () => {
    const row = await fetchUsdBrl(mockFetch(200, { base: "USD", date: "2026-11-06", rates: { BRL: 5.4321 } }));
    expect(row).toEqual({ rate_date: "2026-11-06", base: "USD", quote: "BRL", rate: 5.4321, source: "ECB via Frankfurter" });
  });
  it("rejects HTTP errors and malformed payloads instead of storing a bad rate", async () => {
    await expect(fetchUsdBrl(mockFetch(503, {}))).rejects.toThrow("503");
    await expect(fetchUsdBrl(mockFetch(200, { base: "USD", date: "2026-11-06", rates: { BRL: -1 } }))).rejects.toThrow();
    await expect(fetchUsdBrl(mockFetch(200, { base: "EUR", date: "2026-11-06", rates: { BRL: 6 } }))).rejects.toThrow();
  });
});
