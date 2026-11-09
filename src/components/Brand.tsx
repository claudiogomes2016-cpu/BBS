export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-surface-3" />
        <path d="M8 22 14 10l4 8 2-4 4 8" fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[13px] font-bold tracking-wide text-ink">AFFILIATE</p>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">INTELLIGENCE</p>
        </div>
      )}
    </div>
  );
}
