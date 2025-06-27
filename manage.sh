#!/bin/bash

# Color settings
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default mode and options
MODE=""
REBUILD=false
CLEAN=false
BACKUP=false
DETACH=false

# Help information
show_help() {
    echo -e "IdeaBase Environment Management Script"
    echo -e "Usage: ./manage.sh [mode] [options]"
    echo -e ""
    echo -e "Modes:"
    echo -e "  dev             Development environment mode"
    echo -e "  prod            Production environment mode"
    echo -e ""
    echo -e "Common options:"
    echo -e "  -h, --help      Show help information"
    echo -e "  -r, --rebuild   Force rebuild containers"
    echo -e "  -d, --detach    Start without following logs (suitable for server deployment)"
    echo -e ""
    echo -e "Development environment options:"
    echo -e "  -c, --clean     Completely clean and rebuild environment"
    echo -e ""
    echo -e "Production environment options:"
    echo -e "  -b, --backup    Backup database before deployment"
    echo -e ""
    echo -e "Examples:"
    echo -e "  ./manage.sh dev           # Start development environment"
    echo -e "  ./manage.sh dev -c        # Clean and rebuild development environment"
    echo -e "  ./manage.sh prod          # Deploy production environment"
    echo -e "  ./manage.sh prod -b -r    # Backup database and rebuild production environment containers"
    echo -e "  ./manage.sh prod -d       # Deploy production environment without showing logs (background run)"
}

# Check if the first argument is a mode
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

MODE=$1
shift

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
    -h | --help)
        show_help
        exit 0
        ;;
    -r | --rebuild)
        REBUILD=true
        ;;
    -d | --detach)
        DETACH=true
        ;;
    -c | --clean)
        if [ "$MODE" == "dev" ]; then
            CLEAN=true
            REBUILD=true
        else
            echo -e "${RED}Error: -c/--clean option is only supported in development environment mode${NC}"
            exit 1
        fi
        ;;
    -b | --backup)
        if [ "$MODE" == "prod" ]; then
            BACKUP=true
        else
            echo -e "${RED}Error: -b/--backup option is only supported in production environment mode${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
    esac
    shift
done

# Enable BuildKit to accelerate builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Check if Docker is installed and running
if ! command -v docker &>/dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! docker info &>/dev/null; then
    echo -e "${RED}Error: Docker service is not running. Please start Docker service and try again.${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &>/dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

# Check configuration files
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml file not found.${NC}"
    exit 1
fi

