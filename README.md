# IdeaBase

A platform that scrapes trending projects from GitHub and uses AI to analyze entrepreneurial opportunities.

## Project Structure

This project consists of the following main components:
- Frontend: Next.js application
- Backend: FastAPI REST API
- Database: PostgreSQL
- Task Queue: Celery + Redis

## Environment Management

The project uses a unified management script `manage.sh` to handle development and production environments:

### Script Usage

```bash
./manage.sh [mode] [options]
```

### Available Modes

- `dev` - Development environment mode
- `prod` - Production environment mode

### Common Options

- `-h, --help` - Show help information
- `-r, --rebuild` - Force rebuild containers
- `-d, --detach` - Start without following logs (suitable for server deployment)

### Development Environment Specific Options

- `-c, --clean` - Completely clean and rebuild environment

```bash
# Example: Start development environment
./manage.sh dev

# Example: Clean and rebuild development environment
./manage.sh dev -c
```

### Production Environment Specific Options

- `-b, --backup` - Backup database before deployment

```bash
# Example: Deploy production environment
./manage.sh prod

# Example: Backup database and rebuild production environment
./manage.sh prod -b -r

# Example: Deploy production environment in background
./manage.sh prod -d
```

### Access Environment

- Frontend: http://localhost:3000
- API Documentation: http://localhost:8000/docs

## Docker Compose Configuration

The project uses three Docker Compose configuration files for convenient development and deployment:

1. `docker-compose.yml` - Base configuration, contains common settings for all services
2. `docker-compose.override.yml` - Development environment configuration, includes hot reload and other development conveniences
3. `docker-compose.prod.yml` - Production environment configuration, includes restart policies and other production settings

### Manual Docker Compose Usage

**Development Environment** (automatically uses override.yml):
```bash
docker-compose up -d
```

**Production Environment**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Server Deployment Guide

### Method 1: Direct use of manage.sh

The simplest way to deploy on a server is using detach mode:

```bash
./manage.sh prod -d
```

This will start all containers but won't follow log output, suitable for deployment via SSH session.

### Method 2: Use nohup for background execution

```bash
nohup ./manage.sh prod > deploy.log 2>&1 &
```

This will run the deployment script in the background and redirect output to a log file.

### Method 3: Use systemd service (Recommended)

The project provides systemd service files and installation scripts for running as a system service on Linux servers:

1. Upload project code to server (e.g., `/opt/ideabase/`)
2. Use installation script to configure system service:

```bash
cd /opt/ideabase
sudo ./install-service.sh
```

3. Use systemd commands to manage service:

```bash
# Start service
sudo systemctl start ideabase

# Stop service
sudo systemctl stop ideabase

# Check status
sudo systemctl status ideabase

# View logs
sudo journalctl -u ideabase
```

The system service will automatically run when the server starts and launch all containers after Docker service is available.

## Configure HTTPS (Using Nginx Reverse Proxy)

In production environments, you usually need to serve the application via HTTPS. Since servers may have multiple applications sharing ports 80/443, we recommend using Nginx as a reverse proxy:

### 1. Install and Configure Nginx

The project provides an automatic configuration script:

```bash
cd /opt/ideabase
sudo ./setup-nginx.sh
```

This script will:
- Install Nginx (if not already installed)
- Configure reverse proxy to forward requests from Nginx to IdeaBase containers
- Automatically configure SSL certificates (optional, using Let's Encrypt)

### 2. Manual Nginx Configuration

If you need to configure manually, you can refer to the `ideabase-nginx.conf` file and modify according to your needs:

1. Copy configuration file to Nginx configuration directory:
   ```bash
   sudo cp ideabase-nginx.conf /etc/nginx/sites-available/ideabase
   sudo ln -s /etc/nginx/sites-available/ideabase /etc/nginx/sites-enabled/
   ```

2. Modify domain name and port mapping:
   ```bash
   sudo nano /etc/nginx/sites-available/ideabase
   ```

3. Install SSL certificate (using Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. Test and restart Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

After configuration, you can access IdeaBase via domain name, and Nginx will automatically forward requests to the corresponding Docker containers.

## Environment Variables

The backend requires the following environment variables:

- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: Model to use (default: gpt-4)
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name
- `POSTGRES_SERVER`: Database server
- `GITHUB_TOKEN`: GitHub API token (optional)
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port

## Project Overview

IdeaBase.ai uses AI to analyze trending projects on GitHub, discovering the commercial value and entrepreneurial opportunities they contain. It periodically scrapes the GitHub Trending page, uses OpenAI's GPT models for deep analysis, and presents the results to users in an intuitive way.

## Tech Stack

### Frontend

- **Framework**: Next.js + React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Data Fetching**: SWR/Axios

### Backend

- **Framework**: FastAPI
- **Database ORM**: SQLAlchemy
- **Task Scheduling**: Celery + Redis
- **Data Scraping**: BeautifulSoup4 + httpx
- **AI Analysis**: OpenAI API (GPT-4)

## Getting Started

### One-Click Startup

The project provides one-click startup scripts to quickly start development environment or deploy production environment:

```bash
# Start development environment
./dev.sh

# Deploy production environment
./deploy.sh
```

These scripts will automatically check environment configuration, create default settings, and start corresponding services.

### Quick Start with Docker

1. Clone repository

```bash
git clone https://github.com/zhoudongyan/ideabase.git
cd ideabase
```

2. Set environment variables

```bash
# Create and edit .env file
cp backend/.env.example backend/.env
# Set your OpenAI API key
```

3. Start services using Docker Compose

```bash
docker-compose up -d
```

4. Access application

```
Frontend: http://localhost:3000
API Documentation: http://localhost:8000/docs
```

### Development Environment Setup

See `frontend/README.md` and `backend/README.md` for details

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## License

MIT
