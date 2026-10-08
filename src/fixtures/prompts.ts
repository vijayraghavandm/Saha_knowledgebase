import type { PromptTemplate } from '../types';

// Provider-neutral prompt TEXT only. Nothing here is sent anywhere by this app,
// and no model has been tested with these prompts.

const POPULATE_TEMPLATE = `ROLE
You are helping an internal content team draft caregiving knowledge records for clinician review. You are not giving medical advice. Your output will not be shown to caregivers or patients.

INPUTS
- Condition: {{condition_name}}
- Template dimensions (JSON): {{template_dimensions_json}}
- Reference excerpts supplied by the clinical reviewer, each with source title, edition/date, and section/page: {{reference_excerpts}}

TASK
1. For each template dimension, propose candidate records using ONLY the supplied excerpts. One record is one atomic question, observation, precaution, or candidate action. Do not combine several instructions in one record.
2. For every record return: dimension_id, content_type (question | observation | do | dont | precaution | protocol_gap | tip), content, intended_use, applicability, required_patient_information, caregiver_role, required_training (use "Unknown" when the excerpt does not say), and source (the excerpt identifier plus the exact supporting sentence).
3. When a dimension has no supporting excerpt, do not write content from general knowledge. Return a protocol_gap record that states what is missing and a specific question for the clinician.
4. Mark every record that is not directly supported by a supplied excerpt as evidence_state "unverified". Never mark a record "supported" yourself; a human verifies evidence.

RULES
- Do not invent citations, page numbers, numeric thresholds, doses, device settings, fluid or activity targets, or waiting periods.
- Do not infer urgency or severity. Leave urgency as "not_assessed".
- Keep general disease knowledge separate from instructions for any individual patient.
- Every record is a draft: review_state "unreviewed", clinical_use_status "not_released".

OUTPUT
Return JSON only:
{
  "candidate_records": [ ... ],
  "gaps": [ { "dimension_id": "", "missing": "", "question_for_clinician": "" } ],
  "notes": ""
}`;

const REVIEW_DRAFT = `ROLE
You are helping a human reviewer check a draft care plan before any human decides whether to use it. You are not the decision-maker and you do not give medical advice.

INPUTS
- Patient context supplied for this review: {{patient_context}}
- Existing clinician instructions, verbatim: {{existing_clinician_instructions}}
- Draft care plan to review: {{draft_care_plan}}
- Accepted knowledge records (JSON): {{knowledge_records_json}}
- Supplied evidence excerpts: {{evidence_excerpts}}

TASK
Compare the draft with the patient context, the existing clinician instructions, and the supplied evidence. Return a change report grouped under exactly these headings:
- retain
- correct_or_remove
- add
- ask_for_missing_information
- prioritise
- refer_for_human_decision

For every item give: the draft line it refers to (or "new"), the proposed change, a one-sentence reason, and the related knowledge record IDs and dimension IDs.

RULES
- Preserve existing clinician instructions exactly. If the draft conflicts with one, report the conflict under refer_for_human_decision; do not resolve it yourself.
- Where information is missing, say what is missing and who could supply it. Do not fill the gap. Do not invent thresholds, doses, device settings, targets, frequencies, or waiting periods.
- Do not propose treatments or changes to treatment.
- Do not assume the caregiver is trained or authorised for a task unless the patient context says so.
- A priority is an ordering suggestion, not a severity or urgency assessment.
- Do not rewrite the draft. Return the change report only; a human applies or rejects each change.

OUTPUT
Return JSON only:
{
  "change_report": {
    "retain": [], "correct_or_remove": [], "add": [],
    "ask_for_missing_information": [], "prioritise": [], "refer_for_human_decision": []
  },
  "missing_information": [],
  "unverified_statements": []
}`;

export function seedPromptTemplates(): PromptTemplate[] {
  return [
    {
      id: 'populate_template',
      title: 'Prompt 1 — Populate the caregiving template from supplied reference excerpts',
      text: POPULATE_TEMPLATE,
      default_text: POPULATE_TEMPLATE,
    },
    {
      id: 'review_draft',
      title: 'Prompt 2 — Review an existing draft against patient context and supplied evidence',
      text: REVIEW_DRAFT,
      default_text: REVIEW_DRAFT,
    },
  ];
}
