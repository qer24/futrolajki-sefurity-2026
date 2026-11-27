<script lang="ts">
	import * as Pagination from '#lib/components/ui/pagination';
	import * as Table from '#lib/components/ui/table';
	import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/svelte';
	import DutyRankBadge from '#lib/components/duty/DutyRankBadge.svelte';
	import DutyTableFilters from '#lib/components/duty/DutyTableFilters.svelte';
	import { RANKS, type Rank } from '#lib/modules/duty/duty-ranks.js';

	interface Duty {
		id: number;
		start_time: string;
		nickname: string;
		rank: Rank | null;
		tag_nfc: string;
		end_time?: string;
	}

	type SortKey = 'nickname' | 'rank' | 'start_time' | 'end_time' | 'tag_nfc' | 'length';
	type Sort = { key: SortKey; dir: 'asc' | 'desc' };

	const PAGE_SIZE = 10;
	let {
		duties,
		loading = false,
		error = '',
		history = false,
		showTag = false,
		searchTag = false,
		searchPlaceholder,
		emptyMessage
	}: {
		duties: Duty[];
		loading?: boolean;
		error?: string;
		history?: boolean;
		showTag?: boolean;
		searchTag?: boolean;
		searchPlaceholder: string;
		emptyMessage: string;
	} = $props();

	let search = $state('');
	let rankFilter = $state<Rank | 'all'>('all');
	let page = $state(1);
	let sort = $state<Sort>({ key: 'start_time', dir: 'desc' });

	function formatTime(value: string): string {
		const date = new Date(value);
		return isNaN(date.getTime()) ? value : date.toLocaleString('pl-PL');
	}

	function time(value?: string): number {
		const timestamp = value ? new Date(value).getTime() : 0;
		return isNaN(timestamp) ? 0 : timestamp;
	}

	function formatDuration(start: string, end: string): string {
		const diff = time(end) - time(start);
		if (diff <= 0 || isNaN(diff)) return '—';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours === 0) return `${minutes}m`;
		return `${hours}h ${minutes}m`;
	}

	function rankOrder(rank: Rank | null): number {
		return rank === null ? -1 : RANKS.indexOf(rank);
	}

	function compareBy(a: Duty, b: Duty, key: SortKey): number {
		switch (key) {
			case 'rank':
				return rankOrder(a.rank) - rankOrder(b.rank);
			case 'start_time':
				return time(a.start_time) - time(b.start_time);
			case 'end_time':
				return time(a.end_time) - time(b.end_time);
			case 'length': {
				const aLength = a.end_time ? time(a.end_time) - time(a.start_time) : 0;
				const bLength = b.end_time ? time(b.end_time) - time(b.start_time) : 0;
				return aLength - bLength;
			}
			case 'nickname':
				return a.nickname.localeCompare(b.nickname, 'pl');
			case 'tag_nfc':
				return a.tag_nfc.localeCompare(b.tag_nfc);
		}
	}

	function nextSort(key: SortKey) {
		sort =
			sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
	}

	const filtered = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return duties.filter((duty) => {
			if (rankFilter !== 'all' && duty.rank !== rankFilter) return false;
			if (!query) return true;

			return (
				duty.nickname.toLowerCase().includes(query) ||
				(searchTag && duty.tag_nfc.toLowerCase().includes(query)) ||
				(!history && duty.start_time.toLowerCase().includes(query)) ||
				formatTime(duty.start_time).toLowerCase().includes(query) ||
				(history &&
					duty.end_time !== undefined &&
					formatTime(duty.end_time).toLowerCase().includes(query))
			);
		});
	});

	const sorted = $derived(
		[...filtered].sort((a, b) => {
			const multiplier = sort.dir === 'asc' ? 1 : -1;
			return multiplier * compareBy(a, b, sort.key);
		})
	);
	const paged = $derived(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	$effect(() => {
		if (history) sort = { key: 'end_time', dir: 'desc' };
	});

	$effect(() => {
		search;
		rankFilter;
		sort;
		page = 1;
	});
</script>

{#snippet sortHead(label: string, key: SortKey)}
	<Table.Head
		aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
	>
		<button
			type="button"
			class="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
			onclick={() => nextSort(key)}
		>
			{label}
			{#if sort.key === key}
				{#if sort.dir === 'asc'}
					<ArrowUp class="size-3.5 text-foreground" />
				{:else}
					<ArrowDown class="size-3.5 text-foreground" />
				{/if}
			{:else}
				<ArrowUpDown class="size-3.5 text-muted-foreground/50" />
			{/if}
		</button>
	</Table.Head>
{/snippet}

<div class="space-y-4">
	<DutyTableFilters bind:search bind:rankFilter placeholder={searchPlaceholder} />

	{#if loading}
		<p class="text-muted-foreground">Loading...</p>
	{:else if error}
		<p class="text-red-500">{error}</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					{@render sortHead('Nick', 'nickname')}
					{@render sortHead('Ranga', 'rank')}
					{@render sortHead('Początek', 'start_time')}
					{#if history}
						{@render sortHead('Koniec', 'end_time')}
						{@render sortHead('Czas trwania', 'length')}
					{/if}
					{#if showTag}
						{@render sortHead('Badge NFC ID', 'tag_nfc')}
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each paged as duty (duty.id)}
					<Table.Row>
						<Table.Cell class="font-medium">{duty.nickname}</Table.Cell>
						<Table.Cell><DutyRankBadge rank={duty.rank} /></Table.Cell>
						<Table.Cell class="font-mono text-xs">
							{formatTime(duty.start_time)}
						</Table.Cell>
						{#if history}
							<Table.Cell class="font-mono text-xs">
								{formatTime(duty.end_time ?? '')}
							</Table.Cell>
							<Table.Cell class="font-mono text-xs">
								{formatDuration(duty.start_time, duty.end_time ?? '')}
							</Table.Cell>
						{/if}
						{#if showTag}
							<Table.Cell class="font-mono text-xs">{duty.tag_nfc}</Table.Cell>
						{/if}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell
							colspan={3 + (history ? 2 : 0) + (showTag ? 1 : 0)}
							class="h-24 text-center text-muted-foreground"
						>
							{emptyMessage}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		{#if filtered.length > PAGE_SIZE}
			<Pagination.Root count={filtered.length} perPage={PAGE_SIZE} bind:page>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton />
						</Pagination.Item>
						{#each pages as p (p.key)}
							{#if p.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link page={p} isActive={currentPage === p.value}>
										{p.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		{/if}
	{/if}
</div>
