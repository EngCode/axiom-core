# Local API for AI clients

**Status:** v1 · **Bind:** `127.0.0.1` only · **Default port:** `47615`

Axiom Core can expose its workspace to an external AI client through a small HTTP server. The
server runs inside the desktop app, never on the network, and every request except the health check
needs the workspace token.

## Enable and configure

Open **User → Local API**:

- **Port** — default `47615`. If another program owns it, choose another free port (for example
  `47616`), save, then restart Axiom Core. The app reports the bind error in the same card.
- **Token** — generated on first run. Copy it into the client; treat it like a password.
- **Enabled** — turn the server off without deleting the token.

Settings live in the workspace database (`api.port`, `api.token`, `api.enabled`). Changing the port
takes effect after the next app start; the token takes effect after restart as well.

## Connect

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:47615/v1/snapshot
```

An AI tool can use any HTTP client with a custom header:

```json
{
  "baseUrl": "http://127.0.0.1:47615",
  "headers": { "Authorization": "Bearer <token>" }
}
```

`GET /v1/health` is the only unauthenticated route, useful as a connection test.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/v1/health` | unauthenticated health and version |
| GET | `/v1/version` | API and app version |
| GET | `/v1/snapshot` | full workspace snapshot |
| GET | `/v1/projects` | projects |
| GET | `/v1/projects/{id}` | project plus its tasks |
| GET | `/v1/issues?project=&status=` | filtered tasks |
| GET | `/v1/issues/{id-or-key}` | one task |
| PATCH | `/v1/issues/{id}` | partial update |
| POST | `/v1/issues` | create a task |
| GET | `/v1/openapi.json` | machine-readable route list |

Task fields use camelCase; statuses are `backlog`, `todo`, `in_progress`, `done`; priorities are
`urgent`, `high`, `medium`, `low`, `none`.

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  http://127.0.0.1:47615/v1/issues/<issue-id>
```

## Agent prompt

A useful instruction for an external agent:

> You are connected to Axiom Core at `http://127.0.0.1:47615`. Send the bearer token on every
> request. Read `/v1/snapshot` before mutating. Update tasks with `PATCH /v1/issues/{id}` and create
> them with `POST /v1/issues`. Never invent task ids or keys.

## Security

- Loopback only.
- Token required on all data routes.
- No CORS credentials; no remote bind.
- The server stops when Axiom Core exits.

## Next

- Per-client tokens and scopes.
- A dedicated `/v1/docs` search endpoint.
- Optional write audit log.
