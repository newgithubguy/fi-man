# Docker Setup Guide - Finance Calendar Mobile

Use this guide to run the mobile project in Docker.

## Quick Start

```bash
cd /path/to/fi-man/fi-man-mobile
docker compose up -d --build
```

Access:
- Local: http://localhost:8081
- Network: http://YOUR_MACHINE_IP:8081

## Stop

```bash
docker compose down
```

## Logs

```bash
docker compose logs -f
```

## Data Persistence

- SQLite path in container: `/data/finance.db`
- Docker volume: `finance-calendar-mobile-data`

## Rebuild After Updates

```bash
cd /path/to/fi-man
git pull origin master
cd fi-man-mobile
docker compose down
docker compose build --no-cache
docker compose up -d
```
