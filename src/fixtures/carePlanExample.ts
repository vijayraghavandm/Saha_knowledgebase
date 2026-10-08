import type { CarePlanExample, DraftLine, Scorecard, Suggestion } from '../types';

// LOCAL FIXTURE — ENTIRELY SYNTHETIC.
// One made-up elder profile, one made-up baseline draft, and one saved mock
// reviewer report. No model produced the report and no model is called at
// runtime. The baseline draft is NOT a reproduction of Saha's production output.
// Medication details, monitoring limits, activity targets, and treatment
// settings are null and stay null unless a reviewer genuinely supplies them.

const BASELINE_DRAFT: DraftLine[] = [
  { id: 'L1', text: 'Monitoring: caregiver records readings at every visit.' },
  { id: 'L2', text: 'Flag any reading that is outside the normal range.' },
  { id: 'L3', text: 'Note any change from the elder’s usual situation that the caregiver or family reports.' },
  { id: 'L4', text: 'Caregiver manages medicines and equipment as needed.' },
  { id: 'L5', text: 'Contact the doctor if there is a problem.' },
  { id: 'L6', text: 'Everyday care (mobility, bathing, meals, rest): not covered in this draft.' },
];

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 'S01',
    category: 'retain',
    text: 'Keep the line on reporting changes from the elder’s usual situation.',
    rationale: 'It asks for a report rather than a diagnosis, and matches the observation records.',
    record_ids: ['COPD-R06', 'COPD-R09'],
    dimension_ids: ['D14', 'D16'],
    effect: { op: 'retain', target_line_id: 'L3' },
    decision: 'pending',
  },
  {
    id: 'S02',
    category: 'correct_or_remove',
    text: 'Remove the stated recording frequency; none was supplied.',
    rationale: 'The draft states a frequency that nobody provided for this elder.',
    record_ids: ['COPD-R10'],
    dimension_ids: ['D15'],
    effect: {
      op: 'replace',
      target_line_id: 'L1',
      new_text:
        'Monitoring: record only measurements a clinician has prescribed for this elder. Measurement type and frequency: not supplied.',
    },
    decision: 'pending',
  },
  {
    id: 'S03',
    category: 'correct_or_remove',
    text: 'Replace “outside the normal range” with an explicit gap.',
    rationale: '“Normal range” is undefined for this elder; no patient-specific limits were provided.',
    record_ids: ['COPD-R10'],
    dimension_ids: ['D15'],
    effect: {
      op: 'replace',
      target_line_id: 'L2',
      new_text: 'Patient-specific monitoring/action limits: not supplied. Left unfilled.',
    },
    decision: 'pending',
  },
  {
    id: 'S04',
    category: 'add',
    text: 'Add the usual help needed from bed to bathroom.',
    rationale: 'Everyday assistance is missing from the draft.',
    record_ids: ['COPD-R01'],
    dimension_ids: ['D07'],
    effect: { op: 'add', new_text: 'Record the help the elder usually needs to get from bed to bathroom.' },
    decision: 'pending',
  },
  {
    id: 'S05',
    category: 'add',
    text: 'Add the elder’s comfort and daily-routine preferences.',
    rationale: 'The draft captures measurements but nothing about what matters to the elder.',
    record_ids: ['COPD-R11'],
    dimension_ids: ['D02', 'D09'],
    effect: { op: 'add', new_text: 'Capture the elder’s preferences for comfort and daily routines.' },
    decision: 'pending',
  },
  {
    id: 'S06',
    category: 'add',
    text: 'Add separate task states for documentation.',
    rationale: 'Without a “status unknown” state, a missing entry can be mistaken for a completed task.',
    record_ids: ['COPD-R12'],
    dimension_ids: ['D19'],
    effect: { op: 'add', new_text: 'Record each task as completed, not completed, or status unknown.' },
    decision: 'pending',
  },
  {
    id: 'S07',
    category: 'ask_missing_information',
    text: 'Ask who the care coordinator and the designated clinical contact are.',
    rationale: '“The doctor” and “a problem” are undefined, and no contacts have been entered.',
    record_ids: ['COPD-R08'],
    dimension_ids: ['D17'],
    effect: {
      op: 'replace',
      target_line_id: 'L5',
      new_text: 'Contacts — care coordinator: not supplied; designated clinical contact: not supplied.',
    },
    decision: 'pending',
  },
  {
    id: 'S08',
    category: 'ask_missing_information',
    text: 'Ask whether a written plan for breathing-related worsening already exists.',
    rationale: 'An existing clinician instruction must be preserved, not replaced by a new draft.',
    record_ids: ['COPD-R02'],
    dimension_ids: ['D04'],
    effect: {
      op: 'add',
      new_text: 'Open question: is there an existing written plan for breathing-related worsening, and who supplied it?',
    },
    decision: 'pending',
  },
  {
    id: 'S09',
    category: 'ask_missing_information',
    text: 'Ask whether dietary or fluid restrictions are recorded.',
    rationale: 'Meals are listed as not covered; the existing care plan has not been checked.',
    record_ids: ['COPD-R05'],
    dimension_ids: ['D10'],
    effect: {
      op: 'add',
      new_text: 'Open question: are any dietary or fluid restrictions recorded in the existing care plan?',
    },
    decision: 'pending',
  },
  {
    id: 'S10',
    category: 'prioritise',
    text: 'List the open questions on contacts and caregiver authorisation ahead of monitoring items.',
    rationale: 'An ordering suggestion for the coordinator only. It is not a severity or urgency assessment.',
    record_ids: ['COPD-R07', 'COPD-R08'],
    dimension_ids: ['D17', 'D18'],
    effect: {
      op: 'add',
      new_text: 'Coordinator note: open questions on contacts and caregiver authorisation are listed ahead of monitoring items.',
    },
    decision: 'pending',
  },
  {
    id: 'S11',
    category: 'refer_human_decision',
    text: 'Refer the caregiver’s role with medicines and equipment for a human decision.',
    rationale:
      'The caregiver is not a nurse and task-specific competence is unknown. Who may do which task is a human decision.',
    record_ids: ['COPD-R07', 'COPD-R15', 'COPD-R16'],
    dimension_ids: ['D12', 'D13', 'D18'],
    effect: {
      op: 'replace',
      target_line_id: 'L4',
      new_text: 'Medicines and equipment: caregiver role not defined. Referred for human decision; no task assigned.',
    },
    decision: 'pending',
  },
];

