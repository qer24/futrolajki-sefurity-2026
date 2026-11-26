<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Shield from '@lucide/svelte/icons/shield';
	import { modules } from '$lib/modules/registry.js';

	const sections = $state(
		modules.map((module) => ({
			...module,
			expanded: true
		}))
	);

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header class="border-b">
		<a
			href="/dashboard"
			class="flex h-10 items-center gap-3 rounded-lg px-2 font-semibold group-data-[collapsible=icon]:justify-center"
		>
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Shield class="size-4" />
			</span>
			<span class="truncate group-data-[collapsible=icon]:hidden">Futrolajki</span>
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each sections as section (section.title)}
			<Sidebar.Group>
				<button
					type="button"
					class="flex h-8 w-full items-center justify-between rounded-md px-3 text-xs font-medium text-sidebar-foreground/70 transition-colors group-data-[collapsible=icon]:hidden hover:text-sidebar-foreground"
					aria-expanded={section.expanded}
					onclick={() => (section.expanded = !section.expanded)}
				>
					<span>{section.title}</span>
					<ChevronDown class="size-4 transition-transform {section.expanded ? '' : '-rotate-90'}" />
				</button>
				{#if section.expanded}
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each section.items as item (item.href)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={item.title}>
										{#snippet child({ props })}
											<a href={item.href} {...props}>
												<item.icon />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				{/if}
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer class="border-t">
		<div
			class="flex items-center gap-3 rounded-lg p-2 group-data-[collapsible=icon]:justify-center"
		>
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
			>
				<UserRound class="size-4" />
			</span>
			<span class="min-w-0 group-data-[collapsible=icon]:hidden">
				<span class="block truncate text-sm font-medium">Administrator</span>
				<span class="block truncate text-xs text-muted-foreground">Futrolajki</span>
			</span>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>
