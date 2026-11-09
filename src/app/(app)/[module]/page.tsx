import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleDashed, PlugZap } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { MODULES, moduleBySlug } from "@/lib/nav";

type Props = { params: Promise<{ module: string }> };

export function generateStaticParams() {
  return MODULES.filter((m) => !m.live).map((m) => ({ module: m.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = moduleBySlug((await params).module);
  return { title: m?.title ?? "Not found" };
}

/** Honest placeholder for modules scheduled in later phases: no fake data. */
export default async function ModulePage({ params }: Props) {
  const m = moduleBySlug((await params).module);
  if (!m || m.live) notFound();
  const Icon = m.icon;
  return (
    <>
      <PageHeader title={m.title} subtitle={m.summary}>
        <Badge tone="accent">Scheduled · Phase {m.phase}</Badge>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="What this module will do">
          <ul className="space-y-2">
            {m.capabilities.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-ink-2">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-line p-4">
            <Icon className="h-5 w-5 text-muted" aria-hidden />
            <p className="text-xs text-muted">
              The data tables for this module already exist in the database. The screen activates when Phase {m.phase} is
              delivered and tested — no illustrative or invented numbers are shown before that.
            </p>
          </div>
        </Card>
        <Card title="External access needed">
          {m.dependencies.length === 0 ? (
            <p className="text-sm text-muted">None.</p>
          ) : (
            <ul className="space-y-2">
              {m.dependencies.map((d) => (
                <li key={d} className="flex gap-2 text-sm text-ink-2">
                  <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Requested only when this phase starts.</p>
        </Card>
      </div>
    </>
  );
}
