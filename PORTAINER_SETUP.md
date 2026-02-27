# Portainer Setup Guide - Finance Calendar

This guide shows how to deploy the Finance Calendar app using Portainer.

## Prerequisites

- Docker installed on the host
- Portainer installed and running
- Access to the fi-man repository

## Deploy with a Stack (Recommended)

1. Open Portainer and go to Stacks
2. Click Add Stack
3. Name it: finance-calendar
4. Paste the compose file below:

```yaml
version: '3.8'

services:
  finance-calendar:
    build:
      context: https://github.com/newgithubguy/fi-man.git#master
      dockerfile: Dockerfile
    container_name: finance-calendar
    ports:
      - "8080:3000"
    volumes:
      - finance-calendar-data:/data
    environment:
      - TZ=UTC
      - NODE_ENV=production
      - SESSION_SECRET=change-this-to-random-secret-in-production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  finance-calendar-data:
    driver: local
```

5. Click Deploy the stack

Access the app:
- http://localhost:8080
- http://YOUR_MACHINE_IP:8080

## Updating the Stack

1. Go to Stacks -> finance-calendar
2. Click Pull and redeploy (Git stack)
3. If changes do not appear, rebuild using the command line with --no-cache

## Command Line Rebuild (If Needed)

```bash
cd /path/to/fi-man
git pull origin master

docker compose down
docker compose build --no-cache
docker compose up -d
```

After rebuilding, hard refresh your browser:
- Windows/Linux: Ctrl + Shift + R or Ctrl + F5
- Mac: Cmd + Shift + R

## Troubleshooting

- Check container logs in Portainer
- Verify ports map to 8080 -> 3000
- If updates do not appear, rebuild with --no-cache

## Authentication & Multi-User Setup

The app now requires user authentication. Each user has their own isolated financial data.

### First Time Access:

1. Navigate to http://YOUR_MACHINE_IP:8080
2. You'll be redirected to the login page
3. Click "Register" to create the first account
4. Enter a username and password (minimum 4 characters)

### Adding More Users:

- Each person registers their own account
- All users access the same URL
- Each user's data is completely isolated and private

### Security Best Practices:

**⚠️ Important:** Change the SESSION_SECRET to a random string:
1. Go to Portainer → Stacks → finance-calendar → Editor
2. Update SESSION_SECRET to a long random string (e.g., use a password generator)
3. Click "Update the stack"

**Note:** If using HTTPS/SSL, update the server.js session configuration to set `cookie.secure: true`

### Data Migration:

If you had data before adding authentication, it won't appear automatically. You can either:
- Start fresh (delete volume and recreate)
- Manually migrate data in the database to associate it with a user ID
