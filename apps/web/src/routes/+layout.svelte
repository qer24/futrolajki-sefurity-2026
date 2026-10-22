<script lang="ts">
    import { afterNavigate, goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { isAuthenticated } from '$lib/auth.js';
    import './layout.css';
    import favicon from '#lib/assets/favicon.svg';
    import type { LayoutProps } from './$types';
    import { Button } from "$lib/components/ui/button";

    let { children }: LayoutProps = $props();
    let authChecked = $state(false);

    function protectRoute(pathname: string): void {
        if (pathname !== '/' && !isAuthenticated()) {
            void goto(resolve('/'), { replaceState: true });
        }
    }

    let currentLayout = $derived(
        page.url.pathname.includes('/admin') || page.url.pathname.includes('/dashboard')
            ? 'default'
            : 'login'
    );

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

<div class="bg-background min-h-svh flex flex-col">
    {#if currentLayout === 'default'}
    <header class="flex items-center justify-center border-b border-border bg-background p-4 min-w-svw">
        <nav class="flex items-center gap-4">
            <a href="/dashboard">
                <Button variant={page.url.pathname.startsWith('/dashboard') ? 'default' : 'ghost'}>
                    Dashboard
                </Button>
            </a>
            <a href="/admin">
                <Button variant={page.url.pathname.startsWith('/admin') ? 'default' : 'ghost'}>
                    Admin
                </Button>
            </a>
        </nav>
    </header>
    {/if}

    <main class="flex-1">
        {#if page.url.pathname === '/' || authChecked}
            {@render children()}
        {/if}
    </main>
</div>
