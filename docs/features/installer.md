# Installers and releases

**Status:** CI release pipeline shipped · **Signing:** not yet (see AXI-50) ·
**Workflow:** [`.github/workflows/release.yml`](../../.github/workflows/release.yml) ·
**Config:** [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) and the platform overlays

Axiom Core builds on Windows, Linux and macOS. Tagged builds are published to **GitHub Releases**;
installers are never committed to the repository.

## Outputs

| Platform | Runner | Bundles | Notes |
| --- | --- | --- | --- |
| Windows x64 | `windows-latest` | NSIS `.exe` | per-user install, no admin prompt |
| Linux x64 | `ubuntu-22.04` | `.deb`, AppImage | built against WebKitGTK 4.1 |
| macOS Apple Silicon | `macos-14` | `.dmg`, `.app` | minimum macOS 10.15 |
| macOS Intel | `macos-15-intel` | `.dmg`, `.app` | native x86_64 runner; available until Aug 2027 |

The base config keeps `targets: ["nsis"]` so a plain `tauri build` still works on Windows. The
platform overlays (`tauri.windows.conf.json`, `tauri.linux.conf.json`, `tauri.macos.conf.json`)
supply the right targets and Linux package dependencies when Tauri loads them automatically.

## Publishing

1. Bump `version` in `package.json` and `src-tauri/tauri.conf.json`.
2. Push a tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The **Release** workflow runs the matrix, builds each bundle with `tauri-action` and creates a
   **draft** GitHub Release named `Axiom Core v0.2.0` with every artifact attached.
4. Review the draft, then publish it.

Running the workflow manually (`workflow_dispatch`) builds and uploads the bundles as workflow
artifacts instead of creating a release, which is useful for smoke tests.

Artifacts also land locally under `src-tauri/target/release/bundle/` after a local build.

## Local builds

```bash
pnpm install
pnpm build:win      # NSIS on Windows
pnpm build:linux    # deb + AppImage on Linux
pnpm build:mac      # dmg + app on macOS
```

The frontend is built first (`tsc --noEmit` + Vite) by Tauri's `beforeBuildCommand`, so a type
error fails the bundle rather than shipping a broken UI.

## First run

The installer bundles a checkpointed workspace seed (`seed/axiom.db`). On first launch the Rust
shell copies it to the app data folder when no database exists, so a fresh install starts with the
current projects, tasks, documents, milestones, checklists and task links instead of a blank
workspace.

Existing databases are never overwritten. Uninstalling keeps app data unless it is removed by hand.

Data lives at:

| Platform | Database |
| --- | --- |
| Windows | `%APPDATA%\com.axiom.core\axiom.db` |
| macOS | `~/Library/Application Support/com.axiom.core/axiom.db` |
| Linux | `~/.local/share/com.axiom.core/axiom.db` |

The WebView profile sits alongside it. Library rebuild backups go to `backups/` in the same folder.

## Installing

- **Windows** — per-user, no elevation. WebView2 is the only runtime dependency and ships with
  Windows 11.
- **Linux** — install the `.deb` with your package manager, or mark the AppImage executable and run
  it. WebKitGTK 4.1 and GTK 3 are required.
- **macOS** — open the `.dmg` and drag Axiom Core to Applications. Gatekeeper blocks unsigned apps;
  right-click → **Open** or allow it in **System Settings → Privacy & Security**.

All builds are currently **unsigned**. Windows SmartScreen may show “Windows protected your PC” →
**More info → Run anyway**.

## Signing and updates

Signing, notarization and an update channel are deliberately deferred (AXI-50). Until then:

- No auto-updater; `createUpdaterArtifacts` is off.
- macOS builds are not notarized.
- Windows builds carry no code-signing certificate.
- The seed is a point-in-time snapshot; it is not merged into an existing installation.

## Test checklist

1. Install on a machine with no Axiom Core data.
2. Launch; the main window opens and the seeded project/tasks/documents are present.
3. Create a task, close the window, reopen from the tray; the task is still there.
4. Open **Library → Scan roots**, add a folder and run a rebuild dry run.
5. Uninstall; confirm app data remains in the platform data folder.

## If the Windows setup does nothing

Run the setup by double-clicking it from **File Explorer**, not through an app launcher, terminal
wrapper or the DSH harness. NSIS needs a normal `%TEMP%` and permission to create
`%LOCALAPPDATA%\Axiom Core`; a restricted launcher can make the stub exit before the install
section, or fail later with a temp-folder error.

If it still refuses, build locally and run the binary from `src-tauri/target/release/` — the
release binary serves embedded assets and needs no installer.
