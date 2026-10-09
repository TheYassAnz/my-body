import { buildExport, isExportKind } from "@/features/export/build";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isExportKind(kind)) return new Response("Not found", { status: 404 });

  // Redirects to /connexion when signed out; the userId comes from the session only.
  const { userId } = await requireUser("settings");
  const csv = await buildExport(getDb(), userId, kind);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}.csv"`,
      // Health data: never cached by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
