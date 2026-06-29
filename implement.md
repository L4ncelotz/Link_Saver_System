# implement.md — Link Vault / Vault OS

## Goal

Turn the current single-page Link Hub into **Vault OS**: a keyboard-first personal link operating surface with privacy mode, mobile capture, focus launch workflows, and a timeline of link activity.

The target feeling is not “bookmark list”. It should feel like a **neon command console for launching work**.

---

## Selected Features

| Feature                      | Priority | Role                                      |
| ---------------------------- | -------: | ----------------------------------------- |
| Command Palette              |       P0 | Primary power-user interface              |
| Encrypted Vault Mode         |       P1 | Protect saved links at rest               |
| Share Target / PWA           |       P2 | Save links from mobile/system share sheet |
| Focus Launchpad              |       P1 | Launch task-specific link sets            |
| Link Timeline / Memory Trail |       P1 | Activity history and product depth        |

---

## Core Product Direction

### Current model

```text
Add → List → Delete
```

### Target model

```text
Search → Command → Launch → Remember
```

The UI should still work for normal mouse/touch users, but the premium behavior comes from keyboard workflows and task-based launch flows.

---

## Non-goals for This Version

Do **not** add these yet:

- Backend account system
- Cloud sync
- AI recommendation engine
- Browser extension
- Drag-and-drop reorder
- Analytics dashboard
- Multi-user sharing
- Nested folders

Reason: they increase scope without improving the core “personal launch OS” feel enough for v1.

---

## Technical Assumptions

- App remains client-side only for now.
- Data is stored locally in the browser.
- No backend is available in v1.
- PWA features require HTTPS or localhost during testing.
- Share Target support is not universal across all browsers, so fallback flows are required.
- Encryption protects data at rest only. It does not protect against XSS, malicious extensions, compromised devices, or attacks while the vault is unlocked.

---

## Architecture

### Recommended file split

```text
/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
└── src/
    ├── app.js
    ├── state.js
    ├── storage.js
    ├── crypto.js
    ├── commands.js
    ├── command-palette.js
    ├── focus-launchpad.js
    ├── timeline.js
    ├── share-target.js
    ├── url-utils.js
    └── dom-utils.js
```

### Why split files

The current app can survive as one HTML file, but these features will become messy fast. Split into modules before implementing the advanced features.

### No build system required

Use native ES modules first:

```html
<script type="module" src="./src/app.js"></script>
```

A bundler can be added later if needed.

---

## Storage Strategy

### Current storage

```text
localStorage key: neon_link_vault_links
```

### New storage recommendation

Use IndexedDB for v1 advanced features.

Reason:

- Better for structured data
- Better migration path
- Better for PWA/share flows
- Better for larger timeline/event data
- Allows future file/share handling

### IndexedDB database

```text
Database: link-vault-db
Version: 1

Stores:
- vault
- settings
- pendingShares
```

### Store responsibilities

| Store         | Purpose                                    |                                Encrypted? |
| ------------- | ------------------------------------------ | ----------------------------------------: |
| vault         | Main encrypted or plaintext vault envelope |                 Yes if vault mode enabled |
| settings      | Non-sensitive UI settings                  |                                        No |
| pendingShares | Temporary share-target handoff data        | Prefer no persistent storage while locked |

---

## Data Model

### VaultPlaintext

This is the main object before encryption.

```ts
interface VaultPlaintext {
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  links: LinkItem[];
  focusTasks: FocusTask[];
  timeline: TimelineEvent[];
  settings: VaultSettings;
}
```

### LinkItem

```ts
interface LinkItem {
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
  source: "manual" | "command" | "share-target" | "import";
}
```

### FocusTask

```ts
interface FocusTask {
  id: string;
  name: string;
  description: string;
  linkIds: string[];
  tagRules: string[];
  domainRules: string[];
  launchMode: "guided" | "open-all";
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  runCount: number;
}
```

### TimelineEvent

