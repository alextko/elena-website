// Flat ESLint config for Next.js 16 + ESLint 9.
// `eslint-config-next` ships prebuilt flat-config arrays under its subpath
// exports, so we spread them directly instead of going through FlatCompat
// (which chokes on the plugin's self-referencing structure).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "e2e/**",
      "api-old/**",
      "upload/**",
      "src/components/landing/**",
    ],
  },
];
