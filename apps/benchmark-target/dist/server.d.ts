export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    description: string;
    tags: string[];
}
export interface AppPerformanceProfile {
    version: 'v1_baseline' | 'v2_indexed' | 'v3_cached';
    simulateDbLatencyMs: number;
    simulateNPlusOne: boolean;
    cacheEnabled: boolean;
    artificialFailureRate: number;
}
//# sourceMappingURL=server.d.ts.map