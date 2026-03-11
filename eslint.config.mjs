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
    rules: {
      // False positives on the useCallback → useEffect data-loading pattern
      "react-hooks/set-state-in-effect": "off",
      // False positives on Math.floor / static math calls in components
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
