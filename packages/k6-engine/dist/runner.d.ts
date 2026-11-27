import { EventEmitter } from 'events';
import { ScenarioConfig, AggregatedRunResult, BottleneckDiagnosis } from '@scalelab/shared-types';
export declare class StandaloneLoadRunner extends EventEmitter {
    private config;
    private runId;
    private isAborted;
    private completedRequests;
    private failedRequests;
    private latenciesMs;
    private statusCodeCounts;
    private startTime;
    constructor(config: ScenarioConfig, runId: string);
    abort(): void;
    run(): Promise<AggregatedRunResult>;
    private executeSingleHttp;
}
export declare function analyzeBottlenecks(result: AggregatedRunResult): BottleneckDiagnosis;
//# sourceMappingURL=runner.d.ts.map