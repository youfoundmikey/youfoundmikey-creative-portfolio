// The four real sections of the site. Publishing creates documents of
// these exact types, so everything shows up where it already lives.

export type DestinationId =
  | "musicProject"
  | "fit"
  | "designProject"
  | "thingsILike";

export interface Destination {
  id: DestinationId;
  label: string;
  titlePlaceholder: string | null; // null = this type has no title field
  captionPlaceholder: string;
  titleRequired: boolean;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "musicProject",
    label: "music",
    titlePlaceholder: "Title",
    captionPlaceholder: "Notes",
    titleRequired: true,
  },
  {
    id: "fit",
    label: "fit",
    titlePlaceholder: "Date — leave blank for today",
    captionPlaceholder: "Description",
    titleRequired: false,
  },
  {
    id: "designProject",
    label: "design",
    titlePlaceholder: "Project name",
    captionPlaceholder: "Type — Website, Album Cover…",
    titleRequired: true,
  },
  {
    id: "thingsILike",
    label: "things i like",
    titlePlaceholder: null,
    captionPlaceholder: "Caption",
    titleRequired: false,
  },
];

// Matches the category list in studio/schemaTypes/thingsILike.js
export const TIL_CATEGORIES = [
  "Music",
  "Nature",
  "Cars",
  "Art",
  "Nerd Things",
  "Misc",
] as const;
