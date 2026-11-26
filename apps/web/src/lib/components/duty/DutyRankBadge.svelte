<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { rankStyle } from '$lib/modules/duty/duty-ranks.js';

	let {
		rank,
		class: className = ''
	}: {
		rank: string | null | undefined;
		class?: string;
	} = $props();
</script>

<Badge variant="outline" class="{rankStyle(rank)} {className}">
	{rank ?? '—'}
</Badge>
