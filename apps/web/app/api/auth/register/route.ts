import { registerSchema } from "@ipl/shared";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/passwords";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "auth:register", 10, 15 * 60_000);
    const input = registerSchema.parse(await readJson(request));

    const db = await getDb();
    const users = db.collection("users");
    if (await users.findOne({ username: input.username })) {
      throw new ApiError(409, "USERNAME_TAKEN", "That username is already taken");
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.password);
    const result = await users.insertOne({
      username: input.username,
      passwordHash,
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    const user = { id: result.insertedId.toString(), username: input.username, role: "user" as const };
    await setSessionCookie(signSessionToken(user));
    return ok({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
