# Neon Tasker Labs — Master Monorepo File Manifest

| File Path | Purpose | Category |
|---|---|---|
| `bootstrap-neon-tasker-labs.ps1` | Master monorepo generator and self-recovery script | Tooling |
| `package.json` | Monorepo npm root workspace definition | Configuration |
| `tsconfig.json` | Base TypeScript configuration | Configuration |
| `.env.example` | Environment variable definition template | Configuration |
| `.gitignore` | Monorepo git ignore rules | Configuration |
| `docker-compose.yml` | 5-container infrastructure stack definition | Infrastructure |
| `infrastructure/postgres/init-schemas.sql` | PostgreSQL schemas for secops, subsync, and agentic_guard | Database |
| `infrastructure/signing-proxy/package.json` | Signing proxy service npm configuration | Infrastructure |
| `infrastructure/signing-proxy/tsconfig.json` | Signing proxy TypeScript configuration | Infrastructure |
| `infrastructure/signing-proxy/Dockerfile` | Signing proxy container definition | Infrastructure |
| `infrastructure/signing-proxy/src/index.ts` | Hardened signing proxy with failover provider pool | Infrastructure |
| `infrastructure/mock-sink/package.json` | Mock webhook sink npm configuration | Infrastructure |
| `infrastructure/mock-sink/Dockerfile` | Mock webhook sink container definition | Infrastructure |
| `infrastructure/mock-sink/server.js` | Mock accounting sink and DLQ capture server | Infrastructure |
| `projects/project1-secops/contracts/PausableVault.sol` | Pausable vault contract with guardian access control | Project 1 |
| `projects/project1-secops/n8n/project1-secops-circuit-breaker.json` | Project 1 canonical n8n circuit breaker workflow export | Project 1 |
| `projects/project1-secops/README.md` | Project 1 specification and quickstart | Project 1 |
| `projects/project2-subsync/README.md` | Project 2 specification and quickstart | Project 2 |
| `projects/project2-subsync/src/normalizer.ts` | Exact BigNumber token decimal normalization engine | Project 2 |
| `projects/project2-subsync/src/reconciliation-engine.ts` | Transactional outbox payment reconciliation engine | Project 2 |
| `projects/project2-subsync/n8n/project2-subsync-reconciliation.json` | Project 2 canonical n8n reconciliation workflow export | Project 2 |
| `projects/project2-subsync/frontend/package.json` | SubSync React dashboard npm configuration | Project 2 |
| `projects/project2-subsync/frontend/vite.config.ts` | SubSync React Vite bundler configuration | Project 2 |
| `projects/project2-subsync/frontend/tailwind.config.js` | SubSync Tailwind CSS configuration | Project 2 |
| `projects/project2-subsync/frontend/postcss.config.js` | SubSync PostCSS processor configuration | Project 2 |
| `projects/project2-subsync/frontend/tsconfig.json` | SubSync React TypeScript configuration | Project 2 |
| `projects/project2-subsync/frontend/index.html` | SubSync dashboard HTML root | Project 2 |
| `projects/project2-subsync/frontend/src/main.tsx` | SubSync React entry point | Project 2 |
| `projects/project2-subsync/frontend/src/App.tsx` | SubSync main dashboard component | Project 2 |
| `projects/project2-subsync/frontend/src/index.css` | SubSync global stylesheet | Project 2 |
| `projects/project2-subsync/frontend/src/types/index.ts` | SubSync frontend TypeScript interfaces | Project 2 |
| `projects/project2-subsync/frontend/src/components/Navbar.tsx` | SubSync dashboard navigation bar | Project 2 |
| `projects/project2-subsync/frontend/src/components/StatsOverview.tsx` | SubSync financial metric cards | Project 2 |
| `projects/project2-subsync/frontend/src/components/ContractConfigForm.tsx` | SubSync pipeline contract form | Project 2 |
| `projects/project2-subsync/frontend/src/components/ReconciliationTable.tsx` | SubSync real-time reconciled ledger table | Project 2 |
| `projects/project3-agentic-guard/README.md` | Project 3 specification and quickstart | Project 3 |
| `projects/project3-agentic-guard/policies/default-rules.json` | Project 3 AJV Draft-07 intent schema and baseline policies | Project 3 |
| `projects/project3-agentic-guard/n8n/project3-agentic-guard-firewall.json` | Project 3 canonical n8n policy gateway workflow export | Project 3 |
| `projects/project3-agentic-guard/src/index.ts` | Project 3 module entry point | Project 3 |
| `projects/project3-agentic-guard/src/firewall.ts` | Project 3 pessimistic row-level locking policy firewall | Project 3 |
| `packages/agentic-guard-core/package.json` | Agentic Guard SDK npm package definition | Project 3 |
| `packages/agentic-guard-core/tsconfig.json` | Agentic Guard SDK TypeScript configuration | Project 3 |
| `packages/agentic-guard-core/tsup.config.ts` | Agentic Guard SDK dual CJS/ESM bundler config | Project 3 |
| `packages/agentic-guard-core/src/types.ts` | Agentic Guard SDK core interfaces and types | Project 3 |
| `packages/agentic-guard-core/src/schema.ts` | Agentic Guard SDK JSON schema definitions | Project 3 |
| `packages/agentic-guard-core/src/storage/memory-store.ts` | Agentic Guard in-memory state store implementation | Project 3 |
| `packages/agentic-guard-core/src/storage/pg-store.ts` | Agentic Guard PostgreSQL state store implementation | Project 3 |
| `packages/agentic-guard-core/src/firewall.ts` | Agentic Guard standalone firewall engine | Project 3 |
| `packages/agentic-guard-core/src/index.ts` | Agentic Guard SDK primary export entry point | Project 3 |
| `scripts/setup-windows.ps1` | Windows 10/11 automated setup and build orchestrator | Tooling |
| `scripts/healthcheck.ps1` | 5-container infrastructure health probe | Tooling |
| `scripts/verify-artifacts.ps1` | Monorepo artifact completeness verification gate | Tooling |
| `README.md` | Monorepo master documentation | Documentation |
| `FILE_MANIFEST.md` | Canonical 54-file artifact manifest | Documentation |

---
**Verification Ledger:**
* Expected Files: 54
* Actual Files: 54
* Missing Files: 0
* Unexpected Files: 0
