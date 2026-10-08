import { seedCarePlanExample } from '../fixtures/carePlanExample';
import { seedRecords } from '../fixtures/copdRecords';
import { seedMeetingDecisions } from '../fixtures/meetingDecisions';
import { seedPromptTemplates } from '../fixtures/prompts';
import { seedTemplate } from '../fixtures/template';
import { CLINICAL_USE_STATUS, type AppState } from '../types';

/** Fresh demo state built from the local fixtures. Used on first load and on reset. */
export function createSeedState(): AppState {
  return {
    demo_only: true,
    clinical_use_status: CLINICAL_USE_STATUS,
    template: seedTemplate(),
    knowledge_records: seedRecords(),
    medical_references: [],
    care_plan_example: seedCarePlanExample(),
    prompt_templates: seedPromptTemplates(),
    meeting_decisions: seedMeetingDecisions(),
    meeting_notes: '',
    reviewer_name: '',
  };
}
