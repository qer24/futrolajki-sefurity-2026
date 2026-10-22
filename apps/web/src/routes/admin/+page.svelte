<script>
    import { onMount } from "svelte"; // Import onMount
    import { apiFetch } from "$lib/api.js";
    import CrudTable from "$lib/components/CrudTable.svelte";

    // Reusable rank options
    const rankOptions = [
        { value: "porzadkowa", label: "Porządkowa" },
        { value: "info", label: "Info" },
        { value: "lider", label: "Lider" },
        { value: "koord", label: "Koordynator" },
        { value: "org", label: "Organizator" },
        { value: "sekretarka", label: "Sekretarka" }
    ];

    // --- Users Table Config ---
    const userColumns = [
        { key: "id", label: "ID" },
        { key: "tag_nfc", label: "NFC Tag" },
        { key: "nickname", label: "Nickname" },
        { key: "rank", label: "Rank", format: (val) => (val ? val.charAt(0).toUpperCase() + val.slice(1) : val) },
        { key: "created_at", label: "Created At", format: (val) => new Date(val).toLocaleString() }
    ];

    const userFields = [
        { key: "tag_nfc", label: "NFC Tag", type: "text", placeholder: "Scan tag..." },
        { key: "nickname", label: "Nickname", type: "text" },
        { key: "rank", label: "Rank", type: "select", options: rankOptions }
    ];

    // --- Duty Table Config ---
    const dutyColumns = [
        { key: "id", label: "ID" },
        { key: "user_id", label: "User ID" },
        { key: "start_time", label: "Start Time", format: (val) => val ? new Date(val).toLocaleString() : "-" },
        { key: "end_time", label: "End Time", format: (val) => val ? new Date(val).toLocaleString() : "-" }
    ];

    let dutyFields = $state([
        { key: "user_id", label: "User", type: "select", options: [] },
        { key: "start_time", label: "Start Time", type: "datetime-local" },
        { key: "end_time", label: "End Time", type: "datetime-local" }
    ]);

    async function fetchUsersForSelect() {
        try {
            const response = await apiFetch("/users");
            const users = await response.json();

            dutyFields[0].options = users.map(user => ({
                value: user.id,
                label: `${user.nickname} (ID: ${user.id})`
            }));
        } catch (error) {
            console.error("Failed to load users for duty select:", error);
        }
    }

    onMount(() => {
        fetchUsersForSelect();
    });
</script>

<div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8">Admin Dashboard</h1>

    <div class="space-y-12">
        <CrudTable
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
