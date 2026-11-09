import { LogOut } from "lucide-react";
import { MobileNav, Sidebar } from "@/components/shell/Sidebar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Badge } from "@/components/ui/primitives";
import { requireContext } from "@/server/context";
import { signOut } from "@/server/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-page/90 px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{ctx.workspace.name}</p>
            <p className="truncate text-[11px] text-muted">
              {ctx.user.email} · <span className="capitalize">{ctx.role}</span>
            </p>
          </div>
          <Badge tone="accent">USD base</Badge>
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-2 hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
