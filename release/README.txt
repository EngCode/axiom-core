Axiom Core 0.1.0 - test artifacts

1) Axiom Core_0.1.0_x64-setup.exe
   Per-user NSIS installer. Double-click it from File Explorer.
   Do not run it from inside the DSH harness or a terminal wrapper: NSIS needs a normal
   TEMP folder and permission to write %LOCALAPPDATA%\Axiom Core.

2) Axiom Core 0.1.0 portable.zip
   No-install fallback. Extract the whole archive, then run "Start Axiom Core.cmd".
   The workspace stays in data\ next to the app; the WebView2 profile in webview-data\.

3) Axiom Core_0.1.0_x64_en-US.msi
   All-users MSI. Requires elevation. Use this if NSIS is blocked by policy.

The test build is unsigned. SmartScreen may ask for More info -> Run anyway.
On first launch the app copies its bundled seed, so projects, tasks, docs and milestones are ready.
