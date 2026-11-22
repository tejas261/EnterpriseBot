"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AuthUser } from "@ipl/shared";
import { ApiClientError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(30, "Use at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api.post<{ user: AuthUser }>(`/api/auth/${mode}`, values);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Unable to reach the server. Try again.",
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="rahul"
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "username-error" : undefined}
          {...register("username")}
        />
        {errors.username ? (
          <p id="username-error" className="text-xs text-destructive">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Log in" : "Create account"}
      </Button>
    </form>
  );
}
