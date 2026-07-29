#!/bin/bash

# Unified CI Test Runner
# Runs the required GitHub Actions suite families locally.
# Run from the project root: bash scripts/run_all_ci_tests.sh

set -uo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track failures
FAILED_TESTS=()

# Track processes for cleanup
RAILS_SERVER_PID=""
RUNNER_DB_CONTAINER=""

# Helper function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

# Helper function to track failures
track_failure() {
    FAILED_TESTS+=("$1")
}

run_tracked() {
    local label="$1"
    shift
    print_header "$label"
    if "$@"; then
        echo -e "${GREEN}✓ ${label} passed${NC}"
    else
        echo -e "${RED}❌ ${label} failed${NC}"
        track_failure "$label"
    fi
}

# Function to check Docker daemon status
check_docker() {
    if ! docker ps >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        echo -e "${YELLOW}Attempting to start Docker Desktop...${NC}"

        if command -v open &> /dev/null && [ -d "/Applications/Docker.app" ]; then
            open -a Docker
            echo "Waiting for Docker to start..."

            # Wait up to 60 seconds for Docker to be ready
            for i in {1..12}; do
                sleep 5
                if docker ps >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Docker is now running${NC}"
                    return 0
                fi
                echo "Still waiting... ($((i*5))s)"
            done

            echo -e "${RED}❌ Docker failed to start within 60 seconds${NC}"
            echo "Please start Docker Desktop manually and try again"
            exit 1
        else
            echo -e "${RED}❌ Docker Desktop not found at /Applications/Docker.app${NC}"
            echo "Please start Docker manually and ensure it's running"
            exit 1
        fi
    fi
    return 0
}

