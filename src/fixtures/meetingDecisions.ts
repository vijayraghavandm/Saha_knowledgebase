import type { MeetingDecision } from '../types';

// Agenda questions only. Decisions, owners, next actions, and dates start empty;
// no commitments are invented.
const QUESTIONS = [
  'Which template dimensions should be included first?',
  'What important care dimension is missing?',
  'Which candidate items should be prioritised, revised, or excluded?',
  'What clinical references must Siddharth supply or select?',
  'Which actions require demonstrated training or patient-specific authorisation?',
  'What information must remain unresolved until clinical input is obtained?',
  'What should the human reviewer own in the pilot?',
  'What is the smallest next experiment with the existing generator/reviewer?',
];

export function seedMeetingDecisions(): MeetingDecision[] {
  return QUESTIONS.map((question, i) => ({
    id: `M${String(i + 1).padStart(2, '0')}`,
    question,
    decision: '',
    owner: '',
    next_action: '',
    due_date: '',
    status: 'open',
  }));
}
