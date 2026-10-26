# Core API

**Status:** v1 shipped — read commands plus issue mutations ·
**Rust:** [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs) ·
**Core functions:** [`src-tauri/src/data/api.rs`](../../src-tauri/src/data/api.rs) ·
**Client:** [`src/lib/core-api.ts`](../../src/lib/core-api.ts) ·
**Plan:** [PROJECT-WORKSPACE.md](PROJECT-WORKSPACE.md)

The core API is the boundary between the Rust-owned SQLite snapshot and any surface that needs
workspace data. Reads return typed payloads; mutations load the snapshot, apply a validated change,
and write it through the same `save_state` path the UI uses.

## Versioning

`CORE_API_VERSION = 1` is returned by `core_api_version`. Payloads are camelCase and deserialize
into the same TypeScript models as the store. A breaking shape change increments the version.

## Commands

| Command | Arguments | Returns |
| --- | --- | --- |
| `core_api_version` | — | `number` |
| `core_snapshot` | — | `AppState \| null` |
| `core_project` | `projectId` | `{ project, issues, notes } \| null` |
| `core_issue` | `issueId` | `Issue \| null` |
| `core_issue_update` | `issueId`, `patch` | `Issue \| null` |
| `core_issue_create` | `draft` | `Issue` |

`null` means “not initialized” or “not found”; errors are strings from SQLite or validation.

### Patch and draft

```ts
interface IssuePatch {
  title?: string
  description?: string
  status?: 'backlog' | 'todo' | 'in_progress' | 'done'
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  labels?: string[]
  dueDate?: string
  projectId?: string
}

interface IssueDraft {
  title: string
  description?: string
  status?: string
  priority?: string
  projectId?: string
  labels?: string[]
  dueDate?: string
}
```

### Frontend client

```ts
import { coreApi } from '@/lib/core-api'

const project = await coreApi.project('p-axiom')
await coreApi.updateIssue('i-axiom-16', { status: 'done' })
await coreApi.createIssue({
  title: 'Auto-scroll while pointer sorting',
  projectId: 'p-axiom',
  priority: 'low',
})
```

In a normal browser `coreApi` returns `null`; the desktop shell is the only transport.

## Invariants

- **One snapshot writer.** Mutations do not touch tables directly: they load `AppState`, apply the
  change, and call `db::save_state`. There is no second source of truth.
- **Validated writes.** `status` and `priority` are checked against the known sets; empty titles are
  rejected; timestamps are generated in SQLite (`strftime`).
- **Counters stay coherent.** `core_issue_create` increments the global issue counter and derives the
  key from the project prefix exactly like the UI.
- **Activity is recorded.** Completing an issue and creating one append to the activity feed.
- **No file paths.** Volumes and media files remain in the library API until a path-safety contract
  exists.

## Smoke test used for AXI-33

The mutation layer was exercised against the live workspace with
`src-tauri/examples/sync_axiom_tasks.rs`:

```powershell
cargo run --example sync_axiom_tasks --manifest-path src-tauri/Cargo.toml -- ".axiom-data/axiom.db"
```

It closed AXI-33, raised AXI-31's priority, and created AXI-34–36 through the API. Run it with the
app closed so there is a single writer. The example is idempotent by key.

## Roadmap

1. **Mutation expansion** — project update/delete, issue delete/reorder, then milestones and project
   documents once AXI-31/32 define storage.
2. **Frontend adoption** — route the UI's writes through `coreApi` behind the same optimistic store,
   so every surface shares one write path.
3. **Typed errors** — replace string errors with `NotFound`, `Conflict`, `Storage`.
4. **Second consumers** — a CLI or extra window can use the same commands without duplicating rules.
