import type { ClientCaseType, ClientWorkflowStep } from '../types';

export function createClientWorkflow(
  caseType: ClientCaseType,
  includePayment = false,
  includeExternalResponse = false,
): ClientWorkflowStep[] {
  const steps: ClientWorkflowStep[] = [
    {
      id: 'initial-request',
      title: caseType === 'document_request' ? 'ثبت درخواست سند' : 'ثبت درخواست تجدید اجاره',
      kind: 'form',
      status: 'pending',
      requiresEvidence: false,
      evidenceIds: [],
    },
    {
      id: 'document-review',
      title: 'بررسی و تکمیل مدارک',
      kind: 'form',
      status: 'pending',
      requiresEvidence: false,
      evidenceIds: [],
    },
  ];

  if (includePayment) {
    steps.push({
      id: 'payment',
      title: 'ثبت رسید پرداخت',
      kind: 'payment',
      status: 'pending',
      requiresEvidence: true,
      evidenceIds: [],
    });
  }

  if (includeExternalResponse) {
    steps.push({
      id: 'external-response',
      title: 'دریافت و ثبت پاسخ ارگان',
      kind: 'external',
      status: 'pending',
      requiresEvidence: true,
      evidenceIds: [],
    });
  }

  steps.push({
    id: 'case-completion',
    title: 'تکمیل پرونده',
    kind: 'completion',
    status: 'pending',
    requiresEvidence: false,
    evidenceIds: [],
  });
  return steps;
}
