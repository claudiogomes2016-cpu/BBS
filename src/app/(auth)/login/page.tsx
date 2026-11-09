import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      {error && <p className="mb-4 text-sm text-critical">That sign-in link is invalid or expired.</p>}
      <AuthForm mode="login" next={next} />
    </>
  );
}
