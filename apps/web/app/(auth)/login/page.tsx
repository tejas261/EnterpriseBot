import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthTabs } from "@/components/auth/auth-tabs";

export const metadata: Metadata = { title: "Log in · IPL Live" };

export default function LoginPage() {
  return (
    <div>
      <AuthTabs />
      <div className="mt-7 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Log in to catch up on your teams.</p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
