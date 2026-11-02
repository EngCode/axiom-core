# Installers, signing and updates

**Status:** signed releases + in-place updates wired (AXI-50) ·
**Workflow:** [`.github/workflows/release.yml`](../../.github/workflows/release.yml) ·
**Config:** [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) and the platform overlays

Axiom Core builds on Windows, Linux and macOS. Tagged builds are published to **GitHub Releases**;
installers are never committed to the repository.

## Outputs

| Platform | Runner | Bundles | Notes |
| --- | --- | --- | --- |
| Windows x64 | `windows-latest` | NSIS `.exe`, MSI `.msi` | NSIS is per-user (no UAC); MSI is per-machine (admin) |
| Linux x64 | `ubuntu-22.04` | `.deb`, AppImage | built against WebKitGTK 4.1 |
| macOS Apple Silicon | `macos-14` | `.dmg`, `.app` | minimum macOS 10.15 |
| macOS Intel | `macos-15-intel` | `.dmg`, `.app` | native x86_64 runner; available until Aug 2027 |

The base config keeps `targets: ["nsis"]` so a plain `tauri build` still works on Windows. The
platform overlays (`tauri.windows.conf.json`, `tauri.linux.conf.json`, `tauri.macos.conf.json`)
supply the right targets, signing hook and Linux package dependencies when Tauri loads them
automatically.

Windows ships **two** installers on purpose:

- `Axiom Core_<version>_x64-setup.exe` (NSIS) installs into `%LOCALAPPDATA%\Axiom Core` for the
  current user with no elevation prompt. This is the installer the in-app updater uses.
- `Axiom Core_<version>_x64_en-US.msi` (WiX) installs machine-wide into `Program Files` and needs
  administrator rights once. Use it when per-user installs are blocked by policy, or when NSIS
  cannot start because of a broken `%TEMP%`: the MSI never unpacks a stub into `TEMP`.

## Signing

The Windows bundles are Authenticode-signed when a certificate is configured, and macOS bundles are
signed and notarized when the Apple secrets are present. Without the secrets the build still
succeeds and the artifacts are unsigned, so contributors can produce test builds.

### Windows

`src-tauri/tauri.windows.conf.json` sets `bundle.windows.signCommand` to
[`scripts/sign-windows.ps1`](../../scripts/sign-windows.ps1). Tauri runs it once per artifact
(executable, NSIS setup, MSI) with the artifact path in place of `%1`.

| Variable | Purpose |
| --- | --- |
| `AXIOM_WINDOWS_CERTIFICATE` | base64-encoded `.pfx`, or a path to a `.pfx` file |
| `AXIOM_WINDOWS_CERTIFICATE_PASSWORD` | PFX password (omit for an unencrypted key) |
| `AXIOM_WINDOWS_TIMESTAMP_URL` | RFC 3161 timestamp server; defaults to `http://timestamp.digicert.com` |
| `AXIOM_SIGNTOOL` | explicit `signtool.exe` path (the script otherwise discovers the Windows SDK) |
| `AXIOM_WINDOWS_SIGN_COMMAND` | delegate to a hosted signer such as Azure Trusted Signing |

The script signs with SHA-256 and verifies the result with `signtool verify /pa`. If
`AXIOM_WINDOWS_CERTIFICATE` is unset it prints a warning and exits 0 instead of failing the build.

### macOS

The workflow forwards `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
`APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID`. Tauri signs and notarizes when they are present.
Gatekeeper still blocks completely unsigned local builds; right-click → **Open** in that case.

### Linux

Linux packages are not signed; publish checksums if a distribution needs them.

## Updates

The updater is [`tauri-plugin-updater`](https://tauri.app/plugin/updater/) with minisign
verification. The public key lives in `plugins.updater.pubkey` in `tauri.conf.json`; the private key
is **never** committed. Generate a pair once with:

```bash
pnpm tauri signer generate -w .axiom-data/updater/axiom-core.key
```

`.axiom-data/` is gitignored. Store the private key contents in the
`TAURI_SIGNING_PRIVATE_KEY` repository secret (and its password, if any, in
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).

- The endpoint is
  `https://github.com/EngCode/axiom-core/releases/latest/download/latest.json`, so the newest
  **published** (non-draft) release is always the update source.
- `createUpdaterArtifacts` stays `false` in the base config. `tauri.updater.conf.json` turns it on
  whenever `TAURI_SIGNING_PRIVATE_KEY` is present, so a local build without the key does not fail.
- Windows uses `installMode: "passive"`: the signed NSIS setup runs over the current installation
  and Axiom Core relaunches afterwards. **No uninstall step is required**, and the database,
  WebView profile, posters and library index stay where they are.
- Linux and macOS use the same plugin and replace the installed app bundle in place.

The UI lives in **Settings → Updates**: it shows the installed version, checks the endpoint,
prints the release notes and installs with a progress bar.

Local update build:

```bash
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .axiom-data/updater/axiom-core.key -Raw
pnpm build:win:update
```

The signed NSIS setup and its `.sig` land under `src-tauri/target/release/bundle/nsis/`. The MSI is
Authenticode-signed too, but it has no updater artifact: on Windows the plugin updates through NSIS
only. `latest.json` is produced by the release workflow (`tauri-action`), not by a plain local
build. Minisign signatures are required by the client; an unsigned artifact is rejected even if it
downloads.

