# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Local Development (no Docker)

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend concurrently
npm run dev

# Start individually
npm run dev:frontend   # React on http://localhost:3000
npm run dev:backend    # Express on http://localhost:3001

# Build frontend for production
npm run build
```

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run a single test file
npx jest tests/utils/queryBuilder.test.js

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Tests live in `backend/tests/utils/` and match the util files in `backend/src/utils/`. Jest config at `backend/jest.config.js` — only `src/utils/**/*.js` is covered.

### Docker

```bash
# Start database only
docker-compose up -d postgres

# Initialize schema (run once)
docker-compose --profile setup run --rm backend-setup

# Full app stack
docker-compose up backend frontend

# ETL: initial data load
docker-compose --profile etl run --rm etl python nba_pipeline.py setup
docker-compose --profile etl run --rm etl python nba_pipeline.py load 2025-01-15

# Monitoring stack (Prometheus + Grafana on port 3003)
docker-compose --profile monitoring up
```

### Database

```bash
# From backend/ — run schema setup manually (needs DB running)
cd backend && npm run setup-db

# Apply migrations
npm run migrate
```

## Validation After Every Code Change

Run these two commands after any change before considering work done:

```bash
# 1. Frontend compile check — catches bad imports, JSX syntax errors, missing exports
cd frontend && npm run build

# 2. Backend unit tests — 372 tests covering query builders, filters, metadata, organizers
cd backend && npm test
```

Both must pass cleanly. The frontend build is the only reliable frontend check — `src/App.test.js` is stale CRA boilerplate that has always failed and should be ignored.

**What each check covers:**

| Check | Catches |
|---|---|
| `frontend/npm run build` | Bad imports, broken JSX, missing component props, dead re-exports |
| `backend/npm test` | Query builder logic, filter validation, SQL generation, organizer subqueries, metadata contracts |

**What these checks do NOT cover:** end-to-end flows that require a running database. If you change a controller, a route handler, or any SQL query, manually verify the affected API endpoint with the app running (`docker-compose up backend frontend`).

## Architecture

### Overview

Three-tier full-stack app: Python ETL pipeline → PostgreSQL → Node/Express API → React SPA.

```
data-pipeline/   Python ETL: extracts NBA data from nba_api → PostgreSQL
backend/         Express REST API with JWT auth
frontend/        React SPA with custom report builder UI
database/        SQL init scripts (mounted into Postgres container)
infrastructure/  Terraform config for cloud deployment
```

### Data Pipeline (`data-pipeline/`)

`nba_pipeline.py` is the orchestrator. It wires together:
- `initialize_teams.py` / `initialize_active_players.py` — seed reference data
- `extractors/traditionalExtractor.py` — per-game box score stats
- `extractors/advancedExtractor.py` — advanced metrics (TS%, USG%, etc.)
- `extractors/careerExtractor.py` — career totals and season rankings

Data flows into these tables: `games`, `players`, `teams`, `player_game_stats`, `team_game_stats`, `player_career_totals_regular/playoffs`, `player_season_totals_regular/playoffs`, `player_season_rankings_regular/playoffs`.

### Backend (`backend/src/`)

**Entry point:** `server.js` — registers all route groups under `/api/*`.

**Route → Controller mapping:**
| Route file | Controller | Path prefix |
|---|---|---|
| `routes/reports.js` | `reportController.js` | `/api/reports` |
| `routes/career.js` | `careerController.js` | `/api/career` |
| `routes/auth.js` | `authController.js` | `/api/auth` |
| `routes/dashboards.js` | `dashboardController.js` | `/api/dashboards` |
| `routes/saved-reports.js` | `savedReportsController.js` | `/api/saved-reports` |

`/api/reports` uses `optionalAuth` — it works without login but attaches user context if a token is present.

**Query building pipeline** (the core logic, all in `src/utils/`):

1. `metadata.js` — defines `PLAYER_COLUMNS` and `TEAM_COLUMNS`: column name → `{ where, sort, select, type, category }`. This is the single source of truth for what stats exist and how they map to SQL.
2. `filterValidation.js` — classifies filters as traditional vs. advanced using the metadata.
3. `whereClauseBuilder.js` — converts filter objects `{ column, operator, value }` into parameterized SQL WHERE fragments.
4. `organizerBuilder.js` — builds a subquery that constrains which games are included (all games, last N games, game range, home/away, date range). Organizer runs first to define the game set.
5. `unifiedQueryBuilder.js` — fetches both traditional and advanced stats in a single query; returns `queryMetadata` including `recommendedViewType`.
6. `queryBuilder.js` — wraps the above; applies the organizer subquery, averages stats at the correct level, then applies filters on the averaged values (not raw game rows).
7. `sortingUtils.js`, `valueConverter.js` — helpers for ORDER BY and type coercion.

The key invariant: **filters are applied after aggregation**, not at the raw game row level. This is why the organizer subquery runs inside a CTE before AVG/COUNT.

### Frontend (`frontend/src/`)

**Routing** (in `App.js`):
- `/` — SmartRedirect: sends authenticated users to `/dashboard`, others to landing page
- `/reports` — `CustomReportsBuilder` (no auth required)
- `/dashboard` and `/dashboard/:dashboardId` — `CustomReportsBuilder` wrapped in `ProtectedRoute`
- `/login`, `/signup` — public auth pages

**Auth context** (`contexts/AuthContext.js`) — wraps the app with JWT state; exposes `user`, `loading`, `initialized`, and `authService`.

**`CustomReportsBuilder.jsx`** is the main UI component. State is split into:
- `reportState` — measure, filters, organizer, sortConfig, viewType
- `dataCache` — raw/formatted results, last fetch config, stale flag
- `uiState` — loading, connection status, error, teams list
- `saveState` — save modal and dashboard persistence

**`components/utils/` helpers:**
- `viewDetection.js` — decides traditional/advanced/custom view based on filter types and API `recommendedViewType`
- `dataFormatting.js` — formats unified API response for display, handles sorting
- `columnManager.js`, `filterOptions.js`, `reportUtils.js` — UI metadata for available columns and filter operators

**Services:** `services/api.js` wraps all report/auth/dashboard API calls; `services/careerApi.js` handles career stat endpoints.

### Key Design Decisions

- **View types** (traditional / advanced / custom): determined dynamically. The backend's `unifiedQueryBuilder` recommends a view type in `queryMetadata`; the frontend's `viewDetection.js` uses this or falls back to filter analysis.
- **Organizers** define the game window before any stat aggregation happens. Adding a new organizer type means adding a case in `organizerBuilder.js` and a UI control in `OrganizerSection.jsx`.
- **Column metadata in `metadata.js`** is the contract between UI and SQL. Adding a new stat requires an entry there with `where`, `sort`, `select`, and `type`.
