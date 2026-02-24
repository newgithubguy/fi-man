# Portainer Setup Guide - Finance Calendar

Portainer is a user-friendly Docker management interface that lets you deploy and manage containers without using the command line. This guide shows how to use Portainer to run the Finance Calendar app.

## What is Portainer?

Portainer is a lightweight management UI for Docker that allows you to:
- Deploy containers with a web interface
- Manage container settings and ports
- View container logs and metrics
- Restart/stop containers easily
- No command-line knowledge required

## Prerequisites

- Docker installed on your machine
- Portainer installed (see installation section below)
- The fi-man repository cloned or available on your machine

## Step 1: Install Portainer (First Time Only)

### Option A: Using Docker Compose (Recommended)

Create a file named `portainer-docker-compose.yml`:

```yaml
version: '3.8'

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - "9000:9000"
      - "8000:8000"

volumes:
  portainer_data:
```

Then run:

```bash
docker-compose -f portainer-docker-compose.yml up -d
```

### Option B: Using Docker CLI

```bash
docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce:latest
```

### Option C: On Synology NAS

If running on a Synology NAS:
1. Open Docker app
2. Search for "portainer" in the registry
3. Download the latest `portainer/portainer-ce` image
4. Launch a new container with port 9000 mapped

### Access Portainer

- Open your browser and go to: `http://localhost:9000`
- Or from another device: `http://YOUR_MACHINE_IP:9000`
- On first access, create an admin account

## Step 2: Deploy Finance Calendar via Portainer

### Method A: Using Docker Compose Stack (Easiest)

1. **Open Portainer**: Go to `http://localhost:9000`

2. **Navigate to Stacks**:
   - Click on **Stacks** in the left menu
   - Click **Add Stack**

3. **Enter Stack Name**:
   - Name: `finance-calendar`
   - Leave Webhook ID blank (unless you need it)

4. **Paste Docker Compose**:
   
   In the "Web editor" box, paste this:

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

5. **Deploy**:
   - Click **Deploy the stack** at the bottom
   - Wait for the deployment to complete
   - You'll see a success message

### Method B: Using Local Files

If you have the fi-man repository files locally:

1. **Navigate to Stacks** → **Add Stack**

2. **Select "Build method"** → Choose **Upload**

3. **Upload the repository folder** or paste the contents of `docker-compose.yml`

4. **Update the docker-compose.yml** to reference your local path:
   ```yaml
   build:
     context: /path/to/fi-man
     dockerfile: Dockerfile
   ```

5. **Click Deploy**

### Method C: Using a Pre-Built Image

If you want to skip building:

```yaml
version: '3.8'

services:
  finance-calendar:
    image: finance-calendar:latest
    container_name: finance-calendar
    ports:
      - "8080:80"
    restart: unless-stopped
```