const GENERAL_SCALE = ['Not acceptable', 'Needs work', 'Acceptable', 'Good'];

function seedScorecard(): Scorecard {
  const criterion = (id: string, label: string, scale = GENERAL_SCALE) => ({
    id,
    label,
    scale: [...scale],
    rating: null,
    note: '',
  });
  return {
    criteria: [
      criterion('safety_role_boundaries', 'Safety and role boundaries'),
      criterion('correctness', 'Correctness'),
      criterion('essential_coverage', 'Essential coverage'),
      criterion('evidence_support', 'Evidence support'),
      criterion('caregiver_usefulness', 'Caregiver usefulness'),
      criterion('prioritisation', 'Prioritisation'),
      criterion('review_effort', 'Review effort', ['Very high', 'High', 'Moderate', 'Low']),
    ],
    critical_flags: [
      { id: 'out_of_role_instruction', label: 'An instruction falls outside the caregiver’s role or authorisation', status: 'not_assessed' },
      { id: 'invented_clinical_content', label: 'Clinical content appears that nobody supplied (limit, dose, setting, target)', status: 'not_assessed' },
      { id: 'clinician_instruction_changed', label: 'An existing clinician instruction was changed or dropped', status: 'not_assessed' },
      { id: 'missing_info_treated_as_known', label: 'Missing patient information is treated as known', status: 'not_assessed' },
      { id: 'evidence_not_verifiable', label: 'Evidence is cited but cannot be verified', status: 'not_assessed' },
    ],
    overall_note: '',
  };
}

export function seedCarePlanExample(): CarePlanExample {
  return {
    synthetic: true,
    demo_only: true,
    label: 'Synthetic elder profile for meeting discussion. Not a real person.',
    profile: {
      summary: 'Older adult living at home and receiving home support.',
      condition_context: 'COPD, supplied as context for this example. No clinical details provided.',
      caregiver_role: 'Home caregiver. Not a nurse.',
      caregiver_task_competence: 'Unknown — not yet entered.',
      preferences: 'Example: likes an unhurried morning routine and to be asked before help is given.',
      baseline_assistance: 'Example: usual assistance not yet recorded.',
      current_instructions: 'None supplied for this example.',
      care_coordinator: 'Not assigned in this example.',
      clinical_contact: 'Not supplied.',
    },
    clinical_fields: {
      medication_details: null,
      monitoring_limits: null,
      activity_targets: null,
      treatment_settings: null,
    },
    original_draft: BASELINE_DRAFT.map((l) => ({ ...l })),
    working_draft: BASELINE_DRAFT.map((l) => ({ ...l })),
    reviewer_report: {
      source: 'saved_mock_fixture_no_model_call',
      loaded: false,
      loaded_at: null,
      suggestions: MOCK_SUGGESTIONS.map((s) => ({
        ...s,
        record_ids: [...s.record_ids],
        dimension_ids: [...s.dimension_ids],
        effect: { ...s.effect },
      })),
    },
    scorecard: seedScorecard(),
  };
}
