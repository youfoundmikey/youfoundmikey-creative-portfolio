"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DESTINATIONS,
  TIL_CATEGORIES,
  type DestinationId,
} from "@/lib/destinations";
import { compressIfImage } from "@/lib/compress";
import { haptic } from "@/lib/haptics";

const DRAFT_KEY = "post-draft";
const SIZE_WARN = 4 * 1024 * 1024; // Vercel bodies cap at 4.5MB — warn near it

type Status = "idle" | "compressing" | "uploading" | "error";

interface Picked {
  file: File;
  url: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Composer() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [dest, setDest] = useState<DestinationId | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // music-only fields — mirrors the Music Project schema in Studio
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  // things-i-like media kind — photo upload or music/video link
  const [tilKind, setTilKind] = useState<"photo" | "music" | "video">("photo");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  // every section has an optional order number
  const [order, setOrder] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const destination = DESTINATIONS.find((d) => d.id === dest) ?? null;

  // ---- draft persistence: backgrounding the browser never eats your words
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.caption === "string") setCaption(d.caption);
        if (DESTINATIONS.some((x) => x.id === d.dest)) setDest(d.dest);
        if (typeof d.category === "string") setCategory(d.category);
        if (typeof d.emoji === "string") setEmoji(d.emoji);
        if (typeof d.color === "string") setColor(d.color);
        if (typeof d.embedUrl === "string") setEmbedUrl(d.embedUrl);
        if (typeof d.projectUrl === "string") setProjectUrl(d.projectUrl);
        if (["photo", "music", "video"].includes(d.tilKind)) setTilKind(d.tilKind);
        if (typeof d.linkUrl === "string") setLinkUrl(d.linkUrl);
        if (typeof d.linkTitle === "string") setLinkTitle(d.linkTitle);
        if (typeof d.order === "string") setOrder(d.order);
      }
    } catch {
      /* corrupt draft — start clean */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          title,
          caption,
          dest,
          category,
          emoji,
          color,
          embedUrl,
          projectUrl,
          tilKind,
          linkUrl,
          linkTitle,
          order,
        })
      );
    } catch {
      /* storage full or private mode — nothing to do */
    }
  }, [title, caption, dest, category, emoji, color, embedUrl, projectUrl, tilKind, linkUrl, linkTitle, order]);

  // keep the caption textarea's height honest after restoring a draft
  useEffect(() => {
    const el = captionRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [caption]);

  // ---- file selection + previews
  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const additions = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (additions.length === 0) return;
    setPicked((prev) => [...prev, ...additions]);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const removeFile = useCallback((index: number) => {
    setPicked((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setPicked((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  // Photo optional for music (embed-first) and for TIL link items (no image field)
  const isTilLink = dest === "thingsILike" && tilKind !== "photo";
  const photoRequired = dest !== "musicProject" && !isTilLink;

  const totalSize = picked.reduce((sum, p) => sum + p.file.size, 0);

  // ---- publish
  async function publish() {
    if (!destination || status === "uploading") return;
    if (photoRequired && picked.length === 0) return;
    if (destination.titleRequired && !title.trim()) return;
    if (isTilLink && !linkUrl.trim()) return;

    setErrorMsg("");
    let uploads: File[] = [];
    if (picked.length > 0 && !isTilLink) {
      setStatus("compressing");
      uploads = await Promise.all(picked.map((p) => compressIfImage(p.file)));
    }

    setStatus("uploading");
    setProgress(0);

    const form = new FormData();
    uploads.forEach((f) => form.append("files", f, f.name));
    form.append("destination", destination.id);
    form.append("title", title.trim());
    form.append("caption", caption.trim());
    form.append("category", category ?? "");
    form.append("emoji", emoji.trim());
    form.append("color", color.trim());
    form.append("embedUrl", embedUrl.trim());
    form.append("projectUrl", projectUrl.trim());
    form.append("tilType", tilKind);
    form.append("linkUrl", linkUrl.trim());
    form.append("linkTitle", linkTitle.trim());
    form.append("order", order.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/publish");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Success: buzz, wipe, done. Back to zero, ready for the next one.
        haptic();
        clearFiles();
        setDest(null);
        setTitle("");
        setCaption("");
        setCategory(null);
        setEmoji("");
        setColor("");
        setEmbedUrl("");
        setProjectUrl("");
        setTilKind("photo");
        setLinkUrl("");
        setLinkTitle("");
        setOrder("");
        setProgress(0);
        setStatus("idle");
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        let msg = "Publish failed";
        try {
          msg = JSON.parse(xhr.responseText).error || msg;
        } catch {}
        setErrorMsg(msg);
        setStatus("error"); // form state untouched — just hit retry
      }
    };

    xhr.onerror = () => {
      setErrorMsg("Network dropped. Everything's still here — retry.");
      setStatus("error");
    };

    xhr.send(form);
  }

  const canPublish =
    !!destination &&
    (!photoRequired || picked.length > 0) &&
    (!destination.titleRequired || !!title.trim()) &&
    (!isTilLink || !!linkUrl.trim()) &&
    status !== "uploading";

  return (
    <main className="flex min-h-[100svh] flex-col pt-[env(safe-area-inset-top)]">
      {/* wordmark — the only thing that lives up top */}
      <header className="px-6 pb-2 pt-4">
        <h1 className="font-heading text-3xl leading-none">
          Post<span className="text-accent">.</span>
        </h1>
      </header>

      {/* ---- media area ---- */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={dest !== "fit"}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {picked.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mx-6 mt-2 flex min-h-[34svh] flex-col items-center justify-center bg-ink/[0.04] active:bg-ink/[0.08]"
          aria-label="Add photos"
        >
          <span className="font-heading text-5xl italic text-ink/30">tap</span>
          <span className="mt-1 text-sm text-ink/40">
            {isTilLink
              ? "links don't need a photo"
              : dest === "musicProject"
                ? "add photos (optional)"
                : dest === "fit"
                  ? "add a photo"
                  : "add photos — one or many"}
          </span>
        </button>
      ) : (
        <div className="mx-6 mt-2 grid max-h-[38svh] grid-cols-3 gap-1.5 overflow-y-auto">
          {picked.map((p, i) => (
            <div key={p.url} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper"
                aria-label={`Remove photo ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {dest !== "fit" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center bg-ink/[0.06] text-3xl text-ink/40 active:bg-ink/[0.1]"
              aria-label="Add more photos"
            >
              +
            </button>
          )}
        </div>
      )}

      {picked.length > 0 && (
        <p className="px-6 pt-2 text-xs text-ink/40">
          {picked.length} photo{picked.length > 1 ? "s" : ""} ·{" "}
          {fmtSize(totalSize)} · will compress before upload
          {dest === "fit" && picked.length > 1 && (
            <span className="text-accent">
              {" "}
              · fits take one photo — only the first will post
            </span>
          )}
          {totalSize > SIZE_WARN && (
            <span className="text-accent">
              {" "}
              · big upload — if it fails, try fewer photos
            </span>
          )}
        </p>
      )}

      {/* spacer pushes all interaction into thumb range */}
      <div className="flex-1" />

      {/* ---- destination: where on the site this lands ---- */}
      <div
        className="flex gap-2 overflow-x-auto px-6 pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {DESTINATIONS.map((d) => {
          const on = dest === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDest(on ? null : d.id)}
              className={`min-h-tap shrink-0 rounded-full px-5 text-sm transition-colors ${
                on
                  ? "bg-accent text-paper"
                  : "bg-transparent text-ink/60 shadow-[inset_0_0_0_1.5px_rgba(22,21,18,0.2)]"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* ---- TIL media kind: photo upload or music/video link ---- */}
      {dest === "thingsILike" && (
        <div
          className="flex gap-2 overflow-x-auto px-6 pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {(
            [
              ["photo", "📷 photo"],
              ["music", "🎵 music link"],
              ["video", "🎬 video link"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setTilKind(kind)}
              className={`min-h-tap shrink-0 rounded-full px-4 text-sm transition-colors ${
                tilKind === kind
                  ? "bg-accent text-paper"
                  : "bg-transparent text-ink/50 shadow-[inset_0_0_0_1.5px_rgba(22,21,18,0.15)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ---- TIL link fields ---- */}
      {isTilLink && (
        <div className="flex flex-col gap-1 px-6 pb-3">
          <input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={tilKind === "music" ? "Music link URL" : "Video link URL"}
            className="min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
          />
          <input
            type="text"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Link title"
            className="min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
          />
        </div>
      )}

      {/* ---- category: only for things i like, same list as the site ---- */}
      {dest === "thingsILike" && (
        <div
          className="flex gap-2 overflow-x-auto px-6 pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {TIL_CATEGORIES.map((c) => {
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(on ? null : c)}
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

      {/* ---- fields adapt to the destination ---- */}
      <div className="flex flex-col gap-1 px-6 pb-3">
        {destination?.titlePlaceholder !== null && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={destination?.titlePlaceholder ?? "Title"}
            enterKeyHint="next"
            className="min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 text-lg outline-none placeholder:text-ink/30 focus:border-accent"
          />
        )}
        {dest === "musicProject" && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Emoji"
                maxLength={4}
                className="min-h-tap w-28 border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
              />
              <label className="flex min-h-tap flex-1 cursor-pointer items-center gap-3 border-b-2 border-ink/15 py-2">
                <input
                  type="color"
                  value={color || "#FF4000"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0"
                />
                <span className={color ? "text-ink" : "text-ink/30"}>
                  {color || "Color"}
                </span>
                {color && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setColor("");
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
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="untitled.stream embed URL"
              className="min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
            />
            <input
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="untitled.stream project URL"
              className="min-h-tap w-full border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
            />
          </>
        )}
        <textarea
          ref={captionRef}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={destination?.captionPlaceholder ?? "Say something, or don't"}
          rows={1}
          className="min-h-tap w-full overflow-hidden border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
        />
        {destination && (
          <input
            type="text"
            inputMode="decimal"
            value={order}
            onChange={(e) => setOrder(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Order (optional)"
            className="min-h-tap w-36 border-b-2 border-ink/15 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
          />
        )}
      </div>

      {errorMsg && (
        <p className="px-6 pb-2 text-sm text-accent">{errorMsg}</p>
      )}

      {/* ---- publish: fixed to the bottom, above the home indicator ---- */}
      <div className="sticky bottom-0 bg-paper px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <button
          type="button"
          onClick={publish}
          disabled={!canPublish}
          className="relative min-h-[60px] w-full overflow-hidden bg-ink text-lg font-medium text-paper transition-opacity active:opacity-90 disabled:opacity-25"
        >
          {/* the button is the progress bar */}
          <span
            className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-200 ease-out"
            style={{ width: status === "uploading" ? `${progress}%` : "0%" }}
          />
          <span className="relative">
            {status === "uploading"
              ? `Uploading ${progress}%`
              : status === "compressing"
                ? "Compressing"
                : status === "error"
                  ? "Retry"
                  : destination
                    ? `Publish to ${destination.label}`
                    : "Publish"}
          </span>
        </button>
      </div>
    </main>
  );
}
