import { loginSchema } from "@ipl/shared";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { burnPasswordCheck, verifyPassword } from "@/lib/passwords";
import { rateLimit } from "@/lib/rate-limit";
import { findUserByUsername, toAuthUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "auth:login", 10, 15 * 60_000);
    const input = loginSchema.parse(await readJson(request));

    const userDoc = await findUserByUsername(input.username);
    if (!userDoc) {
      await burnPasswordCheck(input.password);
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }
    if (!(await verifyPassword(input.password, userDoc.passwordHash))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    const now = new Date();
    await (await getDb())
      .collection("users")
      .updateOne({ _id: userDoc._id }, { $set: { lastLoginAt: now, updatedAt: now } });

    const user = toAuthUser(userDoc);
    await setSessionCookie(signSessionToken(user));
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
