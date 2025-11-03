#!/bin/bash

# Prepare the database
bin/rails db:test:prepare

echo "Running model tests..."
bin/rails test test/models

echo "Running controller tests..."
bin/rails test test/controllers

echo "Running channel tests..."
bin/rails test test/channels

echo "✅ All Rails tests complete!"
echo ""
echo "📝 To run E2E tests, use: npm run test:e2e"
