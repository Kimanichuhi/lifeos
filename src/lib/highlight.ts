import Prism from 'prismjs';
// Import order matters: each file mutates the shared Prism.languages object
// and several extend an already-registered grammar (e.g. typescript extends
// javascript, tsx extends jsx+typescript), so dependencies load first.
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';

export const SNIPPET_LANGUAGES = [
  'text', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'bash', 'sql', 'json', 'css', 'yaml', 'markup',
] as const;

export function highlightCode(code: string, language: string): string {
  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, language);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
