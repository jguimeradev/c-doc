import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { headerSlugs } from './data/headers';

/** Library reference: src/content/items/<header>/<name>.md */
const items = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/items' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['fn', 'macro', 'type']),
    header: z.enum(headerSlugs),
    summary: z.string(),
    signature: z.string(),
    standard: z.string().default('ISO C'),
    safety: z.string().optional(),
    source: z.string().url().optional(),
  }),
});

/** The book: src/content/book/<order>-<slug>.md, organized after K&R's chapters. */
const book = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/book',
    generateId: ({ entry }) => entry.replace(/^\d+-/, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    /** Label shown before the title, e.g. "1", "A". */
    number: z.string(),
    order: z.number(),
    summary: z.string(),
  }),
});

/** Exercises: src/content/exercises/<chapter-id>.md, one page per book chapter. */
const exercises = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/exercises' }),
  schema: z.object({
    chapter: z.string(),
    summary: z.string(),
  }),
});

/** Projects: src/content/projects/<order>-<slug>.md */
const projects = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/^\d+-/, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    summary: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    chapters: z.array(z.string()),
    skills: z.array(z.string()),
    platform: z.string().default('Any C17 compiler'),
  }),
});

export const collections = { items, book, exercises, projects };
