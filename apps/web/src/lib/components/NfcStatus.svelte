<script>
    import { onMount } from "svelte";
    import { nfc, startNfcStream, stopNfcStream } from "$lib/nfc.svelte.js";

    onMount(() => {
        startNfcStream();
        return stopNfcStream;
    });

    let copied = $state(false);

    async function copyUid() {
        if (!nfc.lastCard?.uid) return;
        await navigator.clipboard.writeText(nfc.lastCard.uid);
        copied = true;
        setTimeout(() => (copied = false), 1500);
    }

    const shown = $derived(nfc.card ?? nfc.lastCard);
</script>

<div class="rounded-lg border p-4 space-y-3">
    <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">NFC Reader</h2>
        <div class="flex items-center gap-2 text-sm">
            <span
                    class="inline-block h-2.5 w-2.5 rounded-full"
                    class:bg-green-500={nfc.streaming && nfc.readers.length}
                    class:bg-yellow-500={nfc.streaming && !nfc.readers.length}
                    class:bg-red-500={!nfc.streaming}
            ></span>
            {#if !nfc.streaming}
                Backend disconnected
            {:else if nfc.readers.length}
                {nfc.readers.join(", ")}
            {:else}
                No reader attached
            {/if}
        </div>
    </div>

    {#if nfc.error}
        <p class="text-sm text-red-600">{nfc.error}</p>
    {/if}

    {#if shown}
        <div class="rounded bg-base-200 p-3 space-y-1 text-sm">
            <div class="font-medium">
                {nfc.card ? "Card on reader" : "Last scanned card (removed)"}
            </div>
            <div>UID: <code class="font-mono">{shown.uid ?? "not exposed"}</code></div>
            <div>Standard: {shown.type}</div>
            <div>ATR: <code class="font-mono break-all">{shown.atr}</code></div>
            <div>Scanned: {new Date(shown.scannedAt).toLocaleString()}</div>
            <div>
                Owner:
                {#if shown.user}
                    <strong>{shown.user.nickname}</strong> ({shown.user.rank})
                {:else}
                    <em>unregistered tag</em>
                {/if}
            </div>

            {#if shown.uid}
                <button class="btn btn-sm mt-2" onclick={copyUid}>
                    {copied ? "Copied!" : "Copy UID"}
                </button>
            {/if}
        </div>
    {:else}
        <p class="text-sm opacity-70">Tap a card on the reader…</p>
    {/if}
</div>
