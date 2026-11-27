'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  GitBranch,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Copy,
  Terminal,
  ExternalLink,
  Code2,
  Play,
  RotateCcw,
} from 'lucide-react';

const API_BASE = 'http://localhost:3001';

export default function CicdGatePage() {
  const [p95Threshold, setP95Threshold] = useState(250);
  const [errorThreshold, setErrorThreshold] = useState(1.0);
  const [copied, setCopied] = useState(false);
  const [isSimulatingCheck, setIsSimulatingCheck] = useState(false);
  const [ciHistory, setCiHistory] = useState<any[]>([]);

  // Fetch real CI history from database
  const loadCiHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ci/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.checks && data.checks.length > 0) {
          setCiHistory(data.checks);
          return;
        }
      }
    } catch {}

    // Fallback baseline history
    setCiHistory([
      {
        id: 'ci_1',
        commitSha: '7a8f9c1',
        branch: 'main',
        measuredP95Ms: 65,
        measuredErrorRate: 0.0,
        status: 'PASSED',
        message: 'feat: add compound index on products (category, price)',
        createdAt: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: 'ci_2',
        commitSha: '3e4d1b8',
        branch: 'pr-142',
        measuredP95Ms: 140,
        measuredErrorRate: 0.1,
        status: 'PASSED',
        message: 'fix: optimize tag join to eliminate N+1 queries',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'ci_3',
        commitSha: '9b2c5e0',
        branch: 'pr-139',
        measuredP95Ms: 385,
        measuredErrorRate: 2.4,
        status: 'FAILED',
        message: 'refactor: unindexed join on user order history',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  };

  useEffect(() => {
    loadCiHistory();
  }, []);

  // Trigger Live Test Gate check
  const handleTriggerGate = async () => {
    setIsSimulatingCheck(true);
    const mockCommit = Math.random().toString(16).substring(2, 9);
    const mockBranch = `pr-${Math.floor(Math.random() * 80) + 140}`;

    try {
      const res = await fetch(`${API_BASE}/api/ci/gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitSha: mockCommit,
          branch: mockBranch,
          maxP95Ms: p95Threshold,
          maxErrorRate: errorThreshold,
          message: 'Automated CI PR Validation Benchmark',
        }),
      });

      if (res.ok) {
        await loadCiHistory();
        setIsSimulatingCheck(false);
        return;
      }
    } catch {}

    // Client-side simulated gate evaluation if API offline
    setTimeout(() => {
      const simulatedP95 = Math.floor(Math.random() * 250) + 50;
      const simulatedError = Math.random() > 0.8 ? 1.5 : 0.0;
      const isPassed = simulatedP95 <= p95Threshold && simulatedError <= errorThreshold;

      const newCheck = {
        id: `ci_${Date.now()}`,
        commitSha: mockCommit,
        branch: mockBranch,
        measuredP95Ms: simulatedP95,
        measuredErrorRate: simulatedError,
        status: isPassed ? 'PASSED' : 'FAILED',
        message: 'Automated CI PR Validation Benchmark',
        createdAt: new Date().toISOString(),
      };

      setCiHistory((prev) => [newCheck, ...prev]);
      setIsSimulatingCheck(false);
    }, 800);
  };

  const githubActionYaml = `name: ScaleLab Performance Gate

on:
  pull_request:
    branches: [ main ]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Staging Target API
        run: docker compose -f docker-compose.staging.yml up -d

      - name: Execute ScaleLab Automated Benchmark Gate
        run: |
          curl -X POST http://localhost:3001/api/ci/gate \\
            -H "Content-Type: application/json" \\
            -d '{
              "scenarioId": "catalog-peak-traffic",
              "commitSha": "\${{ github.sha }}",
              "branch": "\${{ github.ref_name }}",
              "maxP95Ms": ${p95Threshold},
              "maxErrorRate": ${errorThreshold}
            }'
`;

  const copyYaml = () => {
    navigator.clipboard.writeText(githubActionYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              CI/CD Continuous Performance Regression Gates
            </h1>
            <p className="text-xs text-slate-400">
              Automatically block pull requests that degrade P95 latency or exceed error rate SLAs.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration & GitHub Action Generator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Quality Gate SLA Thresholds</h3>
            <p className="text-xs text-slate-400">
              Any PR exceeding these limits triggers a failed status check in GitHub Actions.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-500 block mb-1">MAX P95 LATENCY GATE</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={p95Threshold}
                    onChange={(e) => setP95Threshold(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                  />
                  <span className="text-slate-400">ms</span>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">MAX HTTP ERROR RATE</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={errorThreshold}
                    onChange={(e) => setErrorThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Action Snippet */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>.github/workflows/bench.yml</span>
              </span>
              <button
                onClick={copyYaml}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 font-mono transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[10px] overflow-x-auto border border-slate-800 leading-relaxed">
              <code>{githubActionYaml}</code>
            </pre>
          </div>
        </div>

        {/* Right Column: Commit Benchmark History & Regression Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Continuous Benchmark Audit Trail
                </h3>
                <span className="text-xs font-mono text-slate-500">Live PR & Commit Quality Gates</span>
              </div>
              <button
                onClick={handleTriggerGate}
                disabled={isSimulatingCheck}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white flex items-center space-x-1.5 transition shadow"
              >
                {isSimulatingCheck ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing CI Gate Check...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Simulate Incoming PR Webhook</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {ciHistory.map((run, i) => {
                const isPassed = run.status === 'PASSED';
                const p95 = run.measuredP95Ms ?? run.p95Ms;
                const errRate = run.measuredErrorRate ?? run.errorRate;

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border transition ${
                      isPassed
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {run.commitSha || run.commit}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800 font-mono">
                          {run.branch}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(run.createdAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium mt-2">
                      {run.message}
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">P95 LATENCY</span>
                        <span
                          className={`font-bold ${
                            p95 > p95Threshold ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {p95} ms
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">ERROR RATE</span>
                        <span
                          className={`font-bold ${
                            errRate > errorThreshold ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          {errRate}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">STATUS GATE</span>
                        <span
                          className={`font-bold uppercase ${
                            isPassed ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                    </div>

                    {!isPassed && (
                      <div className="mt-2.5 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                        🛑 <strong>CI Gate Blocked:</strong> Latency ({p95}ms) exceeded maximum threshold ({p95Threshold}ms). Pull request merge blocked!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
