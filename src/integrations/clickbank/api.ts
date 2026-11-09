/**
 * ClickBank REST API v1.3 (affiliate use).
 * Sources: support.clickbank.com/en/articles/10535397 (auth, quotas)
 *          support.clickbank.com/en/articles/10535407 (Orders API)
 * Auth header: "Authorization: <API key>" (keys look like "API-...").
 * Quotas: 25,000 requests/day/account, 10 requests/second/IP; 403 when exceeded.
 */
export const CLICKBANK_API_BASE = "https://api.clickbank.com/rest/1.3";
export const API_KEY_PATTERN = /^API-[A-Za-z0-9]{16,128}$/;

export type ConnectionCheck =
  | { ok: true; orders: number | null }
  | { ok: false; reason: "unauthorized" | "unavailable"; detail: string };

export async function checkApiKey(apiKey: string, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<ConnectionCheck> {
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const url = `${CLICKBANK_API_BASE}/orders2/count?role=AFFILIATE&startDate=${start}&endDate=${end}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Authorization: apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    return { ok: false, reason: "unavailable", detail: e instanceof Error ? e.message : "network error" };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      reason: "unauthorized",
      detail: "ClickBank rejected the key. Check that it is active and has the Orders read permission for your account nickname.",
    };
  }
  if (!res.ok) return { ok: false, reason: "unavailable", detail: `ClickBank API responded ${res.status}` };
  const text = (await res.text()).trim();
  const n = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
  return { ok: true, orders: Number.isFinite(n) ? n : null };
}
