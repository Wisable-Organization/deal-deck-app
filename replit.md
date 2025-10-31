# Deal Dashboard

## Overview

Deal Dashboard is a B2B SaaS application for managing M&A (Mergers & Acquisitions) deal pipelines. The platform provides a visual kanban-style pipeline for tracking companies through different stages of the deal process, from initial onboarding through to final sale. Users can manage deal details, track buyer matches, monitor activities, and maintain comprehensive documentation for each transaction.

The application features a three-panel detail view (inspired by HubSpot's interface) for deep-diving into individual deals, displaying seller information, deal history/activities, and buyer matching data. The design emphasizes information density, data-first layouts, and efficient workflows suitable for financial transaction management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)

**UI Component System**
- Shadcn/ui component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Design follows B2B SaaS principles prioritizing information density and professional credibility

**State Management**
- TanStack Query (React Query) for server state management, caching, and API interactions
- Local React state for UI-specific concerns
- Custom query client configuration with optimized defaults (no refetching, infinite stale time)

**Design System**
- Custom color palette optimized for deal management (professional blues, stage-specific accent colors)
- Comprehensive theming with light/dark mode support via CSS variables
- Stage-specific color coding (Onboarding: blue, Valuation: purple, Buyer Matching: amber, Due Diligence: orange, Sold: green)
- Hover elevation states for interactive elements

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for RESTful API endpoints
- Custom middleware for request logging and error handling
- Session-based architecture foundation (connect-pg-simple configured)

**API Design**
- RESTful endpoints following resource-based patterns:
  - `/api/deals` - Deal CRUD operations
  - `/api/contacts` - Contact management (sellers/buyers)
  - `/api/buying-parties` - Buyer entity management
  - `/api/activities` - Activity tracking
  - `/api/documents` - Document management
  - `/api/deals/:id/buyers` - Deal-buyer relationship matching

**Data Validation**
- Zod schemas for runtime type validation
- Drizzle-Zod integration for automatic schema generation from database models
- Request/response validation at API boundaries

**Development Setup**
- Hot module reloading in development via Vite middleware integration
- Separate build process for client (Vite) and server (esbuild)
- Source maps enabled for debugging

### Data Storage Solutions

**Database**
- PostgreSQL via Neon Database serverless driver
- Drizzle ORM for type-safe database queries and migrations
- Schema-first approach with TypeScript type generation

**Database Schema Design**
- **Deals table**: Core entity storing company information, financial metrics (revenue, SDE, valuation ranges, multiples, commission), deal stage, priority, health scores, and ownership
- **Contacts table**: Polymorphic contact storage for both sellers and buyers (using entityId/entityType pattern)
- **Buying Parties table**: Separate buyer entity management with acquisition criteria
- **Deal-Buyer Matches table**: Junction table for many-to-many relationship between deals and buying parties with match scoring
- **Activities table**: Polymorphic activity tracking (tasks, emails, meetings, documents, system events) linked to any entity
- **Documents table**: Document management with status tracking (draft, sent, signed)

**Data Patterns**
- UUID primary keys (gen_random_uuid())
- Decimal types for financial precision (revenue, valuations, multiples)
- Timestamp tracking with defaultNow()
- Enum-like types using Postgres text with TypeScript literal types

### External Dependencies

**Core Libraries**
- `@tanstack/react-query` - Server state management and caching
- `drizzle-orm` & `drizzle-kit` - Database ORM and migration tooling
- `@neondatabase/serverless` - Serverless PostgreSQL client
- `wouter` - Lightweight routing
- `zod` - Schema validation
- `date-fns` - Date manipulation and formatting

**UI Component Dependencies**
- `@radix-ui/*` - Unstyled, accessible UI primitives (20+ components)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `cmdk` - Command menu/palette functionality
- `embla-carousel-react` - Carousel/slider functionality
- `lucide-react` - Icon system

**Form Handling**
- `react-hook-form` - Form state and validation
- `@hookform/resolvers` - Zod integration for form validation

**Development Tools**
- `@replit/*` plugins - Development tooling for Replit environment
- `tsx` - TypeScript execution for development server
- `esbuild` - Fast JavaScript bundler for production builds

**Session Management**
- `connect-pg-simple` - PostgreSQL session store (configured but authentication not yet implemented)