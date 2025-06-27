#!/bin/bash

# Color settings
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure script is run with root privileges
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run this script with sudo or as root user${NC}"
    exit 1
fi

# Get project path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
echo -e "${YELLOW}Project path: ${SCRIPT_DIR}${NC}"

# Confirm domain name
echo -e "${YELLOW}Please enter your domain name (e.g.: ideabase.example.com):${NC}"
read -r DOMAIN

# Check if domain is empty
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: No domain provided${NC}"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &>/dev/null; then
    echo -e "${YELLOW}Nginx not installed, installing...${NC}"
    apt-get update
    apt-get install -y nginx
else
    echo -e "${GREEN}Nginx is installed${NC}"
fi

# Check if configuration file exists
NGINX_CONF="${SCRIPT_DIR}/ideabase-nginx.conf"
if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}Error: $NGINX_CONF file does not exist${NC}"
    exit 1
fi

# Replace domain name in configuration file
echo -e "${YELLOW}Updating domain name in Nginx configuration...${NC}"
sed -i "s/ideabase.example.com/$DOMAIN/g" "$NGINX_CONF"

# Create site configuration file
echo -e "${YELLOW}Creating Nginx site configuration...${NC}"
cp "$NGINX_CONF" "/etc/nginx/sites-available/ideabase"

# Enable site
echo -e "${YELLOW}Enabling site...${NC}"
ln -sf "/etc/nginx/sites-available/ideabase" "/etc/nginx/sites-enabled/ideabase"

# Ask if SSL configuration is needed
echo -e "${YELLOW}Do you need to configure SSL certificate? (y/n)${NC}"
read -r SSL_CHOICE

if [[ "$SSL_CHOICE" == "y" ]]; then
    # Check if certbot is installed
    if ! command -v certbot &>/dev/null; then
        echo -e "${YELLOW}Certbot not installed, installing...${NC}"
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi

    # Configure SSL certificate
    echo -e "${YELLOW}Configuring SSL certificate...${NC}"
    certbot --nginx -d "$DOMAIN"
else
    echo -e "${YELLOW}Skipping SSL certificate configuration, please configure manually later${NC}"
    # Backup and modify configuration file to remove SSL related configuration
    cp "/etc/nginx/sites-available/ideabase" "/etc/nginx/sites-available/ideabase.bak"
    echo "server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}" >"/etc/nginx/sites-available/ideabase"
fi

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${YELLOW}Restarting Nginx...${NC}"
    systemctl restart nginx

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Nginx configuration completed!${NC}"
    echo -e "${GREEN}Your IdeaBase can now be accessed at:${NC}"
    if [[ "$SSL_CHOICE" == "y" ]]; then
        echo -e "${GREEN}https://$DOMAIN${NC}"
    else
        echo -e "${GREEN}http://$DOMAIN${NC}"
    fi
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}Nginx configuration test failed, please check configuration${NC}"
    exit 1
fi
