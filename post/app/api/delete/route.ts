import { NextRequest, NextResponse } from "next/server";
import { sanity, DOC_TYPES } from "@/lib/sanity-server";

export const runtime = "nodejs";

/** Deletes a document. Assets stay in the media library — that's fine. */
export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

    const doc = await sanity.getDocument(id);
    if (!doc || !DOC_TYPES.has(doc._type)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sanity.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
