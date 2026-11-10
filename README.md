# HER LITTLE UNIVERSE ❤️

A dreamy romantic website with an interactive memory book and a private daily love mailbox.

## What's included

- The site opens directly into the main world; the separate cinematic intro/front page has been removed.
- The placeholder MP4 is now a subtle full-screen background video behind the main website.
- The background video plays, freezes on its final frame for 4.5 seconds, then starts again.
- Existing homepage, navigation, interactive keepsake photo book and placeholder memories are preserved.
- Month-wise daily mailbox with a tiny envelope for every date.
- Supabase email/password sign-in and role-based access (administrator and viewer).
- Daily text, audio, video and multiple-image entries saved in Supabase Database and private Storage.
- In-browser audio/video recording where the browser supports MediaRecorder.
- Private media playback using temporary signed URLs, plus download and copy controls.
- Administrator delete control removes the database entry and its uploaded media from Storage.
- Birthday unlock is enforced by Supabase Row Level Security, not only by front-end JavaScript.
- The viewer gets read-only access on/after the configured birthday. Uploading is disabled for the administrator after that date; administrator deletion remains available.

## Run locally

1. Extract the ZIP.
2. Open the project folder in VS Code.
3. Follow `SETUP_SUPABASE.md` to create and configure your Supabase project.
4. Start Live Server from `index.html`.

## Important

The project code and SQL schema are prepared, but the website cannot connect to your personal Supabase project until you enter its Project URL and anon/public key in `supabase-config.js`, run `supabase/schema.sql`, create both Auth users and assign their roles. The birthday is intentionally set to `2099-12-31` in the SQL seed as a safe locked default; replace it with the correct birthday before launch.

Never put a Supabase `service_role` key in browser code. The anon/public key is designed for browser use when Row Level Security is configured correctly.

## Main files

- `index.html` — main website and mailbox markup
- `css/style.css` — existing website styling plus background video layer
- `css/daily-mailbox.css` — mailbox and account UI
- `js/background-video.js` — delayed background-video replay
- `js/daily-mailbox.js` — Supabase auth, uploads, playback, downloads and deletion
- `supabase-config.js` — Project URL and anon/public key placeholders
- `supabase/schema.sql` — tables, private Storage bucket and Row Level Security policies
- `SETUP_SUPABASE.md` — complete Supabase setup and testing instructions


## Supabase project configuration

The provided Supabase Project URL and publishable browser key are configured in `supabase-config.js`. Run `supabase/schema.sql` in the Supabase SQL Editor. The archive unlock date is configured as **2027-04-23** (Asia/Kolkata), based on the supplied birthday `2008-04-23`. Create the admin and viewer Auth users and assign their UUIDs as described in `SETUP_SUPABASE.md`. Never place a service-role key in frontend code.


## Separate pages
The site is now split into five separate pages: `index.html` (Home), `memories.html` (Memories), `daily-letters.html` (Daily Letters), `little-surprises.html` (Little Surprises), and `note.html` (A Note for You). The navigation links move between pages instead of scrolling through one long page. Keep all files and folders together when hosting on GitHub Pages.


## ME, ALWAYS HERE
A new prototype page is available at `me-always-here.html`. See `ME_ALWAYS_HERE_IMPLEMENTATION.md` for the agreed requirements and the secure production integration plan. The AI, cloned voice, live avatar and real-time services are not connected in this prototype.


## ME, ALWAYS HERE — AI chat brain

The ME, ALWAYS HERE page now includes a Supabase-backed AI chat integration. Apply `supabase/ai-brain.sql`, deploy `supabase/functions/me-always-here`, and configure the private `OPENAI_API_KEY` Edge Function secret by following `ME_ALWAYS_HERE_IMPLEMENTATION.md`. The browser uses the existing Supabase publishable key and never receives the model API key. Chat history and approved memories are private and protected by Row Level Security.

The AI chat requires an authenticated account present in `hlu_members`. It supports English, conversational Tamil and Tanglish response matching. Speak mode remains a future integration; this release does not include voice cloning, live calls or an avatar.
