#!/usr/bin/env sh
# Fails the commit if prisma/schema.prisma has changes with no matching
# migration file under prisma/migrations. File-based diff only — no live
# database connection required. Skipped entirely if migrations haven't been
# initialized yet (this project still on `prisma db push`).

MIGRATIONS_DIR="prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ] || [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  exit 0
fi

DIFF_OUTPUT=$(npx prisma migrate diff \
  --from-migrations "$MIGRATIONS_DIR" \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>&1)
DIFF_EXIT=$?

if [ $DIFF_EXIT -ne 0 ]; then
  echo ""
  echo "Could not check Prisma migration status — skipping (schema/migrations unreadable or prisma errored):"
  echo "$DIFF_OUTPUT"
  exit 0
fi

# A no-op diff is just the "-- This is an empty migration." style comment/blank output.
MEANINGFUL=$(echo "$DIFF_OUTPUT" | grep -v '^--' | grep -v '^[[:space:]]*$')

if [ -n "$MEANINGFUL" ]; then
  echo ""
  echo "prisma/schema.prisma has changes with no matching migration file:"
  echo "$DIFF_OUTPUT"

  if command -v claude >/dev/null 2>&1; then
    echo ""
    echo "Asking Claude Code to generate the missing migration..."
    claude -p "prisma/schema.prisma has drifted from prisma/migrations. Run 'npx prisma migrate dev --name <descriptive_name> --create-only' to generate the missing migration file, review the generated SQL for correctness against the schema change, then stop — do not apply it to any database or run further prisma commands. Requires a reachable DATABASE_URL; if the database is unreachable, report that back instead of guessing at the SQL." \
      --permission-mode acceptEdits \
      --allowedTools "Read Edit Grep Glob Bash(npx prisma*)" \
      || true

    git add "$MIGRATIONS_DIR"
    echo ""
    echo "Review the generated migration (git diff --cached -- $MIGRATIONS_DIR) and run 'git commit' again."
  else
    echo "claude CLI not found on PATH — run 'npx prisma migrate dev --name <name>' manually, then retry."
  fi

  exit 1
fi

exit 0
