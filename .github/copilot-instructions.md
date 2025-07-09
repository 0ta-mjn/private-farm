This is a TypeScript monorepo for an IoT system targeting small-scale personal farms. The project uses Turborepo with pnpm workspaces and targets Node.js 22.x. The frontend is built with Next.js and shadcn/ui, while the backend uses Hono for REST APIs and PostgreSQL with Drizzle ORM. Please follow these guidelines when contributing:

## Code Standards

### Required Before Each Commit
- Run `pnpm lint` to check code quality across all packages
- Run `pnpm typecheck` to ensure TypeScript type safety
- Run `pnpm test` for unit tests before committing changes

### Development Flow
- Build: `pnpm build`
- Development: `pnpm dev` (starts all applications in watch mode)
- Test: `pnpm test` (includes setup and runs all tests)
- Database: `pnpm db:push` to sync schema changes
- E2E Testing: `pnpm e2e` (includes Playwright setup)

## Repository Structure
- `apps/`: Application entry points and main services
  - `dashboard/`: Next.js frontend dashboard with shadcn/ui
  - `api/`: Hono-based API server for Cloudflare Workers
  - `reviewer/`: Discord notification system
- `packages/`: Shared libraries and core logic
  - `core/`: Business logic and service layer
  - `db/`: Database schema and Drizzle ORM setup
  - `config/`: Environment configuration and validation
  - `auth-client/`: Client-side authentication
  - `auth-admin/`: Admin authentication
  - `discord/`: Discord API integration
  - `e2e-tests/`: Playwright E2E testing suite
- `docs/`: Documentation and architectural decision records
- `infra/`: Infrastructure configuration for Cloudflare and Supabase
  - `cloudflare/`: Cloudflare Workers and deployment configuration
  - `supabase/emulator/`: Supabase local development setup (`@repo/supabase`)
- `scripts/`: Build and deployment utilities

## Key Guidelines
1. Use TypeScript strict mode and maintain type safety across all packages
2. Follow React best practices for the Next.js dashboard
3. Implement proper error handling using the shared error definitions in `@repo/dashboard-db`, `@repo/discord`, etc...
4. Use Zod for runtime validation in both frontend and backend
5. Write unit tests with Vitest and maintain test coverage
6. Use kebab-case for file names and follow existing naming conventions
7. Check relevant README files (`apps/dashboard/README.md` or `apps/api/README.md`) before starting implementation
8. Keep responses concise and avoid verbose explanations
