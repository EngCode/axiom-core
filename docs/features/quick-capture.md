# Quick capture

**Status:** shipped (minimal) · **Shortcut:** `Ctrl+Alt+Space` · **Desktop only** ·
**Sources:** [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs),
[`src/pages/quick-capture.tsx`](../../src/pages/quick-capture.tsx)

A frameless one-line window for getting a task out of your head without opening Axiom Core.

## How it works

1. The Rust shell registers `Ctrl+Alt+Space` as a **global** shortcut at startup. If another app
   already owns it, the registration error is logged and the tray keeps working.
2. The shortcut calls `toggle_capture_window`:
   - if the window exists, it is closed;
   - otherwise a window labelled `capture` is created: 560×152, no decorations, always on top,
     hidden from the taskbar, not resizable, centred.
3. `src/main.tsx` sees the window label `capture` and renders `QuickCaptureApp` instead of the
   router. In a plain browser, `?capture=1` does the same for development.
4. The input is focused on mount. `Enter` adds a task and closes; `Esc` closes; losing focus after
   a 450 ms grace period also closes, so it behaves like a command popup.
5. The window is **destroyed**, not hidden. Reopening is a fresh, fast create.

## What gets created

| Field | Value |
| --- | --- |
| Title | trimmed input |
| Status | `todo` |
| Due date | today |
| Priority | none (default) |
| Project | none |

The task is written through the same store as the main window, so it lands in SQLite after the
usual 400 ms debounce.

## Cross-window behaviour

Both windows share the WebView2 origin. The main window listens for `storage` events and adopts
the new state, so a task captured while the app is open appears in Focus without a refresh.

## Using it without the shortcut

The tray menu exposes **Quick capture** with the same toggle behaviour, and **Open Axiom Core** for the
main window. If the app is started with `AXIOM_START_HIDDEN=1`, only the tray is available until
one of these actions.

## Known gaps

- No project, priority, due-date or note capture — it is deliberately one line.
- No confirmation feedback inside the window; it closes after 220 ms.
- No settings UI for changing or disabling the shortcut.
- The shortcut path itself has not been exercised by automation in this environment (Windows
  blocks synthetic input into the app); the window and tray paths were verified.
- The window is created fresh each time; cold start is tens to a few hundred milliseconds.
