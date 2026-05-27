# AE Zero Dashboard — Setup Guide

Internal sales closure dashboard for managing solar quotes, utility capacity requests, and final invoice generation.

---

## Directory Structure

```
ae-zero/
├── Site/ae-zero/        ← Public website (calculator, projects)
└── dashboard/           ← This project (internal CRM dashboard)
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 20+ (for running CLI commands outside Docker)

---

## Step 1 — Environment Variables

Copy the example file and fill in the blanks:

```bash
copy .env.local.example .env.local
```

Required values to fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Keep default for Docker dev |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3001` for dev |
| `DASHBOARD_SEED_KEY` | Any secret string — delete after first admin is created |
| `AWS_ACCESS_KEY_ID` | Hostinger env vars / AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | Hostinger env vars (only shown once at IAM key creation) |
| `S3_BUCKET_NAME` | `ae-zero-quotes-prod-ap-south-1-471112748080-ap-south-1-an` |
| `AWS_REGION` | `ap-south-1` |
| `SMTP_PASS` | Hostinger env vars |

---

## Step 2 — Start Docker

Starts MySQL (port 3307) and the Next.js dev server (port 3001) with hot reload:

```bash
docker-compose up --build
```

To run in background:

```bash
docker-compose up --build -d
```

Check logs:

```bash
docker-compose logs -f app
docker-compose logs -f mysql
```

---

## Step 3 — Push Database Schema

Run inside the app container (MySQL must be healthy first):

```bash
docker-compose exec app npm run db:push
```

This creates all tables (`users`, `closure_forms`, `activity_logs`) in MySQL.

To inspect the database visually:

```bash
docker-compose exec app npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555`.

---

## Step 4 — Seed First Admin User

The seed endpoint only works while `DASHBOARD_SEED_KEY` is set in `.env.local`.

**Using PowerShell:**

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/dashboard/seed" `
  -ContentType "application/json" `
  -Body '{"name":"Admin","email":"admin@ae-zero.com","password":"YourPassword123!","secretKey":"AEZeroSeed2026!"}'
```

**Using curl (Git Bash / WSL):**

```bash
curl -X POST http://localhost:3001/api/dashboard/seed \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@ae-zero.com","password":"YourPassword123!","secretKey":"AEZeroSeed2026!"}'
```

Expected response:

```json
{
  "user": { "id": "...", "email": "admin@ae-zero.com", "name": "Admin", "role": "admin" },
  "message": "Admin created. Remove DASHBOARD_SEED_KEY from env now."
}
```

**After success — remove the seed key from `.env.local`:**

```env
# DASHBOARD_SEED_KEY=AEZeroSeed2026!   ← comment out or delete this line
```

Then restart the app container:

```bash
docker-compose restart app
```

---

## Step 5 — Sign In

Open `http://localhost:3001` → redirects to `/login`.

Use the email and password from Step 4.

---

## Adding More Users

Log in as admin → **Users** (sidebar) → **Add User**.

Roles:
- **Admin** — full access including Users page and all activity logs
- **Agent** — can manage quotes and closures, sees only own activity log

---

## Closure Workflow (4 Steps)

```
Quotes list → Start Closure → Utility Email → Enter Capacity → Generate Invoice
```

| Step | Action |
|---|---|
| 1 | Click **Start Closure** on any quote — customer details pre-filled from the PDF |
| 2 | Enter customer Account No + Bill ID, select STELCO or FENAKA, click **Send to Utility** |
| 3 | When utility replies with max kWp, enter the value under **Step 3** |
| 4 | Select freight type (40ft for ≤30 kWp, 20ft for up to 90 kWp), click **Generate Invoice PDF** |

Invoice is uploaded to S3 under `invoices/YYYY/MM/` and a signed download link is returned (valid 1 hour).

---

## Pricing Tables

Prices are embedded in `src/lib/pricing.ts`. Two tables:

| Table | File source | Range |
|---|---|---|
| 20ft FCL | `May 19 On Grid upto 90kwp.xlsx` | 3–90 kWp |
| 40ft FCL | `40 feet final april 8 calc.xlsx` | 3–30 kWp |

Intermediate kWp values use linear interpolation. To update prices, edit `src/lib/pricing.ts` — the `PRICING_20FT` and `PRICING_40FT` objects.

---

## Production Deployment (Hostinger)

1. Add all `.env.local` variables to Hostinger → **Environment Variables**
2. Update `DATABASE_URL` to the Hostinger MySQL connection string
3. Update `NEXTAUTH_URL` to the production domain
4. Run `npm run db:push` against the production database once
5. Deploy — do **not** set `DASHBOARD_SEED_KEY` in production after initial setup

---

## Stopping Docker

```bash
docker-compose down          # stops containers, keeps DB data
docker-compose down -v       # stops containers AND wipes DB volume (fresh start)
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Cannot find module 'autoprefixer'` | Run `npm install` inside the container |
| `prisma generate` fails on Docker build | Ensure `prisma/schema.prisma` is present before build |
| `Unauthorized` on all API calls | Check `NEXTAUTH_SECRET` is set and matches between restarts |
| S3 errors | Confirm `AWS_SECRET_ACCESS_KEY` is filled in `.env.local` |
| MySQL connection refused | Wait for the `mysql` container healthcheck to pass, then retry |
