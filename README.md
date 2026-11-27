# ScaleLab — Performance Engineering Platform

> **Measure. Diagnose. Optimize. Verify.**  
> An enterprise-grade performance engineering platform for benchmarking, load generation, bottleneck diagnostics, and controlled optimization experiments.

---

## 🏗️ Architecture & Workspaces

The repository is organized as a Turborepo monorepo:

- **`apps/dashboard`**: High-performance dark technical developer dashboard built with **Next.js 14 App Router**, **Tailwind CSS**, and **Lucide**.
- **`apps/api`**: Core Gateway & Test Orchestrator using **Fastify/NestJS architecture**, **Prisma ORM**, SSE streaming, and diagnostic analytics.
- **`apps/benchmark-target`**: Multi-tiered reference E-Commerce API with controllable performance profiles (`v1_baseline` unindexed & N+1, `v2_indexed` optimized queries, `v3_cached` with Redis/in-memory cache).
- **`packages/shared-types`**: Canonical TypeScript definitions for test scenarios, metrics, telemetry snapshots, and AI bottleneck diagnoses.
- **`packages/database`**: Prisma schema, SQLite/PostgreSQL connectors, and migration scripts.
- **`packages/k6-engine`**: k6 script generator, standalone high-concurrency runner, and real-time percentile aggregation engine (P50, P90, P95, P99, RPS, error rates).

---

## 🚀 Running the Services

### 1. Start the Benchmark Target API (Port 4000)
In a separate terminal:
```bash
node apps/benchmark-target/dist/server.js
```

### 2. Start the ScaleLab Core API Gateway (Port 3001)
In a second terminal:
```bash
node apps/api/dist/server.js
```

### 3. Start the Developer Dashboard (Port 3000)
In a third terminal:
```bash
npm --workspace=@scalelab/dashboard run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔬 Testing the Complete Optimization Workflow

1. Navigate to the dashboard at `http://localhost:3000`.
2. Notice the **Target Architecture Mode** at the top:
   - **v1: Baseline**: Runs with unindexed queries and sequential N+1 query patterns (~150ms–300ms tail latency).
   - **v2: DB Indexed**: Drops query latency down to ~30ms.
   - **v3: Caching Enabled**: Delivers sub-15ms cached responses.
3. Click **"Start Benchmark Run"**.
4. Watch the real-time **SSE live streaming distribution** graph update as virtual users ramp up.
5. Review the **AI Performance Advisor** card:
   - Identifies confirmed facts (P95 latency, RPS, error rate).
   - Flags root cause hypotheses (e.g., N+1 query pattern, missing index).
   - Provides concrete remediation snippets (`CREATE INDEX`, Redis caching).
6. Switch to **v2** or **v3**, run the benchmark again, and see the **Measured Optimization Delta** card highlight quantitative gains (e.g., **-45% P95 latency reduction** and **+80% throughput gain**).
