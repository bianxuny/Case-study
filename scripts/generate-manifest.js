#!/usr/bin/env node
/**
 * Scans assets/ folders and generates portfolio item entries.
 * Usage: node scripts/generate-manifest.js [--section featured] [--merge]
 *
 * --section  Default section id for new items (default: "featured")
 * --merge    Append new files to existing portfolio.json instead of replacing items
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const DATA_PATH = join(ROOT, 'data', 'portfolio.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
const GIF_EXT = new Set(['.gif']);

const args = process.argv.slice(2);
const defaultSection = getArg('--section') || 'featured';
const merge = args.includes('--merge');

async function scanDir(subdir, type) {
  const dir = join(ROOT, 'assets', subdir);
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => !f.startsWith('.') && f !== '.gitkeep')
      .map((f) => ({ filename: f, type, src: `assets/${subdir}/${f}` }));
  } catch {
    return [];
  }
}

function detectType(filename) {
  const ext = extname(filename).toLowerCase();
  if (GIF_EXT.has(ext)) return 'gif';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (IMAGE_EXT.has(ext)) return 'image';
  return null;
}

function slugify(name) {
  return basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleFromFilename(filename) {
  return basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const [images, videos, gifs] = await Promise.all([
    scanDir('images', 'image'),
    scanDir('videos', 'video'),
    scanDir('gifs', 'gif'),
  ]);

  const allFiles = [...images, ...videos, ...gifs].filter((f) => detectType(f.filename));

  let data;
  try {
    data = JSON.parse(await readFile(DATA_PATH, 'utf-8'));
  } catch {
    data = { meta: {}, stats: [], sections: [], items: [] };
  }

  const existingSrcs = new Set((data.items || []).map((i) => i.src));
  const newItems = [];

  for (const file of allFiles) {
    if (existingSrcs.has(file.src)) continue;

    newItems.push({
      id: slugify(file.filename),
      section: defaultSection,
      type: file.type,
      src: file.src,
      title: titleFromFilename(file.filename),
      description: '',
      tags: [],
      span: 'default',
    });
  }

  if (merge) {
    data.items = [...(data.items || []), ...newItems];
  } else if (newItems.length > 0 && (data.items || []).length === 0) {
    data.items = newItems;
  } else if (newItems.length > 0) {
    console.log(`Found ${newItems.length} new file(s) not in portfolio.json:`);
    newItems.forEach((i) => console.log(`  + ${i.src}`));
    console.log('\nRun with --merge to append them, or add manually.');
    return;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${DATA_PATH}`);
  if (newItems.length) console.log(`Added ${newItems.length} item(s).`);
  else console.log('No new files to add.');
}

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

main().catch(console.error);
