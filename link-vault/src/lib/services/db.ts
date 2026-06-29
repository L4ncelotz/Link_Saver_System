import Dexie, { type Table } from 'dexie';
import type { LinkItem, FocusTask, TimelineEvent, VaultSettings } from '../types/vault';

export class LinkVaultDB extends Dexie {
  vault!: Table<{ id: string; payload: string; isEncrypted: boolean }, string>;
  settings!: Table<VaultSettings, string>;
  pendingShares!: Table<{ id: string; url: string; title: string; text: string; timestamp: number }, string>;

  // Plaintext data exposed when decrypted
  links!: Table<LinkItem, string>;
  timeline!: Table<TimelineEvent, string>;
  focusTasks!: Table<FocusTask, string>;

  constructor() {
    super('link-vault-db');
    this.version(1).stores({
      vault: 'id',
      settings: 'id',
      pendingShares: 'id',
      links: 'id, domain, createdAt',
      timeline: 'id, linkId, timestamp',
      focusTasks: 'id'
    });
  }
}

export const db = new LinkVaultDB();
