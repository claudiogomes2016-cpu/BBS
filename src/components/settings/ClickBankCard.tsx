"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/ui/form";
import {
  createInsSecret,
  saveClickBankApiKey,
  saveClickBankNickname,
  testClickBankApiKey,
  type SecretState,
} from "@/server/actions/clickbank";
import type { FormState } from "@/server/actions/auth";

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label={label} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.target.select()} />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-2 hover:text-ink"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export interface ClickBankCardProps {
  canEdit: boolean;
  webhookUrl: string;
  status: string;
  nickname: string | null;
  verifiedAt: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  insHint: string | null;
  apiHint: string | null;
}

const when = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "never");

export function ClickBankCard(p: ClickBankCardProps) {
  const [secretState, makeSecret] = useActionState<SecretState>(createInsSecret, {});
  const [apiState, saveApi] = useActionState<FormState, FormData>(saveClickBankApiKey, {});
  const [testState, testApi] = useActionState<FormState>(testClickBankApiKey, {});
  const [nickState, saveNick] = useActionState<FormState, FormData>(saveClickBankNickname, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone={p.status === "connected" ? "good" : p.status === "error" ? "critical" : "neutral"}>
          {p.status.replace("_", " ")}
        </Badge>
        <span>Verified: {when(p.verifiedAt)}</span>
        <span>· Last notification: {when(p.lastEventAt)}</span>
        {p.lastError && <span className="text-critical">· {p.lastError}</span>}
      </div>

      {/* Step 1 */}
      <section>
        <h3 className="text-sm font-semibold text-ink">1 · Account nickname</h3>
        <form action={saveNick} className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-48">
            <input name="nickname" defaultValue={p.nickname ?? ""} placeholder="e.g. cgomes82" disabled={!p.canEdit} className={inputClass} />
          </div>
          <SubmitButton variant="ghost" disabled={!p.canEdit}>Save</SubmitButton>
          <FormMessage state={nickState} />
        </form>
      </section>

      {/* Step 2 */}
      <section>
        <h3 className="text-sm font-semibold text-ink">2 · Instant Notifications (sales, refunds, chargebacks)</h3>
        <p className="mt-1 text-xs text-muted">
          In ClickBank, open the Instant Notification settings (request access first if asked), paste the secret key
          and the URL below, click <b>Test URL</b>, then <b>Save</b>.
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Instant Notification URL">
            <CopyField value={p.webhookUrl} label="notification URL" />
          </Field>
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-2">Secret key</span>
            {secretState.secret ? (
              <CopyField value={secretState.secret} label="secret key" />
            ) : (
              <p className="text-xs text-muted">
                {p.insHint ? <>Configured (ends in <span className="font-mono">{p.insHint}</span>).</> : "Not configured yet."}
              </p>
            )}
            <form action={makeSecret} className="mt-2 flex flex-wrap items-center gap-3">
              <SubmitButton variant="ghost" disabled={!p.canEdit}>
                {p.insHint ? <><RefreshCw className="mr-2 h-4 w-4" />Generate a new key</> : <><KeyRound className="mr-2 h-4 w-4" />Generate secret key</>}
              </SubmitButton>
              <FormMessage state={secretState} />
            </form>
            {p.insHint && !secretState.secret && (
              <p className="mt-1 text-[11px] text-muted">Generating a new key stops notifications until you update it in ClickBank.</p>
            )}
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section>
        <h3 className="text-sm font-semibold text-ink">3 · API key (order reconciliation)</h3>
        <p className="mt-1 text-xs text-muted">
          ClickBank → Settings → API Management → Create New API Key, with <b>Orders/Tickets API Read</b> and <b>Analytics</b> for your
          nickname. Paste it here — it is stored server-side and never shown again.
        </p>
        <form action={saveApi} className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <input
              name="api_key"
              type="password"
              autoComplete="off"
              placeholder={p.apiHint ? `Saved (…${p.apiHint}) — paste to replace` : "API-…"}
              disabled={!p.canEdit}
              className={inputClass}
            />
          </div>
          <SubmitButton disabled={!p.canEdit}>Save key</SubmitButton>
        </form>
        <div className="mt-2"><FormMessage state={apiState} /></div>
        {p.apiHint && (
          <form action={testApi} className="mt-2 flex flex-wrap items-center gap-3">
            <SubmitButton variant="ghost" disabled={!p.canEdit}>Test connection</SubmitButton>
            <FormMessage state={testState} />
          </form>
        )}
      </section>
    </div>
  );
}
