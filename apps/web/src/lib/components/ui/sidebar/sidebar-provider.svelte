<script lang="ts">
	import { onMount } from 'svelte';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import { SIDEBAR_STORAGE_KEY, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './constants.js';
	import { setSidebar } from './context.svelte.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		open = $bindable(true),
		onOpenChange = () => {},
		class: className,
		style,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	let isReady = $state(false);

	onMount(() => {
		const storedOpen = localStorage.getItem(SIDEBAR_STORAGE_KEY);
		if (storedOpen === 'true' || storedOpen === 'false') {
			open = storedOpen === 'true';
		}

		requestAnimationFrame(() => {
			isReady = true;
		});
	});

	const sidebar = setSidebar({
		isReady: () => isReady,
		open: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange(value);
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
		}
	});
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<Tooltip.Provider delayDuration={0}>
	<div
		data-slot="sidebar-wrapper"
		style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style}"
		class={cn(
			'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
</Tooltip.Provider>
