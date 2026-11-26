<script lang="ts">
	import NfcStatus from '$lib/components/NfcStatus.svelte';
	import DutyScanAlert from '$lib/components/duty/DutyScanAlert.svelte';
	import ActiveDutySection from '$lib/components/duty/ActiveDutySection.svelte';
	import { loadActiveDuties, type ActiveDuty } from '$lib/modules/duty/duty-data.js';

	let duties = $state<ActiveDuty[]>([]);
	let loading = $state(false);
	let error = $state('');

	// silent = refresh in the background without swapping the table for "Loading..."
	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';

		try {
			duties = await loadActiveDuties();
		} catch {
			error = 'Nie udało się pobrać listy dyżurów';
		} finally {
			loading = false;
		}
	}

	function refresh() {
		load();
	}

	$effect(() => {
		load();
	});
</script>

<DutyScanAlert onDutyChange={() => load(true)} />

<div class="w-full">
	<div class="px-6 py-4 lg:px-10">
		<NfcStatus />
	</div>

	<ActiveDutySection
		{duties}
		{loading}
		{error}
		searchTag
		searchPlaceholder="Szukaj: nick, czas rozpoczęcia..."
		onRefresh={refresh}
	/>
</div>
