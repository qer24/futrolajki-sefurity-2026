<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { apiFetch } from "$lib/api.js";

    type Todo = {
        id: number;
        title: string;
        done: number;
        created_at: string;
    };

    let todos = $state<Todo[]>([]);
    let title = $state("");
    let loading = $state(false);
    let error = $state("");

    async function loadTodos() {
        loading = true;
        error = "";

        try {
            const response = await apiFetch("/todos");
            if (!response.ok) throw new Error("load failed");
            todos = await response.json();
        } catch {
            error = "Nie udało się pobrać listy zadań";
        } finally {
            loading = false;
        }
    }

    async function addTodo(event: SubmitEvent) {
        event.preventDefault();

        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        await apiFetch("/todos", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ title: cleanTitle })
        });

        title = "";
        await loadTodos();
    }

    async function deleteTodo(id: number) {
        await apiFetch(`/todos/${id}`, {
            method: "DELETE"
        });

        await loadTodos();
    }

    $effect(() => {
        loadTodos();
    });
</script>

<main class="mx-auto max-w-md p-6">
    {#if loading}
        <p>Loading...</p>
    {:else if error}
        <p class="text-red-500">{error}</p>
    {:else}
        <Card.Root>
            <Card.Header>
                <Card.Title>Todos</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
                <form class="flex gap-2" onsubmit={(e) => { e.preventDefault(); addTodo(e); }}>
                    <Input bind:value={title} placeholder="What needs doing?" />
                    <Button type="submit">Add</Button>
                </form>

                <ul class="space-y-2">
                    {#each todos as todo (todo.id)}
                        <li class="flex items-center justify-between rounded-md border p-2">
                            <span>{todo.title}</span>
                            <Button variant="ghost" size="sm" onclick={() => deleteTodo(todo.id)}>Delete</Button>
                        </li>
                    {/each}
                </ul>
            </Card.Content>
        </Card.Root>
    {/if}
</main>
