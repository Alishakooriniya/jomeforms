import { AuditRepository } from './repositories/audit.repository.js';
import { ClientRepository } from './repositories/client.repository.js';
import { CompanyRepository } from './repositories/company.repository.js';
import { DocumentRepository } from './repositories/document.repository.js';
import { ReportRepository } from './repositories/report.repository.js';
import { RoleRepository } from './repositories/role.repository.js';
import { ScanRepository } from './repositories/scan.repository.js';
import { SequenceRepository } from './repositories/sequence.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { SettingsRepository } from './repositories/settings.repository.js';
import { TemplateRepository } from './repositories/template.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { AuditService } from './services/audit.service.js';
import { AuthService } from './services/auth.service.js';
import { ClientService } from './services/client.service.js';
import { CompanyService } from './services/company.service.js';
import { DocumentService } from './services/document.service.js';
import { LocalDiskStorage } from './services/storage.service.js';
import type { FileStorage } from './services/storage.service.js';
import { ReportService } from './services/report.service.js';
import { RoleService } from './services/role.service.js';
import { ScanService } from './services/scan.service.js';
import { SettingsService } from './services/settings.service.js';
import { TemplateService } from './services/template.service.js';
import { UserService } from './services/user.service.js';
import { WorkflowService } from './services/workflow.service.js';

export interface Repositories {
  users: UserRepository;
  roles: RoleRepository;
  companies: CompanyRepository;
  clients: ClientRepository;
  templates: TemplateRepository;
  documents: DocumentRepository;
  scans: ScanRepository;
  sessions: SessionRepository;
  audit: AuditRepository;
  settings: SettingsRepository;
  sequences: SequenceRepository;
  reports: ReportRepository;
}

export interface Services {
  audit: AuditService;
  auth: AuthService;
  users: UserService;
  roles: RoleService;
  companies: CompanyService;
  clients: ClientService;
  workflow: WorkflowService;
  templates: TemplateService;
  documents: DocumentService;
  scans: ScanService;
  settings: SettingsService;
  reports: ReportService;
}

export interface Container {
  repositories: Repositories;
  services: Services;
  storage: FileStorage;
}

export function createRepositories(): Repositories {
  return {
    users: new UserRepository(),
    roles: new RoleRepository(),
    companies: new CompanyRepository(),
    clients: new ClientRepository(),
    templates: new TemplateRepository(),
    documents: new DocumentRepository(),
    scans: new ScanRepository(),
    sessions: new SessionRepository(),
    audit: new AuditRepository(),
    settings: new SettingsRepository(),
    sequences: new SequenceRepository(),
    reports: new ReportRepository(),
  };
}

export function createContainer(options: { storage?: FileStorage } = {}): Container {
  const repositories = createRepositories();
  const storage = options.storage ?? new LocalDiskStorage();

  const audit = new AuditService(repositories.audit);
  const auth = new AuthService(repositories.users, repositories.sessions, repositories.audit);
  const users = new UserService(repositories.users, repositories.companies, audit, auth);
  const roles = new RoleService(repositories.roles, audit);
  const companies = new CompanyService(repositories.companies, repositories.users, audit);
  const clients = new ClientService(
    repositories.clients,
    repositories.companies,
    repositories.settings,
    repositories.sequences,
    audit,
  );
  const workflow = new WorkflowService(repositories.clients, storage, audit);
  const templates = new TemplateService(repositories.templates, audit);
  const documents = new DocumentService(
    repositories.documents,
    repositories.templates,
    repositories.clients,
    repositories.scans,
    repositories.settings,
    repositories.sequences,
    storage,
    audit,
  );
  const scans = new ScanService(repositories.documents, repositories.scans, storage, audit);
  const settings = new SettingsService(repositories.settings, audit);
  const reports = new ReportService(repositories.reports, audit);

  return {
    repositories,
    storage,
    services: {
      audit,
      auth,
      users,
      roles,
      companies,
      clients,
      workflow,
      templates,
      documents,
      scans,
      settings,
      reports,
    },
  };
}
