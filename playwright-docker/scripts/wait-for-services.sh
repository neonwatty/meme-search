#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.docker-e2e"

if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}Loading environment from $ENV_FILE${NC}"
  set -a
  source "$ENV_FILE"
  set +a
else
  echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
  exit 1
fi

# Configuration
TIMEOUT=${SERVICE_HEALTH_TIMEOUT:-120}
INTERVAL=2
ELAPSED=0

echo -e "${YELLOW}Waiting for services to become healthy...${NC}"
echo -e "Timeout: ${TIMEOUT}s, Check interval: ${INTERVAL}s"
echo ""

# Function to check PostgreSQL
check_postgres() {
  docker exec meme_search_e2e_postgres pg_isready -U postgres -d meme_search_e2e > /dev/null 2>&1
}

# Function to check Rails
check_rails() {
  curl -sf http://localhost:3001/ > /dev/null 2>&1
}

# Function to check Python
check_python() {
  curl -sf http://localhost:8000/ > /dev/null 2>&1
}

# Wait for PostgreSQL
echo -n "PostgreSQL: "
while ! check_postgres; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}TIMEOUT${NC}"
    echo -e "${RED}PostgreSQL did not become healthy within ${TIMEOUT}s${NC}"
    docker logs meme_search_e2e_postgres --tail 50
    exit 1
  fi
  echo -n "."
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo -e " ${GREEN}HEALTHY${NC}"

# Wait for Rails
ELAPSED=0
echo -n "Rails App:  "
while ! check_rails; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}TIMEOUT${NC}"
    echo -e "${RED}Rails did not become healthy within ${TIMEOUT}s${NC}"
    docker logs meme_search_e2e_rails --tail 50
    exit 1
  fi
  echo -n "."
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo -e " ${GREEN}HEALTHY${NC}"

# Wait for Python
ELAPSED=0
echo -n "Python API: "
while ! check_python; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}TIMEOUT${NC}"
    echo -e "${RED}Python service did not become healthy within ${TIMEOUT}s${NC}"
    docker logs meme_search_e2e_python --tail 50
    exit 1
  fi
  echo -n "."
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo -e " ${GREEN}HEALTHY${NC}"

echo ""
echo -e "${GREEN} All services are healthy!${NC}"
echo ""
echo "Service URLs:"
echo "  Rails:      http://localhost:3001"
echo "  Python API: http://localhost:8000"
echo "  PostgreSQL: localhost:5433"
echo ""
