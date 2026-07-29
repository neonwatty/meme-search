#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="$PROJECT_ROOT/scripts/run_all_ci_tests.sh"
TEST_ROOT="$(mktemp -d)"

cleanup() {
    rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

assert_contains() {
    local file="$1"
    local expected="$2"
    rg -F -- "$expected" "$file" >/dev/null || fail "$file does not contain: $expected"
}

assert_not_contains() {
    local file="$1"
    local unexpected="$2"
    if rg -F -- "$unexpected" "$file" >/dev/null 2>&1; then
        fail "$file unexpectedly contains: $unexpected"
    fi
}

make_stubs() {
    local case_dir="$1"
    mkdir -p "$case_dir/bin"

    cat > "$case_dir/bin/docker" <<'EOF'
#!/bin/bash
set -euo pipefail
echo "$*|${DATABASE_URL:-unset}" >> "$STUB_LOG"
case "${1:-}" in
    ps) exit 0 ;;
    run)
        printf '%s\n' "fake-container-id"
        exit 0
        ;;
    exec) exit 0 ;;
    inspect)
        printf '%s\n' "49152"
        exit 0
        ;;
    rm) exit 0 ;;
esac
exit 0
EOF

    cat > "$case_dir/bin/mise" <<'EOF'
#!/bin/bash
set -euo pipefail
echo "$*|${DATABASE_URL:-unset}" >> "$STUB_LOG"
if [[ "$*" == *"bin/rails db:test:prepare"* ]] && [ "${STUB_DB_PREPARE_FAIL:-false}" = "true" ]; then
    exit 1
fi
if [[ "$*" == *"bin/rails db:test:prepare"* ]] && [ "${STUB_SIGNAL_PARENT:-false}" = "true" ]; then
    touch "$STUB_BLOCK_MARKER"
    kill -TERM "$PPID"
    sleep 1
fi
exit 0
EOF

    chmod +x "$case_dir/bin/docker" "$case_dir/bin/mise"
}

run_case() {
    local name="$1"
    shift
    local case_dir="$TEST_ROOT/$name"
    mkdir -p "$case_dir"
    make_stubs "$case_dir"
    : > "$case_dir/log"
    (
        cd "$PROJECT_ROOT"
        env PATH="$case_dir/bin:/usr/bin:/bin" \
            STUB_LOG="$case_dir/log" \
            "$@" \
            bash "$RUNNER" --skip-python --skip-e2e >/dev/null 2>&1
    )
}

unset_case="$TEST_ROOT/unset"
run_case unset env -u DATABASE_URL
assert_contains "$unset_case/log" "run -d --rm --name meme-search-ci-db-"
assert_contains "$unset_case/log" "-p 127.0.0.1::5432"
assert_contains "$unset_case/log" "bin/rails db:test:prepare|postgres://postgres:postgres@127.0.0.1:49152/meme_test"
assert_contains "$unset_case/log" "bundle exec rake assets:precompile|postgres://postgres:postgres@127.0.0.1:49152/meme_test"
assert_contains "$unset_case/log" "rm -f meme-search-ci-db-"
assert_not_contains "$unset_case/log" "docker compose"

provided_case="$TEST_ROOT/provided"
run_case provided env DATABASE_URL="postgres://caller.example/test"
assert_contains "$provided_case/log" "bin/rails db:test:prepare|postgres://caller.example/test"
assert_contains "$provided_case/log" "bundle exec rake assets:precompile|postgres://caller.example/test"
assert_not_contains "$provided_case/log" "run -d --rm"
assert_not_contains "$provided_case/log" "rm -f meme-search-ci-db-"

invalid_case="$TEST_ROOT/invalid"
mkdir -p "$invalid_case"
make_stubs "$invalid_case"
: > "$invalid_case/log"
if (
    cd "$PROJECT_ROOT"
    env PATH="$invalid_case/bin:/usr/bin:/bin" \
        STUB_LOG="$invalid_case/log" \
        STUB_DB_PREPARE_FAIL=true \
        DATABASE_URL="postgres://invalid.example/test" \
        bash "$RUNNER" --skip-python --skip-e2e >/dev/null 2>&1
); then
    fail "invalid DATABASE_URL unexpectedly succeeded"
fi
assert_not_contains "$invalid_case/log" "run -d --rm"

interrupt_case="$TEST_ROOT/interrupt"
mkdir -p "$interrupt_case"
make_stubs "$interrupt_case"
: > "$interrupt_case/log"
block_marker="$interrupt_case/blocked"
if (
    cd "$PROJECT_ROOT"
    env -u DATABASE_URL \
        PATH="$interrupt_case/bin:/usr/bin:/bin" \
        STUB_LOG="$interrupt_case/log" \
        STUB_SIGNAL_PARENT=true \
        STUB_BLOCK_MARKER="$block_marker" \
        bash "$RUNNER" --skip-python --skip-e2e >/dev/null 2>&1
) ; then
    fail "interrupt case unexpectedly succeeded"
fi
[ -f "$block_marker" ] || fail "interrupt case never reached database preparation"
assert_contains "$interrupt_case/log" "rm -f meme-search-ci-db-"

echo "Local CI database wiring tests passed"
