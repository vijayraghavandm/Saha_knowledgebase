import rawTemplate from '../../data/Saha_Knowledge_Template_v0_1.json';
import { CLINICAL_USE_STATUS, type DiseaseTemplate } from '../types';

// LOCAL FIXTURE. The supplied template file has no example questions, so one
// information-capture example per dimension is added here for discussion.
// These are proposed wording, not clinical guidance.
export const EXAMPLE_QUESTIONS: Record<string, string> = {
  D01: 'Does this module apply to this elder and care setting, and what is outside its scope?',
  D02: 'What does the elder most want to keep doing for themselves?',
  D03: 'Which details are still unknown before any guidance is selected?',
  D04: 'Has a clinician already given written instructions, and who supplied them?',
  D05: 'Which daily support activities has the family or a clinician asked for?',
  D06: 'Is there anything the family or a clinician has said should not be done?',
  D07: 'What help does the elder usually need to get from bed to bathroom?',
  D08: 'What assistance or restrictions should be considered when planning a bath?',
  D09: 'Are any rest or sleep-position instructions already documented for this person?',
  D10: 'Are any dietary or fluid restrictions recorded in the existing care plan?',
  D11: 'Is there an existing toileting, continence, or skin-care plan, and who supplied it?',
  D12: 'Which equipment is in the home, and who has been trained to use it?',
  D13: 'Is there a clinician-supplied treatment schedule, and who may support each task?',
  D14: 'Has more assistance than usual been needed, and who reported it?',
  D15: 'Have any measurements, frequencies, or action limits actually been supplied?',
  D16: 'Was this observed directly or reported by someone else?',
  D17: 'Who is the care coordinator, and who is the designated clinical contact?',
  D18: 'Which tasks has this caregiver been trained and authorised to perform?',
  D19: 'Is each task recorded as completed, not completed, or status unknown?',
  D20: 'Which topics has the family asked to understand better?',
};

/** Builds the editable template from the supplied machine-readable blank template. */
export function seedTemplate(): DiseaseTemplate {
  return {
    schema_version: rawTemplate.schema_version,
    template_id: rawTemplate.template_id,
    template_version: rawTemplate.template_version,
    label: rawTemplate.label,
    design_status: rawTemplate.design_status,
    demo_only: true,
    condition_example: rawTemplate.condition_example,
    intended_audience: rawTemplate.intended_audience,
    clinical_use_status: CLINICAL_USE_STATUS,
    design_basis: { ...rawTemplate.design_basis },
    dimensions: rawTemplate.dimensions.map((d) => ({
      id: d.id,
      title: d.title,
      purpose_question: d.purpose_question,
      example_question: EXAMPLE_QUESTIONS[d.id] ?? '',
      inclusion_decision: 'to_discuss',
      not_applicable_reason: '',
      reviewer_comment: '',
    })),
    change_log: [],
  };
}
