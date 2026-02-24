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
      - "8080:80"
    environment:
      - TZ=UTC
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/index.html"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
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
- Verify ports map to 8080 -> 80
- If updates do not appear, rebuild with --no-cache
