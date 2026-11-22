import { handleApiError, ok } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
