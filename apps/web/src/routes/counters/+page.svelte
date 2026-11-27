<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { apiFetch } from '#lib/api.js';
	import { loadModuleAvailability } from '#lib/modules/availability.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Minus from '@lucide/svelte/icons/minus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	interface Counter {
		id: number;
		name: string;
		current_count: number;
		max_count: number | null;
		created_by: string;
		created_at: string;
		last_edit: string;
	}

	let counters = $state<Counter[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let busyCounterId = $state<number | null>(null);
	let error = $state('');
	let dialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let counterToRemove = $state<Counter | null>(null);
	let editingCounter = $state<Counter | null>(null);
	let counterName = $state('');
	let maxCount = $state('');
	let reverseButtons = $state(false);
	let moduleStatus = $state<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
	let countAnimation = $state<Record<number, 'increment' | 'decrement'>>({});
	const controlOrderStorageKey = 'counters-reverse-control-order';

	async function loadCounters() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch('/counters');
			if (!response.ok) throw new Error('Unable to load counters.');
			counters = await response.json();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to load counters.';
		} finally {
			loading = false;
		}
	}

	function openAddDialog() {
		editingCounter = null;
		counterName = '';
		maxCount = '';
		error = '';
		dialogOpen = true;
	}

	function openEditDialog(counter: Counter) {
		editingCounter = counter;
		counterName = counter.name;
		maxCount = counter.max_count === null ? '' : String(counter.max_count);
		error = '';
		dialogOpen = true;
	}

	async function saveCounter(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';

		try {
			const response = await apiFetch(
				editingCounter ? `/counters/${editingCounter.id}` : '/counters',
				{
					method: editingCounter ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: counterName,
						max_count: maxCount === '' ? null : Number(maxCount)
					})
				}
			);
			if (!response.ok) {
				const result: { error?: string } = await response.json();
				throw new Error(result.error ?? 'Unable to save counter.');
			}
			dialogOpen = false;
			await loadCounters();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to save counter.';
		} finally {
			saving = false;
		}
	}

	async function changeCount(counter: Counter, action: 'increment' | 'decrement') {
		busyCounterId = counter.id;
		error = '';
		try {
			const response = await apiFetch(`/counters/${counter.id}/${action}`, { method: 'POST' });
			if (!response.ok) {
				const result: { error?: string } = await response.json();
				throw new Error(result.error ?? 'Unable to update counter.');
			}
			const updated: Counter = await response.json();
			countAnimation[counter.id] = action;
			counters = counters.map((item) => (item.id === updated.id ? updated : item));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to update counter.';
		} finally {
			busyCounterId = null;
		}
	}

	function openRemoveDialog(counter: Counter) {
		counterToRemove = counter;
		error = '';
		deleteDialogOpen = true;
	}

	async function removeCounter() {
		if (!counterToRemove) return;
		const counter = counterToRemove;
		busyCounterId = counter.id;
		error = '';
		try {
			const response = await apiFetch(`/counters/${counter.id}`, { method: 'DELETE' });
			if (!response.ok) {
				const result: { error?: string } = await response.json();
				throw new Error(result.error ?? 'Unable to remove counter.');
			}
			counters = counters.filter((item) => item.id !== counter.id);
			deleteDialogOpen = false;
			counterToRemove = null;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to remove counter.';
		} finally {
			busyCounterId = null;
		}
	}

	function formatDate(date: string): string {
		return new Date(`${date.replace(' ', 'T')}Z`).toLocaleString();
	}

	function toggleButtonOrder() {
		reverseButtons = !reverseButtons;
		localStorage.setItem(controlOrderStorageKey, String(reverseButtons));
	}

	async function initializePage() {
		reverseButtons = localStorage.getItem(controlOrderStorageKey) === 'true';
		try {
			const availability = await loadModuleAvailability();
			if (!availability.counters) {
				moduleStatus = 'disabled';
				await goto(resolve('/dashboard'), { replaceState: true });
				return;
			}
			moduleStatus = 'enabled';
			await loadCounters();
		} catch (cause) {
			moduleStatus = 'error';
			loading = false;
			error = cause instanceof Error ? cause.message : 'Unable to load module availability.';
		}
	}

	onMount(() => {
		void initializePage();
	});
</script>

