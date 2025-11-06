### DealDash (formerly DealStream) — README

#### Project overview
DealDash is a CRM/deal-management app for SMB brokerage with five core screens:
- Deal Pipeline (Kanban by stage; drag to update stage)
- Deal Detail (three panels: deal overview, activity timeline with quick actions, and a toggleable right drawer for Stage Checklist or Buyer Matches)
- Dashboard (KPIs and charts)
- Buying Groups (table of buyer groups with key attributes)
- Buying Group Detail (group profile, contacts, notes, and per-deal stage Kanban)

The frontend is implemented in React + Tailwind with React Router v6 for navigation. The backend is FastAPI with in-memory storage for local development, designed to be easily migrated to Supabase/PostgreSQL for production.

#### Repository structure
- `client/` — React app with React Router v6, UI components, pages, hooks, and query client
- `api/` — FastAPI backend with in-memory storage (local dev) and Supabase integration (production)
- `server/` — Legacy Express server (can be removed)
- `shared/schema.ts` — Drizzle ORM schema and TypeScript types used across client/server
- `Schema.csv` — High-level CSV of intended tables and columns
- `design_guidelines.md` — UI/UX notes
- `main.py` — Combined entry point for Replit deployment
- `requirements.txt` — Python dependencies for FastAPI backend

Key router and navigation (React Router v6):
```14:25:client/src/App.tsx
function Router() {
  return (
    <Routes>
      <Route path="/" element={<DealPipeline />} />
      <Route path="/deals/:id" element={<DealDetails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/buying-parties" element={<BuyingParties />} />
      <Route path="/buying-parties/:id" element={<BuyingPartyDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

```5:13:client/src/components/Navigation.tsx
export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Deal Pipeline", icon: GitBranch },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/buying-parties", label: "Buying Parties", icon: Users },
  ];
```

### Frontend features

#### Deal Pipeline
- Columns represent stages: onboarding, valuation, buyer_matching, due_diligence, sold.
- Each column lists `DealCard`s; drag a card to another column to update its `stage`.
- Filters, add-deal button placeholder, and stage counts.

Data flow:
```1:35:client/src/pages/DealPipeline.tsx
const { data: deals = [], isLoading } = useQuery<Deal[]>({
  queryKey: ["/api/deals"],
});

const updateStageMutation = useMutation({
  mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
    return await apiRequest("PATCH", `/api/deals/${dealId}`, { stage });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
  },
});
```

Card UI:
```26:52:client/src/components/DealCard.tsx
export function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onClick(deal.id)}
      data-testid={`card-deal-${deal.id}`}
      className="bg-card border border-card-border rounded-md p-4 cursor-pointer hover-elevate active-elevate-2 transition-shadow"
    >
      ...
      <div className="text-2xl font-mono font-semibold text-chart-2" data-testid={`text-revenue-${deal.id}`}>
        ${parseFloat(deal.revenue).toLocaleString()} ARR
      </div>
      ...
    </div>
  );
}
```

#### Deal Detail (highly detailed)
The Deal Detail route `/deals/:id` renders a HubSpot-style view with:
- Sticky header: Back to Pipeline, Deal Title, Stage Badge, Owner, Tools menu.
- Command bar: Schedule, Send for Signature, Add Doc, Create Invoice, Update Stage, and quick toggle buttons for Stage Checklist / Buying Parties drawer.
- Three-column layout:
  - Left: Deal Snapshot (Revenue, SDE, Valuation, Multiples, Commission, Age in Stage, Health score), Description, Notes (autosave), Seller Contacts, Key Documents (pinned and recent).
  - Middle: Activity Timeline with type filters and quick-add presets (email, meeting, request docs, send CIM/NDA, buyer outreach, note).
  - Right: Drawer toggles between Stage Checklist and Buyer Matches. For matches, each card shows buyer party name, primary contact, target acquisition, budget, match stage pill, an expandable checklist, and email/schedule buttons.

Core data fetching and UI:
```71:113:client/src/pages/DealDetails.tsx
const dealId = params?.id;

