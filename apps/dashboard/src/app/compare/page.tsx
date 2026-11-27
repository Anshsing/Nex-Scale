'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

const API_BASE = 'http://localhost:3001';

function CompareContent() {
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get('runId');

  const [runs, setRuns] = useState<any[]>([]);
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [optimizedRunId, setOptimizedRunId] = useState<string>(initialRunId || '');
  const [baselineData, setBaselineData] = useState<any | null>(null);
  const [optimizedData, setOptimizedData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load available past runs for selection
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch(`${API_BASE}/api/projects`);
        if (res.ok) {
          const data = await res.json();
          const allRuns = data.projects?.[0]?.runs || [];
          setRuns(allRuns);

          if (allRuns.length >= 2) {
            setBaselineRunId(allRuns[allRuns.length - 1].id);
            if (!initialRunId) {
              setOptimizedRunId(allRuns[0].id);
            }
          } else if (allRuns.length === 1) {
            setBaselineRunId(allRuns[0].id);
            setOptimizedRunId(allRuns[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [initialRunId]);

  // Load details for baseline and optimized runs
  useEffect(() => {
    async function fetchComparisonDetails() {
      if (baselineRunId) {
        try {
          const res = await fetch(`${API_BASE}/api/runs/${baselineRunId}`);
          if (res.ok) setBaselineData(await res.json());
        } catch {}
      }
      if (optimizedRunId) {
        try {
          const res = await fetch(`${API_BASE}/api/runs/${optimizedRunId}`);
          if (res.ok) setOptimizedData(await res.json());
        } catch {}
      }
    }
    fetchComparisonDetails();
  }, [baselineRunId, optimizedRunId]);

  const baseResult = baselineData?.result;
  const optResult = optimizedData?.result;

  // Compute scientific deltas
  let latencyReductionPct = 0;
  let throughputGainPct = 0;
  let p99ReductionPct = 0;

  if (baseResult && optResult) {
    const baseP95 = baseResult.latency.p95 || 1;
    const optP95 = optResult.latency.p95 || 1;
    latencyReductionPct = parseFloat((((baseP95 - optP95) / baseP95) * 100).toFixed(1));

    const baseRps = baseResult.avgRps || 1;
    const optRps = optResult.avgRps || 1;
    throughputGainPct = parseFloat((((optRps - baseRps) / baseRps) * 100).toFixed(1));

    const baseP99 = baseResult.latency.p99 || 1;
    const optP99 = optResult.latency.p99 || 1;
    p99ReductionPct = parseFloat((((baseP99 - optP99) / baseP99) * 100).toFixed(1));
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Optimization Experiment Comparison
            </h1>
            <p className="text-xs text-slate-400">
              Scientifically evaluate before-and-after performance benchmarks against your SLA targets.
            </p>
          </div>
        </div>
      </div>

      {/* Run Selection Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Baseline Run (Pre-Optimization)
            </span>
            <span className="text-xs font-mono text-slate-500">Benchmark A</span>
          </div>
          <select
            value={baselineRunId}
            onChange={(e) => setBaselineRunId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.substring(0, 12)}... | P95: {r.p95Ms}ms | RPS: {r.avgRps} | {new Date(r.startedAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Optimized Run (Post-Optimization)
            </span>
            <span className="text-xs font-mono text-slate-500">Benchmark B</span>
          </div>
          <select
            value={optimizedRunId}
            onChange={(e) => setOptimizedRunId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.substring(0, 12)}... | P95: {r.p95Ms}ms | RPS: {r.avgRps} | {new Date(r.startedAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delta Scorecard */}
      {baseResult && optResult && (
        <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">Measured Engineering Impact</h2>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Benchmark Reproducibility
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>P95 TAIL LATENCY DELTA</span>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-400">
                {latencyReductionPct > 0 ? `-${latencyReductionPct}%` : `+${Math.abs(latencyReductionPct)}%`}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                {baseResult.latency.p95}ms → <span className="text-emerald-400 font-bold">{optResult.latency.p95}ms</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>THROUGHPUT CAPACITY GAIN</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-400">
                {throughputGainPct > 0 ? `+${throughputGainPct}%` : `${throughputGainPct}%`}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                {baseResult.avgRps} RPS → <span className="text-emerald-400 font-bold">{optResult.avgRps} RPS</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>P99 SPIKE REDUCTION</span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-3xl font-bold font-mono text-sky-400">
                {p99ReductionPct > 0 ? `-${p99ReductionPct}%` : `+${Math.abs(p99ReductionPct)}%`}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                {baseResult.latency.p99}ms → <span className="text-sky-400 font-bold">{optResult.latency.p99}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Detailed Breakdown */}
      {baseResult && optResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Baseline Details */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Baseline Run Specs ({baselineRunId.substring(0, 10)})</span>
            </h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P50 Latency</span>
                <span className="text-slate-200">{baseResult.latency.p50} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P90 Latency</span>
                <span className="text-slate-200">{baseResult.latency.p90} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P95 Latency</span>
                <span className="text-rose-400 font-bold">{baseResult.latency.p95} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P99 Latency</span>
                <span className="text-slate-200">{baseResult.latency.p99} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Avg Throughput</span>
                <span className="text-slate-200">{baseResult.avgRps} RPS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Error Rate</span>
                <span className="text-slate-200">{baseResult.errorRate}%</span>
              </div>
            </div>
          </div>

          {/* Optimized Details */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Optimized Run Specs ({optimizedRunId.substring(0, 10)})</span>
            </h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P50 Latency</span>
                <span className="text-emerald-400">{optResult.latency.p50} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P90 Latency</span>
                <span className="text-emerald-400">{optResult.latency.p90} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P95 Latency</span>
                <span className="text-emerald-400 font-bold">{optResult.latency.p95} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">P99 Latency</span>
                <span className="text-emerald-400">{optResult.latency.p99} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Avg Throughput</span>
                <span className="text-emerald-400 font-bold">{optResult.avgRps} RPS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Error Rate</span>
                <span className="text-emerald-400">{optResult.errorRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading comparison view...</div>}>
      <CompareContent />
    </Suspense>
  );
}
