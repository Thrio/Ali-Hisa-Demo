# Used references

`industry-refs` **warns** (never blocks) when the same URL was already used for the same industry and city — two rival clients with look-alike sites is a real risk, but a proven reference is still allowed after the user confirms.

Add a row when a client picks a reference — run in the kit repo:
`node scripts/brain.mjs log-reference --client "<name>" --city "<city>" --industry <slug> --url <url> [--cloneability easy|medium|hard]`
Client projects get a read-only copy on every `brain sync`.

| Date | Client | City | Industry | URL | Cloneability |
|---|---|---|---|---|---|
