import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

// Module element types for boundary enforcement
const MODULE_ELEMENTS = [
  { type: "m1", pattern: "src/modules/m1/**" },
  { type: "m2", pattern: "src/modules/m2/**" },
  { type: "m5a", pattern: "src/modules/m5a/**" },
  { type: "m6", pattern: "src/modules/m6/**" },
  // Shared layers — allowed as import targets from any module
  { type: "state", pattern: "src/state/**" },
  { type: "services", pattern: "src/services/**" },
  { type: "types", pattern: "src/types/**" },
  { type: "components", pattern: "src/components/**" },
  { type: "hooks", pattern: "src/hooks/**" },
  { type: "utils", pattern: "src/utils/**" },
  { type: "constants", pattern: "src/constants/**" },
  { type: "mocks", pattern: "src/mocks/**" },
  { type: "lib", pattern: "src/lib/**" },
  { type: "app", pattern: "src/app/**" },
];

// Each module may only import from shared layers, never from sibling modules
const MODULE_TYPES = ["m1", "m2", "m5a", "m6"];
const SHARED_TYPES = ["state", "services", "types", "components", "hooks", "utils", "constants", "mocks", "lib", "app"];

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      boundaries,
    },
    settings: {
      "boundaries/elements": MODULE_ELEMENTS,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Prevent cross-module imports: modules/mX must not import from modules/mY
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            // Each module element may only import from shared layers, not from other modules
            {
              from: MODULE_TYPES,
              allow: SHARED_TYPES,
              disallow: MODULE_TYPES,
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
