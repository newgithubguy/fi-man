# Docker Setup Guide - Finance Calendar

This guide helps you run the Finance Calendar application with Docker for production use, local network access, or persistent data storage.

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
- **Local:** http://localhost:8080
- **Network:** http://YOUR_MACHINE_IP:8080 (access from other devices)

The application server runs on port 3000 inside the container, mapped to port 8080 on your host.

## Stop the Container

```bash
docker compose down
```

## View Logs

```bash
docker compose logs -f
```

## Data Persistence

The Finance Calendar uses SQLite for persistent data storage:

- **Database Location:** `/data/finance.db` (inside container)
- **Docker Volume:** `finance-calendar-data` (managed by Docker)
- **Persistence:** All transactions, accounts, and settings persist even after container restart

### Backing Up Your Data

```bash
# Copy database from running container
docker compose cp finance-calendar:/data/finance.db ./backup-finance.db

# Or manually export transactions via the app UI using "Export CSV"
```

### Restore from Backup

```bash
# Copy database back into container
docker compose cp ./backup-finance.db finance-calendar:/data/finance.db
```

## Rebuild After Updates (Important)

When pulling new code or changes from GitHub, rebuild the Docker image:

```bash
cd /path/to/fi-man
git pull origin master

# Stop and rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

After rebuilding, do a hard refresh in your browser (clears cached files):
- **Windows/Linux:** Ctrl + Shift + R or Ctrl + F5
- **Mac:** Cmd + Shift + R

## Manual Docker Commands (Optional)

```bash
# Build image
docker build -t finance-calendar .

# Run container
docker run -d \
  --name finance-calendar \
  -p 8080:3000 \
  -e SESSION_SECRET=replace-with-a-long-random-secret \
  -v finance-calendar-data:/data \
  --restart unless-stopped \
  finance-calendar
```

## Port Customization

To use a different host port (e.g., 9090), edit docker-compose.yml:

```yaml
ports:
  - "9090:3000"
```

Then rebuild and start again:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

- If updates do not appear, rebuild with --no-cache and hard refresh
- Check logs: docker compose logs -f
- Verify database volume exists: `docker volume ls | grep finance-calendar`

## Features Overview

**Docker deployment includes:**
- Multi-account finance tracking
- Income vs Expenses graphs with auto-refresh
- Category breakdown analysis (expenses & income by description)
- Recurring transactions support
- Built-in calculator in sidebar
- Linked transfers between accounts
- CSV import/export
- Real-time persistent storage (SQLite database)
- Cross-device network access (accessible from other computers on your network)
