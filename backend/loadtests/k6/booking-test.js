import http from 'k6/http';
import { check, sleep } from 'k6';

// Read configuration from environment variables, fallback to defaults
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const EVENT_ID = __ENV.EVENT_ID || '1';

export const options = {
    stages: [
        { duration: '30s', target: 200 }, // Ramp-up to 200 VUs
        { duration: '1m', target: 200 },  // Sustain 200 VUs (stress phase)
        { duration: '30s', target: 0 },   // Ramp-down to 0 VUs
    ],

    http: {
        cookieJar: {
            local: true,
        },
    },
    thresholds: {
        // Assert that less than 1% of requests to the getSeatMap endpoint fail
        'http_req_failed{name:getSeatMap}': ['rate<0.01'],
        // Assert that 95% of requests to the getSeatMap endpoint complete within 500ms
        'http_req_duration{name:getSeatMap}': ['p(95)<500'],
    },
};

export default function () {
    const seatMapParams = {
        headers: {
            'Content-Type': 'application/json',
            // No identity headers needed since the backend generates and tracks guestIds natively
        },
        tags: { name: 'getSeatMap' },
    };

    // Fetch the seat map for the designated event
    const seatMapRes = http.get(`${BASE_URL}/api/events/${EVENT_ID}/seats`, seatMapParams);

    // Assert that response is 200 (ACTIVE) or 202 (WAITING in queue)
    check(seatMapRes, {
        'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
        'valid status field': (r) => {
            try {
                const body = r.json();
                return body.status === 'ACTIVE' || body.status === 'WAITING';
            } catch (e) {
                return false;
            }
        },
    });

    // Pause for 1 second between requests per VU to simulate real user behavior
    sleep(1);
}