import {
  CLINICAL_USE_STATUS,
  type ContentType,
  type IntendedUse,
  type KnowledgeRecord,
  type SeedSource,
} from '../types';

// LOCAL FIXTURE — SYNTHETIC DISCUSSION EXAMPLES.
// These are structural seed records for the meeting, not evidence-backed COPD
// recommendations. They stay within information capture and workflow. Where
// clinical guidance would be needed, the record is a protocol gap carrying a
// question for the clinical reviewer; nothing is filled from model memory.
// No thresholds, settings, doses, targets, or citations appear here.

export const CONDITION_ID = 'copd';

interface Seed {
  n: number;
  dimension_id: string;
  title: string;
  content: string;
  content_type: ContentType;
  intended_use: IntendedUse[];
  seed_source: SeedSource;
  applicability?: string;
  required_patient_information?: string;
  question_for_clinician?: string;
}

const SEEDS: Seed[] = [
  {
    n: 1,
    dimension_id: 'D07',
    title: 'Usual help from bed to bathroom',
    content: 'What help does the elder usually need to get from bed to bathroom?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'Usual level of assistance for moving around the home.',
  },
  {
    n: 2,
    dimension_id: 'D04',
    title: 'Existing written plan for breathing-related worsening',
    content: 'Is there an existing written plan for breathing-related worsening, and who supplied it?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'Whether a written plan exists, its source, and its date.',
  },
  {
    n: 3,
    dimension_id: 'D08',
    title: 'Planning a bath',
    content: 'What assistance or restrictions should be considered when planning a bath?',
    content_type: 'question',
    intended_use: ['onboarding', 'daily_guidance'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'Bathing preferences, usual assistance, and any existing instructions.',
  },
  {
    n: 4,
    dimension_id: 'D09',
    title: 'Documented rest or sleep-position instructions',
    content: 'Are any rest or sleep-position instructions already documented for this person?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'Any documented instructions and who supplied them.',
  },
  {
    n: 5,
    dimension_id: 'D10',
    title: 'Recorded dietary or fluid restrictions',
    content: 'Are any dietary or fluid restrictions recorded in the existing care plan?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'The existing care plan, if one exists.',
  },
  {
    n: 6,
    dimension_id: 'D14',
    title: 'More assistance than usual was reported',
    content: 'Record that more assistance than usual was reported; preserve who reported it and when.',
    content_type: 'observation',
    intended_use: ['daily_guidance', 'coordinator_handover'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'The elder’s usual level of assistance, for comparison.',
  },
  {
    n: 7,
    dimension_id: 'D18',
    title: 'Caregiver training and authorisation',
    content: 'Which tasks has this caregiver been trained and authorised to perform?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
    applicability: 'Any caregiver assigned to the elder.',
  },
  {
    n: 8,
    dimension_id: 'D17',
    title: 'Care coordinator and clinical contact',
    content: 'Who is the care coordinator, and who is the designated clinical contact?',
    content_type: 'question',
    intended_use: ['onboarding', 'coordinator_handover'],
    seed_source: 'supplied_in_brief',
  },
  {
    n: 9,
    dimension_id: 'D16',
    title: 'Observed directly or reported',
    content: 'Was this information observed directly or reported by someone else?',
    content_type: 'question',
    intended_use: ['follow_up'],
    seed_source: 'supplied_in_brief',
    applicability: 'Any observation recorded by a caregiver.',
  },
  {
    n: 10,
    dimension_id: 'D15',
    title: 'Monitoring and action limits not supplied',
    content: 'Patient-specific monitoring/action limits have not been supplied. Leave them unfilled.',
    content_type: 'protocol_gap',
    intended_use: ['care_plan'],
    seed_source: 'supplied_in_brief',
    required_patient_information: 'Clinician-supplied measurements, frequencies, and action instructions for this elder.',
  },
  {
    n: 11,
    dimension_id: 'D02',
    title: 'Comfort and daily-routine preferences',
    content: 'Capture the elder’s preferences for comfort and daily routines.',
    content_type: 'do',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'supplied_in_brief',
  },
  {
    n: 12,
    dimension_id: 'D19',
    title: 'Separate task states',
    content: 'Keep completed, not completed, and status unknown as separate task states.',
    content_type: 'do',
    intended_use: ['daily_guidance', 'coordinator_handover'],
    seed_source: 'supplied_in_brief',
    applicability: 'All recorded caregiver tasks.',
  },
  {
    n: 13,
    dimension_id: 'D01',
    title: 'Module scope and limits',
    content: 'Which condition and care setting does this module cover, and what is explicitly outside its scope?',
    content_type: 'question',
    intended_use: ['onboarding'],
    seed_source: 'assistant_added_seed',
  },
  {
    n: 14,
    dimension_id: 'D11',
    title: 'Existing toileting, continence, or skin-care plan',
    content: 'Is there an existing toileting, continence, or skin-care plan, and who supplied it?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'assistant_added_seed',
    required_patient_information: 'Any existing plan and its source.',
  },
  {
    n: 15,
    dimension_id: 'D12',
    title: 'Equipment in the home',
    content: 'Which equipment is present in the home, and who has been trained to use it?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'assistant_added_seed',
  },
  {
    n: 16,
    dimension_id: 'D13',
    title: 'Clinician-supplied treatment schedule',
    content: 'Is there a treatment schedule supplied by a clinician, and who is authorised to support each task?',
    content_type: 'question',
    intended_use: ['onboarding', 'care_plan'],
    seed_source: 'assistant_added_seed',
    required_patient_information: 'The schedule as supplied; nothing is assumed when it is absent.',
  },
  {
    n: 17,
    dimension_id: 'D20',
    title: 'Topics the family wants to understand',
    content: 'Which topics has the family asked to understand better?',
    content_type: 'question',
    intended_use: ['onboarding', 'follow_up'],
    seed_source: 'assistant_added_seed',
  },
  {
    n: 18,
    dimension_id: 'D05',
    title: 'Routine caregiving do’s — clinical input needed',
    content: 'Condition-specific routine caregiving do’s have not been supplied. Leave this unfilled until a source is provided.',
    content_type: 'protocol_gap',
    intended_use: ['daily_guidance'],
    seed_source: 'assistant_added_seed',
    question_for_clinician:
      'Which routine daily support activities should a non-nurse home caregiver be given for an elder with COPD, and which reference should each one cite?',
  },
  {
    n: 19,
    dimension_id: 'D06',
    title: 'Don’ts and precautions — clinical input needed',
    content: 'Condition-specific don’ts and precautions have not been supplied. Leave this unfilled until a source is provided.',
    content_type: 'protocol_gap',
    intended_use: ['daily_guidance', 'care_plan'],
    seed_source: 'assistant_added_seed',
    question_for_clinician:
      'Which precautions should a non-nurse caregiver be told about for an elder with COPD, under which circumstances does each apply, and what is the source?',
  },
  {
    n: 20,
    dimension_id: 'D14',
    title: 'Reportable changes — clinical input needed',
    content: 'Condition-specific caregiver-observable changes have not been supplied. Leave this unfilled until a source is provided.',
    content_type: 'protocol_gap',
    intended_use: ['daily_guidance', 'follow_up'],
    seed_source: 'assistant_added_seed',
    question_for_clinician:
      'Which changes from usual should a caregiver be asked to report for an elder with COPD, in lay wording and without diagnosis, and what is the source?',
  },
];

export function recordId(n: number): string {
  return `COPD-R${String(n).padStart(2, '0')}`;
}

/** Every seed record starts unreviewed, with evidence not supplied and no reviewer name. */
export function seedRecords(): KnowledgeRecord[] {
  return SEEDS.map((s) => ({
    id: recordId(s.n),
    version: 1,
    condition_id: CONDITION_ID,
    dimension_id: s.dimension_id,
    title: s.title,
    content_type: s.content_type,
    original_content: s.content,
    edited_content: null,
    intended_use: [...s.intended_use],
    applicability: s.applicability ?? '',
    required_patient_information: s.required_patient_information ?? '',
    caregiver_role: 'Unknown',
    required_training: 'Unknown',
    proposed_priority: 'unset',
    urgency: 'not_assessed',
    urgency_note: '',
    content_origin: 'synthetic_example',
    seed_source: s.seed_source,
    needs_clinical_input: Boolean(s.question_for_clinician),
    question_for_clinician: s.question_for_clinician ?? '',
    evidence_reference_ids: [],
    evidence_state: 'not_supplied',
    review: { state: 'unreviewed', comment: '', reviewer_name: '', timestamp: null },
    history: [],
    clinical_use_status: CLINICAL_USE_STATUS,
    demo_only: true,
  }));
}
