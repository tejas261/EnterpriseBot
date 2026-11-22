import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { SESSION_COOKIE, authUserSchema, type AuthUser } from "@ipl/shared";
import { getEnv } from "./env";

/** Signs a short-lived HS256 session token. Subject = user id. */
export function signSessionToken(user: AuthUser): string {
  const env = getEnv();
  return jwt.sign({ username: user.username, role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.AUTH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, getEnv().JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
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

export async function setSessionCookie(token: string): Promise<void> {
  const decoded = jwt.decode(token);
  const expiresAt = typeof decoded === "object" && decoded !== null ? decoded.exp : undefined;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(expiresAt ? { maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) } : {}),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Reads and verifies the session cookie. Never accepts a user id from the client. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
