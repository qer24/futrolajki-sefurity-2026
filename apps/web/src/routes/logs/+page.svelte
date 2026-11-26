<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowUp, ArrowDown } from '@lucide/svelte';
	import { apiFetch } from '$lib/api.js';
	import DutyRankBadge from '$lib/components/duty/DutyRankBadge.svelte';
	import DutyTableFilters from '$lib/components/duty/DutyTableFilters.svelte';
	import type { Rank } from '$lib/modules/duty/duty-ranks.js';

	type LogType = 'start' | 'end';

	interface ActiveDuty {
		id: number;
		user_id: number;
		start_time: string;
		nickname: string;
		rank: Rank | null;
		tag_nfc: string;
	}

	interface EndedDuty extends ActiveDuty {
		end_time: string;
	}

	interface LogEvent {
		key: string;
		type: LogType;
		at: number;
		duty: ActiveDuty;
	}

	interface DayGroup {
		key: string;
		label: string;
		events: LogEvent[];
	}

	const BATCH_SIZE = 100;

	const ACTIONS: Record<LogType, { text: string; dot: string; textClass: string }> = {
		start: {
			text: 'zaczął służbę',
			dot: 'bg-emerald-500',
			textClass: 'text-emerald-700 dark:text-emerald-400'
		},
		end: {
			text: 'skończył służbę',
			dot: 'bg-amber-500',
			textClass: 'text-amber-700 dark:text-amber-400'
		}
	};

	let active = $state<ActiveDuty[]>([]);
	let ended = $state<EndedDuty[]>([]);
	let loading = $state(false);
	let error = $state('');

	let search = $state('');
	let rankFilter = $state<Rank | 'all'>('all');
	let order = $state<'asc' | 'desc'>('desc');
	let visibleCount = $state(BATCH_SIZE);

	function toTime(value?: string): number {
		const t = value ? new Date(value).getTime() : NaN;
		return t;
	}

	function formatClock(at: number): string {
		return new Date(at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
	}

	function dayKey(at: number): string {
		const d = new Date(at);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function dayLabel(at: number): string {
		return new Date(at).toLocaleDateString('pl-PL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Every duty produces a "start" event; ended duties also produce an "end" event
	const allEvents = $derived.by(() => {
		const list: LogEvent[] = [];

		for (const duty of active) {
			const at = toTime(duty.start_time);
			if (!isNaN(at)) list.push({ key: `s-${duty.id}`, type: 'start', at, duty });
		}

		for (const duty of ended) {
			const start = toTime(duty.start_time);
			const end = toTime(duty.end_time);
			if (!isNaN(start)) list.push({ key: `s-${duty.id}`, type: 'start', at: start, duty });
			if (!isNaN(end)) list.push({ key: `e-${duty.id}`, type: 'end', at: end, duty });
		}

		return list;
	});

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();

		return allEvents.filter((e) => {
			if (rankFilter !== 'all' && e.duty.rank !== rankFilter) return false;
			if (!q) return true;

			return e.duty.nickname.toLowerCase().includes(q) || e.duty.tag_nfc.toLowerCase().includes(q);
		});
	});

	const sorted = $derived.by(() => {
		const m = order === 'asc' ? 1 : -1;
		return [...filtered].sort((a, b) => {
			if (a.at !== b.at) return m * (a.at - b.at);
			// Same moment: a start comes before an end
			return m * ((a.type === 'start' ? 0 : 1) - (b.type === 'start' ? 0 : 1));
		});
	});

	const visible = $derived(sorted.slice(0, visibleCount));

	const groups = $derived.by(() => {
		const result: DayGroup[] = [];

		for (const event of visible) {
			const key = dayKey(event.at);
			const last = result[result.length - 1];

			if (last && last.key === key) {
				last.events.push(event);
			} else {
				result.push({ key, label: dayLabel(event.at), events: [event] });
			}
		}

		return result;
	});

	// Start over from the first batch whenever the filters or order change
	$effect(() => {
		search;
		rankFilter;
		order;
		visibleCount = BATCH_SIZE;
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const [activeResponse, historyResponse] = await Promise.all([
				apiFetch('/duty/active'),
				apiFetch('/duty/history')
			]);
			if (!activeResponse.ok || !historyResponse.ok) throw new Error('load failed');

			active = await activeResponse.json();
			ended = await historyResponse.json();
		} catch {
			error = 'Nie udało się pobrać logów';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});
</script>

<div class="w-full">
	<section class="px-6 py-8 lg:px-10">
		<div class="mb-4 flex items-center justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold">Logi dyżurów</h2>
				<p class="text-sm text-muted-foreground">
					{filtered.length} zdarzeń
				</p>
			</div>
			<Button variant="outline" onclick={load} disabled={loading}>Odśwież</Button>
		</div>

		<div class="space-y-4">
			<DutyTableFilters bind:search bind:rankFilter placeholder="Szukaj: nick, tag NFC...">
				<Button
					variant="outline"
					class="w-full sm:w-40"
					onclick={() => (order = order === 'desc' ? 'asc' : 'desc')}
				>
					{#if order === 'desc'}
						<ArrowDown class="size-4" />
						Najnowsze
					{:else}
						<ArrowUp class="size-4" />
						Najstarsze
					{/if}
				</Button>
			</DutyTableFilters>

			{#if loading}
				<p class="text-muted-foreground">Loading...</p>
			{:else if error}
				<p class="text-red-500">{error}</p>
			{:else if groups.length === 0}
				<div class="flex h-24 items-center justify-center border-y text-muted-foreground">
					Brak zdarzeń
				</div>
			{:else}
				<div class="space-y-6">
					{#each groups as group (group.key)}
						<section>
							<h3 class="mb-2 text-sm font-semibold text-muted-foreground capitalize">
								{group.label}
							</h3>

							<ul class="divide-y border-y">
								{#each group.events as event (event.key)}
									<li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
										<span class="font-mono text-xs text-muted-foreground tabular-nums">
											{formatClock(event.at)}
										</span>

										<span class="inline-block size-2 rounded-full {ACTIONS[event.type].dot}"></span>

										<span class="font-medium">{event.duty.nickname}</span>

										<DutyRankBadge rank={event.duty.rank} />

										<span class="font-mono text-xs text-muted-foreground">
											({event.duty.tag_nfc})
										</span>

										<span class={ACTIONS[event.type].textClass}>
											{ACTIONS[event.type].text}
										</span>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				</div>

				{#if sorted.length > visibleCount}
					<div class="flex justify-center">
						<Button variant="outline" onclick={() => (visibleCount += BATCH_SIZE)}>
							Pokaż więcej ({sorted.length - visibleCount})
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>
