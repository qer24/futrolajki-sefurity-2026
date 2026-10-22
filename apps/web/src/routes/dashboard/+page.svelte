<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import * as Pagination from "$lib/components/ui/pagination/index.js";
    import { apiFetch } from "$lib/api.js";

    type Rank = "porzadkowa" | "info" | "lider" | "koord" | "org" | "sekretarka";

    interface ActiveDuty {
        id: number;
        user_id: number;
        start_time: string;
        nickname: string;
        rank: Rank | null;
        tag_nfc: string;
    }

    const RANKS: Rank[] = ["porzadkowa", "info", "lider", "koord", "org", "sekretarka"];
    const PAGE_SIZE = 10;

    let duties = $state<ActiveDuty[]>([]);
    let loading = $state(false);
    let error = $state("");

    let search = $state("");
    let rankFilter = $state<string>("all");
    let page = $state(1);

    const MAX = {
        porzadkowa: 18,
        info: 18,
        rest: 5,
        total: 18+18+5
    };

    function uniquePeople(list: ActiveDuty[]): number {
        return new Set(list.map((d) => d.user_id)).size;
    }

    const stats = $derived([
        {
            key: "porzadkowa",
            label: "Porządkowe",
            count: uniquePeople(duties.filter((d) => d.rank === "porzadkowa")),
            max: MAX.porzadkowa
        },
        {
            key: "info",
            label: "Info",
            count: uniquePeople(duties.filter((d) => d.rank === "info")),
            max: MAX.info
        },
        {
            key: "rest",
            label: "reszta",
            count: uniquePeople(duties.filter((d) => d.rank !== "info" && d.rank !== "porzadkowa")),
            max: MAX.rest
        },
        {
            key: "total",
            label: "Łącznie",
            count: uniquePeople(duties),
            max: MAX.total
        }
    ]);

    function barColor(count: number, max: number): string {
        if (count > max) return "bg-red-500";
        if (count === max) return "bg-amber-500";
        return "bg-primary";
    }

    function formatTime(value: string): string {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL");
    }

    const filtered = $derived.by(() => {
        const q = search.trim().toLowerCase();

        return duties.filter((d) => {
            if (rankFilter !== "all" && d.rank !== rankFilter) return false;
            if (!q) return true;

            return (
                d.nickname.toLowerCase().includes(q) ||
                d.tag_nfc.toLowerCase().includes(q) ||
                d.start_time.toLowerCase().includes(q) ||
                formatTime(d.start_time).toLowerCase().includes(q)
            );
        });
    });

    const paged = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

    // Go back to the first page whenever the filters change
    $effect(() => {
        search;
        rankFilter;
        page = 1;
    });

    async function load() {
        loading = true;
        error = "";

        try {
            const response = await apiFetch("/duty/active");
            if (!response.ok) throw new Error("load failed");
            duties = await response.json();
        } catch {
            error = "Nie udało się pobrać listy dyżurów";
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        load();
    });
</script>

<main class="mx-auto max-w-4xl p-6">
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {#each stats as stat (stat.key)}
            <Card.Root class={stat.key === "total" ? "border-primary/40 bg-primary/5" : ""}>
                <Card.Content class="space-y-3 p-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-muted-foreground">{stat.label}</span>
                        {#if stat.count > stat.max}
                            <Badge variant="destructive">Powyżej limitu</Badge>
                        {:else if stat.count === stat.max}
                            <Badge variant="secondary">Komplet</Badge>
                        {/if}
                    </div>

                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-bold tabular-nums">{stat.count}</span>
                        <span class="text-lg text-muted-foreground tabular-nums">/ {stat.max}</span>
                    </div>

                    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                                class="h-full rounded-full transition-all {barColor(stat.count, stat.max)}"
                                style="width: {Math.min(100, (stat.count / stat.max) * 100)}%"
                        ></div>
                    </div>
                </Card.Content>
            </Card.Root>
        {/each}
    </div>

    <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between">
            <div>
                <Card.Title>Trwające dyżury</Card.Title>
                <Card.Description>
                    {filtered.length} z {duties.length} aktywnych
                </Card.Description>
            </div>
            <Button variant="outline" onclick={load} disabled={loading}>Odśwież</Button>
        </Card.Header>

        <Card.Content class="space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row">
                <Input
                        placeholder="Szukaj: nick, tag NFC, czas rozpoczęcia..."
                        bind:value={search}
                        class="sm:flex-1"
                />

                <Select.Root type="single" bind:value={rankFilter}>
                    <Select.Trigger class="w-full sm:w-48">
                        {rankFilter === "all" ? "Wszystkie rangi" : rankFilter}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="all" label="Wszystkie rangi">Wszystkie rangi</Select.Item>
                        {#each RANKS as rank (rank)}
                            <Select.Item value={rank} label={rank}>{rank}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            {#if loading}
                <p class="text-muted-foreground">Loading...</p>
            {:else if error}
                <p class="text-red-500">{error}</p>
            {:else}
                <div class="rounded-md border">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>Nick</Table.Head>
                                <Table.Head>Ranga</Table.Head>
                                <Table.Head>Tag NFC</Table.Head>
                                <Table.Head>Początek</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each paged as duty (duty.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium">{duty.nickname}</Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="secondary">{duty.rank ?? "—"}</Badge>
                                    </Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{duty.tag_nfc}</Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{formatTime(duty.start_time)}</Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                                        Brak trwających dyżurów
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>

                {#if filtered.length > PAGE_SIZE}
                    <Pagination.Root count={filtered.length} perPage={PAGE_SIZE} bind:page>
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton />
                                </Pagination.Item>
                                {#each pages as p (p.key)}
                                    {#if p.type === "ellipsis"}
                                        <Pagination.Item>
                                            <Pagination.Ellipsis />
                                        </Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link page={p} isActive={currentPage === p.value}>
                                                {p.value}
                                            </Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                <Pagination.Item>
                                    <Pagination.NextButton />
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                {/if}
            {/if}
        </Card.Content>
    </Card.Root>
</main>
