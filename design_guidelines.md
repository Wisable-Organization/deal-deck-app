# Deal Dashboard - Design Guidelines

## Design Approach: B2B SaaS Design System

**Selected Approach**: Design System (Utility-Focused)
**Primary References**: HubSpot, Salesforce, Linear, Attio
**Justification**: Deal management requires information density, data visualization clarity, and professional credibility. Users prioritize efficiency, data accuracy, and quick decision-making over visual novelty.

**Core Design Principles**:
- Information hierarchy: Data-first layouts with clear visual priority
- Professional credibility: Clean, trustworthy aesthetic suitable for financial transactions
- Efficient workflows: Minimize clicks, maximize context visibility
- Scannable interfaces: Quick pattern recognition for deal status and metrics

---

## Color Palette

**Light Mode**:
- Primary: 221 83% 53% (Professional blue - trust, stability)
- Primary Hover: 221 83% 45%
- Surface: 0 0% 100% (Pure white)
- Surface Secondary: 210 20% 98% (Subtle gray)
- Border: 214 32% 91%
- Text Primary: 222 47% 11%
- Text Secondary: 215 16% 47%
- Success: 142 71% 45% (Deal closed, positive metrics)
- Warning: 38 92% 50% (Pending actions, due soon)
- Danger: 0 84% 60% (At risk deals, overdue)
- Info: 199 89% 48% (Neutral information)

**Dark Mode**:
- Primary: 221 83% 58%
- Primary Hover: 221 83% 65%
- Surface: 222 47% 11% (Dark base)
- Surface Secondary: 217 33% 17%
- Border: 217 33% 23%
- Text Primary: 210 20% 98%
- Text Secondary: 215 20% 65%

**Accent Colors** (Strategic Use):
- Revenue/Financial: 142 71% 45% (Green for positive metrics)
- Stage Pills: Tailored per stage (Onboarding: blue, Valuation: purple, Due Diligence: orange, Sold: green)

**Status Indicators**:
- Draft: 215 16% 47% (Gray)
- Sent: 221 83% 53% (Blue)
- Signed: 142 71% 45% (Green)
- At Risk: 0 84% 60% (Red)
- On Track: 142 71% 45% (Green)

---

## Typography

**Font Families**:
- Primary: Inter (Google Fonts) - Exceptional readability for data-dense UIs
- Monospace: 'JetBrains Mono' (for financial figures, IDs)

**Scale & Usage**:
- Page Headers: text-2xl font-semibold (Deal Pipeline, Dashboard)
- Section Headers: text-lg font-semibold (Deal Snapshot, Activity Timeline)
- Card Titles: text-base font-semibold (Company names)
- Body Text: text-sm font-normal (Descriptions, notes)
- Metrics/Data: text-sm font-medium (Revenue, SDE, multiples)
- Labels: text-xs font-medium uppercase tracking-wide (Column headers, filters)
- Financial Figures: font-mono text-base font-semibold (Revenue amounts, valuations)

---

## Layout System

**Spacing Primitives**: Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16
- Micro spacing: space-x-1, gap-2 (icons to text, pills)
- Card padding: p-4, p-6
- Section spacing: space-y-4, space-y-6
- Page margins: px-6 lg:px-8, py-4 lg:py-6
- Large section gaps: gap-8, gap-12

**Grid System**:
- Pipeline Kanban: 5-column grid (grid-cols-5)
- Dashboard KPI cards: 4-column responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Buying Parties Table: Full-width with fixed headers
- Deal Details: 3-column layout (1fr 2fr 400px) - Left overview, middle timeline, right drawer

**Container Widths**:
- Full app: max-w-[1920px] mx-auto
- Deal Details panels: Left (360px), Middle (flex-1), Drawer (400px slide-in)
- Table containers: w-full with horizontal scroll on mobile

---

## Component Library

### Navigation
- **Top Nav Bar**: Sticky (sticky top-0), backdrop blur (backdrop-blur-lg bg-surface/95), height h-16
- **Nav Items**: Horizontal tabs with active state (border-b-2 border-primary), text-sm font-medium
- **Nav Structure**: Deal Pipeline | Dashboard | Buying Parties

### Deal Pipeline (Kanban)
- **Column Cards**: Rounded-lg border border-border bg-surface-secondary, min-w-[280px]
- **Column Headers**: text-xs uppercase tracking-wide text-secondary with deal count badge
- **Deal Cards**: Rounded-md border border-border bg-surface p-4 hover:shadow-md transition, cursor-pointer
- **Card Content**: Company name (font-semibold), Revenue (font-mono text-lg), Metrics row (grid-cols-2 gap-2)
- **Stage Pills**: Rounded-full px-3 py-1 text-xs font-medium with stage-specific colors

