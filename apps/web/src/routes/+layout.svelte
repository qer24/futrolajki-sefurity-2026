<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { isAuthenticated } from '$lib/auth.js';
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let authChecked = $state(false);

	function protectRoute(pathname: string): void {
		if (pathname !== '/' && !isAuthenticated()) {
			void goto(resolve('/'), { replaceState: true });
		}
	}

	onMount(() => {
		authChecked = true;
		protectRoute(page.url.pathname);

		return afterNavigate(({ to }) => {
			if (to) protectRoute(to.url.pathname);
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if page.url.pathname === '/' || authChecked}
	{@render children()}
{/if}
