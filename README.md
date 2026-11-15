# Astra AI — Next.js + MySQL + Auth.js + OpenAI

A starter multi-user AI chat SaaS, deployable to Vercel with independently hosted MySQL.

## Features
- Responsive landing page, login, registration, dashboard
- Auth.js credentials login (JWT cookies), bcrypt-hashed passwords
- MySQL chat history with authenticated user ownership checks
- OpenAI Responses API (server-only key)
- Daily AI request quota, DB-backed login/registration throttling
- Create and delete conversations

## Requirements
- Node.js 20.9+ (Node 22 recommended)
- MySQL 8+
- OpenAI API key

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in values. Generate AUTH_SECRET with `openssl rand -base64 32`.
3. Run `sql/schema.sql` against MySQL (e.g. `mysql -u root -p < sql/schema.sql`).
4. `npm run dev` and open http://localhost:3000.
5. Create a new account and sign in.

## Deploy to Vercel
1. Provision a Vercel-reachable MySQL 8+ service with TLS, restricted access and a strong password. For production, use a provider supporting pooled connections/serverless access. Local Docker MySQL on your computer is not reachable from Vercel.
2. Run `sql/schema.sql` against that database.
3. Push the project to GitHub and import the repository on Vercel.
4. Configure `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL=true`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `OPENAI_API_KEY`, `OPENAI_MODEL` in Vercel environment settings.
5. Deploy and test registration, login, history isolation and AI responses.

**Production-readiness:** Add email verification, password reset, bot/WAF protection, monitoring, token-based billing, and rigorous concurrency and retry controls before accepting paying customers. Vercel functions can open multiple DB connections; size the connection budget accordingly. Ensure MySQL is protected by TLS and network rules.

## API
- `POST /api/register` (name, email, password)
- `GET,POST /api/auth/[...nextauth]`
- `GET,POST /api/conversations`
- `DELETE /api/conversations/:id`
- `GET,POST /api/conversations/:id/messages` (POST `{ "content": "Hello" }`)

No Supabase or Prisma dependency. n8n and autonomous tools are not included in this chat foundation.

## Docker (Next.js app + MySQL)

Requires Docker Engine/Desktop with Docker Compose v2.

1. `cp .env.docker.example .env.docker`
2. Edit `.env.docker`: set strong **different** MySQL passwords and your OpenAI API key. Generate `AUTH_SECRET` with `openssl rand -base64 32`.
3. `docker compose --env-file .env.docker up --build -d`
4. Open http://localhost:3000 to register and chat.

Commands:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
docker compose --env-file .env.docker down
# DANGER: removes all MySQL data!
docker compose --env-file .env.docker down -v
```

MySQL runs **inside Docker** at hostname `mysql`, port `3306`. For optional host-side MySQL tools, connect to `127.0.0.1:3307`. The SQL schema is executed automatically **only on first initialization of the MySQL data volume**. Changing `sql/schema.sql` later will not automatically migrate existing data.

This Compose setup is intended for local or single-server use. The Next.js application can also be deployed separately to Vercel, but the Docker MySQL container is not hosted by Vercel. Provision a reachable managed MySQL service for Vercel deployments. For public deployment on a VPS, configure a reverse proxy with HTTPS, network restrictions, persistent backups, and monitoring; the provided Compose ports are bound to localhost by default.

### Dockerfiles in this project
- `Dockerfile`: multi-stage production Next.js image, runs as a non-root user.
- `compose.yaml`: application and MySQL 8.4 with health check and persistent database volume.
- `.dockerignore`: prevents local dependencies, build artifacts and secrets from entering the build context.
- `.env.docker.example`: example Docker Compose configuration; do not commit `.env.docker`.
