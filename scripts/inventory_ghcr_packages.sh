#!/usr/bin/env bash

set -euo pipefail

inventory_owner="${1:-neonwatty}"
inventory_packages=(
  meme_search
  image_to_text_generator
  meme_search_pro
  meme-search
)

for inventory_command in gh jq; do
  if ! command -v "$inventory_command" >/dev/null 2>&1; then
    echo "Missing required command: $inventory_command" >&2
    exit 1
  fi
done

echo "# GHCR transfer inventory"
echo
echo "- Owner: \`$inventory_owner\`"
echo "- Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo

for inventory_package in "${inventory_packages[@]}"; do
  inventory_metadata="$(
    gh api "/users/${inventory_owner}/packages/container/${inventory_package}"
  )"
  inventory_versions="$(
    gh api --paginate \
      "/users/${inventory_owner}/packages/container/${inventory_package}/versions?per_page=100" \
      | jq -s 'add'
  )"

  inventory_total="$(jq 'length' <<<"$inventory_versions")"
  inventory_untagged="$(jq '[.[] | select((.metadata.container.tags | length) == 0)] | length' <<<"$inventory_versions")"
  inventory_latest="$(jq -r 'sort_by(.updated_at) | last | .updated_at' <<<"$inventory_versions")"

  echo "## \`$inventory_package\`"
  echo
  echo "- Visibility: $(jq -r '.visibility' <<<"$inventory_metadata")"
  echo "- Linked repository: $(jq -r '.repository.full_name // "none"' <<<"$inventory_metadata")"
  echo "- Versions: $inventory_total total; $inventory_untagged untagged"
  echo "- Most recent update: $inventory_latest"
  echo
  echo '| Tags | Digest | Updated |'
  echo '| --- | --- | --- |'
  jq -r '
    [.[] | select((.metadata.container.tags | length) > 0)]
    | sort_by(.updated_at)
    | reverse[]
    | "| `\(.metadata.container.tags | join("`, `"))` | `\(.name)` | \(.updated_at) |"
  ' <<<"$inventory_versions"
  echo

  if command -v docker >/dev/null 2>&1 && docker buildx version >/dev/null 2>&1; then
    inventory_manifest="$(docker buildx imagetools inspect --raw "ghcr.io/${inventory_owner}/${inventory_package}:latest")"
    inventory_platforms="$(
      jq -r '
        [
          .manifests[]?.platform
          | select(.os != "unknown" and .architecture != "unknown")
          | "\(.os)/\(.architecture)\(if .variant then "/" + .variant else "" end)"
        ]
        | unique
        | join(", ")
      ' <<<"$inventory_manifest"
    )"
    echo "- \`latest\` platforms: ${inventory_platforms:-not reported}"
    echo
  fi
done
