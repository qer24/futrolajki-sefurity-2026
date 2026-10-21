<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { FieldGroup, Field, FieldLabel } from "$lib/components/ui/field/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { cn, type WithElementRef } from "$lib/utils.js";
    import LogIn from "@lucide/svelte/icons/log-in";
    import type { HTMLAttributes } from "svelte/elements";
    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
    const id = $props.id();
</script>
<div class={cn("flex flex-col gap-6", className)} bind:this={ref} {...restProps}>
    <form>
        <FieldGroup>
            <div class="grid grid-flow-col grid-cols-4 gap-4">
                <Field class="col-span-3">
                    <Input id="password-{id}" type="password" placeholder="Wpisz hasło..." required />
                </Field>
                <Field>
                    <Button type="submit"><LogIn /></Button>
                </Field>
            </div>
        </FieldGroup>
    </form>
</div>
