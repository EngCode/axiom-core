# Documents

**Route:** `/documents` · **Status:** page shell shipped, feature **planned** ·
**Source:** [`src/pages/documents.tsx`](../../src/pages/documents.tsx)

Documents is the long-form counterpart to Notes. The navigation and page exist so the workspace has
the right skeleton; editing, nesting and linking are not implemented yet.

## What exists today

- A route and sidebar entry under the workspace's secondary navigation.
- A page that explains the intended scope and links to the Notes documentation.
- No editor, no storage fields, no actions.

## Intended scope

| Capability | Status |
| --- | --- |
| Long-form page with sections and a table of contents | planned |
| Link documents to projects, issues and library items | planned |
| Nested pages and backlinks | planned |
| Markdown import, PDF export | planned |

## Data model (not started)

Documents will need their own table rather than reusing `notes`, because they carry hierarchy,
blocks and references. The decision is documented here before any schema change.

## Why a separate section from Notes

Notes are quick capture and thinking; Documents are structured, referenced pages that belong to a
project. Merging them would make both worse, so the sidebar treats them as distinct.

## Next step

Agree on the editor and hierarchy model (see the open questions in
[SPEC.md](../resources/SPEC.md)), then add the table, commands and editor.
