# Personalization

**Status:** shipped · **Entry points:** **Settings → Profile** — sidebar footer, top-bar avatar,
`⌘K` → **Settings**, or Tools → Settings ·
**Sources:** [`src/lib/identity.ts`](../../src/lib/identity.ts),
[`src/pages/user.tsx`](../../src/pages/user.tsx),
[`src/lib/store.tsx`](../../src/lib/store.tsx) ·
**See also:** [settings.md](../pages/settings.md)

The app name, workspace name and owner are **data, not constants**. They ship with defaults and can
be changed at any time without touching code.

## Fields

| Field | Default | Where it appears |
| --- | --- | --- |
| App name | `Axiom Core` | sidebar brand, window title, quick-capture footer, app footer, document title |
| Workspace name | `Personal` | sidebar subtitle, top bar breadcrumb, app footer |
| Owner name | `Abdullah` | dashboard greeting, sidebar subtitle, avatar initials |

The sidebar mark is the Axiom Core logo, shipped as a fixed brand asset: the app name changes the
label, not the mark. Empty fields fall back to the defaults on save, so the app can never end up
with a blank name.

## Behaviour

- Changes apply immediately after **Save profile**: sidebar, greeting, window title, document
  title, quick-capture labels.
- **Reset fields** restores the defaults in the form; **Save profile** applies them.
- Leaving the page discards the draft; there is no cancel button because nothing is applied until
  save.
- The native window title is updated through the `set_window_title` Rust command; the tray tooltip
  and tray menu labels are fixed at build time and would need a restart/new build to change.

## Storage

Identity is part of `AppState` and therefore flows through the normal persistence path:

- localStorage: inside `axiom.state.v1`
- SQLite: `meta` rows `identity.appName`, `identity.workspaceName`, `identity.ownerName`

It survives restarts and theme changes; **Reset demo data** restores the seed identity.

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

- No avatar image or per-workspace branding yet.
- Appearance is app-wide (theme + background), not per workspace.
- Installer metadata and file paths are not runtime-editable.
- No multiple workspaces, so identity is global to the app.