To exercise signing without the WiX step (useful when the MSI cannot build in a restricted
environment):

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .axiom-data/updater/axiom-core.key -Raw
pnpm tauri build --bundles nsis --config src-tauri/tauri.updater.conf.json
```

## Publishing

1. Bump `version` in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Push a tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The **Release** workflow runs the matrix, builds each bundle with `tauri-action` and creates a
   **draft** GitHub Release named `Axiom Core v0.2.0` with every artifact, `.sig` file and
   `latest.json` attached.
4. Review the draft, then publish it. Installed copies pick it up on the next update check.

Running the workflow manually (`workflow_dispatch`) builds and uploads the bundles as workflow
artifacts instead of creating a release, which is useful for smoke tests. Updater artifacts are only
produced when the signing secret is available to the run.

Artifacts also land locally under `src-tauri/target/release/bundle/` after a local build.

## Local builds

```bash
pnpm install
pnpm build:win      # NSIS + MSI on Windows
pnpm build:linux    # deb + AppImage on Linux
pnpm build:mac      # dmg + app on macOS

# Same, plus updater signatures and latest.json (needs TAURI_SIGNING_PRIVATE_KEY):
pnpm build:win:update
pnpm build:linux:update
pnpm build:mac:update
```

The frontend is built first (`tsc --noEmit` + Vite) by Tauri's `beforeBuildCommand`, so a type
error fails the bundle rather than shipping a broken UI.

If the MSI step fails with `light.exe : error LGHT0001 : Access to the path ...Temp\....tmp is
denied` while a normal PowerShell write to `%TEMP%` works, a launcher, sandbox or antivirus is
blocking WiX's child process. Point the build at a workspace temp folder for that run:

```powershell
New-Item -ItemType Directory -Force .axiom-data\tmp | Out-Null
$env:TMP = (Resolve-Path .axiom-data\tmp).Path
$env:TEMP = $env:TMP
pnpm build:win
```

## Requirements

| Platform | Runtime |
| --- | --- |
| Windows 10 1809+ / 11 | WebView2 (the installer embeds the bootstrapper and installs it when missing) |
| macOS 10.15+ | none beyond the OS |
| Linux | WebKitGTK 4.1, GTK 3; the `.deb` declares them |

Only the MSI needs administrator rights. NSIS, the AppImage, the `.dmg` and the auto-updater
install per user, so no `sudo`/UAC prompt appears. On Linux, installing the `.deb` needs root
(`sudo apt install ./axiom-core_*.deb`), while the AppImage does not.

## First run

The installer bundles a checkpointed workspace seed (`seed/axiom.db`). On first launch the Rust
shell copies it to the app data folder when no database exists, so a fresh install starts with the
current projects, tasks, documents, milestones, checklists and task links instead of a blank
workspace.

Existing databases are never overwritten, including by an in-place update. Uninstalling keeps app
data unless it is removed by hand.

Data lives at:

| Platform | Database |
| --- | --- |
| Windows | `%APPDATA%\com.axiom.core\axiom.db` |
| macOS | `~/Library/Application Support/com.axiom.core/axiom.db` |
| Linux | `~/.local/share/com.axiom.core/axiom.db` |

The WebView profile sits alongside it. Library rebuild backups go to `backups/` in the same folder.

## Installing

- **Windows** — run the NSIS setup for a per-user install, or the MSI for a machine-wide one.
  WebView2 is the only runtime dependency and ships with Windows 11.
- **Linux** — install the `.deb` with your package manager, or mark the AppImage executable and run
  it. WebKitGTK 4.1 and GTK 3 are required.
- **macOS** — open the `.dmg` and drag Axiom Core to Applications.

Signed builds show the publisher name in the SmartScreen prompt. Unsigned local builds still show
“Windows protected your PC” → **More info → Run anyway**.

## If the Windows setup reports a temporary-file error

`Error writing temporary file. Make sure your temp folder is valid.` comes from the NSIS stub before
it installs anything: the setup unpacks its payload into `%TEMP%`, and that write failed. Common
causes are an antivirus/Controlled Folder Access block, a `TEMP`/`TMP` pointing at a missing or
read-only folder, a full system drive, or a `TEMP` inside a synced OneDrive folder.

Run the doctor:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1 -Fix
powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1 -InstallerPath '.\Axiom Core_0.2.0_x64-setup.exe' -Fix
```

It checks `%TEMP%`/`%TMP` (user and machine), disk space, Controlled Folder Access and the
installer's Authenticode signature. `-Fix` rewrites the per-user `TEMP`/`TMP` to
`%LOCALAPPDATA%\Temp` and unblocks the installer; sign out and back in so new processes inherit it.

Other workarounds, in order:

1. Use the `.msi` — it does not extract a stub to `TEMP`.
2. Move the installer out of OneDrive/a synced folder and run it from **File Explorer**.
3. Re-download it; a truncated download reports the same message.
4. Allow Axiom Core in your antivirus, or turn Controlled Folder Access off for the install.
5. Reboot and install before opening apps that lock `TEMP`.

## Test checklist

1. Install 0.1.x (or the previous build) on a machine with existing Axiom Core data.
2. Install 0.2.0 over it. The database, notes, ratings, posters and library index are unchanged and
   the app opens without an uninstall step.
3. **Settings → Updates** shows the installed version and reports “up to date” when the release
   matches.
4. Install 0.2.0, publish a 0.2.1 draft with a signed artifact, mark it published, then use
   **Check for updates → Install**. The download verifies, the app relaunches, and the version
   changes with data intact.
5. Open **Library → Categories**, rename/reorder/hide a category, edit one title's status, rating,
   notes and category, and confirm they survive a rebuild dry run.
6. Open **Library → Roots**, add a folder and run a rebuild dry run.
7. Uninstall; confirm app data remains in the platform data folder.
