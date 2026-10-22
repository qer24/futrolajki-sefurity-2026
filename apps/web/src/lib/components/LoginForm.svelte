<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FieldGroup, Field } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { setAuthenticated } from '$lib/auth.js';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import LogIn from '@lucide/svelte/icons/log-in';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const id = $props.id();
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('http://localhost:3001/api/auth/login', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ password })
			});

			if (!response.ok) {
				error = 'Niepoprawne hasło';
				return;
			}

			setAuthenticated(password);
			await goto(resolve('/dashboard'));
		} catch {
			error = 'Nie udało się połączyć z API';
		} finally {
			loading = false;
		}
	}
</script>

<div class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
	<form onsubmit={handleSubmit}>
		<FieldGroup>
			<div class="grid grid-flow-col grid-cols-4 gap-4">
				<Field class="col-span-3">
					<Input
						id="password-{id}"
						bind:value={password}
						type="password"
						placeholder="Wpisz hasło..."
						required
					/>
				</Field>
				<Field>
					<Button type="submit" disabled={loading}><LogIn /></Button>
				</Field>
			</div>
			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}
		</FieldGroup>
	</form>
</div>
