# 200 Languages, One Love — feature notes

This is an additive feature. Existing pages and features remain in place.

## What's included

- A new `language-book.html` page using the site's existing header, background video, fonts, footer and overall pink/lavender visual language.
- A matching home-page teaser and navigation link.
- One reusable, decorated book-page template for all 200 languages.
- Page-turn animation, previous/next controls, mobile swipe and keyboard arrows.
- Original-language, Tamil and English audio controls, plus Tamil/English written translation toggles.
- An administrator upload modal with page number, language, opening phrase, poem, ending phrase, both translations and three audio files.
- Supabase table and private audio bucket migration in `supabase/language-book.sql`.
- The first three agreed language pages (Tamil, English and Malayalam) as initial preview content. Their audio buttons become active once their recordings are uploaded.

## One-time Supabase setup

Run the complete `supabase/language-book.sql` file in Supabase Dashboard → SQL Editor. It is a separate migration and does not replace `supabase/schema.sql` or the daily mailbox tables. It reuses the existing `hlu_members` roles and birthday access functions.

The administrator account must already exist in `hlu_members` with the `admin` role. The viewer can read published pages after the configured birthday, following the existing archive access policy.

## Upload a page

1. Open `language-book.html` and sign in with the authorized account.
2. Choose **Upload a page**.
3. Enter a page number from 1 to 200 and the language name.
4. Enter the opening phrase, poem and ending phrase.
5. Add the Tamil and English translations.
6. Select the original-language, Tamil and English voice recordings (up to 25 MB each).
7. Save. The page is published and appears in page-number order.

Reusing an existing page number updates that page. The page template is shared, so content changes never change the typography, colours or decoration. Audio uploads are stored privately; the page requests temporary playback URLs for authorized signed-in visitors.

## Deployment

Upload the project contents to the same GitHub Pages repository as before. No build step is required. Keep the existing `supabase-config.js` values and do not replace the existing database schema. Run the new SQL migration once before using the upload manager.
