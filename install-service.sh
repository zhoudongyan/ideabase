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

# Confirm service name
SERVICE_NAME="ideabase"
SERVICE_FILE="${SERVICE_NAME}.service"

# Check if service file exists
if [ ! -f "${SCRIPT_DIR}/${SERVICE_FILE}" ]; then
    echo -e "${RED}Error: ${SERVICE_FILE} file does not exist${NC}"
    exit 1
fi

# Update path in service file
echo -e "${YELLOW}Updating path in service file...${NC}"
sed -i "s|WorkingDirectory=.*|WorkingDirectory=${SCRIPT_DIR}|g" "${SCRIPT_DIR}/${SERVICE_FILE}"
sed -i "s|ExecStart=.*|ExecStart=${SCRIPT_DIR}/manage.sh prod -d|g" "${SCRIPT_DIR}/${SERVICE_FILE}"

# Copy to systemd service directory
echo -e "${YELLOW}Installing service to systemd...${NC}"
cp "${SCRIPT_DIR}/${SERVICE_FILE}" "/etc/systemd/system/"

# Reload systemd configuration
echo -e "${YELLOW}Reloading systemd configuration...${NC}"
systemctl daemon-reload

# Enable service
echo -e "${YELLOW}Enabling ${SERVICE_NAME} service...${NC}"
systemctl enable ${SERVICE_NAME}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}IdeaBase service has been successfully installed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}You can now manage the service with the following commands:${NC}"
echo -e "  Start service:   ${GREEN}sudo systemctl start ${SERVICE_NAME}${NC}"
echo -e "  Stop service:    ${GREEN}sudo systemctl stop ${SERVICE_NAME}${NC}"
echo -e "  Restart service: ${GREEN}sudo systemctl restart ${SERVICE_NAME}${NC}"
echo -e "  Check status:    ${GREEN}sudo systemctl status ${SERVICE_NAME}${NC}"
echo -e "  View logs:       ${GREEN}sudo journalctl -u ${SERVICE_NAME}${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Would you like to start the service now? (y/n)${NC}"
read -r response
if [[ "$response" == "y" ]]; then
    echo -e "${YELLOW}Starting service...${NC}"
    systemctl start ${SERVICE_NAME}
    echo -e "${YELLOW}Service status:${NC}"
    systemctl status ${SERVICE_NAME}
else
    echo -e "${YELLOW}Service not started. You can start it manually later.${NC}"
fi
