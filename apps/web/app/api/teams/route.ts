import { handleApiError, ok } from "@/lib/api";
import { listTeams } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ teams: await listTeams() });
  } catch (error) {
    return handleApiError(error);
  }
}
