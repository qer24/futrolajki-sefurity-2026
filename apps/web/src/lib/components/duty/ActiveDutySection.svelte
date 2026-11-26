<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import DutyDataTable from '$lib/components/duty/DutyDataTable.svelte';
	import DutyStatGrid from '$lib/components/duty/DutyStatGrid.svelte';
	import type { ActiveDuty } from '$lib/modules/duty/duty-data.js';

	let {
		duties,
		loading,
		error,
		refreshDisabled = false,
		showTag = false,
		searchTag = false,
		searchPlaceholder = 'Szukaj: nick, czas rozpoczęcia...',
		onRefresh
	}: {
		duties: ActiveDuty[];
		loading: boolean;
		error: string;
		refreshDisabled?: boolean;
		showTag?: boolean;
		searchTag?: boolean;
		searchPlaceholder?: string;
		onRefresh: () => void;
	} = $props();
</script>

<DutyStatGrid {duties} />

<section class="px-6 py-8 lg:px-10">
	<div class="mb-4 flex items-center justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold">Trwające dyżury</h2>
			<p class="text-sm text-muted-foreground">
				{duties.length} aktualnie na służbie
			</p>
		</div>
		<Button variant="outline" onclick={onRefresh} disabled={refreshDisabled || loading}>
			Odśwież
		</Button>
	</div>

	<DutyDataTable
		{duties}
		{loading}
		{error}
		{showTag}
		{searchTag}
		{searchPlaceholder}
		emptyMessage="Brak trwających dyżurów"
	/>
</section>
