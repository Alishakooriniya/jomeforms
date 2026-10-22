import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { ListOptions } from '../types/domain.js';

export interface DashboardCounts {
  clientsTotal: number;
  clientsActive: number;
  documentRequests: number;
  rentRenewals: number;
  documentsTotal: number;
  awaitingSignature: number;
  scansTotal: number;
}

export interface RecentClientRow {
  id: string;
  fullName: string;
  code: string;
  status: string;
  caseType: string;
  companyName: string | null;
  createdAt: string;
}

export interface EvidenceFollowUpRow {
  clientId: string;
  clientName: string;
  clientCode: string;
  stepId: string;
  stepTitle: string;
}

export interface OverviewAggregates {
  signedDocuments: number;
  scannedDocuments: number;
  clientStatus: Array<{ status: string; count: number }>;
  clientCaseType: Array<{ caseType: string; count: number }>;
  documentStatus: Array<{ status: string; count: number }>;
  templateUsage: Array<{
    id: string;
    title: string;
    documents: number;
    signed: number;
    scanned: number;
    draft: number;
  }>;
  dailyClients: Array<{ day: string; count: number }>;
  dailyDocuments: Array<{ day: string; count: number }>;
}

export interface AgentRow {
  id: string;
  name: string;
  clients: number;
  documents: number;
  scans: number;
}

interface CountRow {
  total: string;
}

export class ReportRepository {
  async dashboardCounts(): Promise<DashboardCounts> {
    const result = await query<{
      clients_total: string;
      clients_active: string;
      document_requests: string;
      rent_renewals: string;
      documents_total: string;
      awaiting_signature: string;
      scans_total: string;
    }>(`
      select
        (select count(*)::text from clients) as clients_total,
        (select count(*)::text from clients where status not in ('done', 'archived')) as clients_active,
        (select count(*)::text from clients where case_type = 'document_request') as document_requests,
        (select count(*)::text from clients where case_type = 'rent_renewal') as rent_renewals,
        (select count(*)::text from documents) as documents_total,
        (select count(*)::text from documents where status = 'awaiting_signature') as awaiting_signature,
        (select count(*)::text from document_scans) as scans_total
    `);
    const row = result.rows[0];
    return {
      clientsTotal: Number(row?.clients_total ?? 0),
      clientsActive: Number(row?.clients_active ?? 0),
      documentRequests: Number(row?.document_requests ?? 0),
      rentRenewals: Number(row?.rent_renewals ?? 0),
      documentsTotal: Number(row?.documents_total ?? 0),
      awaitingSignature: Number(row?.awaiting_signature ?? 0),
      scansTotal: Number(row?.scans_total ?? 0),
    };
  }

