import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	// Non-app sources: skill packs, scratch experiments, frozen planning pack.
	// Mirrors .prettierignore so `pnpm lint` only gates application code.
	{
		ignores: [
			'.opencode/**',
			'scratch/**',
			'worker-configuration.d.ts',
			'ZATIARAS_WEB_V1_SOURCE_OF_TRUTH_2026-09-15/**'
		]
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			// All {@html} usages are locally-generated JSON-LD structured data
			// (Organization / JuiceBar / Product / BreadcrumbList). No user input
			// ever reaches {@html}, so the XSS vector this rule guards is absent.
			'svelte/no-at-html-tags': 'off',
			// Absolute in-app hrefs/goto() with no `base` path configured.
			// resolve() would add noise without benefit; revisit if a base path
			// is ever introduced (see svelte.config / kit.paths).
			'svelte/no-navigation-without-resolve': 'off',
			// `{' '}` word-spacing inside the kerned-type snippet pattern.
			'svelte/no-useless-mustaches': 'off',
			// Unkeyed {#each} is valid Svelte and every list here is static or
			// append-only with stateless rows (menu grids, outlet lists, order
			// rows rendered as links). Revisit if a reorderable/stateful list
			// with per-row component state is introduced.
			'svelte/require-each-key': 'off'
		}
	}
);
