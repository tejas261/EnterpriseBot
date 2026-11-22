import { assertSameOrigin, handleApiError, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
