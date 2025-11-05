#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW${NC}"
echo -e "${BLUE}Q  Docker E2E Test Environment Setup    Q${NC}"
echo -e "${BLUE}ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.docker-e2e"

# Cleanup function to ensure Docker services are stopped on any exit
cleanup_on_exit() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠ Setup interrupted or failed - cleaning up Docker services...${NC}"
    cd "$PROJECT_ROOT" 2>/dev/null || true
    docker compose -f docker-compose.e2e.yml down -v --remove-orphans 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
  fi
}

# Set trap to cleanup on script error/interrupt (not on successful exit)
trap cleanup_on_exit ERR INT TERM

# Load environment
if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}✓ Loading environment from $ENV_FILE${NC}"
  set -a
  source "$ENV_FILE"
  set +a
else
  echo -e "${RED}✗ Error: Environment file not found: $ENV_FILE${NC}"
  exit 1
fi

cd "$PROJECT_ROOT"

# Clean up previous containers and volumes FIRST
echo -e "${YELLOW}Cleaning up previous test environment...${NC}"
docker compose -f docker-compose.e2e.yml down -v --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Check for port conflicts (after cleanup)
echo -e "${YELLOW}Checking for port conflicts...${NC}"
PORTS_IN_USE=""
for PORT in 3001 5433; do
  if lsof -ti:$PORT > /dev/null 2>&1; then
    PORTS_IN_USE="$PORTS_IN_USE $PORT"
  fi
done

if [ -n "$PORTS_IN_USE" ]; then
  echo -e "${RED}✗ Ports in use:$PORTS_IN_USE${NC}"
  echo -e "${YELLOW}Run: lsof -ti:3001,5433 | xargs kill -9${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Ports 3001, 5433 are available${NC}"

# Build images
echo -e "${YELLOW}Building Docker images (this may take a few minutes)...${NC}"
docker compose -f docker-compose.e2e.yml build

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Docker build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Images built successfully${NC}"

# Start services
echo -e "${YELLOW}Starting Docker services...${NC}"
docker compose -f docker-compose.e2e.yml up -d

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Failed to start services${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Wait for services to be healthy
bash "$SCRIPT_DIR/wait-for-services.sh"

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Services did not become healthy${NC}"
  echo -e "${YELLOW}Displaying recent logs:${NC}"
  docker compose -f docker-compose.e2e.yml logs --tail=50
  exit 1
fi

# Display helpful information
echo -e "${BLUE}TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW${NC}"
echo -e "${BLUE}Q     Environment Ready for Testing     Q${NC}"
echo -e "${BLUE}ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]${NC}"
echo ""
echo -e "${GREEN}Run tests:${NC}"
echo "  npm run test:e2e:docker:run"
echo ""
echo -e "${GREEN}View logs:${NC}"
echo "  docker compose -f docker-compose.e2e.yml logs -f"
echo ""
echo -e "${GREEN}Access services:${NC}"
echo "  docker exec -it meme_search_e2e_rails bin/rails console"
echo "  docker exec -it meme_search_e2e_postgres psql -U postgres -d meme_search_e2e"
echo ""
echo -e "${GREEN}Teardown:${NC}"
echo "  npm run test:e2e:docker:teardown"
echo ""