  async recentClients(limit: number): Promise<RecentClientRow[]> {
    const result = await query<{
      id: string;
      full_name: string;
      code: string;
      status: string;
      case_type: string;
      company_name: string | null;
      created_at: Date;
    }>(
      `select cl.id, cl.full_name, cl.code, cl.status, cl.case_type, co.name as company_name, cl.created_at
       from clients cl
       left join companies co on co.id = cl.company_id
       order by cl.created_at desc
       limit $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      code: row.code,
      status: row.status,
      caseType: row.case_type,
      companyName: row.company_name,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  /** Cases whose first pending step requires evidence that was not uploaded yet. */
  async evidenceFollowUps(limit: number): Promise<EvidenceFollowUpRow[]> {
    const result = await query<{
      client_id: string;
      client_name: string;
      client_code: string;
      step_id: string;
      step_title: string;
    }>(
      `select cl.id as client_id, cl.full_name as client_name, cl.code as client_code,
              step->>'id' as step_id, step->>'title' as step_title
       from clients cl
       cross join lateral (
         select step
         from jsonb_array_elements(cl.workflow) with ordinality as t(step, pos)
         where step->>'status' = 'pending'
         order by pos
         limit 1
       ) first_pending
       where (first_pending.step->>'requiresEvidence')::boolean = true
         and jsonb_array_length(coalesce(first_pending.step->'evidenceIds', '[]'::jsonb)) = 0
       order by cl.updated_at desc
       limit $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      clientId: row.client_id,
      clientName: row.client_name,
      clientCode: row.client_code,
      stepId: row.step_id,
      stepTitle: row.step_title,
    }));
  }

  async overview(): Promise<OverviewAggregates> {
    const statusResult = await query<{ status: string; count: string }>(
      `select status::text, count(*)::text as count from clients group by status`,
    );
    const caseTypeResult = await query<{ case_type: string; count: string }>(
      `select case_type::text, count(*)::text as count from clients group by case_type`,
    );
    const docStatusResult = await query<{ status: string; count: string }>(
      `select status::text, count(*)::text as count from documents group by status`,
    );
    const templateResult = await query<{
      id: string;
      title: string;
      documents: string;
      signed: string;
      scanned: string;
      draft: string;
    }>(`
      select t.id, t.title,
             count(d.id)::text as documents,
             count(d.id) filter (where d.status in ('signed', 'scanned'))::text as signed,
             count(d.id) filter (where exists (select 1 from document_scans s where s.document_id = d.id))::text as scanned,
             count(d.id) filter (where d.status = 'draft')::text as draft
      from form_templates t
      left join documents d on d.template_id = t.id
      group by t.id, t.title
      order by count(d.id) desc, t.title
    `);
    const totalsResult = await query<{
      signed_documents: string;
      scanned_documents: string;
    }>(`
      select
        (select count(*)::text from documents where status in ('signed', 'scanned')) as signed_documents,
        (select count(*)::text from documents
          where exists (select 1 from document_scans s where s.document_id = documents.id)) as scanned_documents
    `);
    const dailyClients = await query<{ day: string; count: string }>(
      `select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::text as count
       from clients where created_at >= now() - interval '400 days'
       group by 1 order by 1`,
    );
    const dailyDocuments = await query<{ day: string; count: string }>(
      `select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::text as count
       from documents where created_at >= now() - interval '400 days'
       group by 1 order by 1`,
    );

    const totals = totalsResult.rows[0];
    return {
      signedDocuments: Number(totals?.signed_documents ?? 0),
      scannedDocuments: Number(totals?.scanned_documents ?? 0),
      clientStatus: statusResult.rows.map((row) => ({ status: row.status, count: Number(row.count) })),
      clientCaseType: caseTypeResult.rows.map((row) => ({ caseType: row.case_type, count: Number(row.count) })),
      documentStatus: docStatusResult.rows.map((row) => ({ status: row.status, count: Number(row.count) })),
      templateUsage: templateResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        documents: Number(row.documents),
        signed: Number(row.signed),
        scanned: Number(row.scanned),
        draft: Number(row.draft),
      })),
      dailyClients: dailyClients.rows.map((row) => ({ day: row.day, count: Number(row.count) })),
      dailyDocuments: dailyDocuments.rows.map((row) => ({ day: row.day, count: Number(row.count) })),
    };
  }

  async agents(filters: ListOptions): Promise<{ items: AgentRow[]; total: number }> {
    const params: QueryParam[] = [];
    let whereSql = '';
    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereSql = `where name ilike $${params.length}`;
    }

    const sortable: Record<string, string> = {
      name: 'name',
      clients: 'clients',
      documents: 'documents',
      scans: 'scans',
    };
    const sortColumn = sortable[filters.sortBy ?? 'documents'] ?? 'documents';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const base = `
      with client_agents as (
        select coalesce(u.full_name, 'کاربر سامانه') as name,
               count(*)::int as clients
        from clients cl
        left join users u on u.id = cl.created_by
        group by 1
      ),
      document_agents as (
        select coalesce(nullif(trim(d.created_by_name), ''), 'کاربر سامانه') as name,
               count(*)::int as documents,
               coalesce(sum((select count(*) from document_scans s where s.document_id = d.id)), 0)::int as scans
        from documents d
        group by 1
      ),
      agents as (
        select coalesce(ca.name, da.name) as name,
               coalesce(ca.clients, 0) as clients,
               coalesce(da.documents, 0) as documents,
               coalesce(da.scans, 0) as scans
        from client_agents ca
        full outer join document_agents da on da.name = ca.name
      )
    `;

    const countResult = await query<CountRow>(`${base} select count(*)::text as total from agents ${whereSql}`, params);
    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<{
      name: string;
      clients: number;
      documents: number;
      scans: number;
    }>(
      `${base}
       select name, clients, documents, scans
       from agents ${whereSql}
       order by ${sortColumn} ${direction}, name
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map((row) => ({
        id: row.name,
        name: row.name,
        clients: row.clients,
        documents: row.documents,
        scans: row.scans,
      })),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }
}
