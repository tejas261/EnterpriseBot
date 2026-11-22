import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthTabs } from "@/components/auth/auth-tabs";

export const metadata: Metadata = { title: "Create account · IPL Live" };

export default function RegisterPage() {
  return (
    <div>
      <AuthTabs />
      <div className="mt-7 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick a username to start following teams.
        </p>
      </div>
      <AuthForm mode="register" />
    </div>
  );
}
