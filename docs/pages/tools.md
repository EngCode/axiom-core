# Tools

**Route:** `/tools` · **Status:** shipped ·
**Source:** [`src/pages/tools.tsx`](../../src/pages/tools.tsx)

App-level controls that do not belong to a single workspace area. The sidebar keeps them at the
bottom of the navigation instead of scattering icons.

## Sections

| Tool | Behaviour |
| --- | --- |
| **Documentation** | Opens `/docs`, the offline documentation reader |
| **Personalization** | Opens the identity dialog (app name, workspace, owner) |
| **Appearance** | Theme picker (Axiom, Paper, Graphite) |
| **Workspace data** | Resets the demo workspace after a confirmation; never touches media drives |

## Design notes

- Each tool is a card with one short explanation and exactly one control.
- Destructive actions use a danger-tinted ghost button and a confirmation; there is no undo yet.
- Identity and theme controls are duplicated in the sidebar footer for speed; Tools is the
  discoverable home.

## Code map

- `src/pages/tools.tsx` — page composition
- `src/components/settings-dialog.tsx` — personalization form
- `src/components/theme-picker.tsx` — theme menu
- `src/lib/store.tsx` — `resetData`

## Next

Export/import and backups belong here once the data layer grows; so does a diagnostics view for the
database and WebView2 profile.
