import api from './api';
import {
  ExecutiveIntelligence,
  OpportunityRow,
  ReviewPeriodKey,
} from '@/lib/executive/analytics';
import { normalizeExecutiveSummary } from '@/lib/executive/summary';
import { AccountGroup } from '@/lib/executive/accountGroups';

function reviveRow(row: any): OpportunityRow {
  return {
    ...row,
    lastActivity: row?.lastActivity ? new Date(row.lastActivity) : null,
  };
}

function reviveIntelligence(data: any): ExecutiveIntelligence {
  const mapRows = (rows: any[] | undefined) => (rows ?? []).map(reviveRow);
  const requiresAttention = Array.isArray(data.requiresAttention) ? data.requiresAttention : [];

  return {
    ...data,
    nearConversion: mapRows(data.nearConversion),
    conversion: {
      ...data.conversion,
    },
    requiresAttention,
    summary: normalizeExecutiveSummary(data.summary, requiresAttention),
    accounts: (data.accounts ?? []).map((a: any) => ({
      ...a,
      topOpportunities: mapRows(a.topOpportunities),
    })),
    movement: {
      ...data.movement,
      created: mapRows(data.movement?.created),
      updated: mapRows(data.movement?.updated),
      won: mapRows(data.movement?.won),
      overdue: mapRows(data.movement?.overdue),
    },
  };
}

export const executiveService = {
  async getIntelligence(
    period: ReviewPeriodKey,
    accountGroups?: AccountGroup[],
    custom?: { from?: string; to?: string }
  ): Promise<ExecutiveIntelligence> {
    const response = await api.get('/api/executive/intelligence', {
      params: {
        period,
        from: custom?.from,
        to: custom?.to,
        groups: accountGroups ? JSON.stringify(accountGroups) : undefined,
      },
    });
    return reviveIntelligence(response.data);
  },
};
