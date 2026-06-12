# EC2 Deploy Guide — PA Frontend
**Stack:** React 18 + Vite · Served as static files via Nginx

---

## 1. EC2 Instance Requirements

| Setting | Recommended |
|---|---|
| Instance type | t3.micro (free tier eligible) or t3.small |
| OS | Ubuntu 24.04 LTS (64-bit x86) |
| Storage | 8 GB gp3 (minimum) |
| Security Group — Inbound | HTTP 80, HTTPS 443, SSH 22 |
| Security Group — Outbound | All traffic |
| Elastic IP | Assign one so the public IP doesn't change on reboot |

---

## 2. Set `VITE_API_URL` for Production

`VITE_API_URL` is read **at build time** by Vite — it is baked into the JS bundle. It is **not** a runtime environment variable.

For production, set it to your backend URL(s) before running `npm run build`:

```
# .env.production  (create this file — never commit it)
VITE_API_URL=https://your-backend.onrender.com
```

If you have a primary EC2 backend **and** a Render fallback:

```
VITE_API_URL=http://<EC2-backend-private-ip>:8000,https://your-backend.onrender.com
```

The app (`src/services/api.js`) automatically retries on the second URL if the first has a network error, and sticks to it for the rest of the session.

> **Rule:** First URL = primary, Second URL = fallback. Comma-separated, no spaces.

---

## 3. Build for Production (local machine)

```bash
# 1. Set the production API URL
cp .env .env.backup
echo "VITE_API_URL=https://your-backend.onrender.com" > .env

# 2. Build
npm run build

# 3. dist/ folder contains all static files — upload this to EC2
```

Or set inline without touching the file:

```bash
VITE_API_URL=https://your-backend.onrender.com npm run build
```

The output is in `dist/` — static HTML, JS, and CSS only. No Node.js needed on the server.

---

## 4. EC2 Setup (run once after launch)

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 5. What the EC2 Server Needs (folder structure)

After running `npm run build`, the `dist/` folder is the **only thing that goes on the server**. No source code, no `node_modules`, no `.env` file.

```
/var/www/html/               ← Nginx root (maps to dist/)
├── index.html               ← Entry point — Nginx serves this for every route
├── assets/
│   ├── index-<hash>.js      ← Full JS bundle (React app)
│   └── index-<hash>.css     ← Full CSS bundle
└── sounds/                  ← Static audio assets from public/sounds/
    └── (any .mp3/.wav files placed in public/sounds/ locally)
```

**What each folder/file does:**

| Path | Purpose |
|---|---|
| `index.html` | Shell page — loads the JS bundle. Nginx serves this for all routes (React Router handles the rest). |
| `assets/index-*.js` | The entire React app compiled and minified. |
| `assets/index-*.css` | All CSS Modules bundled together. |
| `sounds/` | Copied from `public/sounds/` at build time. Currently empty (app uses Web Audio API synthesis instead of MP3 files). |

> **Nothing else is needed.** No Node.js runtime, no `package.json`, no `.env` (API URL is baked into the JS bundle at build time).

---

## 6. Upload the `dist/` folder

From your local machine:

```bash
# Copy the built files to EC2
scp -i your-key.pem -r dist/* ubuntu@<EC2-PUBLIC-IP>:/var/www/html/
```

Or use rsync (faster on re-deploys):

```bash
rsync -avz --delete -e "ssh -i your-key.pem" dist/ ubuntu@<EC2-PUBLIC-IP>:/var/www/html/
```

---

## 7. Configure Nginx for React Router

React Router uses client-side routing — Nginx must serve `index.html` for every path, otherwise direct URL visits (e.g. `/tasks`) return 404.

```bash
sudo nano /etc/nginx/sites-available/pea
```

Paste:

```nginx
server {
    listen 80;
    server_name <EC2-PUBLIC-IP>;   # or your domain name

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: cache static assets aggressively
    location ~* \.(js|css|png|jpg|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site and reload
sudo ln -s /etc/nginx/sites-available/pea /etc/nginx/sites-enabled/
sudo nginx -t          # verify config
sudo systemctl reload nginx
```

---

## 8. HTTPS with Let's Encrypt (optional but recommended)

Requires a domain name pointing to your EC2 Elastic IP.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

Certbot auto-renews. After this, update `VITE_API_URL` to use `https://` and rebuild.

---

## 9. Re-deploy Workflow

Every time you update the frontend:

```bash
# 1. Build locally
VITE_API_URL=https://your-backend.onrender.com npm run build

# 2. Upload to EC2
rsync -avz --delete -e "ssh -i your-key.pem" dist/ ubuntu@<EC2-PUBLIC-IP>:/var/www/html/

# 3. No Nginx restart needed — static files are served immediately
```

---

## 10. Environment Variable Summary

| Variable | Where set | When used |
|---|---|---|
| `VITE_API_URL` | `.env` or shell before build | Build time only — baked into JS bundle |

No other environment variables are needed for the frontend. All secrets (API keys, DB passwords) belong to the backend only.

---

## 11. Verify Deployment

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check files are in place
ls /var/www/html/

# Test from local machine
curl -I http://<EC2-PUBLIC-IP>
# Expected: HTTP/1.1 200 OK
```

Open `http://<EC2-PUBLIC-IP>` in a browser — the login screen should load.
