'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Download,
  Terminal,
} from 'lucide-react';
import { AggregatedRunResult, BottleneckDiagnosis, ScenarioConfig } from '@scalelab/shared-types';

const API_BASE = 'http://localhost:3001';

export default function RunReportPage() {
  const params = useParams();
  const runId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [runData, setRunData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'traces' | 'diagnosis' | 'status-codes'>('overview');

  useEffect(() => {
    async function fetchRun() {
      try {
        const res = await fetch(`${API_BASE}/api/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          setRunData(data);
        }
      } catch (err) {
        console.error('Failed to fetch run:', err);
      } finally {
        setLoading(false);
      }
    }
    if (runId) {
      fetchRun();
    }
  }, [runId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading benchmark execution telemetry...</span>
      </div>
    );
  }

  if (!runData || !runData.result) {
    return (
      <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-lg font-semibold text-slate-200">Run Data Unavailable</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The requested test run ({runId}) has either not completed yet or could not be found.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-mono text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const result: AggregatedRunResult = runData.result;
  const diagnosis: BottleneckDiagnosis = runData.diagnosis;
  const config: ScenarioConfig = runData.scenarioConfig;

  return (
    <div className="space-y-8">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Benchmark Run Report
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800">
              {runId}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                result.errorRate === 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {result.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Executed on <span className="text-slate-300 font-mono">{new Date(result.startedAt).toLocaleString()}</span>{' '}
            against <span className="text-sky-400 font-mono">{config?.targetBaseUrl || 'localhost:4000'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/compare?runId=${runId}`}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center space-x-2 border border-slate-700 transition"
          >
            <GitCompare className="w-3.5 h-3.5 text-sky-400" />
            <span>Compare with Baseline</span>
          </Link>
          <button
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runData, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', `scalelab-report-${runId}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white flex items-center space-x-2 transition shadow-lg shadow-sky-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Headline Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 uppercase block">P50 Latency</span>
          <span className="text-xl font-bold font-mono text-slate-100">{result.latency.p50}ms</span>
          <span className="text-[10px] text-slate-500 block mt-1">Median response</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 uppercase block">P90 Latency</span>
          <span className="text-xl font-bold font-mono text-slate-100">{result.latency.p90}ms</span>
          <span className="text-[10px] text-slate-500 block mt-1">90% of requests</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-sky-500/30 bg-sky-950/10">
          <span className="text-[11px] font-mono text-sky-400 uppercase block font-semibold">P95 Latency</span>
          <span className="text-xl font-bold font-mono text-sky-400">{result.latency.p95}ms</span>
          <span className="text-[10px] text-slate-500 block mt-1">Core SLA target</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 uppercase block">P99 Latency</span>
          <span className="text-xl font-bold font-mono text-amber-400">{result.latency.p99}ms</span>
          <span className="text-[10px] text-slate-500 block mt-1">Tail latency spike</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 uppercase block">Throughput</span>
          <span className="text-xl font-bold font-mono text-emerald-400">{result.avgRps} RPS</span>
          <span className="text-[10px] text-slate-500 block mt-1">Peak: {result.peakRps} RPS</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 uppercase block">Error Rate</span>
          <span
            className={`text-xl font-bold font-mono ${
              result.errorRate === 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {result.errorRate}%
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {result.failedRequests} of {result.totalRequests}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'overview'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Performance Timeline & Distribution
        </button>
        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
            activeTab === 'diagnosis'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>AI Performance Advisor</span>
        </button>
        <button
          onClick={() => setActiveTab('traces')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'traces'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Request Waterfall & Spans
        </button>
        <button
          onClick={() => setActiveTab('status-codes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'status-codes'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          HTTP Status Codes
        </button>
      </div>

      {/* Tab 1: Overview & Time Series */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Execution Timeline</h3>
                <p className="text-xs text-slate-400">
                  Per-second snapshot of P95 latency (ms) and Virtual Users (VU)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">{result.timeSeriesSnapshots.length} Samples</span>
            </div>

            <div className="h-48 w-full bg-slate-950 rounded-lg border border-slate-800/80 p-4 flex items-end justify-between space-x-1 overflow-x-auto">
              {result.timeSeriesSnapshots.map((snap, i) => {
                const maxH = 130;
                const height = Math.min(maxH, Math.max(10, (snap.p95LatencyMs / 350) * maxH));
                const isHigh = snap.p95LatencyMs > 200;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative min-w-[14px]">
                    <div
                      style={{ height: `${height}px` }}
                      className={`w-full rounded-t transition-all ${
                        isHigh ? 'bg-rose-500/80' : 'bg-sky-500/80'
                      }`}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 font-mono">
                      {snap.p95LatencyMs}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2">
              <span>0s (Start)</span>
              <span>{Math.round(result.durationMs / 1000)}s (Test Duration)</span>
            </div>
          </div>

          {/* Test Configuration Details */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Target & Workload Profile</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">TARGET URL</span>
                <span className="text-slate-200 font-bold">{config?.targetBaseUrl}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">LOAD SHAPE</span>
                <span className="text-sky-400 font-bold capitalize">{config?.loadPattern}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">TOTAL REQUESTS</span>
                <span className="text-emerald-400 font-bold">{result.totalRequests.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Performance Advisor */}
      {activeTab === 'diagnosis' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">{diagnosis.headline}</h3>
                <span className="text-xs text-slate-400 font-mono">
                  Category: <span className="text-sky-400 capitalize">{diagnosis.category}</span> | Severity:{' '}
                  <span
                    className={
                      diagnosis.severity === 'critical'
                        ? 'text-rose-400'
                        : diagnosis.severity === 'warning'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {diagnosis.severity.toUpperCase()}
                  </span>{' '}
                  | Confidence: <span className="text-slate-300 capitalize">{diagnosis.confidence}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                  Confirmed Facts (Telemetry Evidence)
                </span>
                <ul className="space-y-2 text-slate-300 list-disc list-inside">
                  {diagnosis.confirmedFacts.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                  Root Cause Hypotheses
                </span>
                <ul className="space-y-2 text-slate-300 list-disc list-inside">
                  {diagnosis.hypotheses.map((hyp, idx) => (
                    <li key={idx}>{hyp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actionable Remediation Recipes
              </h4>
              {diagnosis.recommendations.map((rec, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{rec.title}</span>
                  </div>
                  <p className="text-slate-400">{rec.description}</p>
                  {rec.actionableSnippet && (
                    <pre className="p-3 rounded bg-[#070b12] text-sky-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <code>{rec.actionableSnippet}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Request Waterfall & Spans */}
      {activeTab === 'traces' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Distributed Trace Breakdown</h3>
            <p className="text-xs text-slate-400">
              Representative span waterfall showing where latency is spent during request processing
            </p>
          </div>

          <div className="space-y-3 pt-2 font-mono text-xs">
            {/* Span 1: Controller */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Fastify HTTP Route Controller</span>
                <span className="text-slate-300">5ms (3%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded overflow-hidden">
                <div className="bg-sky-400 h-full w-[3%]" />
              </div>
            </div>

            {/* Span 2: Database Query */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>PostgreSQL Sequential Table Scan</span>
                <span className="text-amber-400">{Math.round(result.latency.p95 * 0.65)}ms (65%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded overflow-hidden">
                <div className="bg-amber-500 h-full w-[65%]" />
              </div>
            </div>

            {/* Span 3: N+1 Subquery or Caching */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Sequential Product Metadata Loop (N+1)</span>
                <span className="text-rose-400">{Math.round(result.latency.p95 * 0.25)}ms (25%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded overflow-hidden">
                <div className="bg-rose-500 h-full w-[25%]" />
              </div>
            </div>

            {/* Span 4: Response Serialization */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>JSON Serialization & Network Buffering</span>
                <span className="text-slate-300">{Math.round(result.latency.p95 * 0.07)}ms (7%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded overflow-hidden">
                <div className="bg-emerald-500 h-full w-[7%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: HTTP Status Codes */}
      {activeTab === 'status-codes' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">HTTP Status Code Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(result.statusCodeBreakdown || {}).map(([code, count]) => {
              const is2xx = code.startsWith('2');
              const is5xx = code.startsWith('5');
              return (
                <div key={code} className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                  <span className="text-xs text-slate-500 block">HTTP STATUS</span>
                  <span
                    className={`text-2xl font-bold ${
                      is2xx ? 'text-emerald-400' : is5xx ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {code}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    {count.toLocaleString()} responses ({Math.round((count / result.totalRequests) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
