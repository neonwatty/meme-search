#!/usr/bin/env bash

set -euo pipefail

ENTRYPOINT_TEST_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRYPOINT_UNDER_TEST="${ENTRYPOINT_TEST_REPO_ROOT}/meme_search/meme_search_app/bin/docker-entrypoint"
ENTRYPOINT_TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/meme-search-entrypoint-test.XXXXXX")"

cleanup_entrypoint_tests() {
  rm -rf -- "${ENTRYPOINT_TEST_ROOT}"
}
trap cleanup_entrypoint_tests EXIT

fail_entrypoint_test() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_log_count() {
  local expected_count="$1"
  local expected_line="$2"
  local log_path="$3"
  local actual_count

  actual_count="$(grep -Fxc "${expected_line}" "${log_path}" 2>/dev/null || true)"
  if [ "${actual_count}" != "${expected_count}" ]; then
    fail_entrypoint_test "expected ${expected_count} occurrence(s) of '${expected_line}', got ${actual_count}"
  fi
}

setup_entrypoint_fixture() {
  local fixture_name="$1"
  local fixture_path="${ENTRYPOINT_TEST_ROOT}/${fixture_name}"

  mkdir -p "${fixture_path}/bin" "${fixture_path}/fake-bin"

  cat > "${fixture_path}/bin/rails" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail

printf 'rails:%s\n' "$*" >> "${ENTRYPOINT_TEST_LOG}"

if [ "${1:-}" = "db:prepare" ]; then
  prepare_count=0
  if [ -f "${ENTRYPOINT_TEST_COUNT_FILE}" ]; then
    read -r prepare_count < "${ENTRYPOINT_TEST_COUNT_FILE}"
  fi
  prepare_count=$((prepare_count + 1))
  printf '%s\n' "${prepare_count}" > "${ENTRYPOINT_TEST_COUNT_FILE}"

  if [ "${prepare_count}" -le "${ENTRYPOINT_TEST_PREPARE_FAILURES:-0}" ]; then
    echo "simulated db:prepare failure ${prepare_count}" >&2
    exit 42
  fi
fi
STUB

  cat > "${fixture_path}/bin/jobs" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf 'jobs:%s\n' "$*" >> "${ENTRYPOINT_TEST_LOG}"
STUB

  cat > "${fixture_path}/fake-bin/sleep" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf 'sleep:%s\n' "$*" >> "${ENTRYPOINT_TEST_LOG}"
STUB

  chmod +x "${fixture_path}/bin/rails" "${fixture_path}/bin/jobs" "${fixture_path}/fake-bin/sleep"
  printf '%s\n' "${fixture_path}"
}

run_entrypoint_fixture() {
  local fixture_path="$1"
  local prepare_failures="$2"
  shift 2

  (
    cd "${fixture_path}"
    ENTRYPOINT_TEST_LOG="${fixture_path}/calls.log" \
      ENTRYPOINT_TEST_COUNT_FILE="${fixture_path}/prepare-count" \
      ENTRYPOINT_TEST_PREPARE_FAILURES="${prepare_failures}" \
      PATH="${fixture_path}/fake-bin:${PATH}" \
      "${ENTRYPOINT_UNDER_TEST}" "$@"
  )
}

transient_fixture="$(setup_entrypoint_fixture transient)"
run_entrypoint_fixture "${transient_fixture}" 1 ./bin/rails server -b 0.0.0.0
assert_log_count 2 "rails:db:prepare" "${transient_fixture}/calls.log"
assert_log_count 1 "sleep:2" "${transient_fixture}/calls.log"
assert_log_count 1 "rails:server -b 0.0.0.0" "${transient_fixture}/calls.log"

jobs_fixture="$(setup_entrypoint_fixture jobs)"
run_entrypoint_fixture "${jobs_fixture}" 1 ./bin/jobs
assert_log_count 2 "rails:db:prepare" "${jobs_fixture}/calls.log"
assert_log_count 1 "sleep:2" "${jobs_fixture}/calls.log"
assert_log_count 1 "jobs:" "${jobs_fixture}/calls.log"

persistent_fixture="$(setup_entrypoint_fixture persistent)"
if run_entrypoint_fixture "${persistent_fixture}" 99 ./bin/rails server >"${persistent_fixture}/stdout.log" 2>"${persistent_fixture}/stderr.log"; then
  fail_entrypoint_test "persistent db:prepare failure unexpectedly started the server"
fi
assert_log_count 5 "rails:db:prepare" "${persistent_fixture}/calls.log"
assert_log_count 4 "sleep:2" "${persistent_fixture}/calls.log"
assert_log_count 0 "rails:server" "${persistent_fixture}/calls.log"
grep -Fq "Database preparation failed after 5 attempts." "${persistent_fixture}/stderr.log" ||
  fail_entrypoint_test "persistent failure did not report retry exhaustion"

bypass_fixture="$(setup_entrypoint_fixture bypass)"
run_entrypoint_fixture "${bypass_fixture}" 99 ./bin/rails db:migrate:status
assert_log_count 1 "rails:db:migrate:status" "${bypass_fixture}/calls.log"
assert_log_count 0 "rails:db:prepare" "${bypass_fixture}/calls.log"
assert_log_count 0 "sleep:2" "${bypass_fixture}/calls.log"

echo "Docker entrypoint retry tests passed."
