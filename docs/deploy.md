# Deploying Apex LSAT to the cloud (Supabase + Vercel)

Goal: one database in the cloud, the app reachable from your phone anywhere, your laptop pointed at the same data so the AI tutor (which runs through your local `claude` login) sees the same history.

Cost: $0 on Supabase Free + Vercel Hobby. Supabase pauses a free project after 7 idle days; one click restores it (or Pro, $25/mo, never pauses).

## 0. What you need
- The GitHub repo `brianyu18/apex-lsat` (private).
- A Supabase account (org **KORGI** already exists).
- A Vercel account (sign in with GitHub).
- Optional: an Anthropic API key, only if you want the tutor to work in the cloud rather than on the laptop.

## 1. Database (Supabase) — already created
Project **apex-lsat** (ref `wvktfgjmwosjtkuxvzrn`, org KORGI, us-west-1) exists with the schema applied, RLS on, and the full bank loaded (411 LR, 48 RC passages / 313 Qs). What's left is yours because it involves the database password:
1. supabase.com → apex-lsat → Project Settings → **Database** → *Reset database password* → save it in your password manager.
2. Top bar **Connect** → copy two strings, replacing `[YOUR-PASSWORD]`:
   - **Transaction pooler** (port 6543) → `DATABASE_URL` (Vercel and laptop).
   - **Session pooler** (port 5432) → `DATABASE_URL_DIRECT` (laptop only, for `pnpm cloud:setup`).
3. Values you'll also need (no secrets):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://wvktfgjmwosjtkuxvzrn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_Q7XYLF_cetpl8In6PafixQ_fDM1bDAK`
4. After step 3 below gives you the Vercel URL: Authentication → **URL configuration** → Site URL = `https://<your-app>.vercel.app`, Redirect URLs += `https://<your-app>.vercel.app/**` and `http://localhost:3000/**`.

## 2. Laptop setup (once)
```bash
git clone git@github.com:brianyu18/apex-lsat.git && cd apex-lsat
pnpm install
cp .env.example .env.local          # fill in DATABASE_URL, DATABASE_URL_DIRECT, the two NEXT_PUBLIC_SUPABASE_* values, APEX_ALLOWED_EMAILS
pnpm cloud:setup                    # confirms migrations, finishes the security lock-down, reloads content (idempotent)
```
Run `pnpm cloud:setup` again whenever you pull new lessons or questions.

## 3. App (Vercel)
1. vercel.com → Add New → Project → Import `brianyu18/apex-lsat` (Framework: Next.js, defaults are fine; Node 22).
2. Environment variables (Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | the **transaction pooler** string (port 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `APEX_ALLOWED_EMAILS` | `p3nguindanc3@gmail.com` |
| `ANTHROPIC_API_KEY` | your key (console.anthropic.com → API keys); set a **$10 monthly limit** under Settings → Limits |
| `APEX_TUTOR_API_MODEL` | `claude-sonnet-5-5` (default) — or `claude-haiku-5-5` for the cheap tier |

3. Deploy. First visit → **Sign in** → enter your email → open the magic link on the same device. Anyone else's email is refused before a session is created.
4. Back in Supabase Authentication → URL configuration, set Site URL and add `https://<your-app>.vercel.app/**` to Redirect URLs (magic links need this).
5. On the phone: open the URL in Safari/Chrome → Share → **Add to Home Screen**. It installs as an app; the Drill page caches an offline pack automatically.

## 4. Laptop against the same database (for the tutor)
`.env.local` on the laptop holds the same `DATABASE_URL` plus the Supabase public values and `APEX_ALLOWED_EMAILS` (so the laptop has the same sign-in gate; leave `ANTHROPIC_API_KEY` out locally to use your subscription through `claude`). Then:
```bash
pnpm dev
```
Open http://localhost:3000 — same plan, same inbox, same analytics as the phone; the tutor runs through your local `claude` login at no API cost. (If you omit the Supabase public values locally, the sign-in gate is simply off.)

## 5. Day-to-day
- Content updates: `git pull && pnpm cloud:setup` (loads new lessons/questions), Vercel redeploys the app automatically on push.
- Backups: Supabase Free keeps no automatic backups. `pnpm cloud:backup` writes a JSON dump of your attempts, sessions, misses, skills, plan and settings to `backups/`; run it weekly or before any experiment.
- Spend: if you set an API key, set a monthly limit in the Anthropic console (Settings → Limits) — $10 covers heavy personal tutor use.

## Troubleshooting
- **"Too many connections"** → you used the direct (5432) string on Vercel; switch `DATABASE_URL` to the transaction pooler (6543).
- **Magic link opens to a 404 / "invalid"** → Site URL or Redirect URLs in Supabase don't match the Vercel domain.
- **Project paused** → Supabase dashboard → Restore. Nothing is lost.
- **Tutor says "available on your laptop"** → expected without an API key; run the app locally for tutor sessions.
