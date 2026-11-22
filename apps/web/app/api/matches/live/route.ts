import { handleApiError, ok } from "@/lib/api";
import { getLiveMatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Initial snapshot only; live updates are pushed over the WebSocket, never polled. */
export async function GET() {
  try {
    return ok({ match: await getLiveMatch() });
  } catch (error) {
    return handleApiError(error);
  }
}
