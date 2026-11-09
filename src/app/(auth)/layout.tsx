import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Brand />
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted">
            FIND OPPORTUNITIES. REDUCE CPC. GENERATE PROFIT.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">{children}</div>
      </div>
    </main>
  );
}
