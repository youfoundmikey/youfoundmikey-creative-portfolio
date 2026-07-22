import { NextRequest, NextResponse } from "next/server";
import { sanity, DOC_TYPES } from "@/lib/sanity-server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PhotoItem {
  _type: string;
  _key: string;
  [k: string]: unknown;
}

/**
 * Edits an existing document: text fields, photo add/remove, order.
 * Strategy is fetch → rebuild arrays in JS → patch. Single user,
 * no concurrent editors, so last-write-wins is exactly right.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

    const doc = await sanity.getDocument(id);
    if (!doc || !DOC_TYPES.has(doc._type)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const title = String(form.get("title") ?? "").trim();
    const caption = String(form.get("caption") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const emoji = String(form.get("emoji") ?? "").trim();
    const color = String(form.get("color") ?? "").trim();
    const embedUrl = String(form.get("embedUrl") ?? "").trim();
    const projectUrl = String(form.get("projectUrl") ?? "").trim();
    const orderRaw = String(form.get("order") ?? "").trim();
    const removePhoto = String(form.get("removePhoto") ?? "") === "1";

    let removeKeys: Set<string>;
    let mediaEdits: { _key: string; linkUrl?: string; linkTitle?: string }[];
    let captionEdits: { _key: string; caption?: string }[];
    let newCaptions: string[];
    try {
      removeKeys = new Set(JSON.parse(String(form.get("removeKeys") ?? "[]")));
      mediaEdits = JSON.parse(String(form.get("mediaEdits") ?? "[]"));
      captionEdits = JSON.parse(String(form.get("captionEdits") ?? "[]"));
      newCaptions = JSON.parse(String(form.get("newCaptions") ?? "[]"));
    } catch {
      return NextResponse.json({ error: "Bad edit payload" }, { status: 400 });
    }

    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.some((f) => !f.type.startsWith("image/"))) {
      return NextResponse.json(
        { error: "These sections only take images" },
        { status: 400 }
      );
    }

    // Upload any new photos first — same pipeline as publish.
    const newImages: Record<string, unknown>[] = [];
    for (const f of files) {
      const buffer = Buffer.from(await f.arrayBuffer());
      const asset = await sanity.assets.upload("image", buffer, {
        filename: f.name,
        contentType: f.type,
      });
      newImages.push({
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
      });
    }

    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    const opt = (field: string, value: string) => {
      if (value) set[field] = value;
      else unset.push(field);
    };

    switch (doc._type) {
      case "musicProject": {
        if (!title) {
          return NextResponse.json({ error: "Title required" }, { status: 400 });
        }
        set.title = title;
        opt("desc", caption);
        opt("emoji", emoji);
        opt("color", color);
        opt("embedUrl", embedUrl);
        opt("projectUrl", projectUrl);
        const capEdits = new Map(captionEdits.map((e) => [e._key, e.caption]));
        const kept = ((doc.photos as PhotoItem[]) ?? [])
          .filter((p) => !removeKeys.has(p._key))
          .map((p) =>
            capEdits.has(p._key)
              ? { ...p, caption: (capEdits.get(p._key) ?? "").trim() || undefined }
              : p
          );
        const added = newImages.map((image, i) => ({
          _type: "object",
          _key: crypto.randomUUID(),
          image,
          caption: newCaptions[i]?.trim() || undefined,
        }));
        const photos = [...kept, ...added];
        if (photos.length) set.photos = photos;
        else unset.push("photos");
        break;
      }
      case "fit": {
        if (title) set.date = title;
        opt("desc", caption);
        if (newImages[0]) set.photo = newImages[0];
        else if (removePhoto) unset.push("photo");
        break;
      }
      case "designProject": {
        if (!title) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        set.name = title;
        opt("type", caption);
        const kept = ((doc.images as PhotoItem[]) ?? []).filter(
          (p) => !removeKeys.has(p._key)
        );
        const added = newImages.map((image) => ({
          ...image,
          _key: crypto.randomUUID(),
        }));
        const images = [...kept, ...added];
        if (images.length) set.images = images;
        else unset.push("images");
        break;
      }
      case "thingsILike":
      default: {
        opt("caption", caption);
        opt("category", category);
        const edits = new Map(mediaEdits.map((e) => [e._key, e]));
        const kept = ((doc.media as PhotoItem[]) ?? [])
          .filter((m) => !removeKeys.has(m._key))
          .map((m) => {
            const e = edits.get(m._key);
            if (!e) return m;
            return {
              ...m,
              linkUrl: (e.linkUrl ?? "").trim() || m.linkUrl,
              linkTitle: (e.linkTitle ?? "").trim() || undefined,
            };
          });
        const added = newImages.map((image) => ({
          _type: "object",
          _key: crypto.randomUUID(),
          type: "photo",
          image,
        }));
        set.media = [...kept, ...added];
        break;
      }
    }

    if (orderRaw && !isNaN(Number(orderRaw))) set.order = Number(orderRaw);
    else unset.push("order");

    await sanity.patch(id).set(set).unset(unset).commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
