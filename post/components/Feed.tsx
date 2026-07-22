"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DESTINATIONS, TIL_CATEGORIES, type DestinationId } from "@/lib/destinations";
import { compressIfImage } from "@/lib/compress";
import { haptic } from "@/lib/haptics";

interface PhotoRef {
  _key: string;
  url?: string;
}

interface MediaItem {
  _key: string;
  type: string;
  linkUrl?: string;
  linkTitle?: string;
  url?: string; // present when type === "photo"
}

interface FeedItem {
  _id: string;
  _type: DestinationId;
  _createdAt: string;
  order?: number;
  // musicProject
  title?: string;
  desc?: string;
  emoji?: string;
  color?: string;
  embedUrl?: string;
  projectUrl?: string;
  photos?: PhotoRef[];
  // fit
  date?: string;
  photoUrl?: string;
  // designProject
  name?: string;
  type?: string;
  images?: PhotoRef[];
  // thingsILike
  caption?: string;
  category?: string;
  media?: MediaItem[];
}

interface NewPhoto {
  file: File;
  url: string;
}

interface EditState {
  title: string;
  caption: string;
  category: string;
  emoji: string;
  color: string;
  embedUrl: string;
  projectUrl: string;
  order: string;
  removeKeys: string[];
  removePhoto: boolean;
  linkEdits: Record<string, { linkUrl: string; linkTitle: string }>;
  newPhotos: NewPhoto[];
}

function thumb(url: string | undefined, size = 400) {
  if (!url) return undefined;
  return `${url}?w=${size}&h=${size}&fit=crop&auto=format`;
}

function typeLabel(t: DestinationId) {
  return DESTINATIONS.find((d) => d.id === t)?.label ?? t;
}

function itemTitle(item: FeedItem) {
  switch (item._type) {
    case "musicProject":
      return item.title || "Untitled";
    case "fit":
      return item.date || "Fit";
    case "designProject":
      return item.name || "Untitled";
    default:
      return item.caption || item.media?.find((m) => m.linkTitle)?.linkTitle || "Untitled";
  }
}

function itemSub(item: FeedItem) {
  switch (item._type) {
    case "musicProject":
      return item.desc;
    case "fit":
      return item.desc;
    case "designProject":
      return item.type;
    default:
      return item.category;
  }
}

function firstThumb(item: FeedItem) {
  switch (item._type) {
    case "musicProject":
      return thumb(item.photos?.[0]?.url);
    case "fit":
      return thumb(item.photoUrl);
    case "designProject":
      return thumb(item.images?.[0]?.url);
    default:
      return thumb(item.media?.find((m) => m.url)?.url);
  }
}

/** Existing photos on an item, normalized to key + url, for the edit grid. */
function existingPhotos(item: FeedItem): PhotoRef[] {
  switch (item._type) {
    case "musicProject":
      return item.photos ?? [];
    case "fit":
      return item.photoUrl ? [{ _key: "__single__", url: item.photoUrl }] : [];
    case "designProject":
      return item.images ?? [];
    default:
      return (item.media ?? [])
        .filter((m) => m.type === "photo")
        .map((m) => ({ _key: m._key, url: m.url }));
  }
}

function freshEdit(item: FeedItem): EditState {
  const linkEdits: EditState["linkEdits"] = {};
  (item.media ?? [])
    .filter((m) => m.type !== "photo")
    .forEach((m) => {
      linkEdits[m._key] = {
        linkUrl: m.linkUrl ?? "",
        linkTitle: m.linkTitle ?? "",
      };
    });
  return {
    title:
      item._type === "fit"
        ? item.date ?? ""
        : item._type === "designProject"
          ? item.name ?? ""
          : item.title ?? "",
    caption:
      item._type === "designProject"
        ? item.type ?? ""
        : item._type === "thingsILike"
          ? item.caption ?? ""
          : item.desc ?? "",
    category: item.category ?? "",
    emoji: item.emoji ?? "",
    color: item.color ?? "",
    embedUrl: item.embedUrl ?? "",
    projectUrl: item.projectUrl ?? "",
    order: item.order !== undefined ? String(item.order) : "",
    removeKeys: [],
    removePhoto: false,
    linkEdits,
    newPhotos: [],
  };
}

