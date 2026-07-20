import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The project is not opted into the React Compiler. Its strict rule treats
    // existing hydration gates and async request lifecycles as build-blocking
    // errors, so keep the diagnostic visible without failing CI on it.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
