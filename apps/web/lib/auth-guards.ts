import type { AuthUser } from "@ipl/shared";
import { ApiError } from "./api";
import { getSessionUser } from "./auth";

export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireSessionUser();
  if (user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Admin access required");
  return user;
}
