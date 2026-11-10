# ME, ALWAYS HERE — AI brain implementation

## What is implemented in this source

- Real model-generated chat replies through a Supabase Edge Function (OpenAI Chat Completions API).
- Backend-side language detection for Tamil script, Tanglish and English, with the detected language and same-register reply instruction sent to the model on every turn.
- A personality prompt for warm, affectionate, casual, direct communication. Pet names are explicitly limited to natural, occasional use.
- Persistent private conversation history in Supabase, scoped to the signed-in user.
- Approved-memory retrieval. The model receives only rows explicitly marked `approved = true`.
- A single profile row for personality instructions and optional approved style examples.
- Authentication and membership checks in both the browser and Edge Function; RLS policies protect the tables.
- Chat UI loading, connection, error and history-restore states.
- Browser read-aloud and browser speech-to-text where supported.

## Important accuracy note about the three examples

The uploaded ZIP did not contain three real conversation transcripts. The examples referred to in the request were not present as files or in the page source. I have therefore **not fabricated or seeded example conversations**. The AI starts with the general style requirements above. Add the three genuine examples to `hlu_ai_profile.style_examples` after reviewing/approving them. They are used as tone references, not as factual memory.

The currently available conversation context shows your short, lowercase, direct way of giving instructions, but it is not a substitute for three real conversations with your partner. Share those three examples to tune the voice more accurately.

## Deploy to the existing Supabase project

### 1. Apply the AI database schema

The existing website schema is preserved. In Supabase Dashboard → SQL Editor, run:

1. `supabase/ai-brain.sql`

This creates the AI profile, approved-memory, conversation and message tables and their RLS policies. Do not replace or rerun the original daily-letters schema just for this feature.

### 2. Configure the Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `OPENAI_API_KEY` — your private provider API key (never put it in `supabase-config.js` or any frontend file).
- `OPENAI_MODEL` — optional; defaults to `gpt-4o-mini`.
- `SITE_ORIGIN` — optional; set to your exact GitHub Pages/custom-domain origin for a restrictive CORS policy, for example `https://YOUR-USERNAME.github.io`.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. Do not add a service-role key to the frontend.

### 3. Deploy the function

Install/login to the Supabase CLI if needed, then from the project root run:

```bash
supabase functions deploy me-always-here --project-ref znaxnxxzfxfxdifjsrio
```

If deploying from another linked Supabase project, use that project's actual ref instead. Keep JWT verification enabled (the default). The function also validates the caller's JWT and checks `hlu_members`.

### 4. Add approved memories and style examples

Sign in with the existing administrator account. In SQL Editor, add only facts you have personally verified and are comfortable using in this AI. Replace the placeholders; do not run them unchanged:

```sql
-- Example shape only: replace the text with a verified fact.
insert into public.hlu_ai_memories
  (category, memory_text, event_date, approved, created_by)
values
  ('personality', 'REPLACE_WITH_A_VERIFIED_PERSONALITY_FACT', null, true, 'YOUR_ADMIN_AUTH_USER_UUID');
```

Allowed categories: `personality`, `life_detail`, `relationship`, `important_date`, `approved_conversation`. Use `event_date` only for a verified date. Unapproved rows are not sent to the AI.

To add the three approved writing examples, update the single profile row. Each item is an object with `label` and `text`:

```sql
update public.hlu_ai_profile
set style_examples = '[
  {"label":"Example 1","text":"PASTE_APPROVED_REAL_CONVERSATION_EXAMPLE_1"},
  {"label":"Example 2","text":"PASTE_APPROVED_REAL_CONVERSATION_EXAMPLE_2"},
  {"label":"Example 3","text":"PASTE_APPROVED_REAL_CONVERSATION_EXAMPLE_3"}
]'::jsonb
where id = true;
```

Do not include another person's private messages unless they have consented to this use. Prefer short excerpts and remove sensitive information. These examples guide style; they do not automatically become memories.

You can adjust the personality instructions here:

```sql
update public.hlu_ai_profile
set personality_instructions =
  'Write in a caring, affectionate, casual and direct way. Match English, conversational Tamil or Tanglish. Use dii, thangoo and my princess naturally but sparingly. Avoid formal Tamil and exaggerated romance.'
where id = true;
```

### 5. Run the website

Use VS Code Live Server or deploy the full folder to GitHub Pages. The page uses the same Supabase URL and publishable key already present in `supabase-config.js`. Existing Daily Letters authentication is reused; the user must be signed in and present in `hlu_members`.

## Testing checklist

After applying the SQL, setting secrets and deploying the Edge Function, test:

1. Sign in with each authorized account from Daily Letters, then open ME, ALWAYS HERE.
2. Send an English message, a Tamil-script message and a Tanglish message. Confirm the detected-language label and response language.
3. Refresh the page and confirm conversation history reloads.
4. Sign out and confirm the Edge Function refuses unauthenticated requests.
5. Sign in with an account not in `hlu_members` and confirm access is denied.
6. Add one approved test memory, ask about it, then mark it unapproved and confirm it is no longer provided as context.
7. Ask about an unknown personal event. The AI should say it does not have that memory rather than inventing one.
8. Temporarily remove the `OPENAI_API_KEY` secret and confirm the UI displays a configuration error; restore it afterward.
9. Open and test Home, Memories, Daily Letters, Little Surprises, A Note for You and ME, ALWAYS HERE.

## Scope and honest limitations

- This release implements the AI chat brain. Speak mode remains clearly marked as not yet connected; no live voice call, cloned voice, digital face or lip-sync is claimed.
- Browser speech recognition and read-aloud are convenience features and depend on browser/device language support. They are not voice cloning.
- Live Supabase deployment, provider billing, real account permissions and actual Tamil/Tanglish model quality cannot be verified from this local ZIP alone. Complete the deployment steps and run the checklist against your project.
- The project includes an existing public browser publishable key, which is intended for frontend use only when RLS is enabled. Rotate it if you believe it has been exposed beyond its intended use. Never expose a service-role key.
