# Team-Meisterschaft Iseltwald — Voting

Einfache Publikums-Voting-App für die Team-Meisterschaft. Besucher stimmen für
eines von 13 Teams ab; ein Admin steuert die Abstimmung und sieht Live-Ergebnisse.

- **Stack:** Nuxt 4 (Vue 3), Tailwind CSS 4 (`@nuxtjs/tailwindcss` v7), Vercel
- **Storage:** Vercel KV / Upstash Redis (`@upstash/redis`) — nur serverseitig
- Öffentliche Seite `/`, Admin-Panel `/admin` (Basic Auth)

## Setup

```bash
pnpm install
```

Umgebungsvariablen anlegen (siehe `.env.example`):

```bash
cp .env.example .env
```

| Variable                        | Zweck                                              |
|---------------------------------|----------------------------------------------------|
| `ADMIN_USER` / `ADMIN_PW`       | Basic Auth für `/admin` und `/api/admin/*`         |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV / Upstash Redis REST-Credentials |

**Lokal ohne KV:** Fehlen die `KV_REST_API_*`-Variablen, nutzt der Server einen
In-Memory-Store (nicht persistent, nur für die Entwicklung). Ohne `ADMIN_USER`/
`ADMIN_PW` ist das Admin-Panel im Dev-Modus offen, in Production gesperrt.

## Development

```bash
pnpm dev   # http://localhost:3000
```

## Deployment (Vercel)

1. Repo mit Vercel verbinden — das Nuxt-Preset wird automatisch erkannt.
2. **Vercel KV / Upstash** als Integration hinzufügen. Die `KV_REST_API_*`-Env-Vars
   werden dabei automatisch gesetzt.
3. `ADMIN_USER` und `ADMIN_PW` in den Vercel-Projekteinstellungen setzen.
4. Deployen. HTTPS (und damit verschlüsselte Basic-Auth-Credentials) liefert Vercel
   automatisch.

> **Vor dem Event:** Preview- und Production-Deploys teilen sich per Default
> dieselbe KV-Instanz. Einmal im Admin-Panel **„Alle Zähler auf 0"** ausführen,
> damit Testklicks nicht mitgezählt werden.

## Bedienung (Admin)

Status-Ablauf: **Vor Start** → **Starten** (offen) → **Beenden** → **Veröffentlichen**.
Besucher sehen die Stimmenzahlen erst nach dem Veröffentlichen. Im Admin-Panel gibt
es zusätzlich Einzel-Overrides pro Team und einen Reset — alle Aktionen mit
Bestätigungs-Dialog.

## Architektur

- `shared/teams.ts` — zentrale Definition der 13 Teams (Name, Farbe) + Poll-Status.
- `server/utils/kv.ts` — KV-Zugriff (atomare `incr`/`decr`), Memory-Fallback.
- `server/api/*` — `vote`, `results`, `admin/{status,reset,set}`.
- `server/middleware/admin-auth.ts` — Basic Auth für Admin-Bereich.
- `app/pages/index.vue` / `app/pages/admin.vue`, `app/components/ResultBars.vue`.
