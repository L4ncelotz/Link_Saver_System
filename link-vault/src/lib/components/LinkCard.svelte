<script lang="ts">
  import type { LinkItem } from '../types/vault';
  import { deleteLink, updateLink } from '../stores/links.store';

  let { link } = $props<{ link: LinkItem }>();

  async function togglePin() {
    await updateLink(link.id, { pinned: !link.pinned });
  }

  async function removeLink() {
    if (confirm('DELETE RECORD?')) {
      await deleteLink(link.id);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(link.url);
    alert('URL COPIED');
  }

  // Derive favicon from URL domain safely
  let faviconSrc = $derived.by(() => {
    try {
      const urlObj = new URL(link.url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch {
      return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iIzk2QUJCRCIgZD0iTTggMGExIDEgMCAwIDAtMSAxdjYuNUw0LjIgNS4zYTEgMSAwIDAgMC0xLjQgMS40bDQgNGEx MSAwIDAgMCAxLjQgMGw0LTRhMSAxIDAgMCAwLTEuNC0xLjRMNyA3LjVWMWEx MSAwIDAgMC0xLTF6Ii8+PC9zdmc+";
    }
  });
</script>

<article class="link-card {link.pinned ? 'pinned' : ''}">
  <a class="link-main" href={link.url} target="_blank" rel="noopener noreferrer">
    <img src={faviconSrc} alt="" class="favicon" />
    <span class="link-text">
      <span class="link-title">
        {link.title}
        {#if link.tags && link.tags.length > 0 && link.tags[0] !== 'None'}
          <span class="tag-badge">{link.tags[0]}</span>
        {/if}
      </span>
      <span class="link-url">{link.url}</span>
    </span>
  </a>

  <div class="link-actions">
    <button class="icon-btn {link.pinned ? 'active' : ''}" onclick={togglePin} title="PIN">
      <i class="ph ph-push-pin {link.pinned ? 'ph-fill' : ''}"></i>
    </button>
    <button class="icon-btn" onclick={copyUrl} title="COPY">
      <i class="ph ph-copy"></i>
    </button>
    <button class="delete-btn icon-btn" onclick={removeLink} title="DELETE">
      <i class="ph ph-trash"></i>
    </button>
  </div>
</article>

<style>
  .link-card {
    position: relative;
    border: 2px solid var(--border);
    background: var(--bg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .link-card:hover {
    transform: translate(-6px, -6px);
    box-shadow: 6px 6px 0 var(--accent);
    border-color: var(--accent);
  }

  .link-card.pinned {
    border-color: var(--fg);
  }

  .link-card.pinned::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 32px 32px 0;
    border-color: transparent var(--fg) transparent transparent;
  }

  .link-main {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
  }

  .favicon {
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    border: 2px solid var(--border-light);
    padding: 2px;
    background: var(--bg);
  }

  .link-text {
    flex: 1;
    min-width: 0;
  }

  .link-title {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--fg);
    margin-bottom: 4px;
    word-wrap: break-word;
  }

  .tag-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 2px 6px;
    border: 1px solid var(--border-light);
    color: var(--fg-muted);
    margin-left: 8px;
    vertical-align: middle;
  }

  .link-url {
    display: block;
    font-size: 13px;
    color: var(--fg-muted);
    word-wrap: break-word;
  }

  .link-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    border-top: 2px solid var(--border);
    padding-top: 16px;
  }

  .icon-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    background: transparent;
    border: 2px solid var(--border);
    color: var(--fg);
    transition: all 150ms;
  }

  .icon-btn:hover {
    background: var(--fg);
    color: #000;
  }

  .icon-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
  }

  .icon-btn.delete-btn:hover {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }
</style>
