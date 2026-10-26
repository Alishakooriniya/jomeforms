import { AuditRepository } from './repositories/audit.repository.js';
import { ClientRepository } from './repositories/client.repository.js';
import { CompanyRepository } from './repositories/company.repository.js';
import { DocumentRepository } from './repositories/document.repository.js';
import { LetterheadRepository } from './repositories/letterhead.repository.js';
import { ReminderRepository } from './repositories/reminder.repository.js';
import { ScanRepository } from './repositories/scan.repository.js';
import { SequenceRepository } from './repositories/sequence.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { SettingsRepository } from './repositories/settings.repository.js';
import { TemplateRepository } from './repositories/template.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { AuditService } from './services/audit.service.js';
import { AuthService } from './services/auth.service.js';
import { BackupService } from './services/backup.service.js';
import { ClientService } from './services/client.service.js';
import { CompanyService } from './services/company.service.js';
import { DocumentService } from './services/document.service.js';
import { LetterheadService } from './services/letterhead.service.js';
import { LocalDiskStorage } from './services/storage.service.js';
import type { FileStorage } from './services/storage.service.js';
import { ReminderService } from './services/reminder.service.js';
import { ScanService } from './services/scan.service.js';
import { SettingsService } from './services/settings.service.js';
import { TemplateService } from './services/template.service.js';
import { UserService } from './services/user.service.js';
import { WorkflowService } from './services/workflow.service.js';

export interface Repositories {
  users: UserRepository;
  companies: CompanyRepository;
  clients: ClientRepository;
  templates: TemplateRepository;
  documents: DocumentRepository;
  scans: ScanRepository;
  sessions: SessionRepository;
  audit: AuditRepository;
  settings: SettingsRepository;
  sequences: SequenceRepository;
  reminders: ReminderRepository;
  letterhead: LetterheadRepository;
}

export interface Services {
  audit: AuditService;
  auth: AuthService;
  users: UserService;
  companies: CompanyService;
  clients: ClientService;
  workflow: WorkflowService;
  templates: TemplateService;
  documents: DocumentService;
  scans: ScanService;
  settings: SettingsService;
  reminders: ReminderService;
  letterhead: LetterheadService;
  backup: BackupService;
}

export interface Container {
  repositories: Repositories;
  services: Services;
  storage: FileStorage;
}

export function createRepositories(): Repositories {
  return {
    users: new UserRepository(),
    companies: new CompanyRepository(),
    clients: new ClientRepository(),
    templates: new TemplateRepository(),
    documents: new DocumentRepository(),
    scans: new ScanRepository(),
    sessions: new SessionRepository(),
    audit: new AuditRepository(),
    settings: new SettingsRepository(),
    sequences: new SequenceRepository(),
    reminders: new ReminderRepository(),
    letterhead: new LetterheadRepository(),
  };
}

export function createContainer(options: { storage?: FileStorage } = {}): Container {
  const repositories = createRepositories();
  const storage = options.storage ?? new LocalDiskStorage();

  const audit = new AuditService(repositories.audit);
  const auth = new AuthService(repositories.users, repositories.sessions, repositories.audit);
  const users = new UserService(repositories.users, repositories.companies, audit, auth);
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
  const reminders = new ReminderService(repositories.reminders, repositories.users, audit);
  const letterhead = new LetterheadService(repositories.letterhead, audit);
  const backup = new BackupService(audit);

  return {
    repositories,
    storage,
    services: {
      audit,
      auth,
      users,
      companies,
      clients,
      workflow,
      templates,
      documents,
      scans,
      settings,
      reminders,
      letterhead,
      backup,
    },
  };
}
