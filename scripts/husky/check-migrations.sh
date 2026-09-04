#!/usr/bin/env sh
# Fails the push if prisma/schema.prisma has changes with no matching
# migration file under prisma/migrations. Current Prisma CLI requires a
# shadowDatabaseUrl (see prisma.config.ts) to replay migrations and compute
# this diff — it isn't configured by default (nothing to assume it exists on
# every contributor's machine), so this check quietly skips until one is set
# up. Skipped entirely if migrations haven't been initialized yet (this
# project still on `prisma db push`).

MIGRATIONS_DIR="prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ] || [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  exit 0
fi

DIFF_OUTPUT=$(npx prisma migrate diff \
  --from-migrations "$MIGRATIONS_DIR" \
  --to-schema prisma/schema.prisma \
  --script 2>&1)
DIFF_EXIT=$?

if [ $DIFF_EXIT -ne 0 ]; then
  echo ""
  echo "Could not check Prisma migration status — skipping (no shadowDatabaseUrl configured, or prisma errored)."
  exit 0
fi

# A no-op diff is just the "-- This is an empty migration." style comment/blank
# output, plus prisma's own "Loaded Prisma config from ..." notice line.
MEANINGFUL=$(echo "$DIFF_OUTPUT" | grep -v '^--' | grep -v '^Loaded Prisma config' | grep -v '^[[:space:]]*$')

if [ -n "$MEANINGFUL" ]; then
  echo ""
  echo "prisma/schema.prisma has changes with no matching migration file:"
  echo "$DIFF_OUTPUT"
  echo ""
  echo "Run 'npx prisma migrate dev --name <descriptive_name> --create-only' to generate the"
  echo "missing migration, review the SQL, commit it, and push again."

  exit 1
fi

exit 0
