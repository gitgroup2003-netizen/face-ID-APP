# GIT GROUP — School Pickup Verification

GIT GROUP helps schools verify who's picking up a child at the gate. Admins
enroll a photo of each authorized guardian against a child; when someone
arrives, security captures a photo at the gate and the app matches it
against that gallery.

- **Face matching runs on-device** in the browser (`@vladmandic/face-api`) —
  no photo is ever sent to an external AI service.
- **Data is stored on your own server** (SQLite file + local `uploads/`
  folder), so the Admin Portal and the Gate Scanner share the same gallery.

## How it works

1. **Admin Portal** (`/#admin`) — add a child to the roster, then enroll each
   authorized guardian: capture their photo with a camera or upload an
   existing photo (e.g. one a parent sent in). The app checks a face can be
   found in the photo before it lets you save it.
2. **Gate Scanner** (`/#gate`) — security opens the camera, frames the
   visitor's face, and presses "Scan arrival." The captured face is compared
   against every enrolled guardian:
   - **VERIFIED** — shows the matched guardian's badge (name, relationship,
     which child) with a confidence score.
   - **NOT ON FILE** — no enrolled guardian matched; the app tells the guard
     to verify identity manually rather than release the child.
   - Every scan (matched or not) is logged with a timestamp for the
     school's records.

## Run in GitHub Codespaces (no local install needed)

1. Push this project to a GitHub repository (create one, then in this
   folder: `git init`, `git add .`, `git commit -m "GIT GROUP"`,
   `git remote add origin <your repo URL>`, `git push -u origin main`).
2. On the repo page, click **Code → Codespaces → Create codespace on main**.
   Codespaces will build the environment and run `npm install`
   automatically (takes a minute or two the first time).
3. Once it's ready, open the terminal (it's usually already open at the
   bottom) and run:
   ```
   npm run dev
   ```
4. Codespaces will pop up a notification that port 3000 is forwarded —
   click **Open in Browser**. That gives you an `https://...githubdev...`
   URL, which is required for the browser to allow camera access.
5. Allow camera access when prompted.

Each time you come back to the codespace, you only need to run
`npm run dev` again — dependencies are already installed.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```
2. Start both the API server and the web app together:
   ```
   npm run dev
   ```
   This runs the Express + SQLite API on `:3001` and the Vite dev server on
   `:3000` (proxying `/api` and `/uploads` to the API). Open
   `http://localhost:3000`.
3. Allow camera access when prompted — a webcam (or a phone/tablet camera)
   is required for both enrollment and scanning.

## Production build

```
npm run build   # builds the frontend into dist/
npm start       # serves the API + built frontend together on :3000
```

Guardian photos are saved to `uploads/`, and all data lives in
`data/gitgroup.sqlite` — back up that folder (or point it at persistent
storage) when you deploy so the roster survives restarts.

## Notes on accuracy

- Enroll guardians with a clear, front-facing, well-lit photo — this is what
  the gate scan gets compared against.
- The match threshold is intentionally strict (a false "match" is the
  costly failure mode at a school gate). If a legitimate guardian is
  rejected, try re-enrolling their photo in better lighting.
- This is a decision-support tool for the security guard, not a replacement
  for their judgment — a "NOT ON FILE" result should always be followed up
  with a manual ID check, and any edge case should be escalated to the
  admin.
