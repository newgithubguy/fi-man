# Docker Setup Guide - Finance Calendar

This guide helps you run the Finance Calendar application with Docker.

## Prerequisites

- Docker installed (Docker Desktop recommended)
- Docker Compose (included with Docker Desktop)

## Quick Start (Recommended)

```bash
# Navigate to the fi-man directory
cd /path/to/fi-man

# Build and start the container
docker compose up -d

# Verify container is running
docker compose ps
```

Access the app:
- http://localhost:8080
- http://YOUR_MACHINE_IP:8080 (other devices on your network)

## Stop the Container

```bash
docker compose down
```

## View Logs

```bash
docker compose logs -f
```

## Rebuild After Updates (Important)

```bash
cd /path/to/fi-man
git pull origin master

docker compose down
docker compose build --no-cache
docker compose up -d
```

After rebuilding, do a hard refresh in your browser:
- Windows/Linux: Ctrl + Shift + R or Ctrl + F5
- Mac: Cmd + Shift + R

## Manual Docker Commands (Optional)

```bash
# Build image
docker build -t finance-calendar .

# Run container
docker run -d \
  --name finance-calendar \
  -p 8080:80 \
  --restart unless-stopped \
  finance-calendar
```

## Port Customization

To use a different host port (e.g., 9090), edit docker-compose.yml:

```yaml
ports:
  - "9090:80"
```

Then rebuild and start again:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Data Persistence

Data is stored in each browser's localStorage. To back up:
- Use Export CSV in the app

## Troubleshooting

- If updates do not appear, rebuild with --no-cache and hard refresh
- Check logs: docker compose logs -f
