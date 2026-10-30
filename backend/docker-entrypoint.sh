#!/bin/sh
set -e

# Prisma runs the seed command through PATH, so the local binaries must be on it.
export PATH="$PWD/node_modules/.bin:$PATH"

node_modules/.bin/prisma migrate deploy

# Idempotent: creates the first admin only when it does not exist yet.
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node_modules/.bin/prisma db seed
fi

exec node dist/main
