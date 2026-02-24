# Docker Setup Guide - Finance Calendar

This guide will help you set up and run the Finance Calendar application in Docker on your local network.

## Prerequisites

- **Docker** installed ([Download Docker](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)
- A machine to run the container (can be your main computer or a NAS/server)

## Quick Start (Recommended)

**Prefer a user-friendly UI instead of command line?**
→ See [PORTAINER_SETUP.md](PORTAINER_SETUP.md) for step-by-step instructions using Portainer

### 1. Using Docker Compose

Docker Compose is the easiest way to get started:

```bash
# Navigate to the fi-man directory
cd /path/to/fi-man

# Build and start the container
docker-compose up -d

# Check if the container is running
docker-compose ps
```

The application will be available at:
- **http://localhost:8080** (if running on your local machine)
- **http://[YOUR_MACHINE_IP]:8080** (from other machines on your network)

### 2. Stopping the Container

```bash
docker-compose down
```

### 3. Viewing Logs

```bash
docker-compose logs -f
```

## Manual Docker Commands (Alternative)

If you prefer not to use Docker Compose:

### Build the Image

```bash
docker build -t finance-calendar .
```

### Run the Container

```bash
docker run -d \
  --name finance-calendar \
  -p 8080:80 \
  --restart unless-stopped \
  finance-calendar
```

### Stop the Container

```bash
docker stop finance-calendar
docker rm finance-calendar
```

## Finding Your Machine's IP Address

To access the application from other devices on your network:

### Windows

```powershell
ipconfig
```

Look for "IPv4 Address" (usually 192.168.x.x or 10.x.x.x)

### macOS/Linux

```bash
ifconfig
```

Look for your local network IP address.

## Accessing from Other Devices

Once you have your machine's IP address:

1. Open a web browser on another device
2. Navigate to: `http://YOUR_MACHINE_IP:8080`
3. Example: `http://192.168.1.100:8080`

## Port Customization

To use a different port (e.g., 9000 instead of 8080):

### Using Docker Compose

Edit `docker-compose.yml`:

```yaml
ports:
  - "9000:80"  # Change 9000 to your desired port
```

Then restart:

```bash
docker-compose down
docker-compose up -d
```

### Using Docker CLI

```bash
docker run -d \
  --name finance-calendar \
  -p 9000:80 \
  --restart unless-stopped \
  finance-calendar
```

## Data Persistence

The application uses **localStorage** for data persistence, which is stored in each user's browser. This means:

- **Data is stored locally** on each device/browser
- Each browser/device has its own separate transaction data
- Data persists across browser sessions and container restarts
- No server-side database is used

To backup your data:
1. Open the application
2. Click "Export CSV" to download your transactions
3. Store the CSV file safely

To restore your data:
1. Open the application
2. Click on the file input under "Import CSV"
3. Select your backup CSV file
4. Click "Confirm Import"

## Advanced Configuration

### Running on Port 80 (Web Standard)

To run on the standard HTTP port (80):

```bash
docker run -d \
  --name finance-calendar \
  -p 80:80 \
  --restart unless-stopped \
  finance-calendar
```

Then access via: `http://YOUR_MACHINE_IP`

### Setting Timezone

Edit `docker-compose.yml` to configure timezone:

```yaml
environment:
  - TZ=America/New_York  # Change to your timezone
```

List of [common timezone values](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## Troubleshooting

### Connection Refused

- Ensure the container is running: `docker-compose ps`
- Check if port 8080 is available on your machine
- Try a different port: change to `-p 9000:80`

### Container Won't Start

```bash
# Check container logs
docker-compose logs

# Or for manual run:
docker logs finance-calendar
```

### Can't Access from Other Network Device

- Verify both devices are on the **same network**
- Check your machine's firewall settings (may need to allow port 8080)
- Verify you're using the correct IP address (not localhost)
- Try ping to test network connectivity

### Port Already in Use

```bash
# Find what's using the port (macOS/Linux)
lsof -i :8080

# Windows: Check Task Manager or use:
netstat -ano | findstr :8080

# Use a different port instead
```

## Updating the Application

To update to the latest version:

```bash
# Pull the latest code
cd /path/to/fi-man
git pull origin master

# Rebuild without cache to get all file updates
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Important**: Use `--no-cache` to ensure all application files are rebuilt from scratch. This is especially important when updating features or fixing bugs.

After updating, do a **hard refresh** in your browser to clear any cached files:
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

## Uninstalling

```bash
# Stop and remove the container
docker-compose down

# Remove the image (optional)
docker rmi finance-calendar
```

## Performance Tips

- The application runs entirely in the browser with localStorage
- All processing happens client-side
- Nginx is highly efficient for serving static files
- Container uses minimal resources (typically <50MB RAM)

## Security Notes

- The application has **no backend server** - all data stays on the client
- Access is not encrypted by default (HTTP only)
- For production use on the internet, consider:
  - Setting up reverse proxy with HTTPS
  - Using authentication/authorization
  - Deploying behind a VPN or firewall

## Support

For issues or questions:
1. Check the main [README.md](README.md)
2. Review Docker logs: `docker-compose logs`
3. Ensure Docker is properly installed and running
