<script>
    import { onMount } from "svelte";

    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Table from "$lib/components/ui/table";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";

    let {
        title = "Manage Data",
        apiEndpoint = "",
        apiFetch,
        primaryKey = "id",
        columns = [],
        fields = [],
        onChange = () => {}
    } = $props();

    let items = $state([]);
    let dialogOpen = $state(false);
    let formData = $state({});

    async function loadData() {
        try {
            const response = await apiFetch(apiEndpoint);
            items = await response.json();
        } catch (error) {
            console.error(`Failed to load data for ${title}:`, error);
        }
    }

    onMount(() => {
        loadData();
    });

    export function openDialog(item = null) {
        // Just copy the item data directly
        formData = item ? { ...item } : {};
        dialogOpen = true;
    }

    export async function openById(id) {
        let item = items.find((i) => i[primaryKey] === id);

        if (!item) {
            await loadData(); // table may be stale (e.g. user was just added)
            item = items.find((i) => i[primaryKey] === id);
        }

        if (item) openDialog(item);
    }

    async function saveRecord() {
        const id = formData[primaryKey];
        const method = id ? "PUT" : "POST";
        const url = id ? `${apiEndpoint}/${id}` : apiEndpoint;

        try {
            await apiFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            dialogOpen = false;
            loadData();
            onChange();
        } catch (error) {
            console.error("Save failed:", error);
        }
    }

    async function deleteRecord(id) {
        if (!confirm("Are you sure you want to delete this record?")) return;
        try {
            await apiFetch(`${apiEndpoint}/${id}`, { method: "DELETE" });
            loadData();
            onChange();
        } catch (error) {
            console.error("Delete failed:", error);
        }
    }
</script>

<div class="my-6">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{title}</h2>
        <!-- Svelte 5 uses standard onclick attributes without the colon -->
        <Button onclick={() => openDialog()}>Add Record</Button>
    </div>

    <div class="rounded-md border bg-card text-card-foreground">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    {#each columns as col}
                        <Table.Head>{col.label}</Table.Head>
                    {/each}
                    <Table.Head class="text-right">Actions</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each items as row}
                    <Table.Row>
                        {#each columns as col}
                            <Table.Cell>
                                {col.format ? col.format(row[col.key], row) : row[col.key]}
                            </Table.Cell>
                        {/each}
                        <Table.Cell class="text-right flex justify-end gap-2">
                            <Button variant="outline" size="sm" onclick={() => openDialog(row)}>Edit</Button>
                            <Button variant="destructive" size="sm" onclick={() => deleteRecord(row[primaryKey])}>Delete</Button>
                        </Table.Cell>
                    </Table.Row>
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={columns.length + 1} class="text-center py-4 text-muted-foreground">
                            No records found.
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>
</div>

<!-- Modal Dialog -->
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>{formData[primaryKey] ? "Edit Record" : "Add Record"}</Dialog.Title>
        </Dialog.Header>
        <div class="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {#each fields as field}
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label class="text-right">{field.label}</Label>
                    <div class="col-span-3">

                        {#if field.type === 'select'}
                            <!-- Use bind:value directly on formData -->
                            <Select.Root type="single" bind:value={formData[field.key]}>
                                <Select.Trigger>
                                    <!-- In Svelte 5 shadcn, you may only need standard placeholder text here depending on your exact version -->
                                    {formData[field.key]
                                        ? field.options.find(o => o.value === formData[field.key])?.label
                                        : `Select ${field.label.toLowerCase()}`}
                                </Select.Trigger>
                                <Select.Content class="max-h-[200px] overflow-y-auto">
                                    {#each field.options as opt}
                                        <Select.Item value={opt.value} label={opt.label}>
                                            {opt.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>

                        {:else if field.type === 'datetime-local'}
                            <Input type="datetime-local" bind:value={formData[field.key]} />
                        {:else if field.type === 'number'}
                            <Input type="number" autocomplete="off" bind:value={formData[field.key]} placeholder={field.placeholder || ""} />
                        {:else}
                            <Input type="text" autocomplete="off" bind:value={formData[field.key]} placeholder={field.placeholder || ""} />
                        {/if}

                    </div>
                </div>
            {/each}
        </div>
        <Dialog.Footer>
            <Button onclick={saveRecord}>Save changes</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
