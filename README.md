# Homebranch Web

The frontend for [Homebranch](https://github.com/Hydraux/Homebranch) — a self-hosted e-book library. Browse, manage, and read your EPUB collection from any device, with reading position synced across devices.

**Requires the backend services to be running:**
- [Homebranch API](https://github.com/Hydraux/Homebranch) — book management and storage
- [Authentication service](https://github.com/Hydraux/Authentication) — user accounts and sessions

---

## Features

- EPUB reader with cross-device position sync
- Library with infinite scroll and search
- Book shelves (collections)
- Currently Reading and Favorites lists
- Dark and light mode
- User management and roles
- Book upload (up to 50 MB)
- Statistics *(roadmap)*

---

## Deployment

The app is a static React SPA served by nginx. Nginx proxies `/api/` and `/auth/` requests to your backend containers — no backend URLs are baked into the frontend at build time.

### Docker (recommended)

Pre-built images are published to the GitHub Container Registry on every push to `main` and on version tags.

```bash
docker run -d \
  --name homebranch-web \
  -p 80:80 \
  -e API_BACKEND=http://your-backend:8080 \
  -e AUTH_BACKEND=http://your-auth:3000 \
  ghcr.io/hydraux/homebranch-web:latest
```

Or with Docker Compose:

```yaml
services:
  homebranch-web:
    image: ghcr.io/hydraux/homebranch-web:latest
    ports:
      - "80:80"
    environment:
      API_BACKEND: http://homebranch-api:8080
      AUTH_BACKEND: http://homebranch-auth:3000
    restart: unless-stopped
```

`API_BACKEND` and `AUTH_BACKEND` are the addresses nginx uses to reach your backend services (internal network addresses, not public URLs).

### Debian / Ubuntu package

Download the `.deb` from the [latest release](../../releases/latest) and install it:

```bash
sudo apt install nginx          # if not already installed
sudo dpkg -i homebranch-web_*.deb
```

After the first install, edit the nginx proxy targets to point to your backend services:

```bash
sudo nano /etc/nginx/conf.d/homebranch.conf
# Update the proxy_pass lines under /api/ and /auth/
sudo systemctl reload nginx
```

The nginx config is preserved across package upgrades so your edits won't be overwritten.

### Build from source

Requirements: Node.js 20+

```bash
git clone https://github.com/Hydraux/homebranch-web
cd homebranch-web
npm install
npm run build
```

The compiled output is in `build/client/`. Serve it with any static file server that supports SPA routing (try_files fallback to `index.html`). Configure your server to proxy `/api/` and `/auth/` to your backend services.

If you are **not** using nginx to proxy API calls, set the build-time variables before running `npm run build`:

```bash
VITE_API_URL=https://api.example.com \
VITE_AUTHENTICATION_URL=https://auth.example.com \
npm run build
```

---

## Configuration

### Docker / nginx environment variables

| Variable | Description |
|---|---|
| `API_BACKEND` | Internal URL nginx proxies `/api/` to, e.g. `http://10.0.0.2:8080` |
| `AUTH_BACKEND` | Internal URL nginx proxies `/auth/` to, e.g. `http://10.0.0.3:3000` |

### Build-time variables

These are only needed when building from source. Docker and `.deb` deployments use nginx proxying so these are always `/api` and `/auth`.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base path the browser uses for API calls |
| `VITE_AUTHENTICATION_URL` | `/auth` | Base path the browser uses for auth calls |
| `VITE_ITEMS_PER_PAGE` | `20` | Books loaded per page in the library |

---

## Development

```bash
cp .env.example .env
# Edit .env: set VITE_API_ROOT and VITE_AUTHENTICATION_ROOT to your
# local backend and auth service addresses.

npm install
npm run dev
```

Vite's dev server proxies `/api/*` and `/auth/*` to the addresses set in `.env`, so you can work against a local or remote backend without CORS issues.

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check without building |
