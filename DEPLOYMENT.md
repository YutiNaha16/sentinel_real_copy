# SENTINEL — Deployment Guide (for the IT team)

This guide lets you host SENTINEL on your own server. The app ships with a **Docker package** so the whole stack — database, backend, and frontend — comes up together.

> **Note:** these Docker files are a **working template**. Review them and test in a staging environment before production, per your standards. The application code itself needs **no changes** to deploy — everything below is configuration.

---

## What you're deploying
Three parts, started together by Docker Compose:
- **db** — PostgreSQL database
- **api** — the backend (NestJS)
- **web** — the frontend (React), served by nginx, which also proxies `/api` to the backend

## Prerequisites
- A Linux server (or VM) with **Docker** and **Docker Compose** installed.
- Outbound HTTPS access (for the messaging provider, e.g. Twilio).

---

## Step-by-step

### 1. Get the code onto the server
Unzip the project (or `git clone` it) into a folder, e.g. `/opt/sentinel`.

### 2. Create the config file
```bash
cp .env.deploy.example .env
```
Edit `.env` and set at minimum:
- `POSTGRES_PASSWORD` — a strong database password
- `JWT_SECRET` — a long random string (`openssl rand -hex 32`)
- `PUBLIC_BASE_URL` — the address users will reach the app on (e.g. `https://sentinel.sodexo.com`). **This must be correct or the "Acknowledge" links in alerts won't work.**

Leave `EMAIL_PROVIDER=mock` for the first run (no real messages sent).

### 3. Build and start
```bash
docker compose up -d --build
```
This builds all three images, starts the database, applies the schema (migrations run automatically), and launches the app.

### 4. Seed the initial data (once)
Creates the starter roles, the IT/Cyber tree, incident types, and default configuration:
```bash
docker compose exec api npm run seed
```
Run this **only once**, on first setup.

### 5. Open the app
Go to `http://<server>:8080` (or whatever `WEB_PORT` you set / your domain). Log in with the seeded admin account and change the default passwords immediately.

---

## Connecting WhatsApp (your own account)

**Important:** WhatsApp is **configuration, not code.** The app already supports it — you just supply your own credentials. Do **not** expect to edit the source.

1. In your `.env`, set:
   ```
   EMAIL_PROVIDER=whatsapp
   TWILIO_ACCOUNT_SID=<your account SID>
   TWILIO_AUTH_TOKEN=<your auth token>
   TWILIO_WHATSAPP_FROM=whatsapp:<your WhatsApp Business sender number>
   ```
2. Restart the api: `docker compose up -d`

That's it — alerts now go out over **your** WhatsApp Business account. (Email or SMS/voice can be wired the same way — one setting.)

---

## Going to production — checklist
- [ ] Put it behind your **reverse proxy with HTTPS/TLS** (the app listens on plain HTTP internally); set `PUBLIC_BASE_URL` to the HTTPS domain.
- [ ] Use a **managed PostgreSQL** (or point `DATABASE_URL` at your DB) with **automated backups**.
- [ ] Set a **strong `JWT_SECRET`** and DB password; keep `.env` out of version control.
- [ ] Change the **seeded demo passwords**.
- [ ] Restrict network access per your firewall policy.
- [ ] Run your **security review / penetration test** *before* loading real employee data.
- [ ] Connect **SSO** (the login layer is built to swap to Azure AD / Okta).
- [ ] Set up **monitoring/log collection** for the containers.

---

## Common operations
| Task | Command |
|---|---|
| View logs | `docker compose logs -f api` |
| Restart after config change | `docker compose up -d` |
| Stop everything | `docker compose down` |
| Stop + wipe the database | `docker compose down -v` *(destroys data)* |
| Re-seed (fresh DB only) | `docker compose exec api npm run seed` |

---

## Notes & honest limitations
- The app is **self-contained** — it runs in its own containers and touches only its own database; it does not modify anything else on the server.
- Migrations run automatically on start; **data persists** in the `dbdata` volume across restarts.
- This package targets a standard Docker host. If you deploy to Kubernetes / a managed cloud service, the same images and environment variables apply — adapt the orchestration to your platform.
- No secrets are baked into the images; all sensitive values come from `.env` at runtime.