(This assumes you've already built the image with `docker build -t finance-calendar .`)

## Step 3: Verify Deployment

1. **In Portainer**, go to **Containers**
2. Look for `finance-calendar` in the list
3. Verify the status shows **Running** ✓
4. Click on it to see details and logs

## Step 4: Access the Application

- **From your machine**: `http://localhost:8080`
- **From another device**: `http://YOUR_MACHINE_IP:8080`

## Managing the Container in Portainer

### View Logs

1. Go to **Containers**
2. Click on `finance-calendar`
3. Click the **Logs** tab at the top
4. View real-time logs or download them

### Restart the Container

1. Go to **Containers**
2. Find `finance-calendar`
3. Click the three dots (•••) on the right
4. Select **Restart**

### Stop the Container

1. Go to **Containers**
2. Click the three dots (•••)
3. Select **Stop**

### Remove the Container

1. Go to **Containers**
2. Click the three dots (•••)
3. Select **Remove**

(Note: You'll need to stop it first if it's running)

### View Resource Usage

1. Go to **Containers**
2. Click on `finance-calendar`
3. View CPU and memory usage in real-time

## Changing the Port

If you want to use a different port (e.g., 9090 instead of 8080):

### Method 1: Via Portainer UI (If already deployed)

1. Go to **Containers**
2. Click `finance-calendar`
3. Unfortunately, Portainer CE doesn't allow easy port editing
4. You'll need to **Remove** and **Redeploy** with the new port

### Method 2: Edit Stack (Recommended)

1. Go to **Stacks**
2. Click on `finance-calendar`
3. Scroll to the docker-compose section
4. Edit the ports line:
   ```yaml
   ports:
     - "9090:80"  # Change 9090 to your desired port
   ```
5. Click **Update the stack**
6. Wait for it to reconnect

### Method 3: Recreate the Stack

1. Go to **Stacks**
2. Delete the existing `finance-calendar` stack
3. Create a new one with the updated port

## Portainer with Synology NAS

If you're running Portainer on a Synology NAS:

1. **Install Portainer** via Docker app (see instructions above)

2. **Deploy Finance Calendar**:
   - In Portainer, go to **Containers** → **Create Container** (not Stack)
   - **Image**: `nginx:alpine` (or build from your local fi-man repo)
   - **Container name**: `finance-calendar`
   - **Network**: Select the Docker network
   - **Port mapping**: 
     - Container: 80
     - Host: 8080 (or your preferred port)
   - **Volume**: (Optional) Mount NAS folder for backups
   - **Restart policy**: Always
   - Click **Deploy**

3. **Access the app**:
   - Find your NAS IP address
   - Open `http://NAS_IP:8080` in your browser

## Backing Up Your Data

Since the app uses browser localStorage, here's how to backup:

1. **Via the App**:
   - Open the Finance Calendar
   - Click **Export CSV**
   - Save the file to your computer

2. **Via Portainer**:
   - Go to **Containers** → `finance-calendar`
   - No database to backup (all data is in browser)
   - To preserve container config, export the stack

## Updating the Container

When you update the fi-man repository:

1. **Go to Stacks** → `finance-calendar`

2. **Click Re-pull and redeploy**:
   - Check **Pull latest image**
   - Click **Update the stack**

3. Portainer will:
   - Remove the old container
   - Pull the latest image
   - Deploy a new container with your settings

## Troubleshooting

### Container Won't Start

1. Click on the container
2. Check the **Logs** tab for error messages
3. Common issues:
   - Port is already in use → Change to different port
   - Not enough permissions → Run Portainer with appropriate permissions
   - Docker socket not accessible → Rebuild/reinstall Portainer

### Can't Access the App

1. Verify container is **Running** status
2. Check port mapping is correct:
   - Go to **Containers** → Click the container
   - Look for "Ports" section
   - Should show something like `8080/tcp -> 80/tcp`
3. Try accessing from the host machine first: `http://localhost:8080`
4. Check firewall on your machine

### Port Already in Use

1. In Portainer, update the stack to use a different port
2. Or find what's using the port:
   - Go to **Containers**
   - Look for other containers using port 8080
   - Stop or delete the conflicting container

### Performance Issues

1. Check resource usage:
   - Click the container
   - View **Inspect** tab for stats
2. The app should use minimal resources (<50MB)
3. If high CPU/memory, check browser tabs with the app open

## Best Practices

✅ **Do:**
- Use **Stacks** for easier management
- Set **Restart policy** to "Unless stopped"
- Keep Portainer itself updated
- Regularly backup your CSV exports
- Enable **Health checks** for monitoring

❌ **Don't:**
- Don't run Portainer with `--privileged` flag unnecessarily
- Don't expose Portainer/Docker to the internet without HTTPS
- Don't change container passwords in production without backup

## Advanced: Set Up Email Alerts (Optional)

In Portainer, you can configure notifications:

1. Go to **Settings** (admin panel)
2. Click **Webhooks**
3. Configure email/Slack for container events
4. Set up alerts for container crashes/restarts

## Getting Help

- **Portainer Docs**: https://docs.portainer.io/
- **Docker Docs**: https://docs.docker.com/
- **Finance Calendar Issues**: Check the GitHub repo

## Next Steps

1. ✅ Install and access Portainer
2. ✅ Deploy the Finance Calendar stack
3. ✅ Access the app at `http://localhost:8080`
4. ✅ Add some transactions
5. ✅ Export CSV to backup your data
6. ✅ Share the URL with others on your network

Enjoy your containerized Finance Calendar! 🎉
