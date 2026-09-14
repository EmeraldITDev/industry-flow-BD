# Chairman's View — Backend & History Spec

Status: **implemented in `industry-flow-backend`** (pending deploy/migrate on Render). Frontend calls `GET /api/executive/intelligence` with client-side fallback.

Do not invent exchange-rate conversion. Keep USD and NGN separate, matching `src/lib/executive/analytics.ts`.

---

## A. Current architecture (inspected)

### Frontend (already built)

| Area | Path |
|------|------|
| Page shell | `src/pages/ChairmanViewPage.tsx` |
| Dashboard | `src/pages/ChairmanView.tsx` |
| Analytics engine | `src/lib/executive/analytics.ts` |
| Access gate | `src/lib/executive/access.ts` (`lazarus.angbazo@emeraldcfze.com` + admins) |
| Account groups | `src/lib/executive/accountGroups.ts` (localStorage today) |
| UI panels | `src/components/executive/*` |
| Route | `/executive` in `src/App.tsx` |
| Nav | `"Chairman's View"` in `AppSidebar` when `canViewExecutive` |

### Backend (existing, no executive endpoints yet)

| Area | Path / note |
|------|-------------|
| API base | `VITE_API_URL` → Render Laravel (`src/services/api.ts`) |
| Projects | `app/Http/Controllers/ProjectController.php` — `index`, `stats`, `update`, etc. |
| Model | `app/Models/Project.php` |
| Table | `projects` (`database/migrations/2026_01_30_000001_create_projects_table.php`) |
| Partner field | `channel_partner` (+ `oem` used as fallback in analytics) |
| Value fields | `contract_value_usd`, `contract_value_ngn` |
| Stage / probability | `pipeline_stage`, `deal_probability` |
| Timestamps | `created_at`, `updated_at` only — **no stage/probability history** |
| Existing stats | `GET /api/projects/stats` (basic counts/sums; not executive-grade) |

### Business definitions already coded (must stay consistent)

- **Won / secured:** `pipeline_stage ∈ {approval, execution, closure}` **or** `status = completed`
- **Late-stage:** `proposal`, `negotiation`, `approval`
- **Funnel stages:** Initiation → Qualification → Proposal → Negotiation → Execution
- **Stagnation:** late-stage, no update for **45 days**
- **Closing soon:** expected close within **45 days**
- **Partner driver:** `channel_partner`, else `oem`

---

## B. Data availability

### Already available (build now / already built on FE)

- Active counts, USD/NGN pipeline, stage counts, probability bands
- Won / execution metrics (using current stage as proxy for “won date” ≈ `updated_at`)
- Near-conversion prioritisation from stage + probability + value + close date + recency
- Client / partner / vertical / sector / product rankings from project fields
- Strategic account grouping by client-name alias matching (FE config)
- Alerts for overdue, stagnant, high-value low-probability, concentration (snapshot)
- Period filters using `created_at` / `updated_at`

### Partially available

| Need | Gap |
|------|-----|
| Period-over-period stage movement (“4 entered Negotiation”) | No prior stage snapshots — only current stage |
| True win date | No `won_at`; using `updated_at` when currently in a won stage |
| Product many-to-many | Schema still string `product` / `sub_product`; FE splits value when multiple labels appear — confirm actual storage shape before server aggregation |
| Strategic account groups | FE localStorage only — not shared across devices/admins |
| Custom date range | Analytics accepts `custom`; UI presets only |

### Missing (requires DB + write-path changes)

| Need | Requirement |
|------|-------------|
| Stage change history | Append-only log when `pipeline_stage` changes |
| Probability change history | Append-only log when `deal_probability` changes |
| Optional value change history | Useful for “significant value added”; not mandatory for v1 |
| Authoritative account groups | Table + CRUD if groups must be org-wide |
| Dedicated executive API auth | Mirror FE allowlist + admin on the server |

---

## C. Proposed database changes (minimum)

### 1. `project_commercial_events` (recommended)

Single append-only history table for commercially meaningful field changes.

```php
Schema::create('project_commercial_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
    $table->string('event_type', 64);
    // stage_changed | probability_changed | won | lost | created
    $table->string('field_name', 64)->nullable();
    $table->string('old_value')->nullable();
    $table->string('new_value')->nullable();
    $table->unsignedBigInteger('actor_user_id')->nullable();
    $table->timestamp('occurred_at')->useCurrent();
    $table->timestamps();

    $table->index(['occurred_at']);
    $table->index(['project_id', 'event_type']);
    $table->index(['event_type', 'occurred_at']);
});
```

**Write hooks**

- On `Project` create → `event_type = created`, `new_value = pipeline_stage`
- On `pipeline_stage` change → `stage_changed` (+ if new stage ∈ won set and old was not → also `won`)
- On `deal_probability` change → `probability_changed`
- Prefer one write site: `ProjectController@update` and any dedicated stage endpoint (`PATCH .../stage` if present)

Do **not** log trivial description edits.

### 2. Optional: `won_at` on `projects`

