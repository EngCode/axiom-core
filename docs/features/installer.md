# Windows installer

**Status:** first test build · **Output:** `release/Axiom Core_0.1.0_x64-setup.exe` ·
**Config:** [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)

Axiom Core ships as an NSIS installer, per-user, with no admin prompt.

## Build

```powershell
node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis --ci
```

The installer is written to `src-tauri/target/release/bundle/nsis/` and copied to `release/` for
testing.

## First run

The installer bundles a checkpointed workspace seed (`seed/axiom.db`) from the build machine.
On first launch the Rust shell copies it to the app data folder if no database exists, so the
installed app starts with the current projects, tasks, documents, milestones, checklists and task
links rather than a blank workspace.

Existing databases are never overwritten. Uninstalling keeps app data unless it is removed by hand.

## Installing

- **Per-user**, no elevation.
- The test build is **unsigned**; Windows SmartScreen may show “Windows protected your PC” →
  **More info → Run anyway**.
- WebView2 is the only runtime dependency; Windows 11 includes it.

Data lives at `%APPDATA%\com.axiom.core\axiom.db` (WAL) with the WebView2 profile alongside it.

## Test checklist

1. Run the installer on a machine that has no Axiom Core data.
2. Launch from the Start menu; the main window opens.
3. Confirm the Axiom Core project shows the current tasks and the seeded documents/milestones.
4. Create a task, close the window, reopen from the tray; the task is still there.
5. Uninstall; confirm app data remains at `%APPDATA%\com.axiom.core`.

## If setup does nothing

Run the setup by double-clicking it from **File Explorer**, not through an app launcher, terminal
wrapper or the DSH harness. NSIS needs a normal `%TEMP%` and permission to create
`%LOCALAPPDATA%\Axiom Core`; a restricted launcher can make the stub exit before the install
section, or fail later with a temp-folder error.

If the setup still refuses, use the portable ZIP:

```
release/Axiom Core 0.1.0 portable.zip
```

Extract it and run `Start Axiom Core.cmd`. The portable build keeps its workspace in `data\` next to
the executable and needs no installer or admin rights.

An MSI is also provided for machines where NSIS is blocked:

```
release/Axiom Core_0.1.0_x64_en-US.msi
```

The MSI installs for all users and asks for elevation.
## Known limits

- Unsigned build.
- No auto-update channel yet.
- Installer name/version follows `tauri.conf.json` (`0.1.0`).
- The seed is a point-in-time snapshot; it is not merged into an existing installation.
