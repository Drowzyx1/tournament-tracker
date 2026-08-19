# Deploy guide

This walks you through putting Tournament Tracker online for free, so you and
your friends can each create an account and sign in with email + password.
Total time is around 10 minutes the first time.

You'll set up two things: a hosted Postgres database and a Vercel deployment.
There's no external auth provider to configure — sign-in is handled entirely
by your own database.

## 1. Create a free Postgres database (Neon)

1. Go to https://neon.tech and sign up (free tier is plenty for this app).
2. Create a new project. Any region close to you is fine.
3. On the project dashboard, find the **connection string** (it looks like
   `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`).
   Copy it — you'll need it twice (local `.env` and Vercel env vars).

   (Supabase is a fine alternative if you'd rather use that — same idea,
   copy the connection string from Project Settings > Database.)

## 2. Push the database schema

With the connection string in your local `.env` as `DATABASE_URL`:

```bash
npm install
npx prisma db push
```

This creates all the tables (`User`, `Trip`, `Transaction`) in your new
database. You can browse the data anytime with:

```bash
npx prisma studio
```

## 3. Deploy to Vercel

1. Push this project to a GitHub repository (create a new repo on GitHub,
   then from this folder):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/tournament-tracker.git
   git push -u origin main
   ```

2. Go to https://vercel.com, sign in with GitHub, and click **Add New →
   Project**. Import the repo you just pushed.

3. Before deploying, expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon/Supabase connection string |
   | `NEXTAUTH_URL` | leave blank for now, or set to `https://<project-name>.vercel.app` if you already know it |
   | `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |

4. Click **Deploy**. Vercel will run `npm install` and `npm run build`
   (which also runs `prisma generate`).

5. Once deployed, copy your real URL (e.g.
   `https://tournament-tracker-xyz.vercel.app`).

   - In Vercel: **Project Settings → Environment Variables**, set
     `NEXTAUTH_URL` to that exact URL, then redeploy (**Deployments → ⋯ →
     Redeploy**) so the new value takes effect.

6. Visit your live URL, click **Create Account**, and sign up with an email
   and password. You should land on the dashboard.

## 4. Let your friends in

Since sign-in is email/password against your own database and the app is
multi-user by design, anyone you send the link to can create their own
account (**Create Account** tab) and get their own private set of trips — no
extra setup needed on your end, no allowlist, no test-user approval.

## Redeploying after changes

Any time you `git push` to `main`, Vercel automatically rebuilds and
redeploys. If you change `prisma/schema.prisma`, run `npx prisma db push`
again (pointed at your production `DATABASE_URL`) before or after deploying
so the live database matches the new schema.

## Troubleshooting

- **"Error: P1001 Can't reach database server"** during `prisma db push` —
  double check the connection string, and that it includes `?sslmode=require`
  for Neon/Supabase.
- **"An account with that email already exists"** — sign in instead of
  signing up, or use a different email.
- **Works locally but not on Vercel** — check that all three environment
  variables (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) are set in
  Vercel (Project Settings → Environment Variables) and that you redeployed
  after adding/changing any of them.
