#!/usr/bin/env bash

set -euo pipefail

source_owner="${1:-neonwatty}"
destination_owner="${2:-meme-search}"
version="$(tr -d '[:space:]' < VERSION)"

if [[ "$source_owner" == "$destination_owner" ]]; then
  echo "Source and destination owners must be different." >&2
  exit 1
fi

packages=(meme_search image_to_text_generator)
tags=(latest "v${version}")

for package in "${packages[@]}"; do
  for tag in "${tags[@]}"; do
    source_image="ghcr.io/${source_owner}/${package}:${tag}"
    destination_image="ghcr.io/${destination_owner}/${package}:${tag}"

    echo "Publishing ${destination_image} from ${source_image}"
    docker buildx imagetools create \
      "$source_image" \
      --tag "$destination_image"
  done
done

for package in "${packages[@]}"; do
  for tag in "${tags[@]}"; do
    docker buildx imagetools inspect \
      "ghcr.io/${destination_owner}/${package}:${tag}"
  done
done
