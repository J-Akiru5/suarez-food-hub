# CI/CD Pipeline v2 (2026) — Suarez Food Hub

## Key Differences from v1

| Aspect | v1 (dated) | v2 (2026) | Why |
|--------|-----------|-----------|-----|
| Linter | ESLint + Prettier | **Biome** | Single Rust-based tool, 50x faster, handles both lint + format |
| Pre-commit | Manual | **Lefthook** | Go-based hook runner, faster than Husky, less node overhead |
| CI testing | Mock Supabase | **Supabase CLI + pg in CI** | Real integration tests with ephemeral DB |
| Build strategy | Build all apps | **Turbo `--affected`** | Only rebuild changed apps + deps |
| Secret scanning | None | **truffleHog + GitHub secret scanning** | Catch leaked keys before push |
| Docker | Manual | **`pnpm deploy` + Dockerfile** | Production-ready containers |
| PR automation | None | **Biome CI check + auto-labeler** | Consistent code style enforced in CI |
| Dashboard | GitHub only | **Local: `turborepo-UI`** | Visualize task graphs locally |

---

## Tool Stack (2026 Standard)

| Purpose | Tool | Why This |
|---------|------|----------|
| Monorepo | Turborepo v2 | `--affected`, persistent tasks, daemon mode |
| Lint + Format | Biome | Rust-native, single binary, 50x faster than ESLint |
| Pre-commit | Lefthook | Go-native hooks, supports parallel execution |
| Unit/Integration | Vitest v3 | Browser mode, Workspaces support |
| E2E | Playwright v2 | Component tests, UI mode, trace viewer |
| DB in CI | Supabase CLI + pg | Spin up real Postgres in CI for integration tests |
| Secret scanning | truffleHog + GitHub native | Catch secrets before they hit the repo |
| PR labeling | GitHub Labeler Action | Auto-label PRs by changed paths (web/admin/staff/rider) |
| Dead code | Knip | Detect unused exports, files, deps |
| Versioning | Changesets | Monorepo publish management (if needed later) |

---

## Complete File Map

```
.github/
├── workflows/
│   ├── ci.yml                  # Lint → Typecheck → Build → Test → Knip
│   ├── smoke.yml               # Playwright e2e (manual or post-deploy)
│   └── labeler.yml             # Auto-label PRs by changed paths
├── labeler-config.yml          # Path-to-label mapping
│
.e2e/
├── package.json
├── playwright.config.ts
├── fixtures/
│   └── test-users.json
└── tests/
    ├── web/                    # home, menu, login, checkout
    ├── admin/                  # login, dashboard
    ├── staff/                  # login, orders
    └── rider/                  # login, deliveries
│
lefthook.yml                    # Pre-commit: format → lint → typecheck → test (affected)
biome.json                      # Unified lint + format config
knip.json                       # Dead code detection config
.changeset/                     # Version management (if publishing)

supabase/
├── config.toml                 # Supabase CLI local config
└── migrations/                 # Already exists
```

---

## CI Pipeline Flow

```
Push / PR to main
    │
    ├─ 1. Secret scan (truffleHog)
    ├─ 2. Install deps (pnpm --frozen-lockfile)
    ├─ 3. Biome check  (lint + format in one pass)
    ├─ 4. TypeScript check (tsc --noEmit)
    ├─ 5. Build affected (turbo build --affected)
    ├─ 6. Unit + Integration (vitest)
    ├─ 7. Knip (dead code)
    │
    └─ (if main branch) ──► Smoke Tests (Playwright)
                               └─ 4 apps × health checks
```

## Local Dev Experience

```bash
pnpm dev              # Start all 4 apps (already works)
pnpm check            # Biome lint + format + typecheck in one shot
pnpm test             # Vitest unit/integration
pnpm smoke            # Playwright e2e (starts all 4 servers automatically)
pnpm ci               # Full pipeline: check → build → test → knip
```

## Pre-commit (Lefthook)

```yaml
pre-commit:
  parallel: true
  commands:
    format:
      run: pnpm biome check --write {staged_files}
    typecheck:
      run: pnpm turbo typecheck --affected
    test:
      run: pnpm vitest run --changed
    secrets:
      run: trufflehog filesystem {staged_files}
```

## What Stays the Same

- **pnpm** workspaces — already set up, still standard
- **Turborepo** task orchestration — just adding `--affected`
- **Supabase SQL migrations** — already exist, just add Supabase CLI config
- **Next.js** apps — no change to apps themselves

## Migration Effort

| Step | Files Changed | Complexity |
|------|--------------|------------|
| 1. Install Biome | `biome.json` + remove ESLint/Prettier | Low |
| 2. Install Lefthook | `lefthook.yml` | Low |
| 3. Add Supabase CLI config | `supabase/config.toml` | Medium |
| 4. Create CI workflows | 3 files in `.github/` | Medium |
| 5. Create e2e tests | 12 files in `.e2e/` | High (most work) |
| 6. Add Knip | `knip.json` | Low |
| 7. Add Changesets | `.changeset/` | Low (optional) |
| 8. Update turbo.json + scripts | `turbo.json`, root+app `package.json` | Low |
