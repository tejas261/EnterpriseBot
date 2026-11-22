import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    settings: { next: { rootDir: "apps/web" } },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/next-env.d.ts",
      "**/playwright-report/**",
      "**/test-results/**",
      "ipl-live.zip",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["scripts/mongo-init-replica-set.js"],
    languageOptions: {
      globals: { rs: "readonly", print: "readonly", sleep: "readonly", quit: "readonly" },
    },
  },
];

export default config;
