# Backup and restore

**Route:** User → Backup & restore · **Format:** folder bundle

A backup is a folder containing:

- `axiom.db` — workspace, tasks, notes, documents, milestones, library and settings,
- `covers/` — poster files chosen in the Library,
- `attachments/` — files attached to tasks.

## Export

1. Open **User**.
2. Choose **Export backup**.
3. Pick a parent folder.
4. Axiom writes `Axiom Backup <date> <time>/` there.

The database is captured with `VACUUM INTO`, so it is a consistent copy even while the app is
running.

## Import

1. Choose **Import backup** and select the folder that contains `axiom.db`.
2. Axiom validates the SQLite integrity check and required tables.
3. The backup is staged as `axiom.db.import`, `covers.import`, `attachments.import`.
4. Restart Axiom Core.
5. On startup the current database is copied to `axiom.db.pre-import-<timestamp>` and the staged
   backup is applied. The previous covers/attachments folders are parked as `*.pre-import`.

Nothing is overwritten until the staged backup passes validation. A failed import leaves the live
workspace untouched.

## Moving machines

Copy the backup folder to the new machine, install Axiom Core, import the folder, and restart.
The installer seeding only runs when no live database exists; an existing workspace is never
replaced by the installer.
