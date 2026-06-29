export interface LinkItem {
  id: string;
  title: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  openCount: number;
  source: 'manual' | 'command' | 'share-target' | 'import';
}

export interface FocusTask {
  id: string;
  name: string;
  description: string;
  linkIds: string[];
  tagRules: string[];
  domainRules: string[];
  launchMode: 'guided' | 'open-all';
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'added' | 'opened' | 'archived' | 'shared';
  linkId: string;
  metadata?: Record<string, any>;
}

export interface VaultSettings {
  defaultTags: string[];
  theme: 'system' | 'dark' | 'light';
  isVaultEncrypted: boolean;
}

export interface VaultPlaintext {
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  links: LinkItem[];
  focusTasks: FocusTask[];
  timeline: TimelineEvent[];
  settings: VaultSettings;
}
