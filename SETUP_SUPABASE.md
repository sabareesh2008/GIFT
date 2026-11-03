# Supabase setup — HER LITTLE UNIVERSE

This build uses a **private Supabase database and private Storage bucket**. The browser uses only the Supabase Project URL and anon/public key. Never put a `service_role` key in the website.

## 1. Prepare your existing Supabase project

1. Open your Supabase project at https://supabase.com/dashboard/project/znaxnxxzfxfxdifjsrio.
2. Open **SQL Editor**.
3. Open `supabase/schema.sql` from this ZIP, copy the entire file, paste it into a new SQL query and run it.
4. The schema creates the database tables, access policies and private Storage bucket.
5. The archive is configured to unlock on **23 April 2027** (Asia/Kolkata), the next occurrence of the supplied birthday 23 April 2008. After this date, Santhiya's access remains read-only.

## 2. Browser connection is already configured

The supplied Project URL and publishable public key are already saved in `supabase-config.js`. The publishable key is designed for browser use; database and Storage access are protected by the SQL policies. Never add a `service_role` or secret key to frontend files. If you rotate the publishable key later, update this file.

## 3. Confirm the birthday unlock date

The SQL schema sets the unlock date to `2027-04-23` in `Asia/Kolkata`. You do not need to change it unless you want a different unlock date.

The unlock is checked by Supabase using the `Asia/Kolkata` date.

## 4. Create the two login accounts

Create the accounts in **Authentication → Users → Add user**:

- Your account (administrator)
- Santhiya's account (viewer)

Use secure passwords and share them safely. Email/password sign-in is used by the website. If email confirmation is enabled, confirm the accounts before testing.

After creating each user, copy their **User UID** from the Auth Users page. Then run this in SQL Editor, replacing both UUID placeholders:

```sql
insert into public.hlu_members (user_id, role)
values ('YOUR-USER-UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;

insert into public.hlu_members (user_id, role)
values ('SANTHIYA-USER-UUID', 'viewer')
on conflict (user_id) do update set role = excluded.role;
```

Only your account should have the `admin` role. Santhiya must have `viewer` only.

## 5. Run and test

1. Open the project folder in VS Code.
2. Start Live Server from `index.html` (localhost is a secure context for camera/microphone recording).
3. Click **Sign in** and log in with your admin account.
4. The **Add today's love** button appears before the birthday.
5. Save a text note first. Confirm it remains after refreshing the page.
6. Upload a small image or voice recording and test playback/download.
7. Open a date and use **Delete this note**. The database row and its Storage media are deleted.
8. Sign out. Santhiya's viewer account cannot see the entries before the birthday.
9. For a safe unlock test, temporarily set the birthday to yesterday in SQL Editor, sign in with the viewer account and confirm read-only access. Then restore the actual birthday date.

## Security behaviour

- `hlu_daily_entries` has Row Level Security enabled.
- Media is stored in the private `hlu-daily-love` bucket.
- Only the administrator can insert or update entries before the birthday.
- Only the administrator can delete entries and their media.
- The viewer can read entries and media only on/after the configured birthday.
- The upload button disappears after the birthday, and Supabase policies also reject uploads even if someone tries to call the API directly.
- The viewer cannot upload, edit or delete.
- The site uses signed URLs for private media rather than public file links.

## Notes

- Maximum individual file size in this setup: 100 MB.
- Camera/microphone recording requires HTTPS or localhost and browser permission.
- GitHub Pages provides HTTPS.
- Do not publish private recordings before the database, Auth users, roles and birthday have been configured and tested.
