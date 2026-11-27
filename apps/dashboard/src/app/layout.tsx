import './globals.css';
import { Activity, Layers, Cpu, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'ScaleLab — Performance Engineering Platform',
  description: 'Enterprise Benchmarking, Bottleneck Diagnostics, and Optimization Lab',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 antialiased">
        <header className="border-b border-slate-800 bg-[#0d1424]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <span className="font-bold text-lg tracking-wider text-slate-100">
                SCALE<span className="text-sky-400">LAB</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40 ml-2">
                PRO PLATFORM
              </span>
            </div>
            <div className="flex items-center space-x-5 text-xs font-medium">
              <a href="/" className="text-slate-300 hover:text-white transition flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Dashboard</span>
              </a>
              <a href="/scenarios/new" className="text-slate-400 hover:text-white transition flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Scenario Designer</span>
              </a>
              <a href="/traces" className="text-slate-400 hover:text-white transition flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Trace Waterfall</span>
              </a>
              <a href="/cicd" className="text-slate-400 hover:text-white transition flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CI/CD Gates</span>
              </a>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
