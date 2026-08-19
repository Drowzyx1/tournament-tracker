# Tournament Tracker

A full-stack web app for tracking expenses and earnings across card game trips
and tournaments. Each person creates their own email/password account and
only ever sees their own trips.

Built as an upgrade from a single-file HTML prototype into a real app with a
database, authentication, and multi-user support — see `DEPLOY.md` for how to
put it online so friends can use it too.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — the frontend pages and the REST-ish
  API routes live in one codebase.
- **PostgreSQL** — relational database. Schema has `User`, `Trip`, and
  `Transaction` tables.
- **Prisma** — type-safe ORM and migration tool. `prisma/schema.prisma` is the
  single source of truth for the database schema.
- **NextAuth.js (Auth.js) v4** — email/password (credentials) sign-in, JWT
  sessions, no external auth provider or API key required. Passwords are
  hashed with bcrypt and stored in our own `User` table.

Suggested resume line:

> Built a full-stack expense/earnings tracker with Next.js, PostgreSQL, and
> Prisma ORM; implemented password-based authentication with bcrypt-hashed
> credentials and a normalized multi-user schema; deployed on Vercel with a
> hosted Postgres database.

## How the data is modeled

```
User (email + hashed password)
  └── Trip (a trip or tournament, e.g. "Regionals - Dallas")
        └── Transaction (an EXPENSE or an EARNING: description, amount, date,
              optional notes, optional screenshot/receipt attachment)
```

Every `Trip` belongs to exactly one `User`, and every `Transaction` belongs to
exactly one `Trip`. All API routes filter by the signed-in user's id, so one
person can never see or edit another person's trips — that's what makes this
safe for your friends to use with their own accounts.

## Project structure

```
app/
  page.tsx                    Sign-in / sign-up landing page
  dashboard/page.tsx          Server component: loads the user's trips, renders <Dashboard>
  api/
    auth/[...nextauth]/       NextAuth route handler (credentials sign-in)
    auth/signup/               POST — create a new account
    trips/                    GET (list) / POST (create)
    trips/[id]/               PATCH (rename/date) / DELETE
    trips/[id]/transactions/  POST (add expense or earning)
    transactions/[id]/        DELETE
components/
  Dashboard.tsx                The interactive UI: sidebar, trip detail, forms
  AuthForm.tsx / SignOutButton.tsx / Providers.tsx
lib/
  prisma.ts                   Prisma client singleton
  auth.ts                     NextAuth configuration (credentials provider)
  types.ts                    Shared TypeScript types
prisma/
  schema.prisma                Database schema
```

## Local development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Get a Postgres database.** Easiest free option: [Neon](https://neon.tech)
   or [Supabase](https://supabase.com) — create a project and copy the
   connection string. (Full walkthrough in `DEPLOY.md`.)

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL` with your connection string. For local dev you can
   leave `NEXTAUTH_URL` as `http://localhost:3000`. Generate a secret:

   ```bash
   openssl rand -base64 32
   ```

   and paste it into `NEXTAUTH_SECRET`. No other secrets are needed — sign-in
   is email/password against your own database.

4. **Push the schema to your database**

   ```bash
   npx prisma db push
   ```

5. **(Optional) Seed a test account**

   Creates a ready-to-use login with a couple of sample trips, instead of
   signing up by hand every time you reset your database:

   ```bash
   npm run db:seed
   ```

   Logs in as `test@example.com` / `password123`.

6. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Known simplifications (fair game to bring up in an interview)

- Money amounts are stored as `Float` for simplicity. In a production finance
  app you'd normally store cents as an `Int` or use `Decimal` to avoid
  floating-point rounding issues.
- Screenshot/receipt attachments are stored as base64 directly in Postgres
  (see `lib/attachments.ts`, capped at 5MB) rather than in dedicated file
  storage — simplest option with no extra service to set up, but it isn't
  how you'd want it at real scale.
- No test suite yet — a good next step would be adding integration tests for
  the API routes (e.g. with Vitest + a test database) to demonstrate testing
  practices.
- No offline/optimistic UI beyond a simple error banner — mutations wait for
  the server response before updating the screen.
