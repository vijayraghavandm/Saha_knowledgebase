# Saha Knowledge Review Studio

**Meeting prototype · Synthetic/draft content · Not for patient care**

An internal review tool for discussing a reusable, disease-specific caregiving knowledge template with a clinical
collaborator, using COPD as the worked example. It shows how a clinician could check, correct, prioritise, and find
gaps in candidate content before that content influences a care plan.

It is not a caregiver app, a hospital dashboard, a clinical decision tool, or a production knowledge engine. Nothing
in it is clinically validated, and nothing is ever sent to a caregiver.

## Run it

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open **http://localhost:5173/**. The app opens on the editable 20-dimension disease template.

| Screen | Route |
| --- | --- |
| Disease template (start here) | `http://localhost:5173/#/template` |
| COPD knowledge matrix | `http://localhost:5173/#/matrix` |
| Care-plan review example | `http://localhost:5173/#/care-plan` |
| Meeting decisions | `http://localhost:5173/#/decisions` |

To serve a production build instead: `npm run build`, then `npm run preview` (http://localhost:4173/).

The demo runs fully offline once dependencies are installed. It needs no API key, backend, login, model download,
external image, or network call.

## Checks

```bash
npm run typecheck   # TypeScript, strict
npm test            # unit tests for state logic, validation, exports, persistence
npm run build       # type check + production build
npm run smoke       # browser smoke test at 1366x768
```

`npm run smoke` starts the dev server and drives an installed Edge or Chrome through the acceptance checks. It
downloads no browser. Screenshots go to `smoke-artifacts/`.

## The four objects

The interface keeps these separate throughout.

1. **Disease template**: which topics should be covered. 20 proposed dimensions.
2. **Knowledge records**: candidate questions, observations, instructions, or precautions for one condition.
3. **Patient-specific instructions**: what has been independently supplied for one elder.
4. **Review scorecard**: how candidate content and suggested changes are evaluated.

A filled template is not a verified knowledge base. Accepted knowledge is not a patient-approved care plan.

## What each screen does

**Disease template.** Edit titles and questions, set an inclusion decision, comment, reorder, and add dimensions.
IDs never change. Wording edits, reordering, and additions increase the template version and are logged; inclusion
decisions and comments are review notes and do not. "Not applicable" is not saved without a reason.

**COPD knowledge matrix.** 20 seed records with search and filters. A row opens a detail drawer for wording, review
decision, classification, source references, and history.

- Accepting a record changes its review state only. It does not verify evidence, grant permission to perform a
  task, or approve patient use. Clinical-use status is always *Not released*.
- The original wording is stored separately from the edit. Editing accepted content returns it to *Needs re-review*.
- Adding a reference, or typing a URL, moves evidence to *Unverified* at most. *Supported* can only be chosen by a
  person once a reference has a locator, verification note, verifier name, and verification date.
- Priority and urgency are separate fields. Urgency is *Not assessed* unless a clinician defines it.

**Care-plan review example.** One synthetic elder, a synthetic baseline draft, and a saved mock reviewer report.
"Load example reviewer output — no model call" reads a local fixture. Each suggested change can be accepted or
rejected; the original draft is preserved and the selected revision is shown separately. The scorecard starts
unrated and never calculates an average. Two provider-neutral prompt templates are available as editable text.

**Meeting decisions.** Eight agenda questions with decision, owner, next action, due date, and status, plus notes,
workflow counts, export, import, and reset.

## About the content

- The 20 dimensions and the interface are proposed design choices for discussion, not an approved clinical framework.
- Seed records are **synthetic discussion examples**, not evidence-backed COPD recommendations. Twelve were supplied
  in the build brief. Eight more were added in the same information-capture scope, and each record says which it is.
- Where clinical guidance would be needed (routine do's, don'ts and precautions, reportable changes), the record is
  a *protocol gap* holding a specific question for the clinical reviewer. Nothing was filled in from model memory.
- There are no citations, thresholds, device settings, doses, fluid or activity targets, or waiting periods anywhere
  in the fixtures. A unit test checks that the seed content contains no numbers.
- The one-line example question per dimension was written for this prototype, because the supplied template file
  does not include one. Treat it as proposed wording.
- Reviewer and verifier names are typed text. They are not authenticated identities. No name is pre-filled.

## Data and privacy

State is saved in this browser's local storage under `saha-knowledge-review-studio/state`, in a versioned envelope
(`state_version: 1`). This is suitable for synthetic meeting data only. **It is not a secure clinical record system.
Do not enter real patient or family details.**

- **Export JSON**: one versioned bundle (`bundle_format: saha_knowledge_review_bundle`, `bundle_version: 1`) with the
  template, knowledge records, source references, review decisions, original and revised demo plan, scorecard,
  prompt templates, meeting decisions, and workflow counts.
- **Export Markdown**: the same information in readable form, labelled draft/demo.
- **Import JSON**: validated before anything changes. A rejected file lists what is wrong and leaves current data
  untouched. A valid file asks for confirmation before replacing local state.
- **Reset demo**: asks for confirmation, then restores the fixtures.

If saved data cannot be read, the fixtures load instead and the unreadable data is kept under a backup key.

## Project layout

```
data/Saha_Knowledge_Template_v0_1.json   Machine-readable blank 20-dimension template
src/types.ts                             Typed data model
src/fixtures/                            Clearly labelled local fixtures
  template.ts                              Template loader + example questions
  copdRecords.ts                           COPD demo records
  carePlanExample.ts                       Synthetic elder, baseline draft, mock reviewer report, scorecard
  prompts.ts                               The two reusable prompt templates
  meetingDecisions.ts                      Agenda questions
src/state/                               Pure state logic (no React)
  actions.ts  selectors.ts  validate.ts  storage.ts  exporters.ts  seed.ts
src/views/                               The four screens and the record drawer
tests/state.test.ts                      Unit tests
scripts/smoke.mjs                        Browser smoke test
docs/MEETING_WALKTHROUGH.md              Suggested order for the meeting
```

## Limitations

- No live AI review. The reviewer report is a saved fixture and the prompts are text only; no model has been tested.
- Single user, single browser. No accounts, no shared editing, no audit-grade history.
- One condition (COPD) and one synthetic elder.
- Dimensions can be added and marked Not applicable but not deleted, so IDs stay stable.
- Text fields save when focus leaves them. A refresh while still typing in a field loses that field's edit.
- Laid out for a laptop screen of 1366×768 or larger. Not designed for phones.
- The smoke test covers the main acceptance paths in a Chromium-based browser. Firefox and Safari were not checked,
  and no formal accessibility audit was done.
