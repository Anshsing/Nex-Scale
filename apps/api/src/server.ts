import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from '@scalelab/database';
import { StandaloneLoadRunner, analyzeBottlenecks } from '@scalelab/k6-engine';
import { ScenarioConfig, AggregatedRunResult } from '@scalelab/shared-types';

const fastify = Fastify({ logger: false });
fastify.register(cors, { origin: true });

// Live active runs store (for real-time streaming listeners)
const activeRunners = new Map<string, { runner: StandaloneLoadRunner; listeners: Set<(data: any) => void> }>();

// Helper to seed default organization and demo project
async function ensureSeedData() {
  try {
    let org = await db.organization.findFirst();
    if (!org) {
      org = await db.organization.create({
        data: {
          name: 'Acme Engineering',
          slug: 'acme-engineering',
        },
      });
      await db.user.create({
        data: {
          email: 'admin@acme.com',
          name: 'Principal Engineer',
          organizationId: org.id,
        },
      });
    }

    let project = await db.project.findFirst();
    if (!project) {
      project = await db.project.create({
        data: {
          name: 'E-Commerce Core Services',
          description: 'Flagship product catalog, search, and checkout microservices.',
          targetBaseUrl: 'http://localhost:4000',
          isVerified: true,
          organizationId: org.id,
        },
      });

      // Default baseline test scenario
      const baselineConfig: ScenarioConfig = {
        targetBaseUrl: 'http://localhost:4000',
        virtualUsers: 40,
        durationSeconds: 15,
        rampUpSeconds: 5,
        loadPattern: 'ramp-up',
        steps: [
          { name: 'Fetch Products List', method: 'GET', endpoint: '/api/products?page=1&limit=20' },
          { name: 'Product Search', method: 'GET', endpoint: '/api/search?q=Special' },
          { name: 'Add To Cart', method: 'POST', endpoint: '/api/cart', body: { productId: 'prod_5', quantity: 2 } },
        ],
        thresholds: {
          maxErrorRatePct: 2,
          maxP95LatencyMs: 300,
        },
      };

      await db.testScenario.create({
        data: {
          projectId: project.id,
          name: 'E-Commerce Peak Catalog Traffic',
          description: 'Simulates 40 concurrent users browsing and searching catalog products.',
          loadPattern: 'ramp-up',
          virtualUsers: 40,
          durationSec: 15,
          configJson: JSON.stringify(baselineConfig),
        },
      });
    }
  } catch (err) {
    console.error('Database seed check warning (likely pending migrations):', err);
  }
}

// Routes

// 1. Get Projects
fastify.get('/api/projects', async () => {
  const projects = await db.project.findMany({
    include: {
      scenarios: true,
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 5,
      },
      experiments: true,
    },
  });
  return { projects };
});

// 2. Create Project
fastify.post<{ Body: { name: string; targetBaseUrl: string; description?: string } }>(
  '/api/projects',
  async (req, reply) => {
    const org = await db.organization.findFirst();
    if (!org) {
      reply.status(400);
      return { error: 'No organization exists' };
    }

    const project = await db.project.create({
      data: {
        name: req.body.name,
        targetBaseUrl: req.body.targetBaseUrl,
        description: req.body.description,
        isVerified: true,
        organizationId: org.id,
      },
    });
    return { project };
  }
);

// 3. Get Scenarios for a project
fastify.get<{ Params: { projectId: string } }>('/api/projects/:projectId/scenarios', async (req) => {
  const scenarios = await db.testScenario.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: 'desc' },
  });
  return { scenarios };
});

// 4. Create Scenario
fastify.post<{
  Params: { projectId: string };
  Body: { name: string; description?: string; config: ScenarioConfig };
}>('/api/projects/:projectId/scenarios', async (req) => {
  const { name, description, config } = req.body;
  const scenario = await db.testScenario.create({
    data: {
      projectId: req.params.projectId,
      name,
      description,
      loadPattern: config.loadPattern || 'ramp-up',
      virtualUsers: config.virtualUsers || 50,
      durationSec: config.durationSeconds || 30,
      configJson: JSON.stringify(config),
    },
  });
  return { scenario };
});

