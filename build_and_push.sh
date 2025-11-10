#!/bin/bash

# Build and Push Docker Images for Meme Search
#
# Quick Start:
#   ./build_and_push.sh                      # Build all ARM64 images and push
#   ./build_and_push.sh --platform multi     # Build AMD64 + ARM64 images
#   ./build_and_push.sh --service app        # Build only Rails app
#   ./build_and_push.sh --no-push            # Build locally without pushing
#
# Options:
#   --platform <arm64|amd64|multi>  Platform to build [default: arm64]
#   --service <app|python|all>      Service to build [default: all]
#   --user <username>               GitHub username [default: neonwatty]
#   --no-push                       Build locally without pushing
#   --help                          Show detailed help

set -e

# Default values
PLATFORM="linux/arm64"
SERVICE="all"
GITHUB_USER="neonwatty"
PUSH_FLAG="--push"
PLATFORM_NAME="arm64"

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform)
      case $2 in
        arm64)
          PLATFORM="linux/arm64"
          PLATFORM_NAME="arm64"
          ;;
        amd64)
          PLATFORM="linux/amd64"
          PLATFORM_NAME="amd64"
          ;;
        multi)
          PLATFORM="linux/amd64,linux/arm64"
          PLATFORM_NAME="multi-platform"
          ;;
        *)
          echo -e "${RED}Error: Invalid platform. Use arm64, amd64, or multi${NC}"
          exit 1
          ;;
      esac
      shift 2
      ;;
    --service)
      case $2 in
        app|python|all)
          SERVICE=$2
          ;;
        *)
          echo -e "${RED}Error: Invalid service. Use app, python, or all${NC}"
          exit 1
          ;;
      esac
      shift 2
      ;;
    --user)
      GITHUB_USER=$2
      shift 2
      ;;
    --no-push)
      PUSH_FLAG="--load"
      shift
      ;;
    --help)
      echo "Build and Push Docker Images Script"
      echo ""
      echo "Usage: ./build_and_push.sh [OPTIONS]"
      echo ""
      echo "OPTIONS:"
      echo "  --platform <platform>   Platform to build (arm64, amd64, multi) [default: arm64]"
      echo "  --service <service>     Service to build (app, python, all) [default: all]"
      echo "  --user <username>       GitHub username [default: neonwatty]"
      echo "  --no-push              Build locally without pushing to registry"
      echo "  --help                 Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./build_and_push.sh                                    # Build all services for ARM64 and push"
      echo "  ./build_and_push.sh --platform multi                  # Build multi-platform images"
      echo "  ./build_and_push.sh --service app --platform arm64    # Build only Rails app for ARM64"
      echo "  ./build_and_push.sh --no-push                         # Build locally without pushing"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if running from project root
if [ ! -d "meme_search/meme_search_app" ] || [ ! -d "meme_search/image_to_text_generator" ]; then
  echo -e "${RED}Error: Must run from meme-search project root directory${NC}"
  exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed${NC}"
  exit 1
fi

# Note about multi-platform and --load
if [ "$PUSH_FLAG" = "--load" ] && [ "$PLATFORM" = "linux/amd64,linux/arm64" ]; then
  echo -e "${RED}Error: Cannot use --no-push with multi-platform builds${NC}"
  echo -e "${YELLOW}Multi-platform builds must be pushed to a registry${NC}"
  exit 1
fi

# Print configuration
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Platform:     ${GREEN}${PLATFORM_NAME}${NC}"
echo -e "Service:      ${GREEN}${SERVICE}${NC}"
echo -e "GitHub User:  ${GREEN}${GITHUB_USER}${NC}"
if [ "$PUSH_FLAG" = "--push" ]; then
  echo -e "Action:       ${GREEN}Build and Push${NC}"
else
  echo -e "Action:       ${GREEN}Build Locally${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to build and push
build_service() {
  local service_name=$1
  local context_path=$2
  local image_name=$3

  echo -e "${BLUE}Building ${service_name} (${PLATFORM_NAME})...${NC}"

  START_TIME=$(date +%s)

  docker buildx build --platform "$PLATFORM" \
    -t "ghcr.io/${GITHUB_USER}/${image_name}:latest" \
    $PUSH_FLAG \
    "$context_path"

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  echo -e "${GREEN}✓ ${service_name} completed in $((DURATION / 60))m $((DURATION % 60))s${NC}"
  echo ""
}

# Build services
if [ "$SERVICE" = "app" ] || [ "$SERVICE" = "all" ]; then
  build_service "Rails App" "./meme_search/meme_search_app" "meme_search"
fi

if [ "$SERVICE" = "python" ] || [ "$SERVICE" = "all" ]; then
  build_service "Python Image-to-Text Service" "./meme_search/image_to_text_generator" "image_to_text_generator"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All builds completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

if [ "$PUSH_FLAG" = "--push" ]; then
  echo ""
  echo -e "Images pushed to:"
  if [ "$SERVICE" = "app" ] || [ "$SERVICE" = "all" ]; then
    echo -e "  ${BLUE}ghcr.io/${GITHUB_USER}/meme_search:latest${NC}"
  fi
  if [ "$SERVICE" = "python" ] || [ "$SERVICE" = "all" ]; then
    echo -e "  ${BLUE}ghcr.io/${GITHUB_USER}/image_to_text_generator:latest${NC}"
  fi
fi