if [ "$MODE" == "prod" ] && [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml file not found.${NC}"
    exit 1
fi

# Check and create environment configuration file
check_env_file() {
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}Environment configuration file not found, creating default configuration...${NC}"
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            echo -e "${GREEN}Environment configuration file created from .env.example${NC}"
        else
            echo "OPENAI_API_KEY=your_api_key_here" >backend/.env
            echo "OPENAI_MODEL=gpt-4" >>backend/.env
            echo "OPENAI_BASE_URL=https://api.openai.com/v1" >>backend/.env
            echo "POSTGRES_USER=postgres" >>backend/.env
            echo "POSTGRES_PASSWORD=postgres" >>backend/.env
            echo "POSTGRES_DB=ideabase" >>backend/.env
            echo "POSTGRES_SERVER=db" >>backend/.env
            echo "GITHUB_TOKEN=" >>backend/.env
            echo "REDIS_HOST=redis" >>backend/.env
            echo "REDIS_PORT=6379" >>backend/.env
            echo -e "${GREEN}Default environment configuration file created${NC}"
        fi

        # Development environment requires manual confirmation
        if [ "$MODE" == "dev" ]; then
            echo -e "${YELLOW}Please edit the backend/.env file and set your OpenAI API key${NC}"
            echo -e "${YELLOW}Press any key to continue...${NC}"
            read -n 1 -s
        else
            # Production environment requires confirmation to continue
            echo -e "${RED}Please ensure correct environment variables are set before deployment, especially OPENAI_API_KEY${NC}"
            echo -e "${YELLOW}Continue? (y/n)${NC}"
            read -r response
            if [[ "$response" != "y" ]]; then
                echo -e "${RED}Operation cancelled${NC}"
                exit 1
            fi
        fi
    else
        # If .env exists but missing some necessary configurations, add default values
        if ! grep -q "OPENAI_API_KEY" backend/.env; then
            echo -e "${YELLOW}Adding missing OPENAI_API_KEY configuration...${NC}"
            echo "OPENAI_API_KEY=your_api_key_here" >>backend/.env
        fi
        if ! grep -q "OPENAI_BASE_URL" backend/.env; then
            echo -e "${YELLOW}Adding missing OPENAI_BASE_URL configuration...${NC}"
            echo "OPENAI_BASE_URL=https://api.openai.com/v1" >>backend/.env
        fi
        if ! grep -q "REDIS_HOST" backend/.env; then
            echo -e "${YELLOW}Adding missing Redis configuration...${NC}"
            echo "REDIS_HOST=redis" >>backend/.env
            echo "REDIS_PORT=6379" >>backend/.env
        fi

        # Additional backup configuration for production environment
        if [ "$MODE" == "prod" ]; then
            echo -e "${YELLOW}Backing up current environment configuration...${NC}"
            cp backend/.env backend/.env.backup.$(date +%Y%m%d%H%M%S)
        fi
    fi

    # Check if OPENAI_API_KEY is set
    if [ -z "${OPENAI_API_KEY}" ]; then
        if grep -q "OPENAI_API_KEY=your_api_key_here" backend/.env || ! grep -q "OPENAI_API_KEY=" backend/.env; then
            echo -e "${RED}Warning: OPENAI_API_KEY environment variable is not set!${NC}"
            echo -e "${YELLOW}You can set it by:${NC}"
            echo -e "  1. Edit backend/.env file to set OPENAI_API_KEY"
            echo -e "  2. Or use in command line: export OPENAI_API_KEY=your_actual_key"
            echo -e "${YELLOW}Confirm to continue? (y/n)${NC}"
            read -r response
            if [[ "$response" != "y" ]]; then
                echo -e "${RED}Operation cancelled${NC}"
                exit 1
            fi
        fi
    fi

    # Configure frontend environment file
    if [ ! -f "frontend/.env" ]; then
        echo -e "${YELLOW}Creating frontend environment configuration file...${NC}"
        touch frontend/.env
    fi

    # Set API URL based on different modes
    if [ "$MODE" == "dev" ]; then
        echo -e "${YELLOW}Configuring development environment frontend API URL...${NC}"
        echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >frontend/.env
    else
        echo -e "${YELLOW}Configuring production environment frontend API URL...${NC}"
        # Get current domain, use default if not set
        DOMAIN=${DOMAIN:-"ideabase.ai"}
        echo "NEXT_PUBLIC_API_URL=https://$DOMAIN" >frontend/.env
        echo -e "${GREEN}Frontend API URL set: https://$DOMAIN${NC}"
    fi
}

