import type { AuditService } from './audit.service.js';
import type {
  AgentRow,
  DashboardCounts,
  EvidenceFollowUpRow,
  RecentClientRow,
  ReportRepository,
} from '../repositories/report.repository.js';
import type { AuditEntry, ListOptions } from '../types/domain.js';
import { aggregateByJalaliMonth, lastJalaliMonths } from '../utils/jalali.js';

export interface DashboardPayload {
  counts: DashboardCounts;
  recentClients: RecentClientRow[];
  evidenceFollowUps: EvidenceFollowUpRow[];
  recentAudit: AuditEntry[];
}

export interface OverviewPayload {
  totals: DashboardCounts & {
    totalValue: number;
    signedDocuments: number;
    scannedDocuments: number;
  };
  ratios: { signedPercent: number; scannedPercent: number };
  clientStatus: Array<{ status: string; count: number }>;
  clientCaseType: Array<{ caseType: string; count: number }>;
  propertyKind: Array<{ propertyKind: string; count: number }>;
  dealKind: Array<{ dealKind: string; count: number }>;
  documentStatus: Array<{ status: string; count: number }>;
  templateUsage: Array<{
    id: string;
    title: string;
    documents: number;
    signed: number;
    scanned: number;
    draft: number;
  }>;
  monthly: Array<{ key: string; label: string; documents: number; clients: number }>;
}

export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly audit: AuditService,
  ) {}

  async dashboard(): Promise<DashboardPayload> {
    const [counts, recentClients, evidenceFollowUps, recentAudit] = await Promise.all([
      this.reports.dashboardCounts(),
      this.reports.recentClients(5),
      this.reports.evidenceFollowUps(5),
      this.audit.recent(6),
    ]);

    return { counts, recentClients, evidenceFollowUps, recentAudit };
  }

  async overview(): Promise<OverviewPayload> {
    const [counts, aggregates] = await Promise.all([
      this.reports.dashboardCounts(),
      this.reports.overview(),
    ]);

    const months = lastJalaliMonths(6);
    const documentTotals = aggregateByJalaliMonth(aggregates.dailyDocuments, months);
    const clientTotals = aggregateByJalaliMonth(aggregates.dailyClients, months);
    const monthly = months.map((month, index) => ({
      key: month.key,
      label: month.label,
      documents: documentTotals[index] ?? 0,
      clients: clientTotals[index] ?? 0,
    }));

    return {
      totals: { ...counts, totalValue: aggregates.totalValue, signedDocuments: aggregates.signedDocuments, scannedDocuments: aggregates.scannedDocuments },
      ratios: {
        signedPercent: counts.documentsTotal
          ? Math.round((aggregates.signedDocuments / counts.documentsTotal) * 100)
          : 0,
        scannedPercent: counts.documentsTotal
          ? Math.round((aggregates.scannedDocuments / counts.documentsTotal) * 100)
          : 0,
      },
      clientStatus: aggregates.clientStatus,
      clientCaseType: aggregates.clientCaseType,
      propertyKind: aggregates.propertyKind,
      dealKind: aggregates.dealKind,
      documentStatus: aggregates.documentStatus,
      templateUsage: aggregates.templateUsage,
      monthly,
    };
  }

  async agents(filters: ListOptions): Promise<{ items: AgentRow[]; total: number }> {
    return this.reports.agents(filters);
  }
}
