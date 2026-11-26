<script lang="ts">
	import DutyDataTable from '$lib/components/duty/DutyDataTable.svelte';
	import ActiveDutySection from '$lib/components/duty/ActiveDutySection.svelte';
	import {
		loadActiveDuties,
		loadDutyHistory,
		type ActiveDuty,
		type EndedDuty
	} from '$lib/modules/duty/duty-data.js';

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
	<ActiveDutySection
		{duties}
		{loading}
		{error}
		refreshDisabled={historyLoading}
		showTag
		searchTag
		searchPlaceholder="Szukaj: nick, tag NFC, czas rozpoczęcia..."
		onRefresh={refresh}
	/>

	<section class="border-t px-6 py-8 lg:px-10">
		<div class="mb-4">
			<h2 class="text-lg font-semibold">Historia dyżurów</h2>
			<p class="text-sm text-muted-foreground">
				{history.length} zakończonych
			</p>
		</div>

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
	</section>
</div>
