#!/bin/bash

echo "Running model tests..."
mise exec -- bin/rails test test/models

echo "Running controller tests..."
mise exec -- bin/rails test test/controllers

echo "Running channel tests..."
mise exec -- bin/rails test test/channels

echo "✅ All Rails tests complete!"
echo ""
echo "📝 To run E2E tests, use: npm run test:e2e"
