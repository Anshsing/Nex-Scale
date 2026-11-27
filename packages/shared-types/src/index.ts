export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type LoadPattern = 'constant' | 'ramp-up' | 'spike' | 'stress';

export type TestStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'aborted';

export interface ScenarioStep {
  name: string;
  method: HttpMethod;
  endpoint: string;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
  expectedStatus?: number;
  weight?: number; // relative weight if multi-step sequence
}

export interface ScenarioConfig {
  targetBaseUrl: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds?: number;
  rampDownSeconds?: number;
  loadPattern: LoadPattern;
  steps: ScenarioStep[];
  thresholds?: {
    maxErrorRatePct?: number; // e.g. 1%
    maxP95LatencyMs?: number; // e.g. 300ms
    maxP99LatencyMs?: number; // e.g. 500ms
  };
}

export interface MetricSnapshot {
  timestamp: number;
  activeVUs: number;
  requestsCompleted: number;
  requestsFailed: number;
  currentRps: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgLatencyMs: number;
  errorRate: number;
}

export interface AggregatedRunResult {
  runId: string;
  scenarioId: string;
  status: TestStatus;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgRps: number;
  peakRps: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  statusCodeBreakdown: Record<string, number>;
  timeSeriesSnapshots: MetricSnapshot[];
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  service: string;
  type: 'http' | 'db' | 'cache' | 'business_logic' | 'external';
  startTimeMs: number;
  durationMs: number;
  metadata?: Record<string, any>;
}

export interface BottleneckDiagnosis {
  id: string;
  runId: string;
  headline: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'database' | 'network' | 'concurrency' | 'caching' | 'compute';
  confirmedFacts: string[];
  hypotheses: string[];
  recommendations: {
    title: string;
    description: string;
    actionableSnippet?: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ExperimentComparison {
  baselineRunId: string;
  optimizedRunId: string;
  baselineP95Ms: number;
  optimizedP95Ms: number;
  latencyReductionPct: number;
  throughputDeltaPct: number;
  errorRateDeltaPct: number;
  summary: string;
}
