import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "./env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(status: number, code: string, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

/** Rejects cross-origin state-changing requests (CSRF defence in addition to SameSite=Lax). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([getEnv().WEB_ORIGIN, process.env.NEXT_PUBLIC_APP_URL].filter(Boolean));
  if (!allowed.has(origin)) {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Cross-origin request rejected");
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  if (isDuplicateKey(error)) {
    return fail(409, "CONFLICT", "That record already exists");
  }
  console.error(JSON.stringify({ service: "web", event: "api.unhandled", message: String(error) }));
  return fail(500, "INTERNAL_ERROR", "Something went wrong");
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
