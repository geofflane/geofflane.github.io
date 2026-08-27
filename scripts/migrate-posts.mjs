// One-shot migration: Jekyll _posts/*.html -> src/content/writing/*.html
// Bodies stay HTML (posts contain raw <pre> that markdown would mangle);
// {% highlight %} blocks are pre-rendered with Shiki at migration time.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHighlighter } from 'shiki';

const SRC = '_posts';
const OUT = 'src/content/writing';

// Jekyll/Rouge language names -> Shiki language ids.
const LANG_MAP = {
  winbatch: 'bat', httpd: 'apache', xhtml: 'html', regex: 'text',
  csharp: 'csharp', javascript: 'javascript', bash: 'bash',
};
const SHIKI_LANGS = ['ruby','csharp','groovy','bash','xml','javascript','java','erlang',
  'scala','scheme','html','c','sql','bat','python','php','go','apache','clojure','css'];

const highlighter = await createHighlighter({
  themes: ['github-dark-dimmed'],
  langs: SHIKI_LANGS,
});

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  let currentKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (kv) { currentKey = kv[1]; fm[currentKey] = kv[2].trim(); continue; }
    const item = line.match(/^-\s+(.*)$/);
    if (item && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(item[1].trim());
    }
  }
  return { fm, body: raw.slice(m[0].length) };
}

function unquote(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/^['"]|['"]$/g, '');
}

function renderCode(code, lang) {
  const mapped = LANG_MAP[lang] ?? lang;
  const useLang = SHIKI_LANGS.includes(mapped) ? mapped : 'text';
  return highlighter.codeToHtml(code, { lang: useLang, theme: 'github-dark-dimmed' });
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.html')).sort();
await mkdir(OUT, { recursive: true });

const report = { count: 0, dateMismatch: [], unknownLangs: new Set(), amazonImgs: 0, wpImgs: 0 };

for (const file of files) {
  const raw = await readFile(path.join(SRC, file), 'utf8');
  const { fm, body } = parseFrontmatter(raw);

  const fileMatch = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.html$/);
  if (!fileMatch) { console.error('SKIP (bad filename):', file); continue; }
  const [, fy, fmo, fd, slug] = fileMatch;

  // Jekyll takes the permalink date from front matter when present.
  const fmDate = unquote(fm.date ?? '');
  const fmDay = fmDate.slice(0, 10);
  if (fmDay && fmDay !== `${fy}-${fmo}-${fd}`) report.dateMismatch.push(`${file} -> ${fmDay}`);
  const [year, month, day] = (fmDay || `${fy}-${fmo}-${fd}`).split('-');

  let html = body;

  // {% highlight lang %} ... {% endhighlight %}  ->  Shiki HTML
  html = html.replace(
    /[ \t]*\{%\s*highlight\s*([a-z0-9_+-]*)\s*%\}\r?\n?([\s\S]*?)[ \t]*\{%\s*endhighlight\s*%\}/gi,
    (_all, lang, code) => {
      const l = (lang || 'text').toLowerCase();
      const mapped = LANG_MAP[l] ?? l;
      if (!SHIKI_LANGS.includes(mapped)) report.unknownLangs.add(l);
      return '\n' + renderCode(code.replace(/\s+$/, ''), l) + '\n';
    }
  );

  // WordPress-era artifacts.
  html = html.replace(/<\/p><\/p>/g, '</p>');
  report.amazonImgs += (html.match(/assoc-amazon\.com/g) || []).length;
  report.wpImgs += (html.match(/wp-content\/uploads/g) || []).length;
  // Protocol-relative and absolute self-links -> root-relative.
  html = html.replace(/(?:https?:)?\/\/(?:www\.)?zorched\.net\//g, '/');

  const tags = Array.isArray(fm.tags) ? fm.tags.map(unquote) : [];
  const title = unquote(fm.title ?? slug).replace(/&amp;/g, '&');

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `pubDate: ${JSON.stringify(fmDate || `${fy}-${fmo}-${fd}`)}`,
    `permalink: ${JSON.stringify(`/${year}/${month}/${day}/${slug}/`)}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
  ].join('\n');

  await writeFile(path.join(OUT, `${slug}.html`), frontmatter + html.trim() + '\n');
  report.count++;
}

console.log(`migrated ${report.count} posts`);
console.log(`date mismatches (front matter wins): ${report.dateMismatch.length}`);
report.dateMismatch.slice(0, 10).forEach((m) => console.log('  ' + m));
console.log(`unmapped languages -> plaintext: ${[...report.unknownLangs].join(', ') || 'none'}`);
console.log(`dead Amazon affiliate images: ${report.amazonImgs}`);
console.log(`wp-content images: ${report.wpImgs}`);
