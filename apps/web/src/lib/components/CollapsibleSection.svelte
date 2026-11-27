<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		title,
		titleClass = 'text-lg font-semibold',
		storageKey,
		children,
		actions
	}: {
		title: string;
		titleClass?: string;
		storageKey: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();

	let collapsed = $state(false);
	const contentId = $derived(`collapsible-${storageKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`);

	onMount(() => {
		collapsed = localStorage.getItem(`ui:section-collapsed:${storageKey}`) === 'true';
	});

	function toggle() {
		collapsed = !collapsed;
		localStorage.setItem(`ui:section-collapsed:${storageKey}`, String(collapsed));
	}
</script>

<section>
	<div class="mb-4 flex items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-2">
			<Button
				variant="outline"
				size="icon-sm"
				onclick={toggle}
				aria-label={`${collapsed ? 'Show' : 'Hide'} ${title}`}
				aria-expanded={!collapsed}
				aria-controls={contentId}
			>
				{#if collapsed}
					<Plus />
				{:else}
					<Minus />
				{/if}
			</Button>
			<h2 class={titleClass}>{title}</h2>
		</div>
		{#if actions}
			{@render actions()}
		{/if}
	</div>

	<div id={contentId} hidden={collapsed}>
		{@render children()}
	</div>
</section>
