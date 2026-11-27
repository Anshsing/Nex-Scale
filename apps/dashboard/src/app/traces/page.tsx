'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Layers,
  Database,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Code2,
  Server,
  Zap,
} from 'lucide-react';
import { TraceSpan } from '@scalelab/shared-types';

export default function TracesExplorerPage() {
  const [selectedSpanId, setSelectedSpanId] = useState<string>('span_db_products');
  const [filterType, setFilterType] = useState<string>('all');

  // Realistic representative request trace with N+1 and slow query breakdown
  const sampleTrace = {
    traceId: 'tr_scalelab_8f7b192a_c401',
    rootEndpoint: 'GET /api/products?category=Electronics&page=1',
    timestamp: '2026-11-27T10:45:12.820Z',
    totalDurationMs: 278,
    status: 200,
    spans: [
      {
        id: 'span_root',
        name: 'HTTP Ingress: Fastify Dispatcher',
        service: 'gateway-api',
        type: 'http',
        startTimeMs: 0,
        durationMs: 278,
        metadata: {
          clientIp: '127.0.0.1',
          httpMethod: 'GET',
          route: '/api/products',
          userAgent: 'ScaleLab-K6-Worker/1.0',
        },
      },
      {
        id: 'span_controller',
        parentId: 'span_root',
        name: 'Controller: CatalogHandler.listProducts',
        service: 'catalog-service',
        type: 'business_logic',
        startTimeMs: 3,
        durationMs: 272,
        metadata: {
          controller: 'CatalogController',
          method: 'findAll',
        },
      },
      {
        id: 'span_db_products',
        parentId: 'span_controller',
        name: 'PostgreSQL: SELECT * FROM products WHERE category = $1',
        service: 'postgres-db',
        type: 'db',
        startTimeMs: 12,
        durationMs: 148,
        metadata: {
          dbSystem: 'postgresql',
          statement: 'SELECT id, name, price, stock, description FROM products WHERE category = $1 ORDER BY price DESC LIMIT 20 OFFSET 0;',
          plan: 'Seq Scan on products (cost=0.00..3840.00 rows=20 width=248) (Filter: category = $1)',
          bottleneck: 'Sequential Scan without Index. Missing compound index (category, price DESC).',
          rowsReturned: 20,
        },
      },
      {
        id: 'span_nplusone_loop',
        parentId: 'span_controller',
        name: 'Loop: Fetch Inventory & Tags (N+1 Query Pattern)',
        service: 'catalog-service',
        type: 'business_logic',
        startTimeMs: 165,
        durationMs: 92,
        metadata: {
          pattern: 'N+1 Query Loop detected',
          queriesTriggered: 15,
          advice: 'Batch query tags using `WHERE product_id IN (...)` or JOIN relation.',
        },
      },
      {
        id: 'span_db_tags_batch',
        parentId: 'span_nplusone_loop',
        name: 'PostgreSQL: SELECT * FROM product_tags WHERE product_id = $1 (x15)',
        service: 'postgres-db',
        type: 'db',
        startTimeMs: 172,
        durationMs: 82,
        metadata: {
          dbSystem: 'postgresql',
          statement: 'SELECT * FROM product_tags WHERE product_id = $1 (executed 15 times sequentially)',
          totalSubqueries: 15,
          avgLatencyPerSubqueryMs: 5.4,
        },
      },
      {
        id: 'span_serialize',
        parentId: 'span_controller',
        name: 'Fastify: JSON Schema Serialization & ETag',
        service: 'gateway-api',
        type: 'business_logic',
        startTimeMs: 260,
        durationMs: 15,
        metadata: {
          payloadSizeBytes: '14.2 KB',
          compression: 'none',
        },
      },
    ] as (TraceSpan & { metadata: any })[],
  };

  const filteredSpans = sampleTrace.spans.filter((s) => {
    if (filterType === 'all') return true;
    return s.type === filterType;
  });

  const selectedSpan = sampleTrace.spans.find((s) => s.id === selectedSpanId) || sampleTrace.spans[0];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Distributed Trace Waterfall Explorer
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Trace ID: <span className="text-sky-400">{sampleTrace.traceId}</span> | Route:{' '}
                <span className="text-slate-200">{sampleTrace.rootEndpoint}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
              Total Duration: {sampleTrace.totalDurationMs}ms
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              HTTP 200 OK
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Overview Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Spans:</span>
          {['all', 'db', 'business_logic', 'http'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition ${
                filterType === t
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Database (60%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>N+1 Loop (33%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-500" />
            <span>Routing (7%)</span>
          </div>
        </div>
      </div>

      {/* Main Waterfall Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Spans Timeline (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2 border-b border-slate-800">
            <span>SPAN / OPERATION HIERARCHY</span>
            <div className="flex items-center space-x-8">
              <span>0ms</span>
              <span>100ms</span>
              <span>200ms</span>
              <span>278ms</span>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSpans.map((span) => {
              const startPct = (span.startTimeMs / sampleTrace.totalDurationMs) * 100;
              const widthPct = Math.max(2, (span.durationMs / sampleTrace.totalDurationMs) * 100);
              const isSelected = span.id === selectedSpanId;
              const isDb = span.type === 'db';
              const isSlow = span.durationMs > 50;

              return (
                <div
                  key={span.id}
                  onClick={() => setSelectedSpanId(span.id)}
                  className={`p-3 rounded-lg cursor-pointer transition border ${
                    isSelected
                      ? 'bg-slate-800/80 border-sky-500/60 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2 truncate pr-4">
                      {isDb ? (
                        <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Server className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className={`font-semibold truncate ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                        {span.name}
                      </span>
                    </div>
                    <span className={`shrink-0 ${isSlow ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {span.durationMs}ms
                    </span>
                  </div>

                  {/* Horizontal Waterfall Bar */}
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mt-2 relative">
                    <div
                      style={{
                        marginLeft: `${startPct}%`,
                        width: `${widthPct}%`,
                      }}
                      className={`h-full rounded-full transition-all ${
                        isDb ? 'bg-amber-500' : span.id.includes('nplusone') ? 'bg-rose-500' : 'bg-sky-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Span Metadata Inspector (1 Col) */}
        <div className="lg:col-span-1 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">Span Inspector</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">OPERATION NAME</span>
              <span className="text-slate-200 font-bold block">{selectedSpan.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DURATION</span>
                <span className="text-rose-400 font-bold text-sm">{selectedSpan.durationMs} ms</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">START OFFSET</span>
                <span className="text-slate-200 font-bold text-sm">+{selectedSpan.startTimeMs} ms</span>
              </div>
            </div>

            {selectedSpan.metadata?.statement && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px]">DATABASE QUERY STATEMENT</span>
                <pre className="text-amber-300 text-[11px] whitespace-pre-wrap break-all overflow-x-auto">
                  {selectedSpan.metadata.statement}
                </pre>
              </div>
            )}

            {selectedSpan.metadata?.plan && (
              <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30 bg-rose-950/10 space-y-1">
                <span className="text-rose-400 block text-[10px] font-bold">QUERY EXPLAIN PLAN</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedSpan.metadata.plan}
                </p>
                <div className="pt-2 text-[10px] text-rose-300 font-sans">
                  ⚠️ <strong>Identified Bottleneck:</strong> {selectedSpan.metadata.bottleneck}
                </div>
              </div>
            )}

            {selectedSpan.metadata?.pattern && (
              <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30 bg-rose-950/10 space-y-1">
                <span className="text-rose-400 block text-[10px] font-bold">ANTI-PATTERN DETECTED</span>
                <p className="text-slate-300 text-[11px]">{selectedSpan.metadata.pattern}</p>
                <p className="text-slate-400 text-[10px] pt-1">{selectedSpan.metadata.advice}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
