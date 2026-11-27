"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateK6Script = generateK6Script;
function generateK6Script(config) {
    const stepsJs = config.steps
        .map((step) => {
        const headers = JSON.stringify({
            'Content-Type': 'application/json',
            'User-Agent': 'ScaleLab-K6-Worker/1.0',
            ...(step.headers || {}),
        });
        const body = step.body ? JSON.stringify(step.body) : 'null';
        const url = `${config.targetBaseUrl.replace(/\/$/, '')}${step.endpoint.startsWith('/') ? '' : '/'}${step.endpoint}`;
        return `
    {
      const res = http.${step.method.toLowerCase()}('${url}', ${body !== 'null' ? JSON.stringify(body) : 'null'}, { headers: ${headers} });
      check(res, {
        'status is ${step.expectedStatus || 200}': (r) => r.status === ${step.expectedStatus || 200},
      });
      sleep(0.05);
    }
    `;
    })
        .join('\n');
    let stageConfig = '';
    if (config.loadPattern === 'ramp-up') {
        const rampTime = config.rampUpSeconds || Math.round(config.durationSeconds * 0.3);
        const holdTime = config.durationSeconds - rampTime;
        stageConfig = `
      stages: [
        { duration: '${rampTime}s', target: ${config.virtualUsers} },
        { duration: '${Math.max(1, holdTime)}s', target: ${config.virtualUsers} },
        { duration: '3s', target: 0 },
      ],
    `;
    }
    else if (config.loadPattern === 'spike') {
        stageConfig = `
      stages: [
        { duration: '5s', target: ${Math.round(config.virtualUsers * 0.2)} },
        { duration: '5s', target: ${config.virtualUsers} },
        { duration: '${Math.max(5, config.durationSeconds - 15)}s', target: ${config.virtualUsers} },
        { duration: '5s', target: 0 },
      ],
    `;
    }
    else {
        // Constant
        stageConfig = `
      vus: ${config.virtualUsers},
      duration: '${config.durationSeconds}s',
    `;
    }
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  ${stageConfig}
  thresholds: {
    http_req_failed: ['rate<${(config.thresholds?.maxErrorRatePct || 10) / 100}'],
    http_req_duration: ['p(95)<${config.thresholds?.maxP95LatencyMs || 2000}'],
  },
};

export default function () {
  ${stepsJs}
}
`;
}
//# sourceMappingURL=generator.js.map