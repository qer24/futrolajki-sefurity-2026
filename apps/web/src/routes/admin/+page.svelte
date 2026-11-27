<script lang="ts">
    import { onMount } from "svelte"; // Import onMount
    import { apiFetch } from "#lib/api.js";
    import CrudTable from "#lib/components/CrudTable.svelte";
    import NfcStatus from "#lib/components/NfcStatus.svelte";
    import { nfc } from "#lib/nfc.svelte.js";

    // Reusable rank options
    const rankOptions = [
        { value: "porzadkowa", label: "Porządkowa" },
        { value: "info", label: "Info" },
        { value: "dowodca", label: "Dowódca" },
    ];

    // --- Users Table Config ---
    const userColumns = [
        { key: "id", label: "ID" },
        { key: "tag_nfc", label: "NFC Tag" },
        { key: "nickname", label: "Nickname" },
        { key: "rank", label: "Rank", format: (val: unknown) => (typeof val === "string" ? val.charAt(0).toUpperCase() + val.slice(1) : val) },
        { key: "created_at", label: "Created At", format: (val: unknown) => typeof val === "string" ? new Date(val).toLocaleString() : "-" }
    ];

    const userFields: Array<{
        key: string;
        label: string;
        type: "text" | "number" | "datetime-local" | "select";
        placeholder?: string;
        options?: Array<{ value: string; label: string }>;
    }> = [
        { key: "tag_nfc", label: "NFC Tag", type: "text", placeholder: "Scan tag..." },
        { key: "nickname", label: "Nickname", type: "text" },
        { key: "rank", label: "Rank", type: "select", options: rankOptions }
    ];

    // --- Duty Table Config ---
    const dutyColumns = [
        { key: "id", label: "ID" },
        { key: "user_id", label: "User ID" },
        { key: "start_time", label: "Start Time", format: (val: unknown) => typeof val === "string" && val ? new Date(val).toLocaleString() : "-" },
        { key: "end_time", label: "End Time", format: (val: unknown) => typeof val === "string" && val ? new Date(val).toLocaleString() : "-" }
    ];

    let dutyFields = $state<Array<{
        key: string;
        label: string;
        type: "text" | "number" | "datetime-local" | "select";
        options?: Array<{ value: string; label: string }>;
    }>>([
        { key: "user_id", label: "User", type: "select", options: [] },
        { key: "start_time", label: "Start Time", type: "datetime-local" },
        { key: "end_time", label: "End Time", type: "datetime-local" }
    ]);

    async function fetchUsersForSelect() {
        try {
            const response = await apiFetch("/users");
            const users = await response.json() as Array<{ id: string | number; nickname: string }>;

            dutyFields[0].options = users.map((user: { id: string | number; nickname: string }) => ({
                value: String(user.id),
                label: `${user.nickname} (ID: ${user.id})`
            }));
        } catch (error) {
            console.error("Failed to load users for duty select:", error);
        }
    }

    let usersTable = $state<{
        openById: (id: unknown) => Promise<void>;
        openDialog: (item: Record<string, string | undefined>) => void;
    }>();
    let lastHandledScan = $state<string | null>(null);

    // React to each new card scan
    $effect(() => {
        const card = nfc.card;

        if (!usersTable || !card?.uid || card.scannedAt === lastHandledScan) return;
        lastHandledScan = card.scannedAt;

        if (card.user) {
            // Known tag -> edit that user
            usersTable.openById(card.user.id);
        } else {
            // Unknown tag -> create a user with this UID prefilled
            usersTable.openDialog({ tag_nfc: card.uid });
        }
    });

    onMount(() => {
        fetchUsersForSelect();
    });
</script>

<div class="w-full px-6 py-8 lg:px-10">
    <div class="space-y-12">
        <NfcStatus />
        <CrudTable
                bind:this={usersTable}
                title="Users Management"
                apiEndpoint="/users"
                {apiFetch}
                columns={userColumns}
                fields={userFields}
                onChange={fetchUsersForSelect}
        />

        <CrudTable
                title="Duty Roster"
                apiEndpoint="/duty"
                {apiFetch}
                columns={dutyColumns}
                fields={dutyFields}
        />
    </div>
</div>
