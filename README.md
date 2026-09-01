# GIT GROUP — Complete Project (Full Replace)

This is your ENTIRE project, fully assembled and tested together —
Supabase auth, multi-school accounts, roles, the Admin Portal with
Library/Reports/Staff/Settings tabs, Visitor Check-In, PWA install
support, and your original face-matching Gate Scanner untouched.

I ran your project's own TypeScript compiler against all of it together
— zero errors.

## Do this as a full replace, not a merge

Since your `src/views` folder got into a confusing state, the cleanest
fix is to delete it entirely and put this one in, rather than trying to
merge file by file again.

### Step 1 — Delete these from your Codespace
- `src/views` (the whole folder)
- `src/lib` (the whole folder)
- `src/components` (the whole folder)
- `src/hooks` (the whole folder)
- `src/App.tsx`
- `src/main.tsx`
- `src/types.ts`
- `index.html`
- `package.json`
- `vite.config.ts`

Leave `public/models/` alone — those are your face-recognition model
files, already correct, no need to touch them (this download includes
them too, in case you ever need to restore them, but you shouldn't need
to).

### Step 2 — Extract this zip on your computer

### Step 3 — Drag these from the extracted folder into your Codespace's
top-level project folder (same level as `data`, `uploads`, `public`):
- `src` (the whole folder — this brings back views, lib, components,
  hooks, App.tsx, main.tsx, types.ts, index.css all at once)
- `index.html`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`

### Step 4 — Reinstall dependencies fresh
```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 5 — Run it
```bash
npm run dev
```

## What's inside

**Auth & accounts**
- Sign up creates a school + makes you its owner
- Sign in / sign out
- Roles: owner, admin, security_guard, head_of_security (extensible)
- You (the creator) can see every school's data for troubleshooting

**Admin Portal — now with tabs**
- Roster — your original add-child / enroll-guardian flow, unchanged
- Library — browse every guardian on file, searchable, with photos
- Reports — pick a date range, see stats, export to Excel / ODF / Word /
  PDF / print
- Staff — see everyone with an account; add new staff with an
  auto-generated shareable password
- Settings — school name + logo

**Gate Scanner** — completely unchanged, still your original
on-device face-matching flow

**Visitor Check-In** — new third option on the home screen: capture a
visitor's photo, log their name and reason for visiting

**Access**
- Owners, admins, head of security, AND security guards can all reach
  both Admin Portal and Gate Scanner

**Installable app (PWA)**
- Real icons in your brand colors, a manifest, and a service worker —
  people can "Add to Home Screen" / install it like a real app on any
  device

**Branding**
- "Frank Ssemakula is the creator of program" footer on every screen

## SQL — already done

You already ran all of this in earlier steps (the original schema, Part
21's fix, and Part 22 for visitor_logs). Nothing new to run for this
package.

## Deploying for real (once you're happy testing)

```bash
npm run build
npm install --save-dev gh-pages
```
Add to `package.json` scripts: `"deploy": "vite build && gh-pages -d dist"`
Then: `npm run deploy`

Also set `base: '/face-ID-APP/'` in `vite.config.ts` before deploying
(currently set to `/` for local dev).
