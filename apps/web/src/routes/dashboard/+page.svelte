<script lang="ts">
    type Todo = {
        id: number;
        title: string;
        done: number;
        created_at: string;
    };

    const API_URL = "http://localhost:3001/api/todos";

    let todos = $state<Todo[]>([]);
    let title = $state("");
    let loading = $state(false);
    let error = $state("");

    async function loadTodos() {
        loading = true;
        error = "";

        try {
            const response = await fetch(API_URL);
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

        await fetch(API_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ title: cleanTitle })
        });

        title = "";
        await loadTodos();
    }

    async function toggleTodo(todo: Todo) {
        await fetch(`${API_URL}/${todo.id}`, {
            method: "PATCH",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ done: !todo.done })
        });

        await loadTodos();
    }

    async function deleteTodo(id: number) {
        await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        await loadTodos();
    }

    $effect(() => {
        loadTodos();
    });
</script>

<main class="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-4 p-6">
    <h1 class="text-2xl font-bold">Dashboard / Todo test UI</h1>

    <form class="flex gap-2" onsubmit={addTodo}>
        <input
            class="w-full rounded border px-3 py-2"
            bind:value={title}
            placeholder="Nowe zadanie"
            required
        />
        <button class="rounded bg-black px-4 py-2 text-white" type="submit">Dodaj</button>
    </form>

    {#if error}
        <p class="text-sm text-red-500">{error}</p>
    {/if}

    {#if loading}
        <p>Ładowanie...</p>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each todos as todo (todo.id)}
                <li class="flex items-center justify-between gap-2 rounded border p-3">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" checked={Boolean(todo.done)} onchange={() => toggleTodo(todo)} />
                        <span class:line-through={Boolean(todo.done)}>{todo.title}</span>
                    </label>
                    <button class="rounded border px-2 py-1 text-sm" type="button" onclick={() => deleteTodo(todo.id)}>
                        Usuń
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</main>
