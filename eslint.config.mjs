import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Professional/industry-standard baseline on top of Next's defaults.
  {
    rules: {
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
      "no-debugger": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      curly: ["error", "multi-line"],
      "no-nested-ternary": "error", // AGENTS.md Code Rule 12
      "max-lines": ["warn", { max: 600, skipBlankLines: true, skipComments: true }], // AGENTS.md Code Rule 9
      "@typescript-eslint/no-explicit-any": "warn", // AGENTS.md Code Rule 7
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "import/no-duplicates": "error",
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  // AGENTS.md Code Rule 15 — navigation must go through the app's wrappers
  // so the route-progress bar fires. Applies everywhere except src/actions
  // (server actions don't render/navigate).
  //
  // NOTE: flat config doesn't merge same-key rule values across matching
  // blocks — the last matching block for a file wins for that rule entirely.
  // This block and the Code Rule 2 block below have overlapping file scopes,
  // so both `no-restricted-imports` restrictions are combined into every
  // block a file can match, rather than split across separate blocks.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/actions/**", "src/components/Link.tsx", "src/hooks/useRouter.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import Link from '@/components/Link' instead — it shows the route-progress bar (AGENTS.md Code Rule 15).",
            },
            {
              name: "next/navigation",
              importNames: ["useRouter"],
              message:
                "Import useRouter from '@/hooks/useRouter' instead — it shows the route-progress bar (AGENTS.md Code Rule 15).",
            },
          ],
        },
      ],
    },
  },
  // Same as above, plus AGENTS.md Code Rule 2 (no direct Prisma access
  // outside src/actions/**) — src/lib/db.ts is the Prisma client itself
  // and is exempt from the Prisma restriction, so it's excluded here.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/actions/**", "src/lib/db.ts", "src/components/Link.tsx", "src/hooks/useRouter.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import Link from '@/components/Link' instead — it shows the route-progress bar (AGENTS.md Code Rule 15).",
            },
            {
              name: "next/navigation",
              importNames: ["useRouter"],
              message:
                "Import useRouter from '@/hooks/useRouter' instead — it shows the route-progress bar (AGENTS.md Code Rule 15).",
            },
            {
              name: "@prisma/client",
              message: "Query Prisma only from src/actions/** server actions (AGENTS.md Code Rule 2).",
            },
            {
              name: "@/lib/db",
              message: "Query Prisma only from src/actions/** server actions (AGENTS.md Code Rule 2).",
            },
          ],
          patterns: [
            {
              group: ["**/lib/db"],
              message: "Query Prisma only from src/actions/** server actions (AGENTS.md Code Rule 2).",
            },
          ],
        },
      ],
    },
  },

  // AGENTS.md Code Rule 14 — no barrel/index re-export files under src/.
  {
    files: ["src/**/index.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message:
            "No barrel/index re-export files (AGENTS.md Code Rule 14) — import each component/util directly from the file it's defined in.",
        },
      ],
    },
  },

  // AGENTS.md Code Rule 7 — domain types live in src/types/**, not a
  // colocated types.ts, except a file that also exports a zod schema.
  {
    files: [
      "src/components/**/types.ts",
      "src/components/**/*.types.ts",
      "src/actions/**/types.ts",
      "src/actions/**/*.types.ts",
      "src/hooks/**/types.ts",
      "src/hooks/**/*.types.ts",
      "src/lib/**/types.ts",
      "src/lib/**/*.types.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: 'Program:not(:has(ImportDeclaration[source.value="zod"]))',
          message:
            "Domain types belong in src/types/**, not a colocated types.ts (AGENTS.md Code Rule 7). Exception: a file exporting a zod schema + its z.infer type may stay colocated.",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored skill packages, not app source.
    ".opencode/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
