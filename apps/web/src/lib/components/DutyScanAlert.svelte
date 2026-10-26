<script lang="ts">
    import { onDestroy, untrack } from "svelte";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Progress } from "$lib/components/ui/progress/index.js";
    import { LogIn, LogOut, TriangleAlert } from "@lucide/svelte";
    import { nfc, type ScannedCard } from "$lib/nfc.svelte.js";

    // Called after a tap started / ended a duty, so the page can refresh its list.
    let { onDutyChange }: { onDutyChange?: () => void } = $props();

    const DURATION_MS = 10000;
    const TICK_MS = 50;
    // Ignore scans older than this (e.g. the "last card" snapshot sent when the page loads)
    const MAX_SCAN_AGE_MS = 15_000;

    type Kind = "started" | "ended" | "unknown" | "error";
    type View = { kind: Kind; scan: ScannedCard };

    const RANK_STYLES: Record<string, string> = {
        porzadkowa:
            "border-transparent bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
        info: "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
        dowodca:
            "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300"
    };
    const NO_RANK_STYLE = "border-transparent bg-muted text-muted-foreground";

    const META = {
        started: {
            icon: LogIn,
            title: "Dyżur rozpoczęty",
            alert: "border-green-500 bg-green-50 dark:bg-green-950/60",
            badge: "bg-green-500 text-white",
            text: "text-green-700 dark:text-green-300"
        },
        ended: {
            icon: LogOut,
            title: "Dyżur zakończony",
            alert: "border-blue-500 bg-blue-50 dark:bg-blue-950/60",
            badge: "bg-blue-500 text-white",
            text: "text-blue-700 dark:text-blue-300"
        },
        unknown: {
            icon: TriangleAlert,
            title: "Nieznana karta",
            alert: "border-red-500 bg-red-50 dark:bg-red-950/60",
            badge: "bg-red-500 text-white",
            text: "text-red-700 dark:text-red-300"
        },
        error: {
            icon: TriangleAlert,
            title: "Nie udało się zapisać dyżuru",
            alert: "border-red-500 bg-red-50 dark:bg-red-950/60",
            badge: "bg-red-500 text-white",
            text: "text-red-700 dark:text-red-300"
        }
    } as const;

    let current = $state<View | null>(null);
    let remainingMs = $state(DURATION_MS);

    let timer: ReturnType<typeof setInterval> | undefined;
    let lastSeen = "";

    function stopCountdown() {
        if (timer) clearInterval(timer);
        timer = undefined;
    }

    function startCountdown() {
        stopCountdown();
        const startedAt = Date.now();
        remainingMs = DURATION_MS;

        timer = setInterval(() => {
            remainingMs = Math.max(0, DURATION_MS - (Date.now() - startedAt));

            if (remainingMs <= 0) {
                stopCountdown();
                current = null;
            }
        }, TICK_MS);
    }

    function toView(scan: ScannedCard): View | null {
        if (scan.dutyError) return { kind: "error", scan };
        if (scan.duty) return { kind: scan.duty.action, scan };
        if (!scan.user) return { kind: "unknown", scan };
        // Known user but no duty change (tap ignored by the server cooldown)
        return null;
    }

    $effect(() => {
        const scan = nfc.card ?? nfc.lastCard;

        if (!scan || scan.scannedAt === lastSeen) return;
        lastSeen = scan.scannedAt;

        untrack(() => {
            if (Date.now() - new Date(scan.scannedAt).getTime() > MAX_SCAN_AGE_MS) return;

            const view = toView(scan);
            if (!view) return;

            if (scan.duty) onDutyChange?.();

            current = view;
            startCountdown();
        });
    });

    onDestroy(stopCountdown);

    function formatDateOnly(value: string): string {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleString("pl-PL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function formatTimeOnly(value: string): string {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function isSameDay(val1: string, val2: string): boolean {
        const d1 = new Date(val1);
        const d2 = new Date(val2);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    }

    function formatDuration(totalSeconds: number): string {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) return `${h} h ${m} min`;
        if (m > 0) return `${m} min ${s} s`;
        return `${s} s`;
    }

    function closeAlert() {
        if (!current) return;
        current = null;
        stopCountdown();
    }
</script>

<svelte:window
        onclick={closeAlert}
        onkeydown={(e) => { if (e.key === 'Escape') closeAlert(); }}
/>

{#if current}
    {@const meta = META[current.kind]}
    {@const scan = current.scan}
    {@const Icon = meta.icon}

    <div
            class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 p-6 backdrop-blur-sm cursor-pointer"
            role="alert"
            aria-live="assertive"
    >
        <div class="rounded-full p-6 shadow-lg {meta.badge}">
            <Icon class="size-16" />
        </div>

        <Alert.Root class="w-full max-w-2xl border-2 p-8 {meta.alert} text-center cursor-default">
            <Alert.Title class="text-3xl font-bold {meta.text} mb-4">{meta.title}</Alert.Title>

            <Alert.Description class="w-full text-base text-foreground flex flex-col items-center gap-4">
                {#if current.kind === "unknown"}
                    <p class="text-lg">Ten tag NFC nie jest przypisany do żadnego użytkownika.</p>
                    <p class="text-lg">Napisz do @arcywastooshort</p>
                    <div class="mt-2 text-xl font-mono text-muted-foreground">
                        UID: {scan.uid ?? "brak"}
                    </div>
                {:else}
                    {#if current.kind === "error"}
                        <p class="text-red-600 font-semibold">{scan.dutyError}</p>
                    {/if}

                    {#if scan.user}
                        <div class="flex items-center gap-3 text-3xl font-semibold my-2">
                            <span>{scan.user.nickname}</span>
                            <Badge
                                    variant="outline"
                                    class="text-lg px-3 py-1 {RANK_STYLES[scan.user.rank] ?? NO_RANK_STYLE}"
                            >
                                {scan.user.rank}
                            </Badge>
                        </div>
                    {/if}

                    {#if scan.duty}
                        <div class="flex flex-col items-center justify-center gap-1 font-mono text-2xl text-muted-foreground">
                            <span>{formatDateOnly(scan.duty.startTime)}</span>
                            <div class="flex items-center gap-2">
                                <span>{formatTimeOnly(scan.duty.startTime)}</span>
                                {#if scan.duty.endTime}
                                    <span>&mdash;</span>
                                    <span>{formatTimeOnly(scan.duty.endTime)}</span>
                                    {#if !isSameDay(scan.duty.startTime, scan.duty.endTime)}
                                        <span class="ml-1 text-xl">({formatDateOnly(scan.duty.endTime)})</span>
                                    {/if}
                                {/if}
                            </div>
                        </div>

                        {#if scan.duty.durationSeconds !== null}
                            <div class="mt-4 text-xl font-medium text-muted-foreground">
                                Czas trwania: {formatDuration(scan.duty.durationSeconds)}
                            </div>
                        {/if}
                    {/if}
                {/if}
            </Alert.Description>
        </Alert.Root>

        <div class="w-full max-w-2xl space-y-2">
            <Progress value={(remainingMs / DURATION_MS) * 100} max={100} class="h-3" />
            <p class="text-center text-sm text-muted-foreground tabular-nums">
                Zamknięcie za {Math.ceil(remainingMs / 1000)} s
            </p>
        </div>
    </div>
{/if}
