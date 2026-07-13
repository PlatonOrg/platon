#!/bin/sh
set -e

echo "========================================"
echo "  Running database migrations..."
echo "========================================"

node ./node_modules/typeorm/cli.js migration:run -d dist/tools/datasource.prod.js

echo "========================================"
echo "  Migrations done. Starting application..."
echo "========================================"

exec node dist/apps/api/main.js
