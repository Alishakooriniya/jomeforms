/* یادآورها: تبدیل تاریخ/ساعت شمسی به لحظه‌ی سررسید و وضعیت نمایش.
   قاعده: تاریخ بدون ساعت یعنی یادآور از ابتدای همان روز فعال است. */

import type { Reminder } from '../types';
import type { Tone } from '../data/labels';
import { jalaliToLocalDate } from './jalali';
import { toLatinDigits } from './utils';

export type ReminderState = 'pending' | 'active' | 'done';

export const REMINDER_STATE_LABELS: Record<ReminderState, string> = {
  pending: 'در انتظار',
  active: 'فعال',
  done: 'انجام‌شده',
};

export const REMINDER_STATE_TONE: Record<ReminderState, Tone> = {
  pending: 'neutral',
  active: 'warn',
  done: 'success',
};

export const REMINDER_STATE_OPTIONS = (Object.keys(REMINDER_STATE_LABELS) as ReminderState[]).map((value) => ({
  value,
  label: REMINDER_STATE_LABELS[value],
}));

/** ساعت ورودی کاربر (ارقام فارسی/لاتین، H:MM یا HH:MM) → HH:MM یا null */
export function normalizeReminderTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(toLatinDigits(value.trim()));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** لحظه‌ی سررسید در تقویم محلی — بدون ساعت یعنی ابتدای روز */
export function reminderDueAt(reminder: Pick<Reminder, 'date' | 'time'>): Date | null {
  const base = jalaliToLocalDate(reminder.date);
  if (!base) return null;
  const [hour = 0, minute = 0] = (reminder.time ?? '').split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);
}

/** وضعیت فعلی یادآور: انجام‌شده / رسیده و فعال / هنوز نرسیده */
export function reminderState(reminder: Pick<Reminder, 'date' | 'time' | 'done'>, now: Date = new Date()): ReminderState {
  if (reminder.done) return 'done';
  const due = reminderDueAt(reminder);
  return due && due.getTime() <= now.getTime() ? 'active' : 'pending';
}
