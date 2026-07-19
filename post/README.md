# Post.

One screen. Pick media, title it, tag it, publish to Sanity. Built for a thumb on a phone.

## File tree

```
post/
├── app/
│   ├── api/
│   │   ├── login/route.ts      # password → httpOnly session cookie
│   │   └── publish/route.ts    # asset upload → document create (server-side token)
│   ├── login/page.tsx          # the password gate
│   ├── globals.css
│   ├── layout.tsx              # fonts, PWA meta, viewport
│   ├── manifest.ts             # PWA manifest
│   └── page.tsx
├── components/
│   ├── Composer.tsx            # the whole app, basically
│   └── SwRegister.tsx          # registers the service worker
├── lib/
│   ├── auth.ts                 # session token hashing (edge-safe)
│   ├── compress.ts             # client-side image compression
│   ├── destinations.ts         # ← the four site sections + TIL categories
│   └── haptics.ts              # vibrate on Android, switch-hack on iOS
├── public/
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── sw.js                   # network-first, never caches /api
├── middleware.ts               # gates everything behind the cookie
└── (config files)
```

No new schema needed — publishing creates documents of your existing types
(`musicProject`, `fit`, `designProject`, `thingsILike`), mapped like this:

| Pill | Creates | Title field → | Caption field → |
|---|---|---|---|
| music | `musicProject` | `title` | `desc` (notes) |
| fit | `fit` | `date` (blank = today, e.g. "July 19, 2026") | `desc` |
| design | `designProject` | `name` | `type` |
| things i like | `thingsILike` | — (no title) | `caption` (+ category pills) |

The photo lands in each type's image field (`photos[0]`, `photo`, `images[0]`,
or `media[0]`). New docs have no `order`, so drag them into place in Studio
if position matters.

## Env vars

| Var | Value | Where to get it |
|---|---|---|
| `SANITY_PROJECT_ID` | `hk3szrp3` | Your project. Already filled in `.env.example`. |
| `SANITY_DATASET` | `production` | Your only dataset. |
| `SANITY_API_TOKEN` | *(secret)* | [sanity.io/manage](https://sanity.io/manage) → youfoundmikey → **API** → **Tokens** → Add API token, permissions **Editor**. Shown once — copy it then. |
| `APP_PASSWORD` | *(make one up)* | The word you type on your phone. Once a year, roughly. |

All four are server-side only. Nothing sensitive ever ships to the client.

## Run locally

```bash
cd post
npm install
cp .env.example .env.local   # then fill in the two blanks
npm run dev
```

## Deploy to Vercel

1. Commit and push (the repo root already has git).
2. [vercel.com/new](https://vercel.com/new) → import the repo → set **Root Directory** to `post/`. Framework auto-detects as Next.js.
3. Add the four env vars under **Settings → Environment Variables** (Production).
4. Deploy. Open the URL on your phone in Safari.
5. Share button → **Add to Home Screen**. Opens fullscreen, standalone, no browser chrome.

Or from the terminal: `cd post && npx vercel --prod` and answer the prompts.

## Behavior notes

- Photos only — your four sections all store images. Videos on the site are
  links (Things I Like), not uploads, so there's nothing to upload them into.
- Draft text (title, caption, destination, category) saves to localStorage on
  every keystroke.
  iOS killing the tab costs you nothing but the file pick.
- Upload progress is real (`XMLHttpRequest.upload.onprogress`), rendered as a
  fill inside the Publish button itself.
- Failure keeps all state and turns the button into **Retry**.
- Success is a haptic tick and an empty form. No toast, no modal, no confetti.
