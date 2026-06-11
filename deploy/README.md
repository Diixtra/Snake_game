# Deploying to the Diixtra forge (warm, via Crossplane)

The forge already ships the XRDs we need (in
`infrastructure/base/crossplane-compositions/`), so deploying is just
committing one of the two resources below into the forge's GitOps tree —
Flux reconciles it and Crossplane does the rest. No CI workflow lives in this
repo: Cloudflare Pages builds straight from git, and Cloud Run images come
from the forge's existing build pipeline.

## Option A — Cloud Run, warm (`cloud-run-app.yaml`)

Uses the existing `XCloudRunApp` composition. **Warm** here means
`minInstances: 1`: Cloud Run keeps one instance hot at all times, so the game
loads instantly with no cold start, while `maxInstances` still allows
scale-out under load.

The image is the `Dockerfile` in this repo: non-root nginx-alpine serving the
static bundle on port 8080 with a `/healthz` endpoint.

## Option B — Cloudflare Pages (`cloudflare-pages.yaml`)

Uses the existing `XCloudflarePages` composition. The game is fully static,
so Pages is the cheapest fit — it builds from the repo on every push to
`productionBranch` (`cd web && npm ci && npm run build` → `web/dist`) and
serves from the edge, which is always-warm by nature.

The composition expects the GitHub repo under the **Diixtra org**; mirror or
provision it there first (the forge's XRepository / Port "Create Repository"
action handles that).

## Before merging into the forge

- Adjust `domain` / `apiSubdomain` (currently `snake.diixtra.com`) and
  `region` to taste.
- Adjust `metadata.namespace` to match the forge's app namespace convention.
- For Cloud Run, pin `imageTag` to a real tag if you want Renovate-managed
  bumps instead of `latest`.
