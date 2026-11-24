import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { headers } from '../data/headers';

export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const index: { n: string; k: string; h: string; d: string; u: string }[] = [];

  for (const i of await getCollection('items'))
    index.push({
      n: i.data.name,
      k: i.data.kind,
      h: i.data.header,
      d: i.data.summary,
      u: `${base}/${i.data.header}/${i.data.kind}.${i.data.name}/`,
    });
  for (const h of headers) index.push({ n: h.file, k: 'mod', h: '', d: h.summary, u: `${base}/${h.slug}/` });
  for (const c of await getCollection('book')) {
    const u = `${base}/book/${c.id}/`;
    index.push({ n: c.data.title, k: 'book', h: 'book', d: c.data.summary, u });
    const { headings } = await render(c);
    for (const s of headings.filter((x) => x.depth === 2))
      index.push({ n: s.text, k: 'book', h: 'book', d: c.data.title, u: `${u}#${s.slug}` });
  }
  const book = await getCollection('book');
  for (const ex of await getCollection('exercises')) {
    const ch = book.find((c) => c.id === ex.data.chapter);
    const u = `${base}/book/${ex.data.chapter}/exercises/`;
    const { headings } = await render(ex);
    for (const h of headings.filter((x) => x.depth === 2))
      index.push({ n: h.text.replace(/ (easy|medium|hard)$/, ''), k: 'project', h: 'exercises', d: ch?.data.title ?? '', u: `${u}#${h.slug}` });
  }
  for (const p of await getCollection('projects'))
    index.push({ n: p.data.title, k: 'project', h: 'projects', d: p.data.summary, u: `${base}/projects/${p.id}/` });
  index.push({ n: 'C Playground', k: 'project', h: '', d: 'Compile, run and debug C in the browser: assembly, stack, heap and registers', u: `${base}/playground/` });
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
};
