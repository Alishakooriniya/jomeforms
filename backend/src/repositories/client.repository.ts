import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { DbClient, QueryParam } from '../config/database.js';
import type {
  Client,
  ClientCaseType,
  ClientStatus,
  ClientWithRelations,
  ClientWorkflowStep,
  DealKind,
  ListOptions,
  PartyRole,
  PropertyKind,
  WorkflowEvidence,
} from '../types/domain.js';

export interface ClientFilters extends ListOptions {
  status?: ClientStatus;
  caseType?: ClientCaseType;
  companyId?: string;
  agentName?: string;
}

export interface ClientInput {
  code?: string;
  fullName: string;
  nationalId?: string;
  mobile?: string;
  caseType: ClientCaseType;
  companyId?: string | null;
  workflow: ClientWorkflowStep[];
  phone?: string | null;
  email?: string | null;
  fatherName?: string | null;
  birthDate?: string | null;
  partyRole: PartyRole;
  party2Name?: string | null;
  party2Role?: PartyRole;
  party2NationalId?: string | null;
  party2Mobile?: string | null;
  dealKind: DealKind;
  status: ClientStatus;
  province: string;
  city: string;
  address: string;
  propertyKind: PropertyKind;
  area: number;
  region?: string | null;
  plate?: string | null;
  unit?: string | null;
  floor?: string | null;
  buildYear?: string | null;
  price: number;
  deposit: number;
  rent: number;
  commissionPercent: number;
  agentName?: string | null;
  source?: string | null;
  tags: string[];
  notes?: string | null;
  extra: Record<string, string>;
}

interface ClientRow extends QueryResultRow {
  id: string;
  code: string;
  full_name: string;
  national_id: string | null;
  mobile: string | null;
  case_type: ClientCaseType;
  company_id: string | null;
  workflow: ClientWorkflowStep[];
  phone: string | null;
  email: string | null;
  father_name: string | null;
  birth_date: string | null;
  party_role: PartyRole;
  party2_name: string | null;
  party2_role: PartyRole;
  party2_national_id: string | null;
  party2_mobile: string | null;
  deal_kind: DealKind;
  status: ClientStatus;
  province: string;
  city: string;
  address: string;
  property_kind: PropertyKind;
  area: string;
  region: string | null;
  plate: string | null;
  unit: string | null;
  floor: string | null;
  build_year: string | null;
  price: string;
  deposit: string;
  rent: string;
  commission_percent: string;
  agent_name: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  extra: Record<string, string>;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string | null;
  document_count?: string | number;
}

interface EvidenceRow extends QueryResultRow {
  id: string;
  client_id: string;
  step_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: string;
  storage_key: string;
  uploaded_at: Date;
  uploaded_by_name: string | null;
}

const SELECT_CLIENT = `
  select cl.*,
         co.name as company_name,
         (select count(*)::int from documents d where d.client_id = cl.id) as document_count
  from clients cl
  left join companies co on co.id = cl.company_id
`;

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    code: row.code,
    fullName: row.full_name,
    nationalId: row.national_id ?? '',
    mobile: row.mobile ?? '',
    caseType: row.case_type,
    companyId: row.company_id ?? undefined,
    workflow: row.workflow ?? [],
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    fatherName: row.father_name ?? undefined,
    birthDate: row.birth_date ?? undefined,
    partyRole: row.party_role,
    party2Name: row.party2_name ?? undefined,
    party2Role: row.party2_role,
    party2NationalId: row.party2_national_id ?? undefined,
    party2Mobile: row.party2_mobile ?? undefined,
    dealKind: row.deal_kind,
    status: row.status,
    province: row.province,
    city: row.city,
    address: row.address,
    propertyKind: row.property_kind,
    area: Number(row.area),
    region: row.region ?? undefined,
    plate: row.plate ?? undefined,
    unit: row.unit ?? undefined,
    floor: row.floor ?? undefined,
    buildYear: row.build_year ?? undefined,
    price: Number(row.price),
    deposit: Number(row.deposit),
    rent: Number(row.rent),
    commissionPercent: Number(row.commission_percent),
    agentName: row.agent_name ?? undefined,
    source: row.source ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    extra: row.extra ?? {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    createdBy: row.created_by ?? 'system',
  };
}

