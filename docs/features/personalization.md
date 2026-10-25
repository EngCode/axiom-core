# Personalization

**Status:** shipped · **Entry points:** sidebar gear (bottom rail) and
`⌘K` → **Personalization** · **Sources:** [`src/lib/identity.ts`](../../src/lib/identity.ts),
[`src/components/settings-dialog.tsx`](../../src/components/settings-dialog.tsx),
[`src/lib/store.tsx`](../../src/lib/store.tsx)

The app name, workspace name and owner are **data, not constants**. They ship with defaults and can
be changed at any time without touching code.

## Fields

| Field | Default | Where it appears |
| --- | --- | --- |
| App name | `Axiom Core` | sidebar brand, window title, quick-capture footer, app footer, document title |
| Workspace name | `Personal` | sidebar subtitle, top bar breadcrumb, app footer |
| Owner name | `Abdullah` | dashboard greeting, sidebar subtitle, avatar initials |

The sidebar mark uses the app name's initials (`Axiom Core` → `AC`). Empty fields fall back to the
defaults on save, so the app can never end up with a blank name.

## Behaviour

- Changes apply immediately after **Save changes**: sidebar, greeting, window title, document
  title, quick-capture labels.
- **Reset fields** restores the defaults in the form; **Save** applies them.
- Cancel discards the draft.
- The native window title is updated through the `set_window_title` Rust command; the tray tooltip
  and tray menu labels are fixed at build time and would need a restart/new build to change.

## Storage

Identity is part of `AppState` and therefore flows through the normal persistence path:

- localStorage: inside `axiom.state.v1`
- SQLite: `meta` rows `identity.appName`, `identity.workspaceName`, `identity.ownerName`

It survives restarts, theme changes and **Reset demo data** — except that reset restores the seed
state, which includes the default identity.

## Changing the shipped defaults

Edit `DEFAULT_IDENTITY` in [`src/lib/identity.ts`](../../src/lib/identity.ts):

```ts
export const DEFAULT_IDENTITY: Identity = {
  appName: 'Axiom Core',
  workspaceName: 'Personal',
  ownerName: 'Abdullah',
}
```

This affects fresh installs, reset data and empty fields. Existing users keep whatever they saved.
The desktop product name (`Axiom Core`), executable name (`axiom-core.exe`) and bundle identifier
(`com.axiom.core`) live in `src-tauri/tauri.conf.json` / `Cargo.toml` and still require a rebuild.

## Known gaps

- No avatar image, accent colour or per-workspace branding yet.
- Tray labels, installer metadata and file paths are not runtime-editable.
- No multiple workspaces, so identity is global to the app.
