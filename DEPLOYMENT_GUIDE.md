# HR Scoring Widget Deployment Guide (Hetzner, Ubuntu, no domain)

This document captures the exact deployment flow used for this project, including troubleshooting steps that were required during the first production setup.

## 1. Current deployment architecture

- Host: Hetzner Cloud Ubuntu server
- App runtime: Node.js + NestJS via PM2
- Database: PostgreSQL in Docker (`docker compose`)
- Reverse proxy: Nginx
- Public entrypoint (current): `http://<SERVER_IP>`
- SSL status: not enabled yet (no domain configured yet)

---

## 2. Local prerequisites (Windows)

- PowerShell
- Git installed
- SSH client available (`ssh -V`)

If Git is missing:

```powershell
winget install --id Git.Git -e --source winget
```

Restart PowerShell after installation.

---

## 3. Create SSH key and configure server access

On local Windows machine:

```powershell
ssh-keygen -t ed25519 -C "hr-scoring-deploy"
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

On server (as `root`):

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Append the local public key to `/home/deploy/.ssh/authorized_keys`.

Important: `chmod`/`chown` are Linux commands and must be run inside SSH session on server, not in Windows PowerShell.

Test access:

```powershell
ssh deploy@<SERVER_IP>
```

---

## 4. Initialize repository and push to GitHub

From local project folder:

```powershell
cd "C:\Users\mkaly\Documents\hr-scoring-widget"
git init
git config user.name "ParadiseMark"
git config user.email "mkalyonov@gmail.com"
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ParadiseMark/hr_helper.git
git push -u origin main
```

If you get `fatal: unable to auto-detect email address`, set `git config user.name/user.email` as above and retry commit.
If you get `src refspec main does not match any`, create at least one commit first.

---

## 5. Server packages and runtime setup

Login as `deploy` via SSH and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git nginx

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

---

## 6. Clone project and configure environment

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/ParadiseMark/hr_helper.git
cd ~/apps/hr_helper/backend
cp .env.example .env
nano .env
```

Minimum required values in `.env`:

```env
APP_PORT=3000
APP_ENV=production
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_scoring_widget
OPENAI_API_KEY=...
AMO_CLIENT_ID=...
AMO_CLIENT_SECRET=...
HH_CLIENT_ID=...
HH_CLIENT_SECRET=...
```

---

## 7. Start PostgreSQL and apply Prisma

```bash
cd ~/apps/hr_helper/backend
docker compose up -d
docker ps

npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
```

---

## 8. Important fix applied during first deployment

The project required `logs` module files (`LogsModule`/`LogsService`) for successful build. If missing in repository, build fails with:

- `Cannot find module './modules/logs/logs.module'`
- `Cannot find module '../../logs/logs.service'`

Ensure these files exist in:

- `backend/src/modules/logs/logs.module.ts`
- `backend/src/modules/logs/logs.service.ts`

And push them to GitHub so server pulls them normally.

---

## 9. PM2 process start

Use this script path:

```bash
pm2 start dist/src/main.js --name hr-scoring-api --cwd /home/deploy/apps/hr_helper/backend --update-env
pm2 save
pm2 startup
```

Then run the `sudo ... pm2 startup ...` command printed by PM2 and save again:

```bash
pm2 save
```

Why `dist/src/main.js` and not `dist/main.js`:
- Current TypeScript build output structure places entrypoint inside `dist/src/`.

---

## 10. Health checks

Internal app check:

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{"status":"ok","service":"hr-scoring-backend","environment":"production","port":"3000"}
```

If a `curl` check fails right after restart, wait 2-5 seconds and retry (process may still be starting).

Check listener:

```bash
ss -ltnp | grep 3000 || true
```

Inspect PM2 logs:

```bash
pm2 logs hr-scoring-api --lines 120 --nostream
```

---

## 11. Nginx reverse proxy (no domain, IP only)

Create config:

```bash
sudo tee /etc/nginx/sites-available/hr-scoring-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name <SERVER_IP> _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/hr-scoring-api /etc/nginx/sites-enabled/hr-scoring-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Validate:

```bash
curl http://127.0.0.1/health
curl http://<SERVER_IP>/health
```

---

## 12. SSL and domain notes

- Domain is not required for current operation.
- HTTPS via Let's Encrypt is not available for plain server IP.
- To enable HTTPS later:
  1. Buy/configure domain
  2. Add DNS A-record to server IP
  3. Update `server_name` in nginx
  4. Run `certbot --nginx -d <domain>`

---

## 13. Routine update flow

When new code is pushed to GitHub:

```bash
cd ~/apps/hr_helper
git pull
cd backend
npm ci
npx prisma generate
npm run build
pm2 restart hr-scoring-api --update-env
```

Optional for schema changes:

```bash
npx prisma migrate deploy
```

---

## 14. Useful operational commands

```bash
pm2 status
pm2 logs hr-scoring-api --lines 100
pm2 restart hr-scoring-api
pm2 describe hr-scoring-api
docker ps
docker compose ps
```

