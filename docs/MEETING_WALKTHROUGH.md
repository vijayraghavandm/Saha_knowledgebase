# Meeting walkthrough

**Meeting prototype · Synthetic/draft content · Not for patient care**

About 25 minutes. Start the app with `npm run dev` and open http://localhost:5173/. If the demo has been used
before, choose **Reset demo** first.

## Say this first (1 minute)

- Everything on screen is synthetic or draft. Nothing is clinically validated and nothing reaches a caregiver.
- The 20 dimensions are our proposal. We want them corrected, not approved as they stand.
- We are asking for checking, correcting, prioritising, and spotting gaps. We are not asking for a textbook.

Point at the process strip: Template → Candidate knowledge → Human review → Patient-context review. The caregiver
workflow is outside this demo.

## 1. Disease template (8 minutes)

1. Read the line under the heading: these are coverage dimensions, not 20 daily tasks.
2. Go down the rows. For each one, set **Include in v1**, **Conditional**, **Defer**, or **Not applicable** and
   type the comment as it is said. Not applicable asks for a reason.
3. Reword a title or question in place if the wording is wrong. The version number goes up.
4. Ask: *what important care dimension is missing?* Add it with **Add a dimension**.

## 2. COPD knowledge matrix (8 minutes)

1. Explain that these are structural examples: mostly questions that capture what is already known about an elder.
2. Filter **Type → Protocol gap**. These four records are where we need clinical input. Open one and read the
   **Question for the clinician** aloud.
3. Open `COPD-R01`. Show the review controls and the note above them: accepting does not verify evidence, grant
   permission, or approve patient use.
4. Accept it, then edit the wording and save. It returns to **Needs re-review**, and the original is still shown.
5. Add a source reference with only a title and a URL. Evidence becomes **Unverified**, and **Supported** stays
   unavailable until verification details are recorded.
6. Set **Proposed priority** on a few records. Note that urgency is a separate field and stays Not assessed.

## 3. Care-plan review example (5 minutes)

1. Show the synthetic elder and the four clinical fields marked **Not supplied — gap**.
2. Read the baseline draft. It is deliberately monitoring-heavy and thin on everyday care. It is not Saha's
   production output.
3. Choose **Load example reviewer output — no model call**. Walk the six groups: Retain, Correct or remove, Add,
   Ask for missing information, Prioritise, Refer for human decision.
4. Accept two changes and reject one. Scroll to **Selected revision**; the original draft is unchanged above it.
5. Show the scorecard. Ask whether these are the right criteria and flags. Leave it unrated unless the reviewer
   wants to rate.
6. Open **Prompt preview** only if there is interest in the generator/reviewer experiment.

## 4. Meeting decisions (3 minutes)

1. Fill in decisions, owners, next actions, and dates as they are agreed. Leave blank what is not agreed.
2. Mark rows **Resolved** where appropriate.
3. Choose **Export JSON** and **Export Markdown** before closing the browser.

## Questions to leave with an answer

- Which dimensions go into v1?
- Which references will the clinician supply or select for the four protocol gaps?
- Which actions need demonstrated training or patient-specific authorisation?
- What does the human reviewer own in the pilot?
- What is the smallest next experiment?
