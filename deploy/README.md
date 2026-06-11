# Deploying to the Diixtra forge (warm, via Crossplane)

Everything in this directory is designed to drop into the
[Diixtra/diixtra-forge](https://github.com/Diixtra/diixtra-forge) GitOps repo,
where Flux reconciles claims and Crossplane providers do the rest.

## What "warm" means here

The forge's default for user workloads is KEDA scale-to-zero (idle apps sleep
and wake on request, with a cold start of up to ~60s). A **warm** deployment
inverts that: a `warmReplicas` floor (≥ 1) is always running, so the game loads
instantly, while KEDA can still scale it *up* under load — it just never goes
cold.

## Option A — Crossplane claim (recommended)

`crossplane/` contains a self-service XRD in the forge's `diixtra.io/v1alpha1`
group, in the same style as the existing QRBuddy XRDs:

| File | What it is | Where it goes in the forge |
|---|---|---|
| `xrd-warmwebapp.yaml` | `WarmWebApp` claim type | alongside the other XRDs registered by the `infrastructure-crossplane` Flux Kustomization |
| `composition-warmwebapp.yaml` | composes Deployment + Service + Traefik IngressRoute + KEDA `HTTPScaledObject` (min = `warmReplicas`) via provider-kubernetes | same place |
| `claim-snake-game.yaml` | the snake game's claim | `apps/base/snake-game/` |

Prerequisites already present on the forge: Crossplane, `provider-kubernetes`
(with an `in-cluster` ProviderConfig), `function-patch-and-transform`, Traefik,
and the KEDA HTTP add-on.

Once the XRD/Composition are reconciled, deploying the game (or any future
warm app) is a single claim:

```yaml
apiVersion: diixtra.io/v1alpha1
kind: WarmWebApp
metadata:
  name: snake-game
  namespace: apps
spec:
  image: ghcr.io/jameskazie/snake-game:latest
  host: snake.diixtra.com
  warmReplicas: 1
```

## Option B — plain kustomize app

If you'd rather not introduce a new XRD yet, `apps/` mirrors the forge's
three-layer app layout (`apps/base/snake-game` + `apps/homelab/snake-game`
overlay). Copy both directories into the forge's `apps/` tree, add
`snake-game` to `apps/base/kustomization.yaml`, and Flux picks it up via
`clusters/homelab/apps.yaml`. The `diixtra.io/warm: "true"` label plus the
absence of an `HTTPScaledObject` keeps it always-on.

## The image

The GitHub Actions workflow in `.github/workflows/build-image.yaml` typechecks,
builds, and publishes `ghcr.io/jameskazie/snake-game:latest` (plus a
commit-SHA tag) on every push to `main`. The image is nginx-alpine serving the
static bundle as a non-root user on port 8080, with a `/healthz` endpoint used
by the probes. Pin the SHA tag in the claim if you want Renovate to manage
bumps the same way the forge handles other images.

## Adjustments before merging into the forge

- Change `host` (`snake.diixtra.com`) to whatever zone you actually route.
- If the apps namespace differs from `apps`, update the claim/overlay.
- The composition writes the Traefik match rule back to `status.url` so
  `kubectl get warmwebapp` shows where the game lives.
