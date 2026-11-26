<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Input } from '$lib/components/ui/input';
	import DutyRankSelect from '$lib/components/duty/DutyRankSelect.svelte';
	import type { Rank } from '$lib/modules/duty/duty-ranks.js';

	let {
		search = $bindable(),
		rankFilter = $bindable(),
		placeholder,
		children
	}: {
		search: string;
		rankFilter: Rank | 'all';
		placeholder: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-col gap-2 sm:flex-row">
	<Input {placeholder} bind:value={search} class="sm:flex-1" />
	<DutyRankSelect bind:value={rankFilter} />
	{@render children?.()}
</div>