{#if moduleStatus === 'loading'}
	<p class="px-6 py-8 text-sm" role="status">Ładowanie modułu…</p>
{:else if moduleStatus === 'error'}
	<p class="px-6 py-8 text-sm text-destructive" role="alert">{error}</p>
{/if}

<section class="w-full px-6 py-8 lg:px-10" hidden={moduleStatus !== 'enabled'}>
	<div class="mb-6 flex flex-wrap items-center justify-end gap-4">
		<Button onclick={openAddDialog}><Plus /> Dodaj licznik</Button>
	</div>

	{#if error && !dialogOpen && !deleteDialogOpen}
		<p class="mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">
			{error}
		</p>
	{/if}

	{#if loading}
		<p class="text-sm" role="status">Ładowanie liczników…</p>
	{:else if counters.length === 0}
		<Card.Root>
			<Card.Content class="py-10 text-center">
				Brak liczników. Dodaj pierwszy, aby rozpocząć.
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each counters as counter (counter.id)}
				<Card.Root class="gap-0 border-2 border-border shadow-sm">
					<Card.Header class="border-b">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<Card.Title class="truncate text-3xl">{counter.name}</Card.Title>
								<Card.Description>
									{counter.max_count === null ? 'Bez limitu' : `Limit: ${counter.max_count}`}
								</Card.Description>
							</div>
							<div class="flex shrink-0 gap-1">
								<Button
									aria-label={`Edytuj ${counter.name}`}
									variant="outline"
									size="lg"
									title="Edytuj"
									disabled={busyCounterId === counter.id}
									onclick={() => openEditDialog(counter)}><Pencil /></Button
								>
								<Button
									aria-label={`Usuń ${counter.name}`}
									variant="destructive"
									size="lg"
									title="Usuń"
									disabled={busyCounterId === counter.id}
									onclick={() => openRemoveDialog(counter)}><Trash2 /></Button
								>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="my-4 border-b">
						<div class="flex flex-col items-center justify-center gap-6 py-2">
							<div class="flex flex-col items-center gap-2">
								<output
									class="min-w-16 text-center text-5xl font-bold tabular-nums"
									class:text-destructive={counter.max_count !== null &&
										counter.current_count > counter.max_count}
									aria-label="Liczba osób"
								>
									{#key counter.current_count}
										<span
											class="inline-block"
											class:count-increment={countAnimation[counter.id] === 'increment'}
											class:count-decrement={countAnimation[counter.id] === 'decrement'}
										>
											{counter.current_count}
										</span>
									{/key}
									{#if counter.max_count !== null}
										<span> / {counter.max_count}</span>
									{/if}
								</output>
							</div>
							<div class="flex w-full gap-2 py-2" class:flex-row-reverse={reverseButtons}>
								<Button
									variant="destructive"
									class="flex-1"
									aria-label={`Zmniejsz ${counter.name}`}
									disabled={counter.current_count === 0 || busyCounterId === counter.id}
									onclick={() => changeCount(counter, 'decrement')}><Minus /></Button
								>
								<Button
									class="flex-1"
									aria-label={`Zwiększ ${counter.name}`}
									disabled={busyCounterId === counter.id}
									onclick={() => changeCount(counter, 'increment')}><Plus /></Button
								>
							</div>
						</div>
					</Card.Content>
					<Card.Footer class="flex items-end justify-between gap-2 text-xs">
						<div class="flex flex-col items-start gap-1">
							<span>Utworzono: {formatDate(counter.created_at)} ({counter.created_by})</span>
							<span>Ostatnia zmiana: {formatDate(counter.last_edit)} ({counter.created_by})</span>
						</div>
						<Button
							variant="outline"
							size="icon"
							aria-label="Zamień kolejność przycisków"
							aria-pressed={reverseButtons}
							title="Zamień kolejność przycisków"
							onclick={toggleButtonOrder}><ArrowLeftRight /></Button
						>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</section>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="bg-background">
		<Dialog.Header>
			<Dialog.Title>{editingCounter ? 'Edytuj licznik' : 'Dodaj licznik'}</Dialog.Title>
		</Dialog.Header>
		<form class="grid gap-4" onsubmit={saveCounter}>
			<div class="grid gap-2">
				<Label for="counter-name">Nazwa</Label>
				<Input id="counter-name" bind:value={counterName} required maxlength={120} />
			</div>
			<div class="grid gap-2">
				<Label for="counter-max">Limit (opcjonalny)</Label>
				<Input
					id="counter-max"
					type="number"
					min="0"
					step="1"
					bind:value={maxCount}
					class="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={saving}>{saving ? 'Zapisywanie…' : 'Zapisz'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="bg-background">
		<Dialog.Header>
			<Dialog.Title>Usuń licznik?</Dialog.Title>
			<Dialog.Description>
				Czy na pewno chcesz usunąć licznik „{counterToRemove?.name}”? Tej operacji nie można cofnąć.
			</Dialog.Description>
		</Dialog.Header>
		{#if error}
			<p class="text-sm text-destructive" role="alert">{error}</p>
		{/if}
		<Dialog.Footer>
			<Button
				variant="outline"
				disabled={busyCounterId !== null}
				onclick={() => (deleteDialogOpen = false)}
			>
				Anuluj
			</Button>
			<Button variant="destructive" disabled={busyCounterId !== null} onclick={removeCounter}>
				{busyCounterId === counterToRemove?.id ? 'Usuwanie…' : 'Usuń'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	@keyframes bounce-increment {
		0%,
		100% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.1);
		}
		65% {
			transform: scale(0.96);
		}
	}

	@keyframes bounce-decrement {
		0%,
		100% {
			transform: scale(1);
		}
		35% {
			transform: scale(0.96);
		}
		65% {
			transform: scale(1.06);
		}
	}

	.count-increment {
		animation: bounce-increment 400ms ease-out;
	}

	.count-decrement {
		animation: bounce-decrement 400ms ease-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.count-increment,
		.count-decrement {
			animation: none;
		}
	}
</style>
