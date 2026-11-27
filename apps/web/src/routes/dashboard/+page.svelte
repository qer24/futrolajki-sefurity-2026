<script lang="ts">
	import CollapsibleSection from '#lib/components/CollapsibleSection.svelte';
	import DutyStatGrid from '#lib/components/duty/DutyStatGrid.svelte';
	import DutyDataTable from '#lib/components/duty/DutyDataTable.svelte';
	import ActiveDutySection from '#lib/components/duty/ActiveDutySection.svelte';
	import {
		loadActiveDuties,
		loadDutyHistory,
		type ActiveDuty,
		type EndedDuty
	} from '#lib/modules/duty/duty-data.js';

	let history = $state<EndedDuty[]>([]);
	let historyLoading = $state(false);
	let historyError = $state('');

	let duties = $state<ActiveDuty[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';

		try {
			duties = await loadActiveDuties();
		} catch {
			error = 'Nie udało się pobrać listy dyżurów';
		} finally {
			loading = false;
		}
	}

	async function loadHistory() {
		historyLoading = true;
		historyError = '';

		try {
			history = await loadDutyHistory();
		} catch {
			historyError = 'Nie udało się pobrać historii dyżurów';
		} finally {
			historyLoading = false;
		}
	}

	function refresh() {
		load();
		loadHistory();
	}

	$effect(() => {
		loadHistory();
	});

	$effect(() => {
		load();
	});
</script>

<div class="w-full">
	<DutyStatGrid {duties} />
	<ActiveDutySection
		{duties}
		storageKey="/dashboard:active"
		{loading}
		{error}
		refreshDisabled={historyLoading}
		showTag
		searchTag
		searchPlaceholder="Szukaj: nick, tag NFC, czas rozpoczęcia..."
		onRefresh={refresh}
	/>

    <hr>

	<div class="px-6 py-4 lg:px-10">
		<CollapsibleSection title="Historia dyżurów" storageKey="/dashboard:history">
			{#snippet actions()}
				<p class="text-sm text-muted-foreground">{history.length} zakończonych</p>
			{/snippet}
			{#snippet children()}
				<DutyDataTable
					duties={history}
					loading={historyLoading}
					error={historyError}
					history
					showTag
					searchTag
					searchPlaceholder="Szukaj: nick, tag NFC, początek, koniec..."
					emptyMessage="Brak zakończonych dyżurów"
				/>
			{/snippet}
		</CollapsibleSection>
	</div>
</div>
