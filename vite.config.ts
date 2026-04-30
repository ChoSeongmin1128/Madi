import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const nodeModule = String.raw`node_modules[\\/]`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: new RegExp(`${nodeModule}(react|react-dom|scheduler)[\\/]`),
              priority: 40,
            },
            {
              name: 'editor-vendor',
              test: new RegExp(
                `${nodeModule}(@blocknote|@tiptap|prosemirror|@handlewithcare|yjs|y-prosemirror|y-protocols|linkifyjs|uuid|fast-deep-equal|@tanstack|emoji-mart|@emoji-mart)[\\/]`,
              ),
              priority: 30,
              maxSize: 450 * 1024,
            },
            {
              name: 'markdown-vendor',
              test: new RegExp(
                `${nodeModule}(unified|remark-|rehype-|micromark|mdast-|hast-|unist-|vfile|bail|trough|devlop|zwitch|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities|html-void-elements|ccount|longest-streak|markdown-table|trim-lines|escape-string-regexp)[\\/]`,
              ),
              priority: 20,
              maxSize: 450 * 1024,
            },
            {
              name: 'syntax-vendor',
              test: new RegExp(`${nodeModule}(highlight\\.js|prosemirror-highlight|shiki|@shikijs)[\\/]`),
              priority: 20,
              maxSize: 450 * 1024,
            },
            {
              name: 'ui-vendor',
              test: new RegExp(`${nodeModule}(@dnd-kit|framer-motion|lucide-react|zustand|clsx|dompurify|marked)[\\/]`),
              priority: 10,
              maxSize: 450 * 1024,
            },
          ],
        },
      },
    },
  },
});
