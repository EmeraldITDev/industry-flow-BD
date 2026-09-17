import api from './api';
import { Project } from '@/types';

export interface MetricAggregate {
  metric: string;
  count: number;
  valueNgn: number;
  valueUsd: number;
}

export interface MetricRecordsResult {
  projects: Project[];
  total: number;
  metric: string;
  totals: { count: number; valueNgn: number; valueUsd: number };
}

/** Query string fragment the Projects page uses to load /api/metrics/records. */
export function metricSearch(metric: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ metric, ...extra });
  return params.toString();
}

export function metricLabel(metric: string): string {
  if (metric === 'active') return 'Active opportunities';
  if (metric === 'won') return 'Deals won';
  if (metric === 'nearConversion') return 'Close to winning';
  if (metric === 'stagnant') return 'Stagnant opportunities';
  if (metric === 'all') return 'Opportunities';
  if (metric.startsWith('stage:')) {
    const stage = metric.slice(6);
    return `Pipeline: ${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
  }
  const sep = metric.indexOf(':');
  if (sep > 0) {
    const kind = metric.slice(0, sep);
    const value = metric.slice(sep + 1);
    const kindLabel: Record<string, string> = {
      clients: 'Client',
      partners: 'Partner',
      sectors: 'Sector',
      verticals: 'Vertical',
      products: 'Product',
      subproducts: 'Sub-product',
    };
    return `${kindLabel[kind] ?? kind}: ${value}`;
  }
  return metric;
}

export const metricsService = {
  async summary(extra: Record<string, unknown> = {}) {
    const response = await api.get('/api/metrics/summary', { params: extra });
    return response.data;
  },

  async aggregate(metric: string, extra: Record<string, unknown> = {}): Promise<MetricAggregate> {
    const response = await api.get('/api/metrics', { params: { metric, ...extra } });
    return response.data;
  },

  async getAllRecords(metric: string, extra: Record<string, unknown> = {}): Promise<MetricRecordsResult> {
    const { projectsService } = await import('./projects');
    const all: Project[] = [];
    let page = 1;
    let lastPage = 1;
    let total = 0;
    let totals = { count: 0, valueNgn: 0, valueUsd: 0 };
    let resolvedMetric = metric;

    do {
      const response = await api.get('/api/metrics/records', {
        params: { metric, page, per_page: 100, ...extra },
      });
      const data = response.data;
      const rows = Array.isArray(data?.data) ? data.data : [];
      const mapped = rows.map((row: unknown) => projectsService.normalize(row));
      all.push(...mapped);

      const meta = data?.meta ?? {};
      lastPage = Number(meta.last_page ?? 1);
      total = Number(meta.total ?? data?.totals?.count ?? all.length);
      if (data?.totals) totals = data.totals;
      if (data?.metric) resolvedMetric = data.metric;
      page += 1;
    } while (page <= lastPage);

    return { projects: all, total, metric: resolvedMetric, totals };
  },
};
