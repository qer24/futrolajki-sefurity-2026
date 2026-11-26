<script lang="ts">
	import type { Rank } from '$lib/modules/duty/duty-ranks.js';

	interface Duty {
		user_id: number;
		rank: Rank | null;
	}

	let { duties }: { duties: Duty[] } = $props();

	function uniquePeople(list: Duty[]): number {
		return new Set(list.map((duty) => duty.user_id)).size;
	}

	const stats = $derived([
		{
			key: 'porzadkowa',
			label: 'Porządkowe',
			count: uniquePeople(duties.filter((duty) => duty.rank === 'porzadkowa'))
		},
		{
			key: 'info',
			label: 'Info',
			count: uniquePeople(duties.filter((duty) => duty.rank === 'info'))
		},
		{
			key: 'rest',
			label: 'Dowódcy',
			count: uniquePeople(duties.filter((duty) => duty.rank === 'dowodca'))
		},
		{
			key: 'total',
			label: 'Łącznie',
			count: uniquePeople(duties)
		}
	]);

	const STAT_DOTS: Record<string, string> = {
		porzadkowa: 'bg-green-500',
		info: 'bg-cyan-500',
		rest: 'bg-purple-500',
		total: 'bg-slate-500'
	};
</script>

<div class="grid grid-cols-2 gap-px border-y bg-border sm:grid-cols-4">
	{#each stats as stat (stat.key)}
		<div class="space-y-3 bg-background px-6 py-5 lg:px-10">
			<div class="flex items-center justify-between">
				<span class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<span class="inline-block size-2 rounded-full {STAT_DOTS[stat.key]}"></span>
					{stat.label}
				</span>
			</div>

			<span class="text-3xl font-bold tabular-nums">{stat.count}</span>
		</div>
	{/each}
</div>
