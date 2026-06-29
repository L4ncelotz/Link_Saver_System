<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { links } from '../stores/links.store';

  let isOpen = $state(false);
  let searchQuery = $state('');
  
  let searchResults = $derived.by(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return $links.filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)).slice(0, 5);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      isOpen = !isOpen;
      searchQuery = '';
    }
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="cmd-overlay" onclick={() => isOpen = false} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="cmd-palette" onclick={e => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="cmd-input-wrap">
        <i class="ph ph-terminal"></i>
        <!-- svelte-ignore a11y_autofocus -->
        <input 
          type="text" 
          class="cmd-input" 
          placeholder="Type a command or search... (ESC to close)" 
          bind:value={searchQuery}
          autofocus
        />
      </div>

      <div class="cmd-results">
        {#if searchResults.length > 0}
          <div class="cmd-group-title">Links</div>
          {#each searchResults as result}
            <a href={result.url} target="_blank" rel="noopener noreferrer" class="cmd-item" onclick={() => isOpen = false}>
              <i class="ph ph-link"></i>
              <span>{result.title}</span>
              <span class="cmd-url">{result.url}</span>
            </a>
          {/each}
        {:else if searchQuery}
          <div class="cmd-empty">No results found for "{searchQuery}"</div>
        {:else}
          <div class="cmd-group-title">Suggestions</div>
          <button class="cmd-item">
            <i class="ph ph-lock"></i>
            <span>Lock Vault</span>
          </button>
          <button class="cmd-item">
            <i class="ph ph-export"></i>
            <span>Export Backup</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .cmd-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 15vh;
  }

  .cmd-palette {
    width: 100%;
    max-width: 600px;
    background: var(--bg);
    border: 2px solid var(--accent);
    box-shadow: 8px 8px 0 rgba(212, 255, 0, 0.2);
    display: flex;
    flex-direction: column;
  }

  .cmd-input-wrap {
    position: relative;
    border-bottom: 2px solid var(--border);
  }

  .cmd-input-wrap i {
    position: absolute;
    top: 50%;
    left: 24px;
    transform: translateY(-50%);
    font-size: 20px;
    color: var(--accent);
  }

  .cmd-input {
    width: 100%;
    padding: 24px 24px 24px 64px;
    background: transparent;
    border: none;
    color: var(--fg);
    font-size: 18px;
    outline: none;
    font-family: inherit;
  }

  .cmd-results {
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
  }

  .cmd-group-title {
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--fg-muted);
    padding: 8px 16px;
    letter-spacing: 1px;
  }

  .cmd-item {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px;
    background: transparent;
    border: 2px solid transparent;
    color: var(--fg);
    text-align: left;
    transition: all 150ms;
    cursor: pointer;
  }

  .cmd-item:hover, .cmd-item:focus {
    background: rgba(212, 255, 0, 0.1);
    border-color: var(--accent);
    color: var(--accent);
    outline: none;
  }

  .cmd-url {
    margin-left: auto;
    font-size: 12px;
    color: var(--fg-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cmd-empty {
    padding: 32px;
    text-align: center;
    color: var(--fg-muted);
  }
</style>