function mapEvidence(row: EvidenceRow): WorkflowEvidence {
  return {
    id: row.id,
    clientId: row.client_id,
    stepId: row.step_id,
    name: row.file_name,
    mime: row.mime_type,
    size: Number(row.size_bytes),
    blobKey: row.storage_key,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    uploadedBy: row.uploaded_by_name ?? 'system',
  };
}

const COLUMNS: Record<keyof ClientInput, string> = {
  code: 'code',
  fullName: 'full_name',
  nationalId: 'national_id',
  mobile: 'mobile',
  caseType: 'case_type',
  companyId: 'company_id',
  workflow: 'workflow',
  phone: 'phone',
  email: 'email',
  fatherName: 'father_name',
  birthDate: 'birth_date',
  partyRole: 'party_role',
  party2Name: 'party2_name',
  party2Role: 'party2_role',
  party2NationalId: 'party2_national_id',
  party2Mobile: 'party2_mobile',
  dealKind: 'deal_kind',
  status: 'status',
  province: 'province',
  city: 'city',
  address: 'address',
  propertyKind: 'property_kind',
  area: 'area',
  region: 'region',
  plate: 'plate',
  unit: 'unit',
  floor: 'floor',
  buildYear: 'build_year',
  price: 'price',
  deposit: 'deposit',
  rent: 'rent',
  commissionPercent: 'commission_percent',
  agentName: 'agent_name',
  source: 'source',
  tags: 'tags',
  notes: 'notes',
  extra: 'extra',
};

