/**
 * Lightweight performance metrics helpers for dev builds.
 *
 * These utilities are intentionally minimal:
 * - No external dependencies
 * - No side effects in production / release builds
 * - Small in-memory footprint (bounded history)
 */

type MetricRecord = {
  name: string;
  value: number;
  context?: string;
  timestamp: number;
};

const ENABLE_PERF_METRICS =
  __DEV__ && (process.env.ENABLE_PERF_METRICS === '1' || process.env.ENABLE_PERF_METRICS === 'true');

// Keep a small ring buffer of the most recent metric records in memory during dev
const MAX_RECORDS = 200;
const records: MetricRecord[] = [];

export function recordCountMetric(name: string, value: number, context?: string): void {
  if (!ENABLE_PERF_METRICS) {
    return;
  }

  const now = Date.now();
  records.push({ name, value, context, timestamp: now });

  if (records.length > MAX_RECORDS) {
    records.splice(0, records.length - MAX_RECORDS);
  }
}

export function getRecentMetrics(): MetricRecord[] {
  if (!ENABLE_PERF_METRICS) {
    return [];
  }
  return [...records];
}

