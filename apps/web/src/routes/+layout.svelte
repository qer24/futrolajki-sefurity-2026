<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import AppSidebar from '#lib/components/AppSidebar.svelte';

	let { children }: LayoutProps = $props();
	let title = $derived(page.data.title);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{title}</title>
</svelte:head>

<Sidebar.Provider>
	<AppSidebar />
	<main class="min-h-svh min-w-0 flex-1 bg-background">
		<header class="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background px-4">
			<Sidebar.Trigger />
			<h1
				class="absolute left-1/2 max-w-[calc(100%-5rem)] -translate-x-1/2 truncate text-center text-lg font-semibold"
			>
				{title}
			</h1>
		</header>
		{@render children()}
	</main>
</Sidebar.Provider>
