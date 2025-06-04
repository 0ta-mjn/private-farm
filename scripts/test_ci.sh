#!/bin/bash

set -e

echo "Running tests in CI environment..."

echo "Starting emulator..."
pnpm emulator:start

echo "Migrating database..."
pnpm db:push:testing

echo "Running tests..."
pnpm dotenv -e .env.testing -- turbo run lint test
