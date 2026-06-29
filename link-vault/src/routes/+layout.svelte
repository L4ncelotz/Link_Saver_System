<script lang="ts">
	import '../app.css';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	let { children } = $props();
</script>

<CommandPalette />
{@render children()}
