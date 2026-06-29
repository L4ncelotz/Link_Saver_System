import { writable } from 'svelte/store';
import type { LinkItem } from '../types/vault';
import { db } from '../services/db';

export const links = writable<LinkItem[]>([]);
export const currentTag = writable<string>('All');
export const searchQuery = writable<string>('');
export const newestFirst = writable<boolean>(true);

export async function loadLinks() {
  const allLinks = await db.links.toArray();
  links.set(allLinks);
}

export async function addLink(link: LinkItem) {
  await db.links.add(link);
  await loadLinks();
}

export async function deleteLink(id: string) {
  await db.links.delete(id);
  await loadLinks();
}

export async function updateLink(id: string, updates: Partial<LinkItem>) {
  await db.links.update(id, updates);
  await loadLinks();
}