```ts
interface TimelineEvent {
  id: string;
  type:
    | "link.added"
    | "link.edited"
    | "link.deleted"
    | "link.opened"
    | "link.copied"
    | "link.pinned"
    | "link.unpinned"
    | "task.created"
    | "task.launched"
    | "share.received"
    | "vault.encryption.enabled"
    | "vault.locked"
    | "vault.unlocked"
    | "vault.unlock_failed";
  at: string;
  entityType: "link" | "task" | "vault" | "share";
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
}
```

### VaultSettings

```ts
interface VaultSettings {
  sortMode: "newest" | "oldest" | "az" | "most-opened";
  commandPaletteHintsSeen: boolean;
  autoLockMinutes: number | null;
  maxTimelineEvents: number;
}
```

---

## Migration Plan

### Legacy keys to detect

```text
glass_saved_links
neon_link_vault_links
premium_saved_links
```

### Migration steps

1. Load legacy array from localStorage.
2. Validate each item.
3. Normalize URL.
4. Add missing fields.
5. Create `VaultPlaintext` with `schemaVersion: 2`.
6. Save to IndexedDB.
7. Keep old localStorage key temporarily as backup.
8. After successful user confirmation or export, remove old key.

### Migration acceptance criteria

- Existing links appear after upgrade.
- Broken legacy items are skipped, not fatal.
- URL normalization does not destroy existing valid URLs.
- User can export before enabling encryption.

---

# Feature 1 — Command Palette

## Goal

Make `Ctrl + K` / `Cmd + K` the fastest way to use the app.

The palette should control links, tasks, vault state, timeline, and PWA actions.

---

## Commands to support

### Link commands

```text
Open <link>
Copy URL <link>
Pin <link>
Unpin <link>
Edit <link>
Delete <link>
Archive <link>
```

### App commands

```text
Add new link
Search links
Export vault
Import vault
Open timeline
Open focus launchpad
```

### Vault commands

```text
Lock vault
Unlock vault
Enable encrypted vault
Change passphrase
```

### Focus commands

```text
Start focus task <task>
Launch all links for <task>
Create focus task
Edit focus task
```

### PWA commands

```text
Install app
Open shared link draft
Copy bookmarklet
```

---

## Command object

```ts
interface Command {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  icon: string;
  group: "links" | "focus" | "vault" | "timeline" | "app";
  disabled?: boolean;
  run: () => void | Promise<void>;
}
```

---

## Search ranking

Use deterministic fuzzy matching. No AI required.

Ranking rules:

1. Exact title match
2. Title starts with query
3. Domain starts with query
4. Tag match
5. URL contains query
6. Recently opened boost
7. Pinned boost

Pseudo-score:

```ts
score = 0
if title === query: score += 100
if title startsWith query: score += 80
if domain startsWith query: score += 70
if tag matches query: score += 60
if url includes query: score += 40
if pinned: score += 15
if opened recently: score += 10
```

---

## Keyboard behavior

| Key                            | Action                                      |
| ------------------------------ | ------------------------------------------- |
| Ctrl/Cmd + K                   | Open command palette                        |
| Esc                            | Close palette                               |
| Arrow Down                     | Next result                                 |
| Arrow Up                       | Previous result                             |
| Enter                          | Run selected command                        |
| Ctrl/Cmd + Enter               | Open selected link in new tab if applicable |
| Backspace on empty nested view | Return to root command list                 |

---

## Accessibility

- Palette wrapper: `role="dialog"`, `aria-modal="true"`
- Search input: `role="combobox"`
- Results: `role="listbox"`
- Result item: `role="option"`
- Maintain selected option with `aria-activedescendant`
- Trap focus while palette is open
- Restore focus to previous element when closed

---

## UI direction

Follow the neon/dithered design system:

- Hard 2px border
- 4px radius
- Dark panel background
- Heading-stroke style for section labels only, not every result
- Active result gets brand border and dither tile reveal
- Use scanline overlay subtly behind the palette

---

## Acceptance criteria

