"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify = (0, fastify_1.default)({ logger: false });
fastify.register(cors_1.default, { origin: true });
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Gaming', 'Office'];
const PRODUCTS = Array.from({ length: 2000 }).map((_, i) => ({
    id: `prod_${i + 1}`,
    name: `Product ${i + 1} - ${CATEGORIES[i % CATEGORIES.length]} Special`,
    category: CATEGORIES[i % CATEGORIES.length],
    price: Math.floor(Math.random() * 500) + 10,
    stock: Math.floor(Math.random() * 100) + 1,
    description: `High performance grade item number ${i + 1} with dynamic characteristics.`,
    tags: [CATEGORIES[i % CATEGORIES.length].toLowerCase(), 'sale', `tag_${i % 20}`],
}));
let currentProfile = {
    version: 'v1_baseline',
    simulateDbLatencyMs: 85, // Simulates unoptimized table scan
    simulateNPlusOne: true, // Simulates multiple sequential fetches
    cacheEnabled: false,
    artificialFailureRate: 0.005, // 0.5% random failure rate under baseline
};
// In-memory cache for v3
const memoryCache = new Map();
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Health check and target verification endpoint
fastify.get('/api/health', async () => {
    return {
        status: 'ok',
        service: 'scalelab-benchmark-ecommerce',
        version: currentProfile.version,
        profile: currentProfile,
        productCount: PRODUCTS.length,
        timestamp: new Date().toISOString(),
    };
});
// Switch profile on the fly (for before/after benchmarks)
fastify.post('/api/admin/profile', async (req) => {
    currentProfile = { ...currentProfile, ...req.body };
    if (!currentProfile.cacheEnabled) {
        memoryCache.clear();
    }
    return { message: 'Performance profile updated', profile: currentProfile };
});
// GET /api/products - Listing with pagination and simulated latency
fastify.get('/api/products', async (req, reply) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const category = req.query.category;
    const traceId = req.headers['x-scalelab-trace-id'] || `tr_${Date.now()}_${Math.random()}`;
    const startTime = Date.now();
    // Simulated failure check
    if (Math.random() < currentProfile.artificialFailureRate) {
        reply.status(500);
        return { error: 'Internal Database Connection Timeout', traceId };
    }
    // Cache check for v3
    const cacheKey = `products_${page}_${limit}_${category || 'all'}`;
    if (currentProfile.cacheEnabled) {
        const cached = memoryCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            reply.header('x-cache', 'HIT');
            reply.header('x-scalelab-trace-id', traceId);
            return {
                data: cached.data,
                cached: true,
                executionTimeMs: Date.now() - startTime,
                trace: { controllerMs: 2, dbMs: 0, cacheMs: 1 },
            };
        }
    }
    // Simulated Database query latency
    const dbLatency = currentProfile.simulateDbLatencyMs;
    await sleep(dbLatency);
    let filtered = category ? PRODUCTS.filter((p) => p.category.toLowerCase() === category.toLowerCase()) : PRODUCTS;
    // N+1 query simulation: in v1 baseline, it queries each item's metadata individually
    let nPlusOneTime = 0;
    if (currentProfile.simulateNPlusOne) {
        const nPlusOneCount = Math.min(limit, 15);
        nPlusOneTime = nPlusOneCount * 4; // 4ms per sequential query
        await sleep(nPlusOneTime);
    }
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    const responsePayload = {
        products: paginated,
        page,
        limit,
        total: filtered.length,
    };
    if (currentProfile.cacheEnabled) {
        memoryCache.set(cacheKey, { data: responsePayload, expiry: Date.now() + 60000 });
    }
    const totalTime = Date.now() - startTime;
    reply.header('x-cache', 'MISS');
    reply.header('x-scalelab-trace-id', traceId);
    return {
        data: responsePayload,
        cached: false,
        executionTimeMs: totalTime,
        trace: {
            traceId,
            controllerMs: 5,
            dbQueryMs: dbLatency,
            nPlusOneQueryMs: nPlusOneTime,
            totalDbMs: dbLatency + nPlusOneTime,
            networkBufferMs: totalTime - (dbLatency + nPlusOneTime + 5),
        },
    };
});
// GET /api/search - Product search simulation
fastify.get('/api/search', async (req, reply) => {
    const query = (req.query.q || '').toLowerCase();
    const startTime = Date.now();
    const searchDbLatency = currentProfile.simulateDbLatencyMs * 1.2;
    await sleep(searchDbLatency);
    const results = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)).slice(0, 30);
    return {
        query,
        count: results.length,
        results,
        executionTimeMs: Date.now() - startTime,
        trace: { dbQueryMs: searchDbLatency },
    };
});
// POST /api/cart - Cart manipulation
fastify.post('/api/cart', async (req) => {
    const { productId, quantity } = req.body || { productId: 'prod_1', quantity: 1 };
    await sleep(25); // 25ms transactional latency
    return {
        success: true,
        item: { productId, quantity, addedAt: new Date().toISOString() },
    };
});
const PORT = parseInt(process.env.BENCHMARK_PORT || '4000', 10);
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`🚀 [ScaleLab Benchmark Target API] running at http://localhost:${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map