# Development environment mode
run_dev_mode() {
    echo -e "${YELLOW}Starting IdeaBase.ai development environment...${NC}"

    # Check environment configuration
    check_env_file

    # Clean mode - stop and remove all containers and volumes
    if $CLEAN; then
        echo -e "${YELLOW}Cleaning development environment...${NC}"
        docker-compose down -v
        echo -e "${GREEN}Development environment cleaned${NC}"
    fi

    # Build containers if rebuild is needed or first time startup
    if $REBUILD; then
        echo -e "${YELLOW}Building development environment containers...${NC}"
        docker-compose build
    fi

    # Start development environment
    echo -e "${YELLOW}Starting development environment containers...${NC}"
    docker-compose up -d

    # Check if containers started successfully
    echo -e "${YELLOW}Checking service status...${NC}"
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}Warning: Some services may not have started properly. Please check logs for details.${NC}"
    fi

    # Display backend service logs
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}IdeaBase.ai development environment started!${NC}"
    echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
    echo -e "${GREEN}API: http://localhost:8000/docs${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}Development environment supports hot reload:${NC}"
    echo -e "  - Frontend code changes will auto-refresh"
    echo -e "  - Backend code changes will auto-restart service"
    echo -e "${GREEN}========================================${NC}"

    # Show logs only in non-detached mode
    if ! $DETACH; then
        echo -e "${YELLOW}Showing backend service logs (Ctrl+C to exit)${NC}"
        docker-compose logs -f backend
    else
        echo -e "${GREEN}Services started in background, use the following command to view logs:${NC}"
        echo -e "  docker-compose logs -f backend"
    fi
}

# Production environment mode
run_prod_mode() {
    echo -e "${YELLOW}Starting IdeaBase.ai production environment deployment...${NC}"

    # Check environment configuration
    check_env_file

    # Pull latest code (if deploying from Git repository)
    if [ -d ".git" ]; then
        echo -e "${YELLOW}Pulling latest code...${NC}"
        if ! git pull; then
            echo -e "${RED}Warning: Unable to pull latest code. Continuing deployment with current code.${NC}"
        fi
    fi

    # Backup database if needed
    if $BACKUP; then
        echo -e "${YELLOW}Backing up database...${NC}"
        BACKUP_FILE="ideabase_backup_$(date +%Y%m%d%H%M%S).sql"
        if docker-compose exec -T db pg_dump -U postgres ideabase >"$BACKUP_FILE" 2>/dev/null; then
            echo -e "${GREEN}Database backed up to: $BACKUP_FILE${NC}"
        else
            echo -e "${RED}Warning: Database backup failed, database may not be running or name mismatch${NC}"
            echo -e "${YELLOW}Continue deployment? (y/n)${NC}"
            read -r response
            if [[ "$response" != "y" ]]; then
                echo -e "${RED}Deployment cancelled${NC}"
                exit 1
            fi
        fi
    fi

    # Stop existing containers
    echo -e "${YELLOW}Stopping existing containers...${NC}"
    docker-compose down

    # Rebuild if needed
    if $REBUILD; then
        echo -e "${YELLOW}Building new containers...${NC}"
        if ! docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache; then
            echo -e "${RED}Container build failed. Please check logs for details.${NC}"
            exit 1
        fi
    fi

    # Start production environment
    echo -e "${YELLOW}Starting production environment containers...${NC}"
    if ! docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d; then
        echo -e "${RED}Container startup failed. Please check logs for details.${NC}"
        exit 1
    fi

    # Check if containers started successfully
    echo -e "${YELLOW}Checking service status...${NC}"
    sleep 5
    if docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps | grep -q "Up"; then
        # Get current domain if set
        DOMAIN=${DOMAIN:-"ideabase.ai"}
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}IdeaBase.ai successfully deployed!${NC}"
        echo -e "${GREEN}Frontend: https://$DOMAIN${NC}"
        echo -e "${GREEN}API: https://$DOMAIN/api${NC}"
        echo -e "${GREEN}========================================${NC}"
    else
        echo -e "${RED}Deployment may have issues, please check container status:${NC}"
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    fi

    # Show logs only in non-detached mode
    if ! $DETACH; then
        echo -e "${YELLOW}Showing service logs (Ctrl+C to exit):${NC}"
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    else
        echo -e "${GREEN}Services started in background, use the following command to view logs:${NC}"
        echo -e "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
    fi
}

# Execute operations based on mode
case $MODE in
dev)
    run_dev_mode
    ;;
prod)
    run_prod_mode
    ;;
*)
    echo -e "${RED}Error: Invalid mode '$MODE'${NC}"
    echo -e "Valid modes: dev, prod"
    show_help
    exit 1
    ;;
esac