export class ClientRepository {
  async list(filters: ClientFilters): Promise<{ items: ClientWithRelations[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const index = params.length;
      where.push(`(
        cl.full_name ilike $${index}
        or cl.code ilike $${index}
        or coalesce(cl.national_id, '') ilike $${index}
        or coalesce(cl.mobile, '') ilike $${index}
        or exists (select 1 from companies c where c.id = cl.company_id and c.name ilike $${index})
      )`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`cl.status = $${params.length}`);
    }
    if (filters.caseType) {
      params.push(filters.caseType);
      where.push(`cl.case_type = $${params.length}`);
    }
    if (filters.companyId) {
      params.push(filters.companyId);
      where.push(`cl.company_id = $${params.length}`);
    }
    if (filters.agentName) {
      params.push(filters.agentName);
      where.push(`cl.agent_name = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      code: 'cl.code',
      fullName: 'cl.full_name',
      area: 'cl.area',
      price: 'cl.price',
      updatedAt: 'cl.updated_at',
      createdAt: 'cl.created_at',
    };
    const sortColumn = sortable[filters.sortBy ?? 'createdAt'] ?? 'cl.created_at';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from clients cl ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<ClientRow>(
      `${SELECT_CLIENT} ${whereSql}
       order by ${sortColumn} ${direction}, cl.id
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map((row) => ({
        ...mapClient(row),
        companyName: row.company_name ?? undefined,
        documentCount: Number(row.document_count ?? 0),
        evidence: [],
      })),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<ClientWithRelations | null> {
    const result = await query<ClientRow>(`${SELECT_CLIENT} where cl.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    const evidence = await this.listEvidence(id);
    return {
      ...mapClient(row),
      companyName: row.company_name ?? undefined,
      documentCount: Number(row.document_count ?? 0),
      evidence,
    };
  }

  async create(input: ClientInput, createdBy: string): Promise<Client> {
    const result = await query<ClientRow>(
      `insert into clients
        (code, full_name, national_id, mobile, case_type, company_id, workflow, phone, email, father_name,
         birth_date, party_role, party2_name, party2_role, party2_national_id, party2_mobile, deal_kind, status,
         province, city, address, property_kind, area, region, plate, unit, floor, build_year,
         price, deposit, rent, commission_percent, agent_name, source, tags, notes, extra, created_by)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
               $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37::jsonb, $38)
       returning *`,
      [
        input.code ?? '',
        input.fullName,
        input.nationalId ?? null,
        input.mobile ?? null,
        input.caseType,
        input.companyId ?? null,
        JSON.stringify(input.workflow),
        input.phone ?? null,
        input.email ?? null,
        input.fatherName ?? null,
        input.birthDate ?? null,
        input.partyRole,
        input.party2Name ?? null,
        input.party2Role ?? 'seller',
        input.party2NationalId ?? null,
        input.party2Mobile ?? null,
        input.dealKind,
        input.status,
        input.province,
        input.city,
        input.address,
        input.propertyKind,
        input.area,
        input.region ?? null,
        input.plate ?? null,
        input.unit ?? null,
        input.floor ?? null,
        input.buildYear ?? null,
        input.price,
        input.deposit,
        input.rent,
        input.commissionPercent,
        input.agentName ?? null,
        input.source ?? null,
        input.tags,
        input.notes ?? null,
        JSON.stringify(input.extra),
        createdBy,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create client');
    return mapClient(row);
  }

  async update(id: string, patch: Partial<ClientInput>): Promise<Client | null> {
    const assignments: string[] = [];
    const params: QueryParam[] = [];

    for (const [key, value] of Object.entries(patch) as Array<[keyof ClientInput, unknown]>) {
      if (value === undefined) continue;
      params.push((key === 'workflow' || key === 'extra' ? JSON.stringify(value) : value) as QueryParam);
      const cast = key === 'workflow' || key === 'extra' ? '::jsonb' : '';
      assignments.push(`${COLUMNS[key]} = $${params.length}${cast}`);
    }

    if (!assignments.length) return (await this.findById(id)) ?? null;

    params.push(id);
    const result = await query<ClientRow>(
      `update clients set ${assignments.join(', ')}, updated_at = now()
       where id = $${params.length} returning *`,
      params,
    );
    const row = result.rows[0];
    return row ? mapClient(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from clients where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async codeExists(code: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'select exists(select 1 from clients where code = $1) as exists',
      [code],
    );
    return result.rows[0]?.exists ?? false;
  }

  async findByCode(code: string): Promise<Client | null> {
    const result = await query<ClientRow>(`${SELECT_CLIENT} where cl.code = $1`, [code]);
    const row = result.rows[0];
    return row ? mapClient(row) : null;
  }

  /** Lock a case row for the duration of a workflow transaction. */
  async lockById(client: DbClient, id: string): Promise<Client | null> {
    const result = await client.query<ClientRow>(
      'select * from clients where id = $1 for update',
      [id],
    );
    const row = result.rows[0];
    return row ? mapClient(row) : null;
  }

  async saveWorkflow(
    client: DbClient,
    id: string,
    workflow: ClientWorkflowStep[],
    status: ClientStatus,
  ): Promise<Client> {
    const result = await client.query<ClientRow>(
      `update clients
       set workflow = $1::jsonb, status = $2, updated_at = now()
       where id = $3
       returning *`,
      [JSON.stringify(workflow), status, id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to persist workflow');
    return mapClient(row);
  }

  async addEvidence(
    client: DbClient,
    input: {
      clientId: string;
      stepId: string;
      fileName: string;
      mimeType: string;
      size: number;
      storageKey: string;
      checksum: string;
      uploadedBy: string;
    },
  ): Promise<WorkflowEvidence> {
    const result = await client.query<EvidenceRow>(
      `insert into case_workflow_evidence
        (client_id, step_id, file_name, mime_type, size_bytes, storage_key, checksum, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        input.clientId,
        input.stepId,
        input.fileName,
        input.mimeType,
        input.size,
        input.storageKey,
        input.checksum,
        input.uploadedBy,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to store workflow evidence');
    const uploadedBy = await client.query<{ full_name: string }>(
      'select full_name from users where id = $1',
      [input.uploadedBy],
    );
    return mapEvidence({ ...row, uploaded_by_name: uploadedBy.rows[0]?.full_name ?? null });
  }

  async listEvidence(clientId: string): Promise<WorkflowEvidence[]> {
    const result = await query<EvidenceRow>(
      `select e.*, u.full_name as uploaded_by_name
       from case_workflow_evidence e
       left join users u on u.id = e.uploaded_by
       where e.client_id = $1
       order by e.uploaded_at desc`,
      [clientId],
    );
    return result.rows.map(mapEvidence);
  }

  async findEvidenceById(id: string): Promise<(WorkflowEvidence & { storageKey: string }) | null> {
    const result = await query<EvidenceRow & { storage_key: string }>(
      `select e.*, u.full_name as uploaded_by_name
       from case_workflow_evidence e
       left join users u on u.id = e.uploaded_by
       where e.id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...mapEvidence(row), blobKey: row.storage_key, storageKey: row.storage_key };
  }
}
