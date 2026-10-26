<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import * as Pagination from "$lib/components/ui/pagination/index.js";
    import { ArrowUp, ArrowDown, ArrowUpDown } from "@lucide/svelte";
    import { apiFetch } from "$lib/api.js";

    type Rank = "porzadkowa" | "info" | "dowodca";

    interface ActiveDuty {
        id: number;
        user_id: number;
        start_time: string;
        nickname: string;
        rank: Rank | null;
        tag_nfc: string;
    }

    interface EndedDuty extends ActiveDuty {
        end_time: string;
    }

    type SortKey = "nickname" | "rank" | "start_time" | "end_time" | "tag_nfc" | "length";
    type Sort = { key: SortKey; dir: "asc" | "desc" };

    const HISTORY_PAGE_SIZE = 10;

    let history = $state<EndedDuty[]>([]);
    let historyLoading = $state(false);
    let historyError = $state("");
    let historySearch = $state("");
    let historyRankFilter = $state<string>("all");
    let historyPage = $state(1);
    let historySort = $state<Sort>({ key: "end_time", dir: "desc" });

    const RANKS: Rank[] = ["porzadkowa", "info", "dowodca"];
    const PAGE_SIZE = 10;

    const RANK_STYLES: Record<Rank, string> = {
        porzadkowa:
            "border-transparent bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
        info:
            "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
        dowodca:
            "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300"
    };

    const RANK_DOTS: Record<Rank, string> = {
        porzadkowa: "bg-green-500",
        info: "bg-cyan-500",
        dowodca: "bg-purple-500"
    };

    const NO_RANK_STYLE = "border-transparent bg-muted text-muted-foreground";

    let duties = $state<ActiveDuty[]>([]);
    let loading = $state(false);
    let error = $state("");

    let search = $state("");
    let rankFilter = $state<string>("all");
    let page = $state(1);
    let sort = $state<Sort>({ key: "start_time", dir: "desc" });

    const MAX = {
        porzadkowa: 18,
        info: 18,
        rest: 4,
        total: 18 + 18 + 4
    };

    // Colors of the top counters (cards, dot, number, progress bar)
    const STAT_STYLES: Record<
        string,
        { card: string; dot: string; number: string; bar: string }
    > = {
        porzadkowa: {
            card: "",
            dot: "bg-green-500",
            number: "",
            bar: "bg-green-500"
        },
        info: {
            card: "",
            dot: "bg-cyan-500",
            number: "",
            bar: "bg-cyan-500"
        },
        rest: {
            card: "",
            dot: "bg-purple-500",
            number: "",
            bar: "bg-purple-500"
        },
        total: {
            card: "",
            dot: "bg-slate-500",
            number: "",
            bar: "bg-slate-500"
        }
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
            label: "Dowódcy",
            count: uniquePeople(duties.filter((d) => d.rank === "dowodca")),
            max: MAX.rest
        },
        {
            key: "total",
            label: "Łącznie",
            count: uniquePeople(duties),
            max: MAX.total
        }
    ]);

    // Over the limit is always red and full is always amber; otherwise use the counter's own color
    function barColor(key: string, count: number, max: number): string {
        if (count > max) return "bg-red-500";
        if (count === max) return "bg-amber-500";
        return STAT_STYLES[key].bar;
    }

    function formatTime(value: string): string {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL");
    }

    function formatDuration(start: string, end: string): string {
        const diff = time(end) - time(start);
        if (diff <= 0 || isNaN(diff)) return "—";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours === 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    }

    // ---------- Sorting ----------

    function rankOrder(rank: Rank | null): number {
        return rank === null ? -1 : RANKS.indexOf(rank);
    }

    function time(value?: string): number {
        const t = value ? new Date(value).getTime() : 0;
        return isNaN(t) ? 0 : t;
    }

    function compareBy(
        a: ActiveDuty & { end_time?: string },
        b: ActiveDuty & { end_time?: string },
        key: SortKey
    ): number {
        switch (key) {
            case "rank":
                return rankOrder(a.rank) - rankOrder(b.rank);
            case "start_time":
                return time(a.start_time) - time(b.start_time);
            case "end_time":
                return time(a.end_time) - time(b.end_time);
            case "length": {
                // Calculate lengths, defaulting to 0 if end_time is missing
                const aLen = a.end_time ? time(a.end_time) - time(a.start_time) : 0;
                const bLen = b.end_time ? time(b.end_time) - time(b.start_time) : 0;
                return aLen - bLen;
            }
            case "nickname":
                return a.nickname.localeCompare(b.nickname, "pl");
            case "tag_nfc":
                return a.tag_nfc.localeCompare(b.tag_nfc);
        }
    }

    function sortList<T extends ActiveDuty & { end_time?: string }>(list: T[], s: Sort): T[] {
        const m = s.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => m * compareBy(a, b, s.key));
    }

    function nextSort(current: Sort, key: SortKey): Sort {
        if (current.key === key) {
            return { key, dir: current.dir === "asc" ? "desc" : "asc" };
        }
        return { key, dir: "asc" };
    }

    // ---------- Active duties ----------

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

    const sorted = $derived(sortList(filtered, sort));
    const paged = $derived(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

    // Go back to the first page whenever the filters or sorting change
    $effect(() => {
        search;
        rankFilter;
        sort;
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

    // ---------- History ----------

    const historyFiltered = $derived.by(() => {
        const q = historySearch.trim().toLowerCase();

        return history.filter((d) => {
            if (historyRankFilter !== "all" && d.rank !== historyRankFilter) return false;
            if (!q) return true;

            return (
                d.nickname.toLowerCase().includes(q) ||
                d.tag_nfc.toLowerCase().includes(q) ||
                formatTime(d.start_time).toLowerCase().includes(q) ||
                formatTime(d.end_time).toLowerCase().includes(q)
            );
        });
    });

    const historySorted = $derived(sortList(historyFiltered, historySort));
    const historyPaged = $derived(
        historySorted.slice(
            (historyPage - 1) * HISTORY_PAGE_SIZE,
            historyPage * HISTORY_PAGE_SIZE
        )
    );

    $effect(() => {
        historySearch;
        historyRankFilter;
        historySort;
        historyPage = 1;
    });

    async function loadHistory() {
        historyLoading = true;
        historyError = "";

        try {
            const response = await apiFetch("/duty/history");
            if (!response.ok) throw new Error("load failed");
            history = await response.json();
        } catch {
            historyError = "Nie udało się pobrać historii dyżurów";
        } finally {
            historyLoading = false;
        }
    }

    function refresh() {
        load();
        loadHistory();
    }

    $effect(() => {
        loadHistory();
    });

    $effect(() => {
        load();
    });
</script>

{#snippet sortHead(label: string, key: SortKey, current: Sort, onclick: () => void)}
    <Table.Head
            aria-sort={current.key === key
            ? current.dir === "asc"
                ? "ascending"
                : "descending"
            : "none"}
    >
        <button
                type="button"
                class="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
                {onclick}
        >
            {label}
            {#if current.key === key}
                {#if current.dir === "asc"}
                    <ArrowUp class="size-3.5 text-foreground" />
                {:else}
                    <ArrowDown class="size-3.5 text-foreground" />
                {/if}
            {:else}
                <ArrowUpDown class="size-3.5 text-muted-foreground/50" />
            {/if}
        </button>
    </Table.Head>
{/snippet}

<main class="mx-auto max-w-4xl p-6">
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {#each stats as stat (stat.key)}
            <Card.Root class={STAT_STYLES[stat.key].card}>
                <Card.Content class="space-y-3 p-4">
                    <div class="flex items-center justify-between">
                        <span class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <span class="inline-block size-2 rounded-full {STAT_STYLES[stat.key].dot}"></span>
                            {stat.label}
                        </span>
                        {#if stat.count > stat.max}
                            <Badge variant="destructive">Powyżej limitu</Badge>
                        {:else if stat.count === stat.max}
                            <Badge variant="secondary">Komplet</Badge>
                        {/if}
                    </div>

                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-bold tabular-nums {STAT_STYLES[stat.key].number}">
                            {stat.count}
                        </span>
                        <span class="text-lg text-muted-foreground tabular-nums">/ {stat.max}</span>
                    </div>

                    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                                class="h-full rounded-full transition-all {barColor(stat.key, stat.count, stat.max)}"
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
                    {duties.length} aktualnie na służbie
                </Card.Description>
            </div>
            <Button variant="outline" onclick={refresh} disabled={loading || historyLoading}>Odśwież</Button>
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
                        {#if rankFilter !== "all"}
                            <span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[rankFilter as Rank]}"></span>
                        {/if}
                        {rankFilter === "all" ? "Wszystkie rangi" : rankFilter}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="all" label="Wszystkie rangi">Wszystkie rangi</Select.Item>
                        {#each RANKS as rank (rank)}
                            <Select.Item value={rank} label={rank}>
                                <span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[rank]}"></span>
                                {rank}
                            </Select.Item>
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
                                {@render sortHead("Nick", "nickname", sort, () => (sort = nextSort(sort, "nickname")))}
                                {@render sortHead("Ranga", "rank", sort, () => (sort = nextSort(sort, "rank")))}
                                {@render sortHead("Początek", "start_time", sort, () => (sort = nextSort(sort, "start_time")))}
                                {@render sortHead("Badge NFC ID", "tag_nfc", sort, () => (sort = nextSort(sort, "tag_nfc")))}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each paged as duty (duty.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium">{duty.nickname}</Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                                variant="outline"
                                                class={duty.rank ? RANK_STYLES[duty.rank] : NO_RANK_STYLE}
                                        >
                                            {duty.rank ?? "—"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{formatTime(duty.start_time)}</Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{duty.tag_nfc}</Table.Cell>
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

    <Card.Root class="mt-16">
        <Card.Header>
            <Card.Title>Historia dyżurów</Card.Title>
            <Card.Description>
                {history.length} zakończonych
            </Card.Description>
        </Card.Header>

        <Card.Content class="space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row">
                <Input
                        placeholder="Szukaj: nick, tag NFC, początek, koniec..."
                        bind:value={historySearch}
                        class="sm:flex-1"
                />

                <Select.Root type="single" bind:value={historyRankFilter}>
                    <Select.Trigger class="w-full sm:w-48">
                        {#if historyRankFilter !== "all"}
                            <span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[historyRankFilter as Rank]}"></span>
                        {/if}
                        {historyRankFilter === "all" ? "Wszystkie rangi" : historyRankFilter}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="all" label="Wszystkie rangi">Wszystkie rangi</Select.Item>
                        {#each RANKS as rank (rank)}
                            <Select.Item value={rank} label={rank}>
                                <span class="mr-2 inline-block size-2 rounded-full {RANK_DOTS[rank]}"></span>
                                {rank}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            {#if historyLoading}
                <p class="text-muted-foreground">Loading...</p>
            {:else if historyError}
                <p class="text-red-500">{historyError}</p>
            {:else}
                <div class="rounded-md border">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                {@render sortHead("Nick", "nickname", historySort, () => (historySort = nextSort(historySort, "nickname")))}
                                {@render sortHead("Ranga", "rank", historySort, () => (historySort = nextSort(historySort, "rank")))}
                                {@render sortHead("Początek", "start_time", historySort, () => (historySort = nextSort(historySort, "start_time")))}
                                {@render sortHead("Koniec", "end_time", historySort, () => (historySort = nextSort(historySort, "end_time")))}
                                {@render sortHead("Czas trwania", "length", historySort, () => (historySort = nextSort(historySort, "length")))}
                                {@render sortHead("Badge NFC ID", "tag_nfc", historySort, () => (historySort = nextSort(historySort, "tag_nfc")))}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each historyPaged as duty (duty.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium">{duty.nickname}</Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                                variant="outline"
                                                class={duty.rank ? RANK_STYLES[duty.rank] : NO_RANK_STYLE}
                                        >
                                            {duty.rank ?? "—"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{formatTime(duty.start_time)}</Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{formatTime(duty.end_time)}</Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{formatDuration(duty.start_time, duty.end_time)}</Table.Cell>
                                    <Table.Cell class="font-mono text-xs">{duty.tag_nfc}</Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
                                        Brak zakończonych dyżurów
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>

                {#if historyFiltered.length > HISTORY_PAGE_SIZE}
                    <Pagination.Root
                            count={historyFiltered.length}
                            perPage={HISTORY_PAGE_SIZE}
                            bind:page={historyPage}
                    >
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
