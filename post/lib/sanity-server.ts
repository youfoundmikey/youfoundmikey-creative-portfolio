// Server-side Sanity client — shared by the feed/update/delete routes.
// (publish/route.ts keeps its own copy; consolidate later if it bugs you.)

import { createClient } from "@sanity/client";

export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: "2026-07-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export const DOC_TYPES = new Set([
  "musicProject",
  "fit",
  "designProject",
  "thingsILike",
]);
