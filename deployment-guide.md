# IdeaBase Deployment Guide

## 1. Cloudflare DNS Configuration

1. Login to Cloudflare console
2. Select ideabase.ai domain
3. Go to DNS management page
4. Add A record:
   - Type: A
   - Name: @ (root domain)
   - Content: 92.120.19.1
   - Proxy status: Choose as needed (recommended to enable for Cloudflare protection)

## 2. Server Configuration Steps

### 1. Login to Server

```
ssh user@92.120.19.1
```

### 2. Install Required Dependencies

```
sudo apt update
sudo apt install -y git docker.io docker-compose
```

### 3. Clone Repository

```
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/your-repo/ideabase.git
cd ideabase
```

### 4. Configure Docker Environment

```
# Ensure docker service is running
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (use docker without sudo)
sudo usermod -aG docker $USER
# Logout and login again for permissions to take effect
```

### 5. Web Server Configuration (Choose A or B)

#### Option A: Using Nginx

1. Install Nginx and Certbot

```
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. Apply for SSL Certificate

```
sudo certbot --nginx -d ideabase.ai
```

3. Configure Nginx

```
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/ideabase.conf
```

Edit content as follows:

```
server {
    listen 80;
    listen [::]:80;
    server_name ideabase.ai;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name ideabase.ai;

    ssl_certificate /etc/letsencrypt/live/ideabase.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ideabase.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Increase client upload size limit
    client_max_body_size 50M;
    
    # NextJS static resource caching (_next/static)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Add caching
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # Static resource caching (public directory)
    location /static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # API request proxy
    location /api/ {
        proxy_pass http://localhost:8000;  # IdeaBase backend API
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout settings
        proxy_read_timeout 60s;
    }
    
    # Frontend application proxy - NextJS
    location / {
        proxy_pass http://localhost:3000;  # IdeaBase frontend service
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout settings, NextJS SSR may need more time
        proxy_read_timeout 60s;
    }
}
```

4. Enable Nginx Configuration

```
# Create symbolic link to enable configuration
sudo ln -s /etc/nginx/sites-available/ideabase.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Option B: Using Caddy (Simpler, Automatic HTTPS)

1. Install Caddy

```
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. Configure Caddy

```
# Create Caddy configuration file
sudo nano /etc/caddy/Caddyfile
```

Edit content as follows:

```
ideabase.ai {
    # Automatic HTTPS (Caddy default feature)
    
    # Global settings
    encode gzip zstd
    header {
        # Security-related headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        # Remove server information
        -Server
    }
    
    # Next.js static resource caching
    handle /_next/static/* {
        header Cache-Control "public, max-age=31536000, immutable"
        reverse_proxy localhost:3000
    }
    
    # Other static resource directories
    handle /static/* {
        header Cache-Control "public, max-age=2592000"
        reverse_proxy localhost:3000
    }
    
    # API request proxy to backend
    handle /api/* {
        reverse_proxy localhost:8000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            
            # Backend timeout settings
            timeout 60s
        }
    }
    
    # Default handling - all other requests forwarded to NextJS frontend
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            # Support WebSocket
            header_up Connection {http.upgrade}
            header_up Upgrade {http.upgrade}
        }
    }
    
    # Upload size limit
    limits {
        header 10KB
        body 50MB
    }
    
    # Log configuration
    log {
        output file /var/log/caddy/ideabase.log {
            roll_size 10MB
            roll_keep 10
        }
        format json
    }
}
```

3. Restart Caddy

```
sudo systemctl reload caddy
```

### 6. Start Application

```
cd ~/projects/ideabase

# Start with production environment configuration
./manage.sh prod
```

### 7. Configure System Service for Auto-start

```
# Create systemd service file
sudo nano /etc/systemd/system/ideabase.service
```

Edit content as follows:

```
[Unit]
Description=IdeaBase Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/admin/ideabase
ExecStart=/home/admin/ideabase/manage.sh prod
ExecStop=/usr/bin/docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
User=username

[Install]
WantedBy=multi-user.target
```

Replace `admin` with your actual username, then:

```
# Enable service
sudo systemctl daemon-reload
sudo systemctl enable ideabase.service
sudo systemctl start ideabase.service
```

## 3. Verify Deployment

1. Check service status: `sudo systemctl status ideabase.service`
2. Check web server status:
   - Nginx: `sudo systemctl status nginx`
   - Caddy: `sudo systemctl status caddy`
3. Visit https://ideabase.ai to confirm the website opens normally
4. Test whether frontend and API functions work properly

If problems occur, check logs:

```
# Application logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs

# Web server logs
# Nginx
sudo tail -f /var/log/nginx/error.log
# Caddy
sudo tail -f /var/log/caddy/ideabase.log
```

## 4. Multi-Domain Configuration

If your server has multiple applications that need to use port 443, you can configure as follows:

### 1. Nginx Multi-Domain Configuration

With Nginx, you can create separate configuration files for each domain:

```
# Create configuration file for second application
sudo nano /etc/nginx/sites-available/another-app.conf
```

Example configuration:

```
server {
    listen 80;
    listen [::]:80;
    server_name another-app.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name another-app.com;

    ssl_certificate /etc/letsencrypt/live/another-app.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/another-app.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # NextJS static resource caching (if also a NextJS application)
    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://localhost:3001;  # Another application's port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Apply for certificate for new domain and enable configuration:

```
sudo certbot --nginx -d another-app.com
sudo ln -s /etc/nginx/sites-available/another-app.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Caddy Multi-Domain Configuration

Caddy's configuration is more concise, just add new domain configuration blocks to Caddyfile:

```
sudo nano /etc/caddy/Caddyfile
```

Add new domain configuration:

```
# Existing IdeaBase configuration
ideabase.ai {
    # ... existing configuration ...
}

# New application configuration (example for NextJS application)
another-app.com {
    # Global settings
    encode gzip zstd
    
    # NextJS static resource caching
    handle /_next/static/* {
        header Cache-Control "public, max-age=31536000, immutable"
        reverse_proxy localhost:3001
    }
    
    # Default frontend handling
    handle {
        reverse_proxy localhost:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Log configuration
    log {
        output file /var/log/caddy/another-app.log {
            roll_size 10MB
        }
    }
}
```

Reload Caddy:

```
sudo systemctl reload caddy
```

### 3. Multi-Domain Best Practices

- **Domain separation**: Each application uses independent domains, server routes traffic to correct application based on request domain
- **Application port separation**: Each application uses different internal ports (e.g., 3000, 3001, 3002)
- **Unified SSL entry**: All HTTPS traffic goes through port 443, handled by Nginx/Caddy for SSL processing and request distribution
- **Automatic certificate management**:
  - Nginx: Use `certbot` to apply for separate certificates for each domain
  - Caddy: Automatically apply for and manage certificates for all configured domains

## 5. Web Server Comparison

### Nginx Advantages

- Widely used, rich documentation
- High performance, highly customizable
- Suitable for complex proxy configurations

### Caddy Advantages

- Automatic HTTPS (no need for manual certbot configuration)
- More concise and intuitive configuration
- Automatic certificate renewal
- Out-of-the-box modern HTTP features
