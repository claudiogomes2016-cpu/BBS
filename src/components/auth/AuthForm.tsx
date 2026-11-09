"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/ui/form";
import { signIn, signUp, type FormState } from "@/server/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "login" ? signIn : signUp, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      {mode === "signup" && (
        <Field label="Full name">
          <input name="fullName" autoComplete="name" className={inputClass} />
        </Field>
      )}
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 10 characters." : undefined}>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={inputClass}
        />
      </Field>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <SubmitButton className="w-full">{mode === "login" ? "Sign in" : "Create account"}</SubmitButton>
      <p className="text-center text-xs text-muted">
        {mode === "login" ? (
          <>
            No account? <Link href="/signup" className="text-accent hover:underline">Create one</Link>
          </>
        ) : (
          <>
            Already registered? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </>
        )}
      </p>
    </form>
  );
}
