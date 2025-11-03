#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW${NC}"
echo -e "${BLUE}Q  Docker E2E Test Environment Teardown Q${NC}"
echo -e "${BLUE}ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

cd "$PROJECT_ROOT"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Save logs
echo -e "${YELLOW}Saving service logs...${NC}"
docker compose -f docker-compose.e2e.yml logs > "$LOG_DIR/docker-e2e-${TIMESTAMP}.log" 2>&1 || true
echo -e "${GREEN} Logs saved to $LOG_DIR/docker-e2e-${TIMESTAMP}.log${NC}"

# Stop and remove containers
echo -e "${YELLOW}Stopping Docker services...${NC}"
docker compose -f docker-compose.e2e.yml down

if [ $? -ne 0 ]; then
  echo -e "${RED} Failed to stop services${NC}"
  exit 1
fi
echo -e "${GREEN} Services stopped${NC}"

# Ask about volume removal
read -p "Remove volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Removing volumes...${NC}"
  docker compose -f docker-compose.e2e.yml down -v
  echo -e "${GREEN} Volumes removed${NC}"
else
  echo -e "${YELLOW}Volumes preserved${NC}"
fi

echo ""
echo -e "${GREEN} Teardown complete${NC}"
echo ""
echo -e "Logs available at: ${BLUE}$LOG_DIR/docker-e2e-${TIMESTAMP}.log${NC}"
echo ""
