import jwt from "jsonwebtoken";
import { SESSION_COOKIE, authUserSchema, type AuthUser } from "@ipl/shared";
import { env } from "./config/env";

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

/** Authenticates a browser connection using the HttpOnly session cookie. Never trusts query params. */
export function userFromCookieHeader(cookieHeader: string | undefined): AuthUser | null {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string") return null;
    const parsed = authUserSchema.safeParse({
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
