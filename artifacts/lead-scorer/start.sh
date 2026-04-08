#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Installing Python dependencies from requirements.txt..."
pip install -r requirements.txt --quiet

echo "Setting up Playwright to use system Chromium..."
export PLAYWRIGHT_BROWSERS_PATH=0

echo "Starting Flask app on port ${PORT:-5001}..."
exec python app.py