- `Ctrl/Cmd + K` opens palette from anywhere except active text input.
- Palette can open, copy, pin, delete, and launch links.
- Search feels instant with at least 1,000 links.
- All results are keyboard navigable.
- Palette closes on Esc and restores previous focus.
- Disabled commands are visible but not executable.
- Command execution logs to timeline.

---

# Feature 2 — Encrypted Vault Mode

## Goal

Allow the user to encrypt all saved vault data with a passphrase.

This is a privacy feature, not a full security guarantee.

---

## Threat model

### Protects against

- Casual inspection of IndexedDB/localStorage
- Someone copying the browser profile while vault is locked
- Accidental exposure during screen sharing if vault is locked

### Does not protect against

- XSS while app is loaded
- Malicious browser extensions
- Compromised OS/device
- Keyloggers
- Screenshots/screen recording
- Data while vault is unlocked in memory
- Forgotten passphrase

---

## Important security decision

If encryption is enabled, remove external runtime scripts from the app.

Current risk:

```html
<script src="https://unpkg.com/@phosphor-icons/web"></script>
```

For encrypted mode, prefer:

- Inline SVG icons
- Locally hosted icon CSS
- Or no external icon script

Reason: any third-party script loaded at runtime can read plaintext while the vault is unlocked.

---

## Crypto approach

Use Web Crypto API:

```text
KDF: PBKDF2 + SHA-256
Cipher: AES-GCM
Key length: 256-bit
Salt: random 16 bytes
IV: random 12 bytes per encryption
```

### Encrypted envelope

```ts
interface EncryptedVaultEnvelope {
  schemaVersion: 2;
  encrypted: true;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string; // base64
  iv: string; // base64, new every save
  ciphertext: string; // base64
  updatedAt: string;
}
```

---

## Unlock flow

```text
User enters passphrase
↓
Derive CryptoKey using PBKDF2
↓
Try AES-GCM decrypt
↓
If success: keep CryptoKey + plaintext vault in memory
↓
If fail: show generic unlock error
```

Do not reveal whether the passphrase, data, or ciphertext was wrong.

---

## Lock flow

```text
User clicks Lock / auto-lock triggers
↓
Encrypt latest plaintext vault
↓
Save encrypted envelope
↓
Clear plaintext state from memory
↓
Clear CryptoKey reference
↓
Render locked screen
```

---

## Write flow while unlocked

```text
User changes vault data
↓
Update in-memory VaultPlaintext
↓
Append timeline event
↓
Encrypt VaultPlaintext with existing CryptoKey
↓
Save new encrypted envelope with new IV
```

Do not re-derive the key on every write. Derive once per unlock session.

---

## Auto-lock

Settings:

```text
Off
1 minute
5 minutes
15 minutes
30 minutes
```

Reset inactivity timer on:

- keyboard input
- mouse click
- touch
- command execution
- link open

---

## Passphrase rules

Do not force complex password rules. Instead show clear copy:

```text
Use a long passphrase. If you forget it, your vault cannot be recovered.
```

Recommended UI:

```text
Enable Encrypted Vault
[ Passphrase ]
[ Confirm passphrase ]

Warning: No recovery is possible.
```

---

## Recovery/export behavior

Support two exports:

| Export type      | Contents                             | Use case            |
| ---------------- | ------------------------------------ | ------------------- |
| Encrypted export | Encrypted envelope only              | Backup safely       |
| Decrypted export | Plain JSON after unlock confirmation | Migration/debugging |

Decrypted export must require explicit confirmation.

---

## Acceptance criteria

- User can enable encrypted vault from existing data.
- Stored vault data is unreadable ciphertext after encryption.
- Wrong passphrase fails without data loss.
- Lock clears visible links and timeline.
- Unlock restores all links, focus tasks, and timeline.
- Auto-lock works after configured inactivity.
- Decrypted export is blocked while locked.
- No third-party runtime scripts remain in encrypted mode.

---

