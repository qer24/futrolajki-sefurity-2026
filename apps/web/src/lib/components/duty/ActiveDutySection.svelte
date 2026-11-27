<script lang="ts">
	import CollapsibleSection from '#lib/components/CollapsibleSection.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import DutyDataTable from '#lib/components/duty/DutyDataTable.svelte';
	import type { ActiveDuty } from '#lib/modules/duty/duty-data.js';

	let {
		duties,
		storageKey,
		loading,
		error,
		refreshDisabled = false,
		showTag = false,
		searchTag = false,
		searchPlaceholder = 'Szukaj: nick, czas rozpoczęcia...',
		onRefresh
	}: {
		duties: ActiveDuty[];
		storageKey: string;
		loading: boolean;
		error: string;
		refreshDisabled?: boolean;
		showTag?: boolean;
		searchTag?: boolean;
		searchPlaceholder?: string;
		onRefresh: () => void;
	} = $props();
</script>

<section class="px-6 py-4 lg:px-10">
	<CollapsibleSection title="Trwające dyżury" {storageKey}>
		{#snippet actions()}
			<div class="flex items-center gap-4">
				<p class="text-sm text-muted-foreground">
					{duties.length} aktualnie na służbie
				</p>
				<Button variant="outline" onclick={onRefresh} disabled={refreshDisabled || loading}>
					Odśwież
				</Button>
			</div>
		{/snippet}
		{#snippet children()}
			<DutyDataTable
				{duties}
				{loading}
				{error}
				{showTag}
				{searchTag}
				{searchPlaceholder}
				emptyMessage="Brak trwających dyżurów"
			/>
		{/snippet}
	</CollapsibleSection>
</section>
