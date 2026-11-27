<script lang="ts">
    import './layout.css';
    import favicon from '#lib/assets/favicon.svg';
    import type { LayoutProps } from './$types';
    import * as Sidebar from "#lib/components/ui/sidebar/index.js";
    import AppSidebar from "#lib/components/AppSidebar.svelte";

    let { children }: LayoutProps = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<Sidebar.Provider>
    <AppSidebar />
    <main class="bg-background min-h-svh min-w-0 flex-1">
        <header class="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background px-4">
            <Sidebar.Trigger />
        </header>
        {@render children()}
    </main>
</Sidebar.Provider>