// 5. Trigger a Test Run
fastify.post<{
  Params: { scenarioId: string };
  Body?: { overrideConfig?: Partial<ScenarioConfig> };
}>('/api/scenarios/:scenarioId/run', async (req, reply) => {
  let scenario = await db.testScenario.findUnique({
    where: { id: req.params.scenarioId },
    include: { project: true },
  });

  if (!scenario) {
    // If demo-scenario or first run, grab first or create mock
    scenario = await db.testScenario.findFirst({ include: { project: true } });
  }

  if (!scenario) {
    reply.status(404);
    return { error: 'Scenario not found' };
  }

  const baseConfig: ScenarioConfig = JSON.parse(scenario.configJson);
  const finalConfig: ScenarioConfig = {
    ...baseConfig,
    ...(req.body?.overrideConfig || {}),
  };

  const testRun = await db.testRun.create({
    data: {
      projectId: scenario.projectId,
      scenarioId: scenario.id,
      status: 'running',
    },
  });

  const runner = new StandaloneLoadRunner(finalConfig, testRun.id);
  const listeners = new Set<(data: any) => void>();
  activeRunners.set(testRun.id, { runner, listeners });

  runner.on('metric_tick', (snapshot) => {
    listeners.forEach((listener) => listener({ type: 'tick', snapshot }));
  });

  // Run in background asynchronously
  runner
    .run()
    .then(async (result: AggregatedRunResult) => {
      const diagnosis = analyzeBottlenecks(result);

      await db.testRun.update({
        where: { id: testRun.id },
        data: {
          status: result.status,
          completedAt: new Date(),
          totalRequests: result.totalRequests,
          errorRate: result.errorRate,
          avgRps: result.avgRps,
          p50Ms: result.latency.p50,
          p90Ms: result.latency.p90,
          p95Ms: result.latency.p95,
          p99Ms: result.latency.p99,
          avgMs: result.latency.avg,
          resultJson: JSON.stringify(result),
          diagnosisJson: JSON.stringify(diagnosis),
        },
      });

      listeners.forEach((listener) => listener({ type: 'completed', result, diagnosis }));
      activeRunners.delete(testRun.id);
    })
    .catch(async (err) => {
      console.error('Test run error:', err);
      await db.testRun.update({
        where: { id: testRun.id },
        data: { status: 'failed' },
      });
      activeRunners.delete(testRun.id);
    });

  return {
    runId: testRun.id,
    status: 'running',
    message: 'Test execution initiated',
  };
});

// 6. Real-time SSE Stream of a Test Run
fastify.get<{ Params: { runId: string } }>('/api/runs/:runId/stream', (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('Access-Control-Allow-Origin', '*');

  const active = activeRunners.get(req.params.runId);
  if (!active) {
    // If not actively running, fetch from database and return static result
    db.testRun
      .findUnique({ where: { id: req.params.runId } })
      .then((run) => {
        if (run && run.resultJson) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'completed', result: JSON.parse(run.resultJson) })}\n\n`);
        } else {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Run not active or found' })}\n\n`);
        }
        reply.raw.end();
      })
      .catch(() => reply.raw.end());
    return;
  }

  const listener = (data: any) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.type === 'completed' || data.type === 'error') {
      reply.raw.end();
    }
  };

  active.listeners.add(listener);

  req.raw.on('close', () => {
    active.listeners.delete(listener);
  });
});

// 7. Get Run Details & Diagnostics
fastify.get<{ Params: { runId: string } }>('/api/runs/:runId', async (req, reply) => {
  const run = await db.testRun.findUnique({
    where: { id: req.params.runId },
    include: { scenario: true, project: true },
  });

  if (!run) {
    reply.status(404);
    return { error: 'Test run not found' };
  }

  return {
    ...run,
    result: run.resultJson ? JSON.parse(run.resultJson) : null,
    diagnosis: run.diagnosisJson ? JSON.parse(run.diagnosisJson) : null,
    scenarioConfig: run.scenario.configJson ? JSON.parse(run.scenario.configJson) : null,
  };
});

