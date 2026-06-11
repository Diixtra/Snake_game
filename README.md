# Neon Serpent 🐍 — Snake, rebuilt for the cloud

The original pygame snake (now in [`legacy/`](legacy/)) reborn as a
TypeScript + HTML5 Canvas game, containerized and ready to run **warm** on the
[Diixtra forge](https://github.com/Diixtra/diixtra-forge) via a Crossplane
`WarmWebApp` claim.

## Play

Arrows / WASD to move · `P` pause · `M` mute · `R` restart.

## Features

**Everything the original had** — red/blue/green/gold foods with speed boost,
double points, and invincibility (walls become wrap-around while it lasts) —
plus:

- ✨ **Neon glow rendering** — gradient snake with eyes, pulsing food, animated
  grid, rainbow shimmer while invincible
- 💥 **Juice** — particle bursts, floating score popups, screen shake,
  synthesized WebAudio sound (no asset files)
- 🔥 **Combo streaks** — eat again within ~4 seconds to stack up to a ×5
  multiplier; the eat sound pitches up with your streak
- ⭐ **Bonus stars** — rare spinning stars worth 50 × combo, gone in 8 seconds
- 🧠 **Code-to-continue** — see below

## Die? Solve code to live.

When you crash, you get **one coding problem** and a timer. Solve it and you
respawn (at half length — continues aren't free). Fail, and the run ends.

- Difficulty scales with how big your snake was when it died:

  | Tier | Snake length | Timer |
  |---|---|---|
  | ROOKIE | < 8 | 30s |
  | CODER | 8–13 | 40s |
  | HACKER | 14–21 | 50s |
  | ARCHITECT | 22+ | 60s |

- Each tier has its own pool of problems (JavaScript, Python, and CS theory),
  drawn shuffle-bag style so you **never see the same problem twice** until a
  pool is exhausted.
- Answers are normalized (case, whitespace, brackets), so `[2, 4, 6]` and
  `2,4,6` both count.
- You can earn unlimited continues — if you can keep answering.

## Develop

```bash
cd web
npm install
npm run dev        # http://localhost:8000 with rebuild-on-save
npm run typecheck
npm run build      # bundle into web/dist/
```

## Run the container

```bash
docker build -t snake-game .
docker run -p 8080:8080 snake-game
# open http://localhost:8080  (health: /healthz)
```

Non-root nginx-alpine serving the static bundle; CI
(`.github/workflows/build-image.yaml`) publishes
`ghcr.io/jameskazie/snake-game` on pushes to `main`.

## Deploy to the cloud (Diixtra forge, warm, Crossplane)

See [`deploy/README.md`](deploy/README.md). Short version: a
`WarmWebApp` XRD/Composition (in the forge's `diixtra.io/v1alpha1` style)
composes the Deployment, Service, Traefik IngressRoute, and a KEDA scaler with
a **warm replica floor** — the game can scale up under load but never scales
to zero, so it always loads instantly:

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

A plain kustomize variant matching the forge's `apps/base` + `apps/homelab`
layout is included as a fallback.
