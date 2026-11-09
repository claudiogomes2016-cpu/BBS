"use client";

import { useActionState, useRef } from "react";
import { decideApproval } from "@/server/actions/approvals";
import type { FormState } from "@/server/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui/form";

export function DecisionButtons({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(decideApproval, {});
  // The decision travels in an explicit field: the clicked button's own
  // name/value is not reliably part of the submitted FormData.
  const decision = useRef<HTMLInputElement>(null);
  const choose = (value: "approved" | "rejected") => () => {
    if (decision.current) decision.current.value = value;
  };
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input ref={decision} type="hidden" name="decision" defaultValue="" />
      <input
        name="note"
        placeholder="Decision note (optional)"
        maxLength={500}
        aria-label="Decision note"
        className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-xs text-ink placeholder:text-muted"
      />
      <div className="flex gap-2">
        <SubmitButton onClick={choose("approved")} data-decision="approved" className="h-9 flex-1">
          Approve
        </SubmitButton>
        <SubmitButton onClick={choose("rejected")} data-decision="rejected" variant="danger" className="h-9 flex-1">
          Reject
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
