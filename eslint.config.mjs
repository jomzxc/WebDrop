import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// Next 16's eslint-config-next already exports *flat config* arrays.
// Keep this file tiny and explicit so `eslint .` works with ESLint v9.
const config = [
	{
		name: "project/ignores",
		ignores: [
			"coverage/**",
			"playwright-report/**",
			"test-results/**",
			".next/**",
			"out/**",
		],
	},
	...nextCoreWebVitals,
	...nextTypeScript,
	{
		name: "project/relaxed-rules",
		rules: {
			// This codebase intentionally uses `any` in a few integration points (Supabase realtime, RTC signals).
			"@typescript-eslint/no-explicit-any": "off",

			// JSX text in marketing pages often uses apostrophes; keep linting focused on real issues.
			"react/no-unescaped-entities": "off",

			// Some components rely on refs for mutable state and pass ref-backed values through props.
			// The React Hooks plugin can be overly strict here.
			"react-hooks/refs": "off",

			// We use a standard mounted-flag pattern in a few places (e.g. theme hydration).
			"react-hooks/set-state-in-effect": "off",
		},
	},
	{
		name: "project/config-files",
		files: [
			"**/*.config.{js,cjs,mjs,ts}",
			"jest.config.js",
			"jest.polyfills.js",
			"jest.setup.js",
			"playwright.config.ts",
			"next.config.*",
			"postcss.config.*",
		],
		rules: {
			// Jest config and setup files commonly use CommonJS.
			"@typescript-eslint/no-require-imports": "off",
		},
	},
];

export default config;
