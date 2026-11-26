<script lang="ts">
	import * as Select from '#lib/components/ui/select';
	import { RANKS, RANK_DOTS, type Rank } from '#lib/modules/duty/duty-ranks.js';

	let { value = $bindable() }: { value: Rank | 'all' } = $props();
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger class="w-full sm:w-48">
		{#if value !== 'all'}
			<span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[value]}"></span>
		{/if}
		{value === 'all' ? 'Wszystkie rangi' : value}
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="all" label="Wszystkie rangi">Wszystkie rangi</Select.Item>
		{#each RANKS as rank (rank)}
			<Select.Item value={rank} label={rank}>
				<span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[rank]}"></span>
				{rank}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
