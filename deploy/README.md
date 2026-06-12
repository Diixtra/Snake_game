# Deploying to the Diixtra forge (warm, via Crossplane)

The forge already ships the XRDs we need (in
`infrastructure/base/crossplane-compositions/`), so deploying is just
committing one of the two resources below into the forge's GitOps tree —
Flux reconciles it and Crossplane does the rest. No CI workflow lives in this
repo: Cloudflare Pages builds straight from git, and Cloud Run images come
from the forge's existing build pipeline.

## Option A — Cloudflare Pages (`cloudflare-pages.yaml`) — RECOMMENDED

Uses the existing `XCloudflarePages` composition. The game is fully static
(works on desktop and mobile), so Pages is the best fit — it builds from the
repo on every push to `productionBranch`
(`cd web && npm ci && npm run build` → `web/dist`) and serves from the edge:
always-warm by nature, no idle-instance cost, lowest latency everywhere.

The composition expects the GitHub repo under the **Diixtra org**; mirror or
provision it there first (the forge's XRepository / Port "Create Repository"
action handles that).

### Step-by-step checklist

1. **Move this repo**: transfer to the Diixtra org (Settings → Danger Zone →
   Transfer), ideally renamed `snake-game` to match `githubRepo` below. Make
   sure the game code is merged to `main` — Pages builds `productionBranch`.
2. **Cloudflare access**: Diixtra org → Settings → GitHub Apps → "Cloudflare
   Workers and Pages" → grant repository access to the new repo.
3. **In a diixtra-forge branch**: find an existing app to copy conventions
   from (`grep -rl "kind: XCloudflarePages" apps/ clusters/`), then create
   `apps/base/snake-game/` containing `cloudflare-pages.yaml` (this file,
   with real `domain` and `metadata.namespace` values) plus a
   `kustomization.yaml` listing it.
4. **Register it**: add `- snake-game` to `apps/base/kustomization.yaml`,
   and mirror whatever the neighbour app does in the `apps/homelab/` overlay.
5. **PR → merge**, then `flux reconcile kustomization apps --with-source`.
6. **Verify**: `kubectl get xcloudflarepages -A` goes Ready/Synced
   (`crossplane beta trace xcloudflarepages snake-game` if not); first build
   appears under Workers & Pages in the Cloudflare dashboard (push a commit
   to `main` if none ran); then open the URL — and thumb-test the swipe
   controls on a phone.

Gotchas: `githubRepo` must match the repo name character-for-character, and
hostnames derive from `domain` + `subdomain`/`wwwSubdomain` — check a working
app's values if the resulting hostname surprises you.

## Option B — Cloud Run, warm (`cloud-run-app.yaml`)

Keep this in the back pocket for when the game grows a backend (leaderboard,
server-validated quiz answers, multiplayer). Uses the existing `XCloudRunApp`
composition; **warm** here means `minInstances: 1` — Cloud Run keeps one
instance hot at all times (wired by the composition to
`template.scaling.min_instance_count`), so no cold starts, while
`maxInstances` still allows scale-out under load.

The image is the `Dockerfile` in this repo: non-root nginx-alpine serving the
static bundle on port 8080 with a `/healthz` endpoint.

## Before merging into the forge

- Adjust `domain` / `apiSubdomain` (currently `snake.diixtra.com`) and
  `region` to taste.
- Adjust `metadata.namespace` to match the forge's app namespace convention.
- For Cloud Run, pin `imageTag` to a real tag if you want Renovate-managed
  bumps instead of `latest`.
