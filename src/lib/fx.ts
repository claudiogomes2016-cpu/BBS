import { z } from "zod";

/** Frankfurter (European Central Bank reference rates), free and keyless. */
export const FX_SOURCE_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL";

const responseSchema = z.object({
  base: z.literal("USD"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.object({ BRL: z.number().positive().max(100) }),
});

export interface FxRow {
  rate_date: string;
  base: "USD";
  quote: "BRL";
  rate: number;
  source: string;
}

export async function fetchUsdBrl(fetchImpl: typeof fetch = fetch): Promise<FxRow> {
  const res = await fetchImpl(FX_SOURCE_URL, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`FX provider responded ${res.status}`);
  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("FX provider returned an unexpected payload");
  return {
    rate_date: parsed.data.date,
    base: "USD",
    quote: "BRL",
    rate: parsed.data.rates.BRL,
    source: "ECB via Frankfurter",
  };
}
