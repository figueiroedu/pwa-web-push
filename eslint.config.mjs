import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**", "tests/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ...(c.languageOptions ?? {}),
      parserOptions: {
        ...((c.languageOptions && c.languageOptions.parserOptions) ?? {}),
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  })),
  ...tseslint.configs.strictTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ...(c.languageOptions ?? {}),
      parserOptions: {
        ...((c.languageOptions && c.languageOptions.parserOptions) ?? {}),
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  })),
  {
    files: ["**/*.ts"],
    rules: {
      "no-console": "error"
    }
  },
  eslintConfigPrettier
];