export default function Feed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState<"idle" | "saving" | "deleting">("idle");
  const [actionError, setActionError] = useState("");
  const [armDelete, setArmDelete] = useState(false);
  const [filter, setFilter] = useState<DestinationId | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/feed", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Feed failed");
      setItems(json.items);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Feed failed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (item: FeedItem) => {
    if (openId === item._id) {
      setOpenId(null);
      setEdit(null);
    } else {
      setOpenId(item._id);
      setEdit(freshEdit(item));
    }
    setActionError("");
    setArmDelete(false);
  };

  const patchEdit = (p: Partial<EditState>) =>
    setEdit((e) => (e ? { ...e, ...p } : e));

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const additions = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (additions.length === 0) return;
    setEdit((e) => (e ? { ...e, newPhotos: [...e.newPhotos, ...additions] } : e));
  };

  async function save(item: FeedItem) {
    if (!edit || busy !== "idle") return;
    setBusy("saving");
    setActionError("");
    try {
      const uploads = await Promise.all(
        edit.newPhotos.map((p) => compressIfImage(p.file))
      );
      const form = new FormData();
      form.append("id", item._id);
      form.append("title", edit.title.trim());
      form.append("caption", edit.caption.trim());
      form.append("category", edit.category);
      form.append("emoji", edit.emoji.trim());
      form.append("color", edit.color.trim());
      form.append("embedUrl", edit.embedUrl.trim());
      form.append("projectUrl", edit.projectUrl.trim());
      form.append("order", edit.order.trim());
      form.append(
        "removeKeys",
        JSON.stringify(edit.removeKeys.filter((k) => k !== "__single__"))
      );
      form.append("removePhoto", edit.removePhoto ? "1" : "0");
      form.append(
        "mediaEdits",
        JSON.stringify(
          Object.entries(edit.linkEdits).map(([_key, v]) => ({ _key, ...v }))
        )
      );
      uploads.forEach((f) => form.append("files", f, f.name));

      const res = await fetch("/api/update", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");

      haptic();
      edit.newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
      setOpenId(null);
      setEdit(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy("idle");
    }
  }

  async function remove(item: FeedItem) {
    if (busy !== "idle") return;
    if (!armDelete) {
      setArmDelete(true);
      return;
    }
    setBusy("deleting");
    setActionError("");
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      haptic();
      setOpenId(null);
      setEdit(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy("idle");
      setArmDelete(false);
    }
  }

  const visible = items?.filter((i) => !filter || i._type === filter) ?? null;

  const inputCls =
    "min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent";

  return (
    <main className="flex min-h-[100svh] flex-col pt-[env(safe-area-inset-top)]">
      <header className="flex items-baseline justify-between px-6 pb-2 pt-4">
        <h1 className="font-heading text-3xl leading-none">
          Uploads<span className="text-accent">.</span>
        </h1>
        <Link href="/" className="min-h-tap py-2 text-sm text-ink/50">
          ← post
        </Link>
      </header>

      {/* type filter */}
      <div
        className="flex gap-2 overflow-x-auto px-6 pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {DESTINATIONS.map((d) => {
          const on = filter === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setFilter(on ? null : d.id)}
              className={`min-h-tap shrink-0 rounded-full px-4 text-sm transition-colors ${
                on
                  ? "bg-accent text-paper"
                  : "bg-transparent text-ink/50 shadow-[inset_0_0_0_1.5px_rgba(22,21,18,0.15)]"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {loadError && (
        <div className="px-6 py-4">
          <p className="text-sm text-accent">{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 min-h-tap text-sm underline"
          >
            retry
          </button>
        </div>
      )}

      {!items && !loadError && (
        <p className="px-6 py-10 text-center font-heading text-2xl italic text-ink/30">
          loading…
        </p>
      )}

      {visible && visible.length === 0 && (
        <p className="px-6 py-10 text-center font-heading text-2xl italic text-ink/30">
          nothing here yet
        </p>
      )}

      <div className="flex flex-col pb-[calc(env(safe-area-inset-bottom)+24px)]">
        {visible?.map((item) => {
          const isOpen = openId === item._id;
          const t = firstThumb(item);
          const photos = edit && isOpen ? existingPhotos(item) : [];
          const links =
            isOpen && item._type === "thingsILike"
              ? (item.media ?? []).filter((m) => m.type !== "photo")
              : [];
          return (
            <div key={item._id} className="border-b border-ink/10">
              {/* row */}
              <button
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-center gap-4 px-6 py-3 text-left active:bg-ink/[0.04]"
              >
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t}
                    alt=""
                    className="h-14 w-14 shrink-0 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-ink/[0.06] text-xl">
                    {item._type === "musicProject" ? (item.emoji || "🎵") : "🔗"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{itemTitle(item)}</p>
                  <p className="truncate text-xs text-ink/40">
                    {typeLabel(item._type)}
                    {itemSub(item) ? ` · ${itemSub(item)}` : ""}
                    {" · "}
                    {new Date(item._createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-ink/30">{isOpen ? "−" : "+"}</span>
              </button>

              {/* edit panel */}
              {isOpen && edit && (
                <div className="flex flex-col gap-1 px-6 pb-5">
                  {/* photos — tap × to mark for removal, ↩ to undo */}
                  <div className="grid grid-cols-4 gap-1.5 pb-2">
                      {photos.map((p) => {
                        const removed =
                          edit.removeKeys.includes(p._key) ||
                          (p._key === "__single__" && edit.removePhoto);
                        return (
                          <button
                            key={p._key}
                            type="button"
                            onClick={() => {
                              if (p._key === "__single__") {
                                patchEdit({ removePhoto: !edit.removePhoto });
                              } else {
                                patchEdit({
                                  removeKeys: removed
                                    ? edit.removeKeys.filter((k) => k !== p._key)
                                    : [...edit.removeKeys, p._key],
                                });
                              }
                            }}
                            className="relative aspect-square"
                            aria-label={removed ? "Keep photo" : "Remove photo"}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb(p.url)}
                              alt=""
                              className={`h-full w-full object-cover ${
                                removed ? "opacity-25" : ""
                              }`}
                            />
                            <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-paper">
                              {removed ? "↩" : "×"}
                            </span>
                          </button>
                        );
                      })}
                      {edit.newPhotos.map((p, i) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(p.url);
                            patchEdit({
                              newPhotos: edit.newPhotos.filter((_, j) => j !== i),
                            });
                          }}
                          className="relative aspect-square"
                          aria-label="Remove new photo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 bg-accent px-1 text-[10px] text-paper">
                            new
                          </span>
                          <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-paper">
                            ×
                          </span>
                        </button>
                      ))}
                      {/* add — fit takes one photo, so adding replaces */}
                      {(item._type !== "fit" || edit.newPhotos.length === 0) && (
                        <label className="flex aspect-square cursor-pointer items-center justify-center bg-ink/[0.06] text-2xl text-ink/40 active:bg-ink/[0.1]">
                          +
                          <input
                            type="file"
                            accept="image/*"
                            multiple={item._type !== "fit"}
                            className="hidden"
                            onChange={(e) => {
                              addPhotos(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  {item._type === "fit" && edit.newPhotos.length > 0 && (
                    <p className="pb-1 text-xs text-ink/40">
                      new photo will replace the current one
                    </p>
                  )}

                  {/* TIL link items */}
                  {links.map((m) => (
                    <div key={m._key} className="flex flex-col pb-1">
                      <p className="pt-1 text-xs text-ink/40">
                        {m.type === "music" ? "🎵 music link" : "🎬 video link"}
                        {edit.removeKeys.includes(m._key) && (
                          <span className="text-accent"> · will be removed</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="url"
                            inputMode="url"
                            autoCapitalize="off"
                            autoCorrect="off"
                            value={edit.linkEdits[m._key]?.linkUrl ?? ""}
                            onChange={(e) =>
                              patchEdit({
                                linkEdits: {
                                  ...edit.linkEdits,
                                  [m._key]: {
                                    linkUrl: e.target.value,
                                    linkTitle:
                                      edit.linkEdits[m._key]?.linkTitle ?? "",
                                  },
                                },
                              })
                            }
                            placeholder="Link URL"
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={edit.linkEdits[m._key]?.linkTitle ?? ""}
                            onChange={(e) =>
                              patchEdit({
                                linkEdits: {
                                  ...edit.linkEdits,
                                  [m._key]: {
                                    linkUrl: edit.linkEdits[m._key]?.linkUrl ?? "",
                                    linkTitle: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="Link title"
                            className={inputCls}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            patchEdit({
                              removeKeys: edit.removeKeys.includes(m._key)
                                ? edit.removeKeys.filter((k) => k !== m._key)
                                : [...edit.removeKeys, m._key],
                            })
                          }
                          className="min-h-tap px-2 text-ink/40"
                          aria-label="Remove link"
                        >
                          {edit.removeKeys.includes(m._key) ? "↩" : "×"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* TIL category */}
                  {item._type === "thingsILike" && (
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {TIL_CATEGORIES.map((c) => {
                        const on = edit.category === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              patchEdit({ category: on ? "" : c })
                            }
                            className={`min-h-tap shrink-0 rounded-full px-4 text-sm transition-colors ${
                              on
                                ? "bg-ink text-paper"
                                : "bg-transparent text-ink/50 shadow-[inset_0_0_0_1.5px_rgba(22,21,18,0.15)]"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* text fields */}
                  {item._type !== "thingsILike" && (
                    <input
                      type="text"
                      value={edit.title}
                      onChange={(e) => patchEdit({ title: e.target.value })}
                      placeholder={
                        item._type === "fit"
                          ? "Date"
                          : item._type === "designProject"
                            ? "Project name"
                            : "Title"
                      }
                      className={`${inputCls} text-lg`}
                    />
                  )}
                  {item._type === "musicProject" && (
                    <>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={edit.emoji}
                          onChange={(e) => patchEdit({ emoji: e.target.value })}
                          placeholder="Emoji"
                          maxLength={4}
                          className="min-h-tap w-28 border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
                        />
                        <label className="flex min-h-tap flex-1 cursor-pointer items-center gap-3 border-b-2 border-ink/15 py-2">
                          <input
                            type="color"
                            value={edit.color || "#FF4000"}
                            onChange={(e) => patchEdit({ color: e.target.value })}
                            className="h-9 w-9 shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0"
                          />
                          <span className={edit.color ? "text-ink" : "text-ink/30"}>
                            {edit.color || "Color"}
                          </span>
                          {edit.color && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                patchEdit({ color: "" });
                              }}
                              className="ml-auto min-h-tap px-2 text-ink/40"
                              aria-label="Clear color"
                            >
                              ×
                            </button>
                          )}
                        </label>
                      </div>
                      <input
                        type="url"
                        inputMode="url"
                        autoCapitalize="off"
                        autoCorrect="off"
                        value={edit.embedUrl}
                        onChange={(e) => patchEdit({ embedUrl: e.target.value })}
                        placeholder="untitled.stream embed URL"
                        className={inputCls}
                      />
                      <input
                        type="url"
                        inputMode="url"
                        autoCapitalize="off"
                        autoCorrect="off"
                        value={edit.projectUrl}
                        onChange={(e) => patchEdit({ projectUrl: e.target.value })}
                        placeholder="untitled.stream project URL"
                        className={inputCls}
                      />
                    </>
                  )}
                  <textarea
                    value={edit.caption}
                    onChange={(e) => patchEdit({ caption: e.target.value })}
                    placeholder={
                      item._type === "designProject"
                        ? "Type — Website, Album Cover…"
                        : item._type === "thingsILike"
                          ? "Caption"
                          : "Description"
                    }
                    rows={2}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={edit.order}
                    onChange={(e) =>
                      patchEdit({ order: e.target.value.replace(/[^0-9.]/g, "") })
                    }
                    placeholder="Order (optional)"
                    className="min-h-tap w-36 border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
                  />

                  {actionError && (
                    <p className="pt-1 text-sm text-accent">{actionError}</p>
                  )}

                  {/* actions */}
                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => save(item)}
                      disabled={busy !== "idle"}
                      className="min-h-[52px] flex-1 bg-ink font-medium text-paper transition-opacity active:opacity-90 disabled:opacity-25"
                    >
                      {busy === "saving" ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busy !== "idle"}
                      className={`min-h-[52px] px-5 font-medium transition-colors disabled:opacity-25 ${
                        armDelete
                          ? "bg-accent text-paper"
                          : "text-accent shadow-[inset_0_0_0_1.5px_#FF4000]"
                      }`}
                    >
                      {busy === "deleting"
                        ? "…"
                        : armDelete
                          ? "Sure?"
                          : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