### Deal Details
- **Sticky Header**: h-20 border-b border-border backdrop-blur-lg bg-surface/95
- **Breadcrumb**: text-sm text-secondary with chevron separator
- **Command Bar**: Horizontal button group with outlined buttons (variant="outline"), gap-2
- **Deal Snapshot Card**: Border-l-4 with health score color, rounded-lg border p-6
- **Metrics Grid**: grid-cols-2 gap-4, label text-xs text-secondary, value text-base font-semibold
- **Contacts Table**: Compact rows with role chips (rounded-full bg-primary/10 text-primary px-2 py-1)
- **Activity Timeline**: Vertical line connector (border-l-2), activity items with icons, timestamps text-xs text-secondary

### Dashboard
- **KPI Cards**: Rounded-xl border border-border bg-surface p-6, hover:shadow-lg transition
- **KPI Layout**: Icon + Label + Large Number + Change indicator (↑/↓ with color)
- **Chart Containers**: Rounded-lg border border-border bg-surface p-6, min-h-[320px]
- **Chart Types**: Line charts (deal flow), bar charts (revenue by stage), donut chart (deal distribution), funnel chart (conversion)

### Buying Parties
- **Table**: Rounded-lg border border-border overflow-hidden
- **Table Header**: bg-surface-secondary border-b border-border sticky top-16
- **Table Rows**: hover:bg-surface-secondary transition, cursor-pointer, border-b border-border
- **Table Cells**: px-4 py-3 text-sm, first cell pl-6
- **Contact Lists**: Truncated with ellipsis, hover to show tooltip with full list
- **Range Displays**: "60-80%" format with muted styling for ranges

### Buying Party Detail
- **Hero Section**: Grid layout (grid-cols-3 gap-6), Company info + Contact cards + Stats
- **Tabs**: Horizontal tabs (Overview | Documents | Meetings | Activity)
- **Action Buttons**: Primary CTA (Schedule Meeting), secondary actions in dropdown menu
- **Document Grid**: grid-cols-2 lg:grid-cols-3 gap-4, document cards with icons and status badges
- **Meeting Scheduler**: Inline calendar picker with time slots, participant chips

### Shared Elements
- **Buttons**: Primary (bg-primary text-white hover:bg-primary-hover), Outline (border-2 border-border hover:bg-surface-secondary), Ghost (hover:bg-surface-secondary)
- **Input Fields**: Rounded-md border border-border bg-surface px-3 py-2 focus:ring-2 focus:ring-primary/20
- **Select Dropdowns**: Consistent with inputs, chevron icon indicator
- **Badges**: Rounded-full or rounded-md depending on context, size-specific padding (sm: px-2 py-0.5 text-xs)
- **Icons**: 16px (inline text), 20px (buttons), 24px (headers), Heroicons library
- **Tooltips**: Rounded-md bg-gray-900 text-white px-3 py-1.5 text-xs

### Data Visualization
- **Health Score**: Progress bar with gradient (green to red), percentage label, contextual messaging
- **Timeline Events**: Icon + Title + Description + Timestamp, connected with vertical line
- **Status Indicators**: Dot (w-2 h-2 rounded-full) + Label, color-coded by status
- **Filters**: Chip-style toggles, rounded-full bg-surface-secondary hover:bg-primary/10 active:bg-primary active:text-white

---

## Animations

**Use Sparingly - Functional Only**:
- **Drag & Drop**: Opacity change (opacity-50) during drag, smooth position transitions
- **Page Transitions**: None - instant navigation for efficiency
- **Hover States**: Shadow elevation (hover:shadow-md transition-shadow duration-200)
- **Drawer Slide**: translate-x-full to translate-x-0 transition-transform duration-300
- **Loading States**: Skeleton screens (bg-surface-secondary animate-pulse) for data-heavy views

---

## Accessibility & Responsive Design

**Dark Mode**: Full implementation across all components, form inputs, and overlays with consistent contrast ratios
**Focus States**: ring-2 ring-primary/50 rounded on all interactive elements
**Touch Targets**: Minimum 44px height for mobile buttons and interactive elements
**Responsive Breakpoints**:
- Mobile (base): Stacked layouts, full-width cards, simplified nav (drawer menu)
- Tablet (md: 768px): 2-column grids, horizontal tabs visible
- Desktop (lg: 1024px): Full multi-column layouts, all panels visible
- Wide (xl: 1280px): Optimal spacing, no horizontal scroll

**Table Responsiveness**: Horizontal scroll on mobile with sticky first column

---

## Images

**No Hero Images**: This is a data-focused application. Visual hierarchy comes from clean layouts and information design, not decorative imagery.

**Iconography Strategy**:
- Heroicons (outline style) for UI actions and navigation
- Company logos as placeholder avatars (32px rounded-sm)
- Status/category icons in timelines and activity feeds
- Document type icons (PDF, DOCX, XLSX) in file lists

**Illustrations** (Optional Enhancement):
- Empty states: Simple line art illustrations for "No deals yet", "No buyers matched"
- Keep minimal and on-brand with primary color palette