
# Load Testing & Monitoring Stack

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* Redis

### Testing & Monitoring Stack

* K6
* Prometheus
* Grafana

---

# System Architecture

```text
User Request
     ↓
Node.js + Express API
     ↓
PostgreSQL + Redis
     ↓
K6 generates load
     ↓
Prometheus stores metrics
     ↓
Grafana visualizes metrics
```

---

# 1. K6 - Load Testing Tool

K6 is an open-source load testing tool used to simulate real-world traffic on APIs and services.

### What K6 Measures

* Response Time
* Number of Requests
* Failure Rate
* Throughput
* Concurrent Users (VUs)

### Example

```javascript
export const options = {
  vus: 20,
  duration: "30s",
};
```

This simulates **20 users** continuously accessing the API for **30 seconds**.

---

# 2. Prometheus - Time Series Database

Prometheus is a monitoring system and time-series database that stores metrics over time.

Without Prometheus:

```text
K6 → Terminal Output Only
```

The results disappear after closing the terminal.

With Prometheus:

```text
K6 → Prometheus → Persistent Metrics Storage
```

Prometheus stores metrics such as:

| Time     | Requests | Response Time |
| -------- | -------- | ------------- |
| 12:00:01 | 5        | 800ms         |
| 12:00:02 | 7        | 900ms         |
| 12:00:03 | 10       | 1.2s          |

This enables historical analysis and monitoring.

---

# 3. Grafana - Visualization Tool

Grafana converts raw metrics into visual dashboards.

Prometheus stores data, while Grafana provides:

* Interactive Dashboards
* Graphs
* Tables
* Alerts

Architecture:

```text
Prometheus + Grafana = Monitoring Dashboard
```

This stack is widely used by companies such as:

* Netflix
* Uber
* Amazon
* Google

---

# Docker Setup

## docker-compose.yml

Docker Compose automatically starts and connects services.

Example:

```yaml
services:
  prometheus:
    image: prom/prometheus

  grafana:
    image: grafana/grafana
```

This file:

* Downloads Prometheus
* Downloads Grafana
* Runs both services
* Connects them via Docker network

Without Docker, manual installation and configuration would be required.

---

# Prometheus Configuration

## prometheus.yml

Prometheus requires configuration to know:

* What to monitor
* How often to monitor

Example:

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

This configuration instructs Prometheus to collect metrics every **5 seconds**.

---

# Remote Write Receiver

```yaml
--web.enable-remote-write-receiver
```

This flag enables Prometheus to receive metrics from K6.

Flow:

```text
K6 → Prometheus Remote Write API → Stored Metrics
```

Without this flag:

```text
HTTP 404 Error
```

---

# Common K6 Metrics

## 1. k6_http_reqs_total

Measures:

```text
Total number of HTTP requests sent
```

Example:

```text
287 requests
```

Higher values indicate more API traffic.

---

## 2. k6_vus

Measures:

```text
Number of active Virtual Users
```

Example:

```javascript
vus: 20
```

This simulates **20 concurrent users** interacting with the application.

---

## 3. k6_http_req_duration

Measures API response time.

Performance Guidelines:

| Response Time | Interpretation     |
| ------------- | ------------------ |
| < 200 ms      | Excellent          |
| 200–500 ms    | Good               |
| 500–1000 ms   | Acceptable         |
| > 1000 ms     | Needs Optimization |

---

## 4. k6_http_req_failed

Measures failed requests.

Example:

```text
0% Failed Requests
```

Indicates excellent API reliability.

---

# Why This Stack Matters

For a ticket booking platform, thousands of users may attempt to:

* Login simultaneously
* Lock seats
* Book tickets

Important questions:

* Can the server handle peak traffic?
* Will login fail under load?
* Can seat locking remain consistent?
* What is the average response time?
* How many requests per second can the system process?

The K6 + Prometheus + Grafana stack answers these questions through measurable performance metrics and visual dashboards.

---

# Industry Standard Stack

```text
K6 → Prometheus → Grafana
```

This monitoring and performance testing stack is widely adopted in modern cloud-native systems and production environments.
