#!/bin/bash

# Script to validate the Discord invite link in README.md returns a valid HTTP response
# This helps catch broken Discord links in CI before they reach users

set -e

# Extract Discord link from README.md (works on both macOS and Linux)
DISCORD_URL=$(grep -oE 'https://discord\.gg/[a-zA-Z0-9]+' README.md | head -1)

if [ -z "$DISCORD_URL" ]; then
    echo "ERROR: No Discord link found in README.md"
    exit 1
fi

echo "Found Discord link: $DISCORD_URL"

# Make HTTP request and check status code
# Discord invite links return 200 for valid invites, or redirect to Discord
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$DISCORD_URL")

echo "HTTP Status: $HTTP_STATUS"

# Accept 200, 301, 302 as valid (redirects are expected for Discord)
if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
    echo "SUCCESS: Discord link is valid (HTTP $HTTP_STATUS)"
    exit 0
else
    echo "ERROR: Discord link returned HTTP $HTTP_STATUS"
    exit 1
fi
