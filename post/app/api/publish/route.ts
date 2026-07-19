import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: "2026-07-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const DESTINATIONS = new Set([
  "musicProject",
  "fit",
  "designProject",
  "thingsILike",
]);

/** "July 19, 2026" — same style as the existing fit documents */
function todayString() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const destination = String(form.get("destination") ?? "");
    const title = String(form.get("title") ?? "").trim();
    const caption = String(form.get("caption") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const emoji = String(form.get("emoji") ?? "").trim();
    const color = String(form.get("color") ?? "").trim();
    const embedUrl = String(form.get("embedUrl") ?? "").trim();
    const projectUrl = String(form.get("projectUrl") ?? "").trim();
    const tilType = String(form.get("tilType") ?? "photo").trim();
    const linkUrl = String(form.get("linkUrl") ?? "").trim();
    const linkTitle = String(form.get("linkTitle") ?? "").trim();
    const orderRaw = String(form.get("order") ?? "").trim();
    const order = orderRaw && !isNaN(Number(orderRaw)) ? Number(orderRaw) : undefined;

    if (!DESTINATIONS.has(destination)) {
      return NextResponse.json({ error: "Pick a destination" }, { status: 400 });
    }

    const isTilLink =
      destination === "thingsILike" && (tilType === "music" || tilType === "video");
    if (isTilLink && !linkUrl) {
      return NextResponse.json({ error: "Link URL required" }, { status: 400 });
    }

    const hasFile = file instanceof File && file.size > 0;
    // Photo optional for music (embed-first) and TIL link items (no image field)
    if (!hasFile && destination !== "musicProject" && !isTilLink) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (hasFile && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "These sections only take images" },
        { status: 400 }
      );
    }

    // 1. Asset pipeline first (when there's a photo). Link items skip it.
    let image: Record<string, unknown> | null = null;
    if (hasFile && !isTilLink) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const asset = await client.assets.upload("image", buffer, {
        filename: file.name,
        contentType: file.type,
      });
      image = {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
      };
    }

    // 2. Then a document shaped exactly like the existing schema expects.
    let doc: Record<string, unknown>;
    switch (destination) {
      case "musicProject":
        doc = {
          _type: "musicProject",
          title,
          emoji: emoji || undefined,
          color: color || undefined,
          embedUrl: embedUrl || undefined,
          projectUrl: projectUrl || undefined,
          desc: caption || undefined,
          photos: image
            ? [{ _type: "object", _key: crypto.randomUUID(), image }]
            : undefined,
        };
        break;
      case "fit":
        doc = {
          _type: "fit",
          date: title || todayString(),
          desc: caption || undefined,
          photo: image,
        };
        break;
      case "designProject":
        doc = {
          _type: "designProject",
          name: title,
          type: caption || undefined,
          images: [{ ...image, _key: crypto.randomUUID() }],
        };
        break;
      case "thingsILike":
      default:
        doc = {
          _type: "thingsILike",
          media: [
            isTilLink
              ? {
                  _type: "object",
                  _key: crypto.randomUUID(),
                  type: tilType,
                  linkUrl,
                  linkTitle: linkTitle || undefined,
                }
              : { _type: "object", _key: crypto.randomUUID(), type: "photo", image },
          ],
          caption: caption || undefined,
          category: category || undefined,
        };
        break;
    }

    if (order !== undefined) doc.order = order;

    const created = await client.create(doc as { _type: string });
    return NextResponse.json({ ok: true, id: created._id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
