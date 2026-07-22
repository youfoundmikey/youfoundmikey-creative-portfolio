import { NextResponse } from "next/server";
import { sanity } from "@/lib/sanity-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the edit screen needs, across all four types, newest first.
// Fields that don't exist on a type just come back null — that's fine.
const QUERY = `*[_type in ["musicProject","fit","designProject","thingsILike"]]
  | order(_createdAt desc)[0...100]{
  _id,
  _type,
  _createdAt,
  order,
  // musicProject
  title, desc, emoji, color, embedUrl, projectUrl,
  "photos": photos[]{ _key, "url": image.asset->url },
  // fit
  date,
  "photoUrl": photo.asset->url,
  // designProject
  name, type,
  "images": images[]{ _key, "url": asset->url },
  // thingsILike
  caption, category,
  "media": media[]{ _key, type, linkUrl, linkTitle, "url": image.asset->url }
}`;

export async function GET() {
  try {
    const items = await sanity.fetch(QUERY);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