# Cleanup function to stop background processes and optionally clean Docker
cleanup() {
    echo ""
    echo -e "${BLUE}Cleaning up background processes...${NC}"

    # Stop Rails test server if we started it
    if [ -n "$RAILS_SERVER_PID" ]; then
        echo "Stopping Rails test server (PID: $RAILS_SERVER_PID)..."
        kill $RAILS_SERVER_PID 2>/dev/null || true
        wait $RAILS_SERVER_PID 2>/dev/null || true
    fi

    # Remove only the ephemeral database created by this runner. Never stop the
    # application's Compose stack or a caller-managed database.
    if [ -n "$RUNNER_DB_CONTAINER" ]; then
        echo "Stopping runner-owned PostgreSQL container ($RUNNER_DB_CONTAINER)..."
        docker rm -f "$RUNNER_DB_CONTAINER" >/dev/null 2>&1 || true
        RUNNER_DB_CONTAINER=""
    fi

    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Register cleanup on every exit. Signal handlers terminate with a useful code;
# the EXIT handler then performs the same owned-resource cleanup.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

setup_rails_database() {
    if [ -n "${DATABASE_URL:-}" ]; then
        echo -e "${GREEN}✓ Using caller-supplied DATABASE_URL${NC}"
        return 0
    fi

    check_docker

    RUNNER_DB_CONTAINER="meme-search-ci-db-$$-$(date +%s)"
    echo -e "${YELLOW}⚠️  DATABASE_URL is unset; starting an ephemeral pgvector database...${NC}"

    if ! docker run -d --rm \
        --name "$RUNNER_DB_CONTAINER" \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=postgres \
        -p 127.0.0.1::5432 \
        pgvector/pgvector:pg17 >/dev/null; then
        echo -e "${RED}❌ Failed to start the runner-owned PostgreSQL container${NC}"
        return 1
    fi

    local ready=false
    for _ in {1..30}; do
        if docker exec "$RUNNER_DB_CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
            ready=true
            break
        fi
        sleep 1
    done

    if [ "$ready" != "true" ]; then
        echo -e "${RED}❌ Runner-owned PostgreSQL did not become ready${NC}"
        return 1
    fi

    local runner_db_port
    runner_db_port="$(docker inspect \
        --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' \
        "$RUNNER_DB_CONTAINER")"
    if ! [[ "$runner_db_port" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Could not resolve the runner-owned PostgreSQL port${NC}"
        return 1
    fi

    export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:${runner_db_port}/meme_test"
    echo -e "${GREEN}✓ Runner-owned PostgreSQL ready on 127.0.0.1:${runner_db_port}${NC}"
}

# Parse options before prerequisite checks so focused non-Rails commands do not
# require Docker or a database they never use.
SKIP_E2E=false
SKIP_RAILS=false
SKIP_PYTHON=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --skip-rails)
            SKIP_RAILS=true
            shift
            ;;
        --skip-python)
            SKIP_PYTHON=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: bash scripts/run_all_ci_tests.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-e2e      Skip Playwright E2E tests"
            echo "  --skip-rails    Skip all Rails tests"
            echo "  --skip-python   Skip all Python tests"
            echo "  --verbose       Show detailed output"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check prerequisites
print_header "Checking Prerequisites"

# Check if mise is available
if ! command -v mise &> /dev/null; then
    echo -e "${RED}❌ mise not found. Please install mise first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ mise found${NC}"

if [ "$SKIP_RAILS" = false ]; then
    if ! setup_rails_database; then
        exit 1
    fi
fi

# Check if in correct directory
if [ ! -f "package.json" ] || [ ! -d "meme_search" ]; then
    echo -e "${RED}❌ Must run from project root directory${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Running from project root${NC}"

# =============================================================================
# RAILS APP TESTS
# =============================================================================

if [ "$SKIP_RAILS" = false ]; then
    cd meme_search/meme_search_app

    # 1. Brakeman Security Scan
    print_header "Rails: Brakeman Security Scan"
    if mise exec -- bin/brakeman -w3 --no-pager; then
        echo -e "${GREEN}✓ Brakeman security scan passed${NC}"
    else
        echo -e "${RED}❌ Brakeman security scan failed${NC}"
        track_failure "Rails: Brakeman"
    fi

    # 2. JavaScript Security Audit
    print_header "Rails: JavaScript Dependency Audit"
    if mise exec -- bash -c "gem uninstall error_highlight -v 0.3.0 -x 2>/dev/null || true && bin/importmap audit"; then
        echo -e "${GREEN}✓ JavaScript audit passed${NC}"
    else
        echo -e "${RED}❌ JavaScript audit failed${NC}"
        track_failure "Rails: JS Audit"
    fi

    # 3. RuboCop Linting
    print_header "Rails: RuboCop Linting"
    if mise exec -- bash -c "gem uninstall error_highlight -v 0.3.0 -x 2>/dev/null || true && bin/rubocop -f github"; then
        echo -e "${GREEN}✓ RuboCop linting passed${NC}"
    else
        echo -e "${RED}❌ RuboCop linting failed${NC}"
        track_failure "Rails: RuboCop"
    fi

    # 4. Prepare Test Database
    print_header "Rails: Preparing Test Database"
    export RAILS_ENV=test
    if mise exec -- bin/rails db:test:prepare; then
        echo -e "${GREEN}✓ Test database prepared${NC}"
    else
        echo -e "${RED}❌ Failed to prepare test database${NC}"
        if [ -n "${DATABASE_URL:-}" ]; then
            echo "Check that DATABASE_URL points to a reachable PostgreSQL server with pgvector support."
        fi
        track_failure "Rails: DB Prepare"
        cd ../..
        exit 1
    fi

    # Match the workflow's fresh-checkout setup before view-rendering suites.
    print_header "Rails: Precompiling Test Assets"
    if mise exec -- bundle exec rake assets:precompile; then
        echo -e "${GREEN}✓ Test assets precompiled${NC}"
    else
        echo -e "${RED}❌ Failed to precompile test assets${NC}"
        track_failure "Rails: Asset Precompile"
        cd ../..
        exit 1
    fi

    # 5. Run Model Tests
    print_header "Rails: Model Tests"
    if [ "$VERBOSE" = true ]; then
        mise exec -- bin/rails test test/models
    else
        mise exec -- bin/rails test test/models > /tmp/rails_model_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Model tests passed${NC}"
        [ "$VERBOSE" = false ] && tail -5 /tmp/rails_model_tests.log
    else
        echo -e "${RED}❌ Model tests failed${NC}"
        [ -f /tmp/rails_model_tests.log ] && cat /tmp/rails_model_tests.log
        track_failure "Rails: Model Tests"
    fi

    # 6. Run Controller Tests
    print_header "Rails: Controller Tests"
    if [ "$VERBOSE" = true ]; then
        mise exec -- bin/rails test test/controllers
    else
        mise exec -- bin/rails test test/controllers > /tmp/rails_controller_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Controller tests passed${NC}"
        [ "$VERBOSE" = false ] && tail -5 /tmp/rails_controller_tests.log
    else
        echo -e "${RED}❌ Controller tests failed${NC}"
        [ -f /tmp/rails_controller_tests.log ] && cat /tmp/rails_controller_tests.log
        track_failure "Rails: Controller Tests"
    fi

    # 7. Run Channel Tests
    print_header "Rails: Channel Tests"
    if [ "$VERBOSE" = true ]; then
        mise exec -- bin/rails test test/channels
    else
        mise exec -- bin/rails test test/channels > /tmp/rails_channel_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Channel tests passed${NC}"
        [ "$VERBOSE" = false ] && tail -5 /tmp/rails_channel_tests.log
    else
        echo -e "${RED}❌ Channel tests failed${NC}"
        [ -f /tmp/rails_channel_tests.log ] && cat /tmp/rails_channel_tests.log
        track_failure "Rails: Channel Tests"
    fi

    # Required Rails suites that have dedicated CI steps.
    run_tracked "Rails: Service Tests" mise exec -- bin/rails test test/services
    run_tracked "Rails: API Contract Tests" mise exec -- bin/rails test test/contracts
    run_tracked "Rails: Database and Migration Tests" mise exec -- bin/rails test test/db
    run_tracked "Rails: Rake Task Tests" mise exec -- bin/rails test test/tasks

    cd ../..
fi

# =============================================================================
# PYTHON SERVICE TESTS
# =============================================================================

if [ "$SKIP_PYTHON" = false ]; then
    cd meme_search/image_to_text_generator

    # 1. Ruff Linting
    print_header "Python: Ruff Linting"
    if mise exec -- ruff check app/; then
        echo -e "${GREEN}✓ Ruff linting passed${NC}"
    else
        echo -e "${RED}❌ Ruff linting failed${NC}"
        track_failure "Python: Ruff"
    fi

    # 2. Integration Tests
    print_header "Python: Integration Tests"
    if [ "$VERBOSE" = true ]; then
        mise exec -- pytest tests/test_app.py -v
    else
        mise exec -- pytest tests/test_app.py -v > /tmp/python_integration_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        [ "$VERBOSE" = false ] && tail -10 /tmp/python_integration_tests.log
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        [ -f /tmp/python_integration_tests.log ] && cat /tmp/python_integration_tests.log
        track_failure "Python: Integration Tests"
    fi

    # 3. Unit Tests with Coverage
    print_header "Python: Unit Tests with Coverage"
    if [ "$VERBOSE" = true ]; then
        mise exec -- pytest tests/unit/ --cov=app --cov-report=term-missing --cov-fail-under=60
    else
        mise exec -- pytest tests/unit/ --cov=app --cov-report=term-missing --cov-fail-under=60 > /tmp/python_unit_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Unit tests with coverage passed${NC}"
        [ "$VERBOSE" = false ] && tail -15 /tmp/python_unit_tests.log
    else
        echo -e "${RED}❌ Unit tests with coverage failed${NC}"
        [ -f /tmp/python_unit_tests.log ] && cat /tmp/python_unit_tests.log
        track_failure "Python: Unit Tests"
    fi

    cd ../..
fi

# =============================================================================
# ROOT CONTRACT AND LOCAL INTEGRATION CLIENTS
# =============================================================================

# The focused test:rails and test:python aliases intentionally remain focused.
# The default/test:ci entrypoint runs the complete cross-project CI surface.
if [ "$SKIP_RAILS" = false ] && [ "$SKIP_PYTHON" = false ]; then
    run_tracked "Repository: OpenAPI 3.1 Contract" npm run contract:openapi
    run_tracked "Repository: Node Dependency Audit" npm audit --audit-level=high
    run_tracked "Repository: TypeScript Check" npx tsc --noEmit
    run_tracked "Repository: Discord Link Check" bash scripts/validate_discord_link.sh

    run_tracked "Local CLI: Tests" \
        bash -c "cd integrations/cli && python3 -m unittest discover -v && python3 -m py_compile meme_search_cli.py meme-search"
    run_tracked "Browser Extension: Tests and Static Checks" \
        bash -c "cd integrations/browser-extension && npm test && npm run check && node -e 'JSON.parse(require(\"fs\").readFileSync(\"manifest.json\", \"utf8\"))' && ! rg 'innerHTML|outerHTML|insertAdjacentHTML' . --glob '*.js' && ! rg --pcre2 'https?://(?!127\\.0\\.0\\.1|localhost)' . --glob '*.js' --glob '!test/**'"
fi

# =============================================================================
# PLAYWRIGHT E2E TESTS
# =============================================================================

if [ "$SKIP_E2E" = false ] && [ "$SKIP_RAILS" = false ]; then
    print_header "Playwright: E2E Tests"

    # Check if Rails test server is running
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Rails test server not running. Starting in background...${NC}"
        cd meme_search/meme_search_app
        mise exec -- bin/rails db:test:seed
        mise exec -- bin/rails server -e test -p 3000 > /tmp/rails_test_server.log 2>&1 &
        RAILS_SERVER_PID=$!
        cd ../..

        echo "Waiting for Rails server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Rails test server started${NC}"
                break
            fi
            sleep 1
        done

        if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${RED}❌ Failed to start Rails test server${NC}"
            kill $RAILS_SERVER_PID 2>/dev/null || true
            track_failure "Playwright: Server Start"
        fi
    else
        echo -e "${GREEN}✓ Rails test server already running${NC}"
        RAILS_SERVER_PID=""
    fi

    # Run Playwright tests
    if [ "$VERBOSE" = true ]; then
        npm run test:e2e
    else
        npm run test:e2e > /tmp/playwright_tests.log 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Playwright E2E tests passed${NC}"
        [ "$VERBOSE" = false ] && tail -10 /tmp/playwright_tests.log
    else
        echo -e "${RED}❌ Playwright E2E tests failed${NC}"
        [ -f /tmp/playwright_tests.log ] && cat /tmp/playwright_tests.log
        track_failure "Playwright: E2E Tests"
    fi

    # Note: Rails server cleanup is handled by the cleanup trap at exit
elif [ "$SKIP_E2E" = true ]; then
    print_header "Playwright: E2E Tests (SKIPPED)"
    echo -e "${YELLOW}⚠️  E2E tests skipped (--skip-e2e flag)${NC}"
fi

# =============================================================================
# FINAL SUMMARY
# =============================================================================

print_header "Test Results Summary"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Your code is ready to push to CI."
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${RED}Failed test suites:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}  ✗ $test${NC}"
    done
    echo ""
    echo "Please fix the failing tests before pushing to CI."
    exit 1
fi
