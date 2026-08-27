import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'src/content/writing';

/** "2014-05-18 09:00:56 -0400" -> a Date JS can parse unambiguously. */
function parseJekyllDate(value: string): Date {
  const iso = value.trim().replace(' ', 'T').replace(/\s*([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(iso);
}

const writing = defineCollection({
  loader: async () => {
    const files = (await readdir(DIR)).filter((f) => f.endsWith('.html'));
    return Promise.all(
      files.map(async (file) => {
        const raw = await readFile(path.join(DIR, file), 'utf8');
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        if (!match) throw new Error(`${file}: missing front matter`);

        const meta: Record<string, unknown> = {};
        for (const line of match[1].split(/\r?\n/)) {
          const kv = line.match(/^(\w+):\s*(.*)$/);
          if (kv) meta[kv[1]] = JSON.parse(kv[2]);
        }

        return {
          id: file.replace(/\.html$/, ''),
          title: meta.title as string,
          pubDate: parseJekyllDate(meta.pubDate as string),
          permalink: meta.permalink as string,
          tags: meta.tags as string[],
          html: raw.slice(match[0].length),
        };
      })
    );
  },
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    permalink: z.string(),
    tags: z.array(z.string()),
    html: z.string(),
  }),
});

export const collections = { writing };