const { data: deal } = useQuery<Deal>({ queryKey: [`/api/deals/${dealId}`], enabled: !!dealId, onSuccess: (d) => setNotesDraft(d?.notes ?? "") });

const { data: contacts = [] } = useQuery<Contact[]>({
  queryKey: ["/api/contacts", { entityId: dealId, entityType: "deal" }],
  queryFn: async () => {
    const res = await fetch(`/api/contacts?entityId=${dealId}&entityType=deal`);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: activities = [] } = useQuery<Activity[]>({
  queryKey: ["/api/activities", { entityId: dealId }],
  queryFn: async () => {
    const res = await fetch(`/api/activities?entityId=${dealId}`);
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: documents = [] } = useQuery<Document[]>({
  queryKey: ["/api/documents", { entityId: dealId }],
  queryFn: async () => {
    const res = await fetch(`/api/documents?entityId=${dealId}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: buyerMatches = [] } = useQuery<BuyerMatchRow[]>({
  queryKey: ["/api/deals", dealId, "buyers"],
  enabled: !!dealId,
});
```

Notes autosave and activity presets:
```124:139:client/src/pages/DealDetails.tsx
const saveNotesMutation = useMutation({
  mutationFn: async (notes: string) => {
    const res = await fetch(`/api/deals/${dealId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error("Failed to save notes");
    return res.json();
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
    qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
  }
});
```
Note: `/api/deals/:id/notes` is not in the current Node server; it will be added to the FastAPI backend.

Pinned documents and key documents UI are present, and the drawer integrates `StageChecklistDeal` and `BuyerChecklist`.

The header also attempts to fetch the latest meeting summary:
```114:122:client/src/pages/DealDetails.tsx
const { data: latestSummary } = useQuery<{ summary: string; createdAt: string; source?: string } | null>({
  queryKey: ["/api/meetings/latest-summary", dealId],
  queryFn: async () => {
    const res = await fetch(`/api/meetings/latest-summary?dealId=${dealId}`);
    if (!res.ok) return null as any;
    return res.json();
  },
  enabled: !!dealId,
});
```
Note: `/api/meetings/latest-summary` is not implemented in the current Node server; it will be provided by FastAPI as a stub or real integration.

#### Dashboard
- KPI cards with icons and change indicators, charts scaffold. Data is currently mocked/static within the page.

#### Buying Groups
- Table/list of all `buying_parties` with key info; clicking navigates to detail.

#### Buying Group Detail
- Shows buying group profile, contacts, notes, and a Kanban of matches (uses `MatchesKanban`).

`MatchesKanban` navigates to deal details on card click:
```41:72:client/src/components/match/MatchesKanban.tsx
{(byStage.get(col.key) ?? []).map(({ match, deal }) => (
  <div
    key={match.id}
    className="p-3 border border-border rounded-md hover-elevate cursor-pointer"
    onClick={() => setLocation(`/deals/${deal.id}`)}
  >
```

### Data model

The canonical data model (used by UI and the server) is in `shared/schema.ts`. It includes enums, tables, and zod insert schemas.

- Deal stages: onboarding, valuation, buyer_matching, due_diligence, sold
- Activity types: task, email, meeting, document, system
- Document statuses: draft, sent, signed

### Current API surface (to mirror in FastAPI)
The temporary Node server exposes endpoints we will replicate in FastAPI to keep the UI working:

```6:45:server/routes.ts
// Deals
GET    /api/deals
GET    /api/deals/:id
POST   /api/deals
PATCH  /api/deals/:id
DELETE /api/deals/:id
```

```47:62:server/routes.ts
// Deal-specific buyer matches (composite response for the right drawer)
GET /api/deals/:id/buyers   // returns [{ match, party, contact }]
```

```64:94:server/routes.ts
// Contacts
GET    /api/contacts?entityId=...&entityType=deal|buying_party
POST   /api/contacts
DELETE /api/contacts/:id
```

```96:134:server/routes.ts
// Buying Parties
GET    /api/buying-parties
GET    /api/buying-parties/:id
POST   /api/buying-parties
PATCH  /api/buying-parties/:id
DELETE /api/buying-parties/:id
```

```136:171:server/routes.ts
// Activities
GET    /api/activities?entityId=...
POST   /api/activities
PATCH  /api/activities/:id
DELETE /api/activities/:id
```

```173:200:server/routes.ts
// Documents
GET    /api/documents?entityId=...
POST   /api/documents
DELETE /api/documents/:id
```

```202:219:server/routes.ts
// Deal-Buyer Matches
POST   /api/deal-buyer-matches
DELETE /api/deal-buyer-matches/:id
```

Gaps to add in FastAPI (called by UI but not implemented in Node server today):
- PATCH `/api/deals/:id/notes` — autosave notes
- GET `/api/meetings/latest-summary?dealId=...` — latest meeting summary for the Deal Snapshot; can initially return null or mock, then integrate later

### FastAPI backend plan

We will implement a FastAPI backend that:
- Mirrors the REST endpoints above (including the two additional ones).
- Uses PostgreSQL (via SQLModel or SQLAlchemy) with the same schema as `shared/schema.ts`.
- Validates inputs via Pydantic models matching the zod insert schemas.
- Returns JSON payloads in the shapes already consumed by the frontend.
- Implements CORS for the Vite dev server origin.
- Provides OpenAPI docs at `/docs`.

Suggested structure:
- `api/main.py` — FastAPI app factory, CORS, router registration
- `api/models.py` — SQLAlchemy/SQLModel models aligned to `shared/schema.ts`
- `api/schemas.py` — Pydantic request/response models
- `api/routers/` — resource routers: deals.py, contacts.py, buying_parties.py, activities.py, documents.py, matches.py, meetings.py
- `api/db.py` — session management, engine setup, migrations configured via Alembic
- `alembic/` — migrations to reflect the schema

Key endpoints and behaviors:

- Deals
  - GET `/api/deals` → List<Deal>
  - GET `/api/deals/{id}` → Deal or 404
  - POST `/api/deals` → create Deal (validate stage ∈ allowed, decimals are strings or numbers; normalize to strings in responses for UI consistency)
  - PATCH `/api/deals/{id}` → partial update; supports `{ stage }` for Kanban drag/drop and any other fields
  - PATCH `/api/deals/{id}/notes` → `{ notes: string }` autosave; returns updated Deal
  - DELETE `/api/deals/{id}` → 204

- Deal buyer matches composite
  - GET `/api/deals/{id}/buyers` → [{ match, party, contact }]
    - `party` is the BuyingParty
    - `contact` is the first contact for that party (if any), same as current UI expectation

- Contacts
  - GET `/api/contacts?entityId=...&entityType=deal|buying_party` → List<Contact>
  - POST `/api/contacts` → create Contact
  - DELETE `/api/contacts/{id}` → 204

- Buying Parties
  - GET `/api/buying-parties` → List<BuyingParty>
  - GET `/api/buying-parties/{id}` → BuyingParty
  - POST `/api/buying-parties` → create BuyingParty
  - PATCH `/api/buying-parties/{id}` → partial update
  - DELETE `/api/buying-parties/{id}` → 204

- Activities
  - GET `/api/activities?entityId=...` → activities for a deal or buyer group
  - POST `/api/activities` → create Activity; allow setting `type`, `title`, `status`, `dealId` or `buyingPartyId`
  - PATCH `/api/activities/{id}` → partial update (`status`, `completedAt`, etc.)
  - DELETE `/api/activities/{id}` → 204

- Documents
  - GET `/api/documents?entityId=...` → documents for a deal or buyer group
  - POST `/api/documents` → create Document (support upload URL or external linking)
  - DELETE `/api/documents/{id}` → 204

- Matches
  - POST `/api/deal-buyer-matches` → create match
  - DELETE `/api/deal-buyer-matches/{id}` → 204

- Meetings (stub for snapshot)
  - GET `/api/meetings/latest-summary?dealId=...` → `{ summary, createdAt, source } | null` for the Deal Snapshot card. Initially returns null if not integrated.

Security and safety:
- Input validation with Pydantic; reject invalid enums/stages.
- Use parameterized queries via ORM; no string-built SQL.
- Return 4xx for validation errors and 404 for missing resources.
- Encode/escape output where needed; set proper content types.
- Log request IDs and errors; avoid leaking internal details in errors.

Pagination and filtering (future-ready):
- Support `?limit` and `?offset` on list endpoints with sensible defaults and maximums.
- Filtering by `stage`, `owner`, `status` on `/api/deals` and `/api/buying-parties` as needed.

Idempotency and race-safety:
- For autosave notes, accept repeated payloads and update `updated_at` only when content changes.
- Use transactions around multi-write operations (e.g., creating a match plus initial checklist, if applicable in future).

Response payload shapes
- Follow the `shared/schema.ts` types. Frontend expects numeric-decimal fields as strings (e.g., `"2800000"`); the backend should serialize decimals to strings to avoid floating point inconsistencies.

Example requests
- Update stage after drag:
```bash
curl -X PATCH http://localhost:8000/api/deals/DEAL_ID \
  -H "Content-Type: application/json" \
  -d '{"stage":"buyer_matching"}'
```
- Autosave notes:
```bash
curl -X PATCH http://localhost:8000/api/deals/DEAL_ID/notes \
  -H "Content-Type: application/json" \
  -d '{"notes":"Followed up with CFO re: Q4."}'
```
- Fetch deal buyers composite:
```bash
curl http://localhost:8000/api/deals/DEAL_ID/buyers
```

### React Router v6 migration plan
Current router uses Wouter. We will:
1. Install React Router v6 and wrap the app with `BrowserRouter`.
2. Replace `wouter` `Link`, `useLocation`, and `useRoute` with React Router equivalents (`Link`, `useNavigate`, `useParams`, `useLocation`).
3. Update route definitions to v6 `<Routes><Route ... /></Routes>`.
4. Replace `setLocation` navigation with `useNavigate()` calls.
5. Ensure `Navigation` active state uses `useLocation()` pathname.

This can be done incrementally: route-by-route migration while keeping path structure identical so APIs remain unaffected.

### Integrations and future endpoints
- The Tools menu links (MiniVal, CIM Tool, Deck Tool, Narrative) open external routes. Backend can later add service endpoints if needed for document generation.
- Meetings summary endpoint can later integrate call transcripts or calendar sources.
- Documents could integrate with Box for storage; schema fields (e.g., `url`) already allow external references.

### Running the Application

#### Local Development

**Option 1: Combined (Recommended for Replit)**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install

# Start both FastAPI backend and Vite frontend
python main.py
```
- Backend API: http://localhost:8000
- Frontend UI: http://localhost:5173
- API Docs: http://localhost:8000/docs

**Option 2: Separate Processes**
```bash
# Terminal 1: Start FastAPI backend
npm run api
# or: uvicorn api.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2: Start Vite frontend
npm run dev
```



**Development:**
- No environment variables required (uses in-memory storage)
- CORS configured for `http://localhost:5173`

**Schema Notes:**
- This includes only the tables actively used by the current UI
- The full `Schema.csv` contains additional tables for future features (agreements, permissions, integrations)
- No schema changes are required for the current implementation

### Validation against schema.csv
- The CSV contains a superset for a more comprehensive CRM (companies, agreements, permissions, integration events). The current feature set uses `deals`, `contacts`, `buying_parties`, `deal_buyer_matches`, `activities`, `documents`.
- No MUST changes are required. We'll add tables incrementally if/when we implement those extra modules.

### Non-functional requirements
- Error handling: consistent 4xx/5xx with JSON `{error, details?}`.
- Observability: structured logs with request IDs; simple access logs in dev.
- Security: parameterized DB access, validation at API boundaries, avoid exposing stack traces.

### Appendix: Current Node endpoints (reference for parity)
The existing Express `server/routes.ts` shows the full list we will replicate, plus two additions noted (deal notes and meeting summary).

```6:19:server/routes.ts
app.get("/api/deals", ...)
app.get("/api/deals/:id", ...)
app.post("/api/deals", ...)
app.patch("/api/deals/:id", ...)
```

```47:62:server/routes.ts
app.get("/api/deals/:id/buyers", ...)
```

```136:171:server/routes.ts
app.get("/api/activities", ...)
app.post("/api/activities", ...)
app.patch("/api/activities/:id", ...)
app.delete("/api/activities/:id", ...)
```

---

- I completed a scan of `client` pages/components, `server` routes/storage, and `shared/schema.ts` to base the README on the actual implemented features and data types. Now I’ll wait for your feedback or proceed to author the FastAPI scaffolding in a follow-up step.

```typescriptreact
function Router() {
  return (
    <Switch>
      <Route path="/" component={DealPipeline} />
      <Route path="/deals/:id" component={DealDetails} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/buying-parties" component={BuyingParties} />
      <Route path="/buying-parties/:id" component={BuyingPartyDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

```typescriptreact
export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Deal Pipeline", icon: GitBranch },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/buying-parties", label: "Buying Parties", icon: Users },
  ];
```

```typescriptreact
const { data: deals = [], isLoading } = useQuery<Deal[]>({
  queryKey: ["/api/deals"],
});

const updateStageMutation = useMutation({
  mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
    return await apiRequest("PATCH", `/api/deals/${dealId}`, { stage });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
  },
});
```

```typescriptreact
export function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onClick(deal.id)}
      data-testid={`card-deal-${deal.id}`}
      className="bg-card border border-card-border rounded-md p-4 cursor-pointer hover-elevate active-elevate-2 transition-shadow"
    >
      ...
      <div className="text-2xl font-mono font-semibold text-chart-2" data-testid={`text-revenue-${deal.id}`}>
        ${parseFloat(deal.revenue).toLocaleString()} ARR
      </div>
      ...
    </div>
  );
}
```

```typescriptreact
const dealId = params?.id;

const { data: deal } = useQuery<Deal>({ queryKey: [`/api/deals/${dealId}`], enabled: !!dealId, onSuccess: (d) => setNotesDraft(d?.notes ?? "") });

const { data: contacts = [] } = useQuery<Contact[]>({
  queryKey: ["/api/contacts", { entityId: dealId, entityType: "deal" }],
  queryFn: async () => {
    const res = await fetch(`/api/contacts?entityId=${dealId}&entityType=deal`);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: activities = [] } = useQuery<Activity[]>({
  queryKey: ["/api/activities", { entityId: dealId }],
  queryFn: async () => {
    const res = await fetch(`/api/activities?entityId=${dealId}`);
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: documents = [] } = useQuery<Document[]>({
  queryKey: ["/api/documents", { entityId: dealId }],
  queryFn: async () => {
    const res = await fetch(`/api/documents?entityId=${dealId}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  enabled: !!dealId,
});

const { data: buyerMatches = [] } = useQuery<BuyerMatchRow[]>({
  queryKey: ["/api/deals", dealId, "buyers"],
  enabled: !!dealId,
});
```

```typescriptreact
const saveNotesMutation = useMutation({
  mutationFn: async (notes: string) => {
    const res = await fetch(`/api/deals/${dealId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error("Failed to save notes");
    return res.json();
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
    qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
  }
});
```

```typescriptreact
const { data: latestSummary } = useQuery<{ summary: string; createdAt: string; source?: string } | null>({
  queryKey: ["/api/meetings/latest-summary", dealId],
  queryFn: async () => {
    const res = await fetch(`/api/meetings/latest-summary?dealId=${dealId}`);
    if (!res.ok) return null as any;
    return res.json();
  },
  enabled: !!dealId,
});
```

```typescriptreact
{(byStage.get(col.key) ?? []).map(({ match, deal }) => (
  <div
    key={match.id}
    className="p-3 border border-border rounded-md hover-elevate cursor-pointer"
    onClick={() => setLocation(`/deals/${deal.id}`)}
  >
```

```typescript
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  revenue: decimal("revenue", { precision: 15, scale: 2 }).notNull(),
  sde: decimal("sde", { precision: 15, scale: 2 }),
  valuationMin: decimal("valuation_min", { precision: 15, scale: 2 }),
  valuationMax: decimal("valuation_max", { precision: 15, scale: 2 }),
  sdeMultiple: decimal("sde_multiple", { precision: 5, scale: 2 }),
  revenueMultiple: decimal("revenue_multiple", { precision: 5, scale: 2 }),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  stage: text("stage").notNull().$type<DealStage>(),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  notes: text("notes"),
  nextStepDays: integer("next_step_days"),
  touches: integer("touches").notNull().default(0),
  ageInStage: integer("age_in_stage").notNull().default(0),
  healthScore: integer("health_score").notNull().default(85),
  owner: text("owner").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```typescript
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
  entityId: varchar("entity_id").notNull(), // dealId or buyingPartyId
  entityType: text("entity_type").notNull(), // 'deal' or 'buying_party'
});
```

```typescript
export const buyingParties = pgTable("buying_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  targetAcquisitionMin: integer("target_acquisition_min"),
  targetAcquisitionMax: integer("target_acquisition_max"),
  budgetMin: decimal("budget_min", { precision: 15, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 15, scale: 2 }),
  timeline: text("timeline"),
  status: text("status").notNull().default("evaluating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dealBuyerMatches = pgTable("deal_buyer_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  buyingPartyId: varchar("buying_party_id").notNull(),
  targetAcquisition: integer("target_acquisition"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("interested"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```typescript
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id"),
  buyingPartyId: varchar("buying_party_id"),
  type: text("type").notNull().$type<ActivityType>(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id"),
  buyingPartyId: varchar("buying_party_id"),
  name: text("name").notNull(),
  status: text("status").notNull().$type<DocumentStatus>().default("draft"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```typescript
// Deals
GET    /api/deals
GET    /api/deals/:id
POST   /api/deals
PATCH  /api/deals/:id
DELETE /api/deals/:id
```

```typescript
// Deal-specific buyer matches (composite response for the right drawer)
GET /api/deals/:id/buyers   // returns [{ match, party, contact }]
```

```typescript
// Contacts
GET    /api/contacts?entityId=...&entityType=deal|buying_party
POST   /api/contacts
DELETE /api/contacts/:id
```

```typescript
// Buying Parties
GET    /api/buying-parties
GET    /api/buying-parties/:id
POST   /api/buying-parties
PATCH  /api/buying-parties/:id
DELETE /api/buying-parties/:id
```

```typescript
// Activities
GET    /api/activities?entityId=...
POST   /api/activities
PATCH  /api/activities/:id
DELETE /api/activities/:id
```

```typescript
// Documents
GET    /api/documents?entityId=...
POST   /api/documents
DELETE /api/documents/:id
```

```typescript
// Deal-Buyer Matches
POST   /api/deal-buyer-matches
DELETE /api/deal-buyer-matches/:id
```
```

# deal-deck-client
# deal-deck-client
# deal-deck-client
# deal-deck-client
# deal-deck-client
# deal-deck-app
# deal-deck-app
# deal-deck-app
# deal-deck-app
# deal-deck-app
# deal-deck-app
# deal-deck-app
