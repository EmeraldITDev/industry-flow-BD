import api from './api';

export const DEFAULT_OPPORTUNITY_CARD_FIELDS = [
  'projectName',
  'businessVertical',
  'projectStatus',
  'pipelineStage',
  'teamLead',
  'leadTime',
  'clientName',
  'dealProbability',
  'progress',
  'taskSummary',
] as const;

export const OPPORTUNITY_CARD_FIELD_OPTIONS = [
  { key: 'projectName', label: 'Opportunity / RFQ Reference', required: true },
  { key: 'businessVertical', label: 'Business Vertical' },
  { key: 'projectStatus', label: 'Project Status' },
  { key: 'pipelineStage', label: 'Pipeline Stage' },
  { key: 'teamLead', label: 'Team Lead' },
  { key: 'teamMembers', label: 'Assigned Team Members' },
  { key: 'leadTime', label: 'Lead Time' },
  { key: 'pipelineIntakeDate', label: 'Pipeline Intake Date' },
  { key: 'expectedCloseDate', label: 'Expected Close Date' },
  { key: 'daysRemaining', label: 'Days Remaining / Overdue' },
  { key: 'clientName', label: 'Client Name' },
  { key: 'sector', label: 'Sector' },
  { key: 'oem', label: 'OEM' },
  { key: 'channelPartner', label: 'Channel Partner' },
  { key: 'products', label: 'Product / Product Category' },
  { key: 'contractValue', label: 'Contract Value', financial: true },
  { key: 'expectedMargin', label: 'Expected Margin', financial: true },
  { key: 'dealProbability', label: 'Deal Probability' },
  { key: 'progress', label: 'Project Progress' },
  { key: 'location', label: 'Location' },
  { key: 'taskSummary', label: 'Task Summary' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'description', label: 'Description' },
] as const;

export type OpportunityCardField =
  (typeof OPPORTUNITY_CARD_FIELD_OPTIONS)[number]['key'];

export interface OpportunityCardPreferences {
  fields: string[];
  overrides: Record<string, string[]>;
}

export const opportunityCardPreferencesService = {
  async get(): Promise<OpportunityCardPreferences> {
    const response = await api.get<OpportunityCardPreferences>(
      '/me/opportunity-card-preferences',
    );
    return response.data;
  },

  async saveGlobal(fields: string[]): Promise<OpportunityCardPreferences> {
    const response = await api.put<OpportunityCardPreferences>(
      '/me/opportunity-card-preferences',
      { fields },
    );
    return response.data;
  },

  async saveForProject(
    projectId: string,
    fields: string[],
  ): Promise<OpportunityCardPreferences> {
    const response = await api.put<OpportunityCardPreferences>(
      `/me/opportunity-card-preferences/${encodeURIComponent(projectId)}`,
      { fields },
    );
    return response.data;
  },

  async resetProject(projectId: string): Promise<OpportunityCardPreferences> {
    const response = await api.delete<OpportunityCardPreferences>(
      `/me/opportunity-card-preferences/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },
};
