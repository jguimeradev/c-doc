import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { headers } from './headers';

type Item = CollectionEntry<'items'>;
export type Kind = Item['data']['kind'];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path: string) => `${base}/${path}`;
export const itemUrl = (i: Item) => url(`${i.data.header}/${i.data.kind}.${i.data.name}/`);

export const kindLabel: Record<Kind, { one: string; many: string }> = {
  fn: { one: 'Function', many: 'Functions' },
  macro: { one: 'Macro', many: 'Macros' },
  type: { one: 'Type', many: 'Types' },
};
export const kindOrder: Kind[] = ['macro', 'type', 'fn'];

export function groupByKind(items: Item[]) {
  return kindOrder
    .map((k) => ({
      kind: k,
      items: items.filter((i) => i.data.kind === k).sort((a, b) => a.data.name.localeCompare(b.data.name)),
    }))
    .filter((g) => g.items.length);
}

export function headersSection() {
  return {
    title: 'Headers',
    links: headers.map((h) => ({ label: h.file, href: url(`${h.slug}/`), kind: 'mod' })),
  };
}


export async function getBook() {
  return (await getCollection('book')).sort((a, b) => a.data.order - b.data.order);
}

export const chapterUrl = (id: string) => url(`book/${id}/`);

export function chapterLabel(c: CollectionEntry<'book'>) {
  const n = c.data.number;
  return n === '0' ? c.data.title : `${n}. ${c.data.title}`;
}

export async function bookSection(currentId?: string) {
  const book = await getBook();
  return {
    title: 'The C Book',
    href: url('book/'),
    links: book.map((c) => ({
      label: chapterLabel(c),
      href: chapterUrl(c.id),
      kind: 'book',
      current: c.id === currentId,
    })),
  };
}

export async function getExercises() {
  return Object.fromEntries((await getCollection('exercises')).map((e) => [e.data.chapter, e]));
}

export const exercisesUrl = (chapterId: string) => url(`book/${chapterId}/exercises/`);

export async function getProjects() {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

export const projectUrl = (id: string) => url(`projects/${id}/`);

export async function projectsSection(currentId?: string) {
  const projects = await getProjects();
  return {
    title: 'Projects',
    href: url('projects/'),
    links: projects.map((p) => ({
      label: p.data.title.split(' — ')[0],
      href: projectUrl(p.id),
      kind: 'project',
      current: p.id === currentId,
    })),
  };
}
