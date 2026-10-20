import type { ClientCaseType, ClientStatus, ClientWorkflowStep } from '../types/domain.js';

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

export interface StepTarget {
  index: number;
  step: ClientWorkflowStep;
}

export function findStep(workflow: ClientWorkflowStep[], stepId: string): StepTarget | null {
  const index = workflow.findIndex((step) => step.id === stepId);
  if (index < 0) return null;
  const step = workflow[index];
  return step ? { index, step } : null;
}

/** A step can only be worked on when it is pending and its predecessor is done. */
export function isStepActionable(workflow: ClientWorkflowStep[], index: number): boolean {
  if (index < 0) return false;
  const step = workflow[index];
  if (!step || step.status === 'completed') return false;
  if (index === 0) return true;
  return workflow[index - 1]?.status === 'completed';
}

export function statusAfterStep(target: ClientWorkflowStep, current: ClientStatus): ClientStatus {
  if (target.kind === 'completion') return 'done';
  if (current === 'done' || current === 'archived') return current;
  return 'in_progress';
}