```php
$table->timestamp('won_at')->nullable()->after('pipeline_stage');
```

Set when first entering `approval|execution|closure` (or when `status` becomes `completed`). Improves YTD/QTD/MTD win counts without scanning history.

### 3. Optional: `executive_account_groups`

Only if localStorage is unacceptable for production.

```php
// executive_account_groups: id, name, sort_order, is_active, timestamps
// executive_account_group_aliases: id, group_id, alias (unique), entity_label nullable
```

Match clients with case-insensitive substring, same as `matchAccountGroup` today.

---

## D. Proposed API endpoints

Follow existing `/api/...` Laravel style used by `projects`, `team`, `auth`. Gate every executive route: authenticated **and** (`email ∈ EXECUTIVE_EMAILS` **or** admin role). Return `403` otherwise.

Query param shared by all analytics endpoints:

| Param | Values |
|-------|--------|
| `period` | `snapshot` \| `last7` \| `last14` \| `month` \| `prevMonth` \| `quarter` \| `ytd` \| `custom` |
| `from`, `to` | ISO dates when `period=custom` |

Suggested surface (group into one controller if preferred):

### `GET /api/executive/overview`

Returns the payload shape consumed by the commercial position strip + summary:

- `totals` (active, pipelineUsd/Ngn, won, proposal, negotiation, lateStage, high/medium/low, newInPeriod, deltas vs previous window)
- `summary` (rule-based strings — port logic from `buildExecutiveIntelligence`, do not invent claims)
- `window` metadata

### `GET /api/executive/pipeline`

- Per-funnel-stage: count, %, usd, ngn, avg probability, period change (change requires history)
- `health.verdict` + `health.narrative` (same rules as FE)

### `GET /api/executive/conversion`

- wonYear / wonQuarter / wonMonth, usd/ngn, averages, inExecution
- byMonth trend, recentWins, byClient / Sector / Vertical / Product / Partner

Prefer `won_at` or `project_commercial_events` where `event_type = won`; fall back to current FE heuristic only until history exists.

### `GET /api/executive/alerts`

- Structured alert groups (atRisk, stagnant, overdue, concentration, mismatches) with project id lists for drill-down

### `GET /api/executive/accounts`

- Strategic account snapshots (configured groups + auto-surfaced top clients)
- Optional nested `?group=dangote` detail

### `GET /api/executive/drivers`

- Ranked clients, partners, verticals, sectors, products, subproducts
- **Currency integrity:** never sum USD+NGN
- **Product multi-label:** if a project lists multiple products, either (a) attribute full value once under a primary product for totals, or (b) split value evenly for category views only — document which; FE currently avoids inflating global totals

### `GET /api/executive/movement`

- created / updated / won / overdue in window (available now)
- **After history:** stageTransitions (`from` → `to` counts and opportunity ids), probabilityChanges for high-value deals

### `GET /api/executive/opportunities`

Paginated drill-down:

- `filter` = `nearConversion` \| `attention` \| `largest` \| `won` \| `stage:{name}` \| `client:{name}` \| `accountGroup:{id}` …
- `page`, `per_page` (default 25)

Do **not** return the full project list for overview metrics.

### Account groups CRUD (if DB-backed)

- `GET/PUT /api/executive/account-groups`

---

## E. Aggregation / performance rules (Render)

1. Aggregate in SQL (`GROUP BY pipeline_stage`, `SUM(contract_value_usd)`, etc.).
2. Avoid N+1; no `with('tasks')` on executive overview.
3. Cache overview/pipeline responses briefly (e.g. 60–120s) keyed by `period` + user role if load warrants it.
4. Paginate opportunity lists.
5. Indexes already on `pipeline_stage`, `deal_probability`, `created_at`; add indexes used by alerts (`expected_close_date`, `updated_at`) if missing.
6. Keep FE `buildExecutiveIntelligence` as a temporary fallback until endpoints land; then replace `ChairmanView` data source with React Query against `/api/executive/*`.

---

## F. Auth alignment

Mirror `src/lib/executive/access.ts` on the backend (config/env list + admin). Do not rely on “hide the menu” alone — the route is already client-gated, but API must enforce the same rules once aggregations move server-side.

---

## G. Implementation sequence (recommended)

1. ~~Wire `/executive` + sidebar~~ **done**
2. Ship FE as-is (client aggregations) for Chairman UAT
3. Add `project_commercial_events` + write hooks on stage/probability updates
4. Optionally backfill `won_at` for current won-stage projects (`won_at = updated_at` with a clear note that it is approximate)
5. Implement `/api/executive/overview` + `/pipeline` + `/conversion` first
6. Add `/movement` stage transitions once events accumulate (do not fabricate past transitions)
7. Migrate account groups to DB if multi-device consistency is required
8. Point `ChairmanView` at the new endpoints and slim client analytics to presentation-only

---

## H. Explicit non-goals for v1 history

- Do not reconstruct “what stage was this deal in two weeks ago” from `updated_at` alone
- Do not hard-code FX rates to produce a single reporting currency
- Do not log every field change — only commercial events listed above