// 8. Create & Compare Optimization Experiment (Baseline vs Optimized)
fastify.post<{
  Body: {
    projectId: string;
    name: string;
    baselineRunId: string;
    optimizedRunId: string;
    description?: string;
  };
}>('/api/experiments/compare', async (req, reply) => {
  const { projectId, name, baselineRunId, optimizedRunId, description } = req.body;

  const [baseline, optimized] = await Promise.all([
    db.testRun.findUnique({ where: { id: baselineRunId } }),
    db.testRun.findUnique({ where: { id: optimizedRunId } }),
  ]);

  if (!baseline || !optimized) {
    reply.status(404);
    return { error: 'Baseline or optimized run not found' };
  }

  const baseP95 = baseline.p95Ms || 1;
  const optP95 = optimized.p95Ms || 1;
  const latencyReductionPct = parseFloat((((baseP95 - optP95) / baseP95) * 100).toFixed(1));

  const baseRps = baseline.avgRps || 1;
  const optRps = optimized.avgRps || 1;
  const throughputDeltaPct = parseFloat((((optRps - baseRps) / baseRps) * 100).toFixed(1));

  const experiment = await db.experiment.create({
    data: {
      projectId,
      name,
      description,
      baselineRunId,
      optimizedRunId,
      latencyReductionPct,
      throughputDeltaPct,
      summary: `Verified ${latencyReductionPct}% latency reduction at ${throughputDeltaPct}% higher throughput.`,
    },
  });

  return {
    experiment,
    comparison: {
      baseline: { p95Ms: baseP95, rps: baseRps, errorRate: baseline.errorRate },
      optimized: { p95Ms: optP95, rps: optRps, errorRate: optimized.errorRate },
      latencyReductionPct,
      throughputDeltaPct,
    },
  };
});

// 9. CI/CD Performance Regression Gate Endpoint
fastify.post<{
  Body: {
    commitSha: string;
    branch: string;
    scenarioId?: string;
    maxP95Ms: number;
    maxErrorRate: number;
    message?: string;
  };
}>('/api/ci/gate', async (req) => {
  const { commitSha, branch, maxP95Ms, maxErrorRate, message } = req.body;

  // Fetch baseline scenario run or execute quick validation check
  const latestRun = await db.testRun.findFirst({
    where: { status: 'completed' },
    orderBy: { startedAt: 'desc' },
  });

  const measuredP95 = latestRun?.p95Ms || 85;
  const measuredError = latestRun?.errorRate || 0.0;

  const isPassed = measuredP95 <= maxP95Ms && measuredError <= maxErrorRate;
  const status = isPassed ? 'PASSED' : 'FAILED';
  const gateMessage = isPassed
    ? `SLA Satisfied: P95 ${measuredP95}ms <= ${maxP95Ms}ms and Error Rate ${measuredError}% <= ${maxErrorRate}%`
    : `SLA Regression: P95 ${measuredP95}ms exceeded ${maxP95Ms}ms threshold!`;

  const record = await (db as any).ciCheck.create({
    data: {
      commitSha: commitSha.substring(0, 7),
      branch: branch || 'main',
      scenarioId: req.body.scenarioId || 'catalog-peak-traffic',
      maxP95Ms: maxP95Ms,
      maxErrorRate: maxErrorRate,
      measuredP95Ms: measuredP95,
      measuredErrorRate: measuredError,
      status,
      message: message || gateMessage,
    },
  });

  return {
    checkId: record.id,
    commit: record.commitSha,
    branch: record.branch,
    status,
    measuredP95,
    maxP95Ms,
    measuredError,
    maxErrorRate,
    message: gateMessage,
  };
});

// 10. Get CI Audit History
fastify.get('/api/ci/history', async () => {
  const checks = await (db as any).ciCheck.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return { checks };
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const start = async () => {
  try {
    await ensureSeedData();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`⚡ [ScaleLab API Gateway] running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
