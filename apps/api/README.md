# API configuration

The API reads `apps/api/.env` when started with the package scripts.

Set `COUNTERS_ENABLED=false` to disable the counters module. When unset or set
to any other value, counters remain enabled. Disabling counters skips its
database schema initialization and leaves its API routes unmounted; the web UI
also hides its navigation entry and redirects direct visits to `/counters`.