# Feature 3 — Share Target / PWA

## Goal

Let the installed app receive shared links from the OS/browser share sheet.

Example:

```text
Mobile browser → Share → Link Vault → Save into vault
```

---

## PWA requirements

Add:

```text
manifest.webmanifest
sw.js
icons/icon-192.png
icons/icon-512.png
```

Minimum manifest:

```json
{
  "name": "Link Vault",
  "short_name": "Vault",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0E1524",
  "theme_color": "#71C7C5",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Share Target MVP

Start with text/URL sharing only.

```json
{
  "share_target": {
    "action": "/?share-target=1",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### Why GET first

- Simpler
- Works for URL/title/text
- No service-worker form parsing needed
- Enough for link capture

Files can be added later with POST + multipart/form-data.

---

## Share handling flow

```text
App launches with ?share-target=1&title=...&url=...&text=...
↓
share-target.js parses URLSearchParams
↓
Normalize URL
↓
Open “Shared Link Draft” screen
↓
If vault unlocked: user can save immediately
↓
If vault locked: user must unlock first
↓
Save link with source = "share-target"
↓
Append timeline event: share.received + link.added
↓
Clean URL using history.replaceState()
```

---

## Locked vault behavior

Do **not** silently persist shared data in plaintext while the vault is locked.

Recommended behavior:

```text
Shared link received.
Unlock vault to save it.
```

If the user closes the app before unlocking, the shared link can be lost. That is acceptable for privacy-first behavior.

Optional later setting:

```text
Allow unencrypted share inbox while locked
```

Default should be off.

---

## Service worker MVP

Use service worker for install/offline shell first.

```text
Cache app shell:
- /
- /index.html
- /styles.css
- /src/*.js
- /manifest.webmanifest
- icons
```

Do not overbuild caching. Use a simple app-shell strategy.

---

## Fallbacks

Because Share Target support is not universal, include fallback capture options:

1. Bookmarklet save
2. Paste from clipboard
3. Manual add form
4. Import JSON

---

## Acceptance criteria

- App is installable on supported browsers.
- Installed app appears as a share target where supported.
- Shared URL/title/text opens a draft in Link Vault.
- Locked encrypted vault requires unlock before saving.
- Shared data is not persisted unencrypted by default.
- URL query parameters are cleaned after capture.
- App still works if Share Target is unsupported.

---

# Feature 4 — Focus Launchpad

## Goal

Let the user select a task and launch the links needed for that task.

This should feel like booting a work mode.

---

## Core concepts

### Focus task examples

```text
Start Work
- Gmail
- Calendar
- Company portal
- Dashboard

Coding Session
- GitHub
- MDN
- Stack Overflow
- Localhost

Learning
- Course page
- Notes
- Dictionary
```

---

## Task selection UI

Main surface:

```text
Focus Launchpad

[ Start Work       5 links ]
[ Coding Session   4 links ]
[ Learning         3 links ]
```

Each task card:

- Task name
- Description
- Number of links
- Last launched time
- Run count
- Primary button: `Launch`
- Secondary action: `Edit`

---

## Recommendation logic

No AI needed. Use deterministic scoring.

When creating/editing a task, suggest links by:

1. Matching tags
2. Matching domains
3. Recently opened links
4. Pinned links
5. Links frequently opened together in previous task sessions

Pseudo-score:

```ts
score = 0
if link.tags intersects task.tagRules: score += 50
if link.domain in task.domainRules: score += 40
if link.pinned: score += 20
if opened in last 7 days: score += 15
if often used with selected links: score += 10
```

---

## Launch modes

### Guided mode

Shows links with checkboxes before opening.

```text
Launch Coding Session
[x] GitHub
[x] MDN
[x] Localhost
[ ] Stack Overflow

[Launch selected]
```

Best default mode.

### Open-all mode

Opens all task links immediately after user clicks launch.

Use with caution because browsers may block popups.

---

## Popup blocker rule

Opening multiple tabs should happen directly inside a user click handler.

Avoid:

```text
click → await animation → open tabs
```

Prefer:

```text
click → open tabs immediately → show launch animation/log
```

---

## Launch sequence visual

After opening links, render a terminal-style sequence:

```text
BOOTING FOCUS TASK...
LOADING GITHUB...
LOADING MDN...
LOADING LOCALHOST...
READY.
```

This fits the early-computing design system and makes the action feel premium.

---

## Command Palette integration

Commands:

```text
Start Focus: Work
Start Focus: Coding Session
Create Focus Task
Edit Focus Task
```

---

## Timeline integration

When launched:

```text
task.launched
link.opened for each opened link
```

Metadata:

```ts
{
  taskId: string,
  linkIds: string[],
  launchMode: "guided" | "open-all"
}
```

---

## Acceptance criteria

- User can create a focus task.
- User can attach existing links to a task.
- User can launch selected task links.
- Browser popup blocking is minimized.
- Launch action logs to timeline.
- Task can be started from Command Palette.
- Task card shows last run and run count.

---

# Feature 5 — Link Timeline / Memory Trail

## Goal

Create a chronological memory of what happened in the vault.

This adds depth and makes the app feel like a real personal system.

---

## Timeline views

### Default view

Grouped by date:

```text
Today
- Added GitHub
- Copied Portfolio URL
- Launched Coding Session

Yesterday
- Shared Notion page from mobile
- Pinned Resume
```

### Filters

```text
All
Links
Focus
Share
Vault
```

### Search

Search timeline by:

- title
- domain
- event type
- task name

---

## Event retention

Default:

```text
maxTimelineEvents: 1000
```

When limit is exceeded:

- Remove oldest events
- Keep important vault events if possible

Important event types:

```text
vault.encryption.enabled
vault.unlock_failed
task.launched
share.received
```

---

## Privacy

If vault encryption is enabled, timeline is inside the encrypted vault.

When locked:

```text
Timeline unavailable. Unlock vault to view memory trail.
```

Do not keep sensitive timeline summaries outside the encrypted vault.

---

## Timeline event writing

Use a single helper:

```ts
appendTimelineEvent(type, entityType, entityId, summary, metadata);
```

Every state-changing action should call this helper.

---

## Timeline UI direction

Use the design system:

- 2px borders
- 4px radius
- Dither tile hover reveal
- Small uppercase event labels
- Date groups with hatched dividers
- No soft glassmorphism

---

## Acceptance criteria

- Adding, editing, deleting, opening, copying, pinning links creates events.
- Focus task launch creates events.
- Share target capture creates events.
- Vault lock/unlock events are logged carefully.
- Timeline is hidden while encrypted vault is locked.
- User can filter by event type.
- Timeline does not grow without limit.

---

# Integration Rules

## Command Palette should be the command layer

Do not implement feature-specific keyboard systems separately.

Examples:

```text
Ctrl + K → “lock” → Lock vault
Ctrl + K → “work” → Start Work focus task
Ctrl + K → “timeline” → Open Memory Trail
```

---

## Timeline should be the event layer

Every meaningful action should create a timeline event.

Avoid scattered event logic. Centralize it.

---

## Encryption should wrap the whole vault

Do not encrypt individual fields in v1.

Recommended:

```text
Encrypt VaultPlaintext as one JSON blob
```

Reason:

- Simpler
- Less metadata leakage
- Easier export/import
- Easier lock/unlock behavior

---

## Share Target must respect vault lock state

If locked, do not save shared content until unlock.

---

# Implementation Order

## Phase 0 — Refactor Foundation

Tasks:

- Split JS/CSS into files.
- Add state manager.
- Add storage abstraction.
- Add migration from old localStorage keys.
- Add timeline helper but keep UI hidden initially.
- Remove unsafe `innerHTML` paths for user-controlled data.

Deliverable:

```text
Same visible app, better internal structure.
```

---

## Phase 1 — Command Palette MVP

Tasks:

- Add `commands.js` registry.
- Add `command-palette.js` UI.
- Add keyboard navigation.
- Add link commands: open, copy, pin, delete.
- Add app commands: add link, export, timeline placeholder.

Deliverable:

```text
Ctrl/Cmd + K controls the current app.
```

---

## Phase 2 — Timeline MVP

Tasks:

- Add timeline events for link actions.
- Add Memory Trail panel/view.
- Add filters.
- Add retention cap.
- Add command palette entry.

Deliverable:

```text
User can see what happened in the vault.
```

---

## Phase 3 — Focus Launchpad

Tasks:

- Add focus task data model.
- Add task create/edit UI.
- Add guided launch mode.
- Add command palette task commands.
- Add task launch timeline events.

Deliverable:

```text
User can launch task-specific link sets.
```

---

## Phase 4 — Encrypted Vault Mode

Tasks:

- Add `crypto.js`.
- Implement PBKDF2 + AES-GCM envelope.
- Add enable encryption flow.
- Add unlock/lock screen.
- Add auto-lock.
- Add encrypted/decrypted export logic.
- Remove external runtime scripts.

Deliverable:

```text
Vault can be locked and stored as ciphertext.
```

---

## Phase 5 — PWA + Share Target

Tasks:

- Add manifest.
- Add icons.
- Add service worker.
- Add install prompt UI.
- Add GET-based share target.
- Add shared link draft screen.
- Add locked-vault share flow.
- Add fallback bookmarklet.

Deliverable:

```text
Installed app can receive shared links where supported.
```

---

# UX Decisions to Confirm Before Dev

## 1. Encryption scope

Recommended:

```text
Encrypt the whole vault when enabled.
```

Alternative:

```text
Only encrypt private links.
```

Tradeoff:

| Option             | Pros                                  | Cons                          |
| ------------------ | ------------------------------------- | ----------------------------- |
| Whole vault        | Simpler, safer, less metadata leakage | Everything hidden when locked |
| Private links only | Public links still visible            | More complex, leaks metadata  |

Decision needed: **whole vault or private-only?**

---

## 2. Share while locked

Recommended:

```text
Require unlock before saving shared link.
```

Alternative:

```text
Save shared link to unencrypted inbox while locked.
```

Decision needed: **privacy-first or convenience-first?**

---

## 3. Focus Launchpad default mode

Recommended:

```text
Guided mode by default.
```

Reason: prevents accidental mass tab opening.

Decision needed: **guided by default or open-all by default?**

---

## 4. Timeline retention

Recommended:

```text
Keep last 1000 events.
```

Decision needed: **1000 events enough?**

---

## 5. File structure

Recommended:

```text
Split into ES modules now.
```

Decision needed: **keep single-file demo or move to multi-file app?**

---

# Design System Notes

Apply the existing dithered neon design system consistently.

## Must keep

- Dark section background
- 2px borders
- 4px base radius
- Space Grotesk font
- Uppercase stroked headings
- Dither/scanline overlays
- Hard-edge cards
- Neon brand focus rings
- Button glint effect

## Avoid

- Glassmorphism
- Large soft gradients as primary style
- Random raw hex values in component CSS
- Over-rounded modern SaaS cards
- AI-like recommendation copy
- Too many micro-animations

---

# Testing Checklist

## Storage / migration

- [ ] Legacy localStorage links migrate successfully.
- [ ] Invalid legacy data does not crash app.
- [ ] Export before encryption works.
- [ ] IndexedDB data survives refresh.

## Command Palette

- [ ] Ctrl/Cmd + K opens palette.
- [ ] Esc closes palette.
- [ ] Arrow keys move selection.
- [ ] Enter executes selected command.
- [ ] Search works for title, URL, domain, and tags.
- [ ] Focus returns after close.

## Timeline

- [ ] Add/edit/delete/open/copy/pin events appear.
- [ ] Task launch events appear.
- [ ] Share target events appear.
- [ ] Filters work.
- [ ] Retention cap works.

## Focus Launchpad

- [ ] Create task.
- [ ] Edit task.
- [ ] Attach links.
- [ ] Guided launch opens selected links.
- [ ] Command palette can launch task.
- [ ] Popup blocking is tested.

## Encryption

- [ ] Enable encryption.
- [ ] Stored data becomes ciphertext.
- [ ] Unlock with correct passphrase works.
- [ ] Wrong passphrase fails safely.
- [ ] Lock clears visible data.
- [ ] Auto-lock works.
- [ ] Decrypted export requires unlock.
- [ ] No external runtime scripts remain.

## PWA / Share Target

- [ ] Manifest is valid.
- [ ] Service worker registers.
- [ ] App install prompt works where supported.
- [ ] Installed app receives shared URL/title/text where supported.
- [ ] Locked vault requires unlock before saving shared data.
- [ ] Unsupported browsers still have fallback capture.

---

# Risk Register

| Risk                                      | Impact | Mitigation                                                           |
| ----------------------------------------- | -----: | -------------------------------------------------------------------- |
| Share Target unsupported in some browsers |   High | Bookmarklet + clipboard fallback                                     |
| Popup blockers block multi-link launch    | Medium | Open tabs only inside direct click handler                           |
| User forgets passphrase                   |   High | Clear warning + encrypted export guidance                            |
| XSS defeats encryption while unlocked     |   High | No unsafe innerHTML, no third-party runtime scripts, strict DOM APIs |
| IndexedDB migration bug                   |   High | Keep legacy backup until migration verified                          |
| Timeline leaks sensitive info             | Medium | Store timeline inside encrypted vault                                |
| Too many features make UI crowded         | Medium | Route power features through Command Palette                         |

---

# Recommended MVP Cut

If time is limited, build in this order:

```text
1. Refactor storage + data model
2. Command Palette
3. Timeline MVP
4. Focus Launchpad guided mode
5. Encrypted Vault Mode
6. PWA install + Share Target
```

Do not start with PWA first. PWA feels impressive, but Command Palette and Focus Launchpad change the product feel more immediately.

---

# Final Product Behavior

After implementation, the app should support this flow:

```text
User presses Ctrl + K
↓
Types “work”
↓
Selects “Start Focus: Work”
↓
Guided launch opens selected links
↓
Timeline records the session
↓
User locks vault
↓
Data at rest becomes ciphertext
↓
Later, user shares a page from mobile into installed PWA
↓
Vault asks to unlock before saving
```

That is the target “wow” loop.

link-vault/
├─ src/
│ ├─ app.css
│ ├─ routes/
│ │ ├─ +layout.svelte
│ │ ├─ +page.svelte
│ │ ├─ share/
│ │ │ └─ +page.svelte
│ │ └─ settings/
│ │ └─ +page.svelte
│ │
│ ├─ lib/
│ │ ├─ components/
│ │ │ ├─ CommandPalette.svelte
│ │ │ ├─ LinkCard.svelte
│ │ │ ├─ VaultUnlock.svelte
│ │ │ ├─ FocusLaunchpad.svelte
│ │ │ └─ TimelineView.svelte
│ │ │
│ │ ├─ stores/
│ │ │ ├─ vault.store.ts
│ │ │ ├─ links.store.ts
│ │ │ └─ command.store.ts
│ │ │
│ │ ├─ services/
│ │ │ ├─ db.ts
│ │ │ ├─ crypto.ts
│ │ │ ├─ share-target.ts
│ │ │ ├─ timeline.ts
│ │ │ └─ focus.ts
│ │ │
│ │ ├─ types/
│ │ │ └─ vault.ts
│ │ │
│ │ └─ utils/
│ │ ├─ url.ts
│ │ └─ shortcuts.ts
│ │
├─ static/
│ ├─ manifest.webmanifest
│ └─ icons/
│
├─ vite.config.ts
├─ svelte.config.js
├─ package.json
└─ README.md
