<script lang="ts">
  import { onMount } from 'svelte';
  import LinkCard from '$lib/components/LinkCard.svelte';
  import { links, loadLinks, addLink, currentTag, searchQuery, newestFirst } from '$lib/stores/links.store';
  import type { LinkItem } from '$lib/types/vault';

  let titleInput = $state('');
  let urlInput = $state('');
  let tagInput = $state('None');

  onMount(async () => {
    await loadLinks();
  });

  async function handleAddLink(e: Event) {
    e.preventDefault();
    if (!titleInput.trim() || !urlInput.trim()) return;

    let finalUrl = urlInput;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const newLink: LinkItem = {
      id: crypto.randomUUID(),
      title: titleInput,
      url: finalUrl,
      normalizedUrl: finalUrl,
      domain: new URL(finalUrl).hostname,
      tags: [tagInput],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
      openCount: 0,
      source: 'manual'
    };

    await addLink(newLink);
    titleInput = '';
    urlInput = '';
    tagInput = 'None';
  }

  let filteredLinks = $derived.by(() => {
    let result = $links;
    if ($currentTag !== 'All') {
      result = result.filter(l => l.tags.includes($currentTag));
    }
    if ($searchQuery) {
      const q = $searchQuery.toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return $newestFirst ? tB - tA : tA - tB;
    });
    
    return result;
  });
</script>

<main class="page">
  <div class="container">
    <header class="hero">
      <h1 class="massive-text">LINK<span>VAULT</span></h1>
      <div class="hero-stats">
        <span class="stat-value">{$links.length}</span>
        <span class="stat-label">Records</span>
      </div>
    </header>
  </div>

  <div class="marquee-container">
    <div class="marquee-content">
      <span>VAULT OS // EXPERIMENTAL // SVELTEKIT CORE // OFFLINE READY //</span>
      <span>VAULT OS // EXPERIMENTAL // SVELTEKIT CORE // OFFLINE READY //</span>
    </div>
  </div>

  <div class="container">
    <div class="layout-grid">
      <aside class="sidebar">
        <div class="panel">
          <div class="panel-header">
            <h2>ADD ENTRY</h2>
          </div>
          <form class="form" onsubmit={handleAddLink}>
            <div class="field">
              <label class="label" for="title">Title</label>
              <div class="input-wrap">
                <i class="ph ph-text-t"></i>
                <input id="title" class="input" type="text" bind:value={titleInput} required autocomplete="off" />
              </div>
            </div>
            <div class="field">
              <label class="label" for="url">URL</label>
              <div class="input-wrap">
                <i class="ph ph-link"></i>
                <input id="url" class="input" type="url" bind:value={urlInput} required autocomplete="off" />
              </div>
            </div>
            <div class="field">
              <label class="label" for="tag">Category</label>
              <div class="input-wrap">
                <i class="ph ph-tag"></i>
                <select id="tag" class="select" bind:value={tagInput}>
                  <option value="None">Uncategorized</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Tools">Tools</option>
                  <option value="Docs">Docs</option>
                </select>
              </div>
            </div>
            <div class="button-row">
              <button class="btn btn-brand" type="submit">
                <i class="ph ph-plus-circle"></i> ADD LINK
              </button>
            </div>
          </form>
        </div>
      </aside>

      <section class="main-content">
        <div class="toolbar">
          <div class="toolbar-top">
            <h2>DATABASE</h2>
            <div class="toolbar-actions">
              <button class="btn-icon" onclick={() => $newestFirst = !$newestFirst} aria-label="Toggle Sort" title="Toggle Sort">
                <i class={$newestFirst ? "ph ph-sort-descending" : "ph ph-sort-ascending"}></i>
              </button>
            </div>
          </div>

          <div class="search-bar">
            <div class="input-wrap">
              <i class="ph ph-magnifying-glass"></i>
              <input class="input" type="text" placeholder="Search database..." bind:value={$searchQuery} />
            </div>
          </div>

          <div class="tag-filters">
            {#each ['All', 'Work', 'Personal', 'Tools', 'Docs', 'None'] as tag}
              <button 
                class="tag-btn {$currentTag === tag ? 'active' : ''}" 
                onclick={() => $currentTag = tag}
              >
                {tag.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>

        <div class="link-list">
          {#each filteredLinks as link (link.id)}
            <LinkCard {link} />
          {:else}
            <div class="empty">
              <i class="ph ph-ghost"></i>
              <p class="empty-title">DATABASE EMPTY</p>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
</main>

<style>
  .layout-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 48px;
    align-items: start;
    padding-bottom: 96px;
  }

  @media (max-width: 1024px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    border: 2px solid var(--border);
    background: var(--bg);
    padding: 32px;
    position: sticky;
    top: 32px;
  }

  .panel-header {
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .button-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 32px;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 32px;
  }

  .toolbar-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toolbar-actions {
    display: flex;
    gap: 12px;
  }

  .tag-filters {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .tag-btn {
    padding: 6px 16px;
    background: transparent;
    border: 2px solid var(--border);
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 150ms;
  }

  .tag-btn:hover {
    border-color: var(--fg);
    color: var(--fg);
  }

  .tag-btn.active {
    background: var(--fg);
    color: #000;
    border-color: var(--fg);
  }

  .link-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }

  .empty {
    grid-column: 1 / -1;
    padding: 64px 32px;
    border: 2px dashed var(--border-light);
    text-align: center;
  }
  .empty i {
    font-size: 48px;
    color: var(--border-light);
    margin-bottom: 16px;
  }
  .empty-title {
    font-size: 24px;
    font-weight: 700;
  }
</style>
