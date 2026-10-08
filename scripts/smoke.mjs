// Browser smoke test. Starts the Vite dev server, drives an installed browser
// (Edge, then Chrome) through the acceptance checks, and exits non-zero on any
// failure. Screenshots are written to smoke-artifacts/.
//
//   npm run smoke

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'smoke-artifacts');
mkdirSync(out, { recursive: true });

const results = [];
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    results.push(`FAIL  ${name}\n      ${String(e.message ?? e).split('\n')[0]}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error('No installed Edge or Chrome found for the smoke test.');
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await context.newPage();

const consoleErrors = [];
const externalRequests = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));
page.on('request', (r) => {
  const url = r.url();
  if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) externalRequests.push(url);
});

const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });
const nav = (label) => page.getByRole('button', { name: label, exact: true }).click();
const drawer = page.getByTestId('record-drawer');
const savedState = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('saha-knowledge-review-studio/state')).state);
async function download(buttonName) {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.content').getByRole('button', { name: buttonName }).click(),
  ]);
  const path = join(out, dl.suggestedFilename());
  await dl.saveAs(path);
  return { path, text: readFileSync(path, 'utf8'), name: dl.suggestedFilename() };
}

try {
  await page.goto(base);

  await check('opens directly on the 20-dimension template', async () => {
    await page.getByRole('heading', { level: 1, name: 'Disease template' }).waitFor();
    assert((await page.locator('tbody tr[data-testid^="dimension-"]').count()) === 20, 'expected 20 dimension rows');
    await page.getByText('Meeting prototype · Synthetic/draft content · Not for patient care').waitFor();
    await page.getByText('These are knowledge-coverage dimensions, not 20 mandatory daily caregiver tasks.').waitFor();
    assert((await page.locator('.process li').count()) === 5, 'expected 5 process steps');
    await page.locator('.process li.outside').getByText('Outside this demo').waitFor();
    assert((await page.getByRole('button', { name: /publish|escalat|run medical/i }).count()) === 0, 'forbidden control present');
    await shot('01-template');
  });

  await check('template edits, inclusion decision, and comment persist after refresh', async () => {
    const title = page.getByLabel('Title for D01');
    await title.fill('Condition scope (edited in smoke test)');
    await title.blur();
    await page.getByLabel('Inclusion decision for D02').selectOption('include_v1');
    const comment = page.getByLabel('Reviewer comment for D02');
    await comment.fill('Smoke comment');
    await comment.blur();
    await page.reload();
    assert((await page.getByLabel('Title for D01').inputValue()) === 'Condition scope (edited in smoke test)', 'title lost');
    assert((await page.getByLabel('Inclusion decision for D02').inputValue()) === 'include_v1', 'decision lost');
    assert((await page.getByLabel('Reviewer comment for D02').inputValue()) === 'Smoke comment', 'comment lost');
    assert((await page.getByTestId('template-meta').innerText()).includes('Template v2'), 'version did not increment to v2');
  });

  await check('Not applicable requires a reason', async () => {
    await page.getByLabel('Inclusion decision for D03').selectOption('not_applicable');
    const save = page.getByRole('button', { name: 'Save as Not applicable' });
    assert(await save.isDisabled(), 'save should be disabled without a reason');
    assert((await savedState()).template.dimensions[2].inclusion_decision === 'to_discuss', 'saved without reason');
    await page.getByLabel('Reason (required)').fill('Covered under D04 for this module');
    await save.click();
    assert((await savedState()).template.dimensions[2].inclusion_decision === 'not_applicable', 'not saved with reason');
  });

  await check('reorder keeps IDs; add dimension gets D21', async () => {
    await page.getByRole('button', { name: 'Move D02 up' }).click();
    const ids = (await savedState()).template.dimensions.map((d) => d.id);
    assert(ids[0] === 'D02' && ids[1] === 'D01', `unexpected order ${ids.slice(0, 2)}`);
    await page.getByRole('button', { name: 'Add dimension' }).click();
    await page.getByText('Enter a title for the new dimension.').waitFor();
    await page.locator('#new-dim-title').fill('Smoke-test dimension');
    await page.getByRole('button', { name: 'Add dimension' }).click();
    await page.getByTestId('dimension-D21').waitFor();
  });

  await check('matrix lists records, filters, and opens the drawer', async () => {
    await nav('COPD knowledge matrix');
    assert((await page.locator('tr[data-testid^="record-row-"]').count()) === 20, 'expected 20 records');
    await page.getByText('Synthetic discussion examples').first().waitFor();
    await page.getByLabel('Search').fill('bathroom');
    assert((await page.locator('tr[data-testid^="record-row-"]').count()) === 1, 'search should leave 1 record');
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.getByLabel('Type', { exact: true }).selectOption('protocol_gap');
    assert((await page.locator('tr[data-testid^="record-row-"]').count()) === 4, 'expected 4 protocol gaps');
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await shot('02-matrix');
    await page.getByTestId('record-row-COPD-R01').click();
    await drawer.getByRole('heading', { name: /COPD-R01/ }).waitFor();
  });

  await check('accepting changes the review state only; priority persists', async () => {
    await drawer.getByLabel('Reviewer name (typed, not authenticated)').fill('Smoke Reviewer');
    await drawer.getByLabel('Proposed priority').selectOption('core');
    assert(await drawer.getByRole('button', { name: 'Edit and accept for prototype' }).isDisabled(), 'edit-and-accept should be disabled');
    await drawer.getByRole('button', { name: 'Accept for prototype', exact: true }).click();
    await shot('03-drawer');
    await page.reload();
    const r = (await savedState()).knowledge_records.find((x) => x.id === 'COPD-R01');
    assert(r.review.state === 'accepted_for_prototype', `review state ${r.review.state}`);
    assert(r.review.reviewer_name === 'Smoke Reviewer', 'reviewer name not recorded');
    assert(r.evidence_state === 'not_supplied', 'evidence state changed');
    assert(r.proposed_priority === 'core' && r.urgency === 'not_assessed', 'priority/urgency wrong');
    assert(r.clinical_use_status === 'not_released' && r.demo_only === true, 'release labels changed');
    const row = page.getByTestId('record-row-COPD-R01');
    assert((await row.innerText()).includes('Accepted for prototype'), 'row badge missing');
    assert((await row.innerText()).includes('Not supplied'), 'evidence badge missing');
  });

  await check('editing accepted content triggers re-review and keeps the original', async () => {
    await page.getByTestId('record-row-COPD-R01').click();
    await drawer.getByLabel('Current wording (editable)').fill('What help is usually needed to reach the bathroom?');
    await drawer.getByRole('button', { name: 'Save edit' }).click();
    const r = (await savedState()).knowledge_records.find((x) => x.id === 'COPD-R01');
    assert(r.review.state === 'needs_re_review', `review state ${r.review.state}`);
    assert(r.original_content === 'What help does the elder usually need to get from bed to bathroom?', 'original overwritten');
    assert(r.history.length >= 3, 'history not kept');
    assert((await drawer.getByTestId('original-content').innerText()).includes('from bed to bathroom'), 'original not shown');
  });

  await check('a typed URL does not make evidence Supported', async () => {
    await drawer.locator('#new-ref-source_title').fill('Smoke source');
    await drawer.locator('#new-ref-locator').fill('https://example.invalid/section');
    await drawer.getByRole('button', { name: 'Add reference' }).click();
    await drawer.getByTestId('reference-REF-01').waitFor();
    const r = (await savedState()).knowledge_records.find((x) => x.id === 'COPD-R01');
    assert(r.evidence_state === 'unverified', `evidence state ${r.evidence_state}`);
    assert(await drawer.locator('#rec-evidence option[value="supported"]').isDisabled(), 'Supported should be unavailable');
    await page.keyboard.press('Escape');
    assert((await drawer.count()) === 0, 'drawer did not close on Escape');
  });

  await check('care-plan example: gaps shown, report loads from fixture, original retained', async () => {
    await nav('Care-plan review example');
    assert((await page.getByText('Not supplied — gap').count()) === 4, 'expected 4 visible clinical gaps');
    await page.getByRole('button', { name: 'Load example reviewer output — no model call' }).click();
    await page.getByTestId('suggestion-S02').getByRole('button', { name: 'Accept change' }).click();
    await page.getByTestId('suggestion-S04').getByRole('button', { name: 'Accept change' }).click();
    await page.getByTestId('suggestion-S03').getByRole('button', { name: 'Reject change' }).click();
    const original = await page.getByTestId('original-draft').innerText();
    assert(original.includes('caregiver records readings at every visit'), 'original draft changed');
    const revision = await page.getByTestId('selected-revision').innerText();
    assert(revision.includes('record only measurements a clinician has prescribed'), 'accepted correction missing');
    assert(revision.includes('from bed to bathroom'), 'accepted addition missing');
    assert(revision.includes('outside the normal range'), 'rejected change was applied');
    const s = await savedState();
    assert(Object.values(s.care_plan_example.clinical_fields).every((v) => v === null), 'clinical fields were filled');
    assert(s.care_plan_example.scorecard.criteria.every((c) => c.rating === null), 'scorecard should start unrated');
    await shot('04-care-plan');
    await page.getByTestId('suggestion-S04').getByRole('button', { name: 'COPD-R01' }).click();
    await drawer.getByRole('heading', { name: /COPD-R01/ }).waitFor();
    await page.keyboard.press('Escape');
    await nav('Care-plan review example');
    const details = page.getByTestId('prompt-preview');
    assert((await details.getAttribute('open')) === null, 'prompt preview should start collapsed');
    await details.locator('summary').click();
    assert((await details.locator('textarea').count()) === 2, 'expected 2 prompt templates');
  });

  let exported;
  await check('meeting decisions persist; exports reflect state with demo labels', async () => {
    await nav('Meeting decisions');
    const owner = page.getByLabel('Owner for M01');
    assert((await owner.inputValue()) === '', 'owner should start unassigned');
    await owner.fill('Smoke Owner');
    await owner.blur();
    await page.getByLabel('Status for M01').selectOption('resolved');
    await page.reload();
    assert((await page.getByLabel('Owner for M01').inputValue()) === 'Smoke Owner', 'owner lost');
    assert((await page.getByTestId('workflow-counts').innerText()).replace(/\s+/g, ' ').includes('Open decisions 7'), 'open count wrong');
    await shot('05-decisions');

    exported = await download('Export JSON');
    const bundle = JSON.parse(exported.text);
    assert(bundle.demo_only === true && bundle.clinical_use_status === 'not_released', 'bundle labels missing');
    assert(bundle.template.dimensions.length === 21, 'bundle template out of date');
    assert(bundle.meeting_decisions[0].owner === 'Smoke Owner', 'bundle decisions out of date');
    assert(bundle.care_plan_example.original_draft.length === 6 && bundle.revised_demo_plan.length === 7, 'plans missing');
    assert(exported.name.includes('DEMO'), 'filename lacks DEMO');

    const md = await download('Export Markdown');
    assert(md.text.includes('DRAFT / DEMO ONLY') && md.text.includes('Smoke Owner'), 'markdown out of date or unlabelled');
  });

  await check('malformed import fails with an error and preserves data', async () => {
    const before = JSON.stringify(await savedState());
    const bad = join(out, 'malformed.json');
    writeFileSync(bad, '{"bundle_format":"saha_knowledge_review_bundle","bundle_version":1,"demo_only":true,"template":5}');
    await page.locator('.content input[type="file"]').setInputFiles(bad);
    const alert = page.getByTestId('import-error');
    await alert.waitFor();
    assert((await alert.innerText()).includes('template: expected an object'), 'error is not specific');
    assert(JSON.stringify(await savedState()) === before, 'state changed after failed import');
    assert((await page.getByLabel('Owner for M01').inputValue()) === 'Smoke Owner', 'UI state changed after failed import');
  });

  await check('reset requires confirmation', async () => {
    await page.locator('.content').getByRole('button', { name: 'Reset demo' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    assert((await savedState()).meeting_decisions[0].owner === 'Smoke Owner', 'cancel still reset');
    await page.locator('.content').getByRole('button', { name: 'Reset demo' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo' }).click();
    const s = await savedState();
    assert(s.meeting_decisions[0].owner === '' && s.template.dimensions.length === 20, 'reset did not restore fixtures');
  });

  await check('valid import round-trips', async () => {
    await page.locator('.content input[type="file"]').setInputFiles(exported.path);
    const dialog = page.getByRole('alertdialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Import and replace' }).click();
    const s = await savedState();
    const bundle = JSON.parse(exported.text);
    assert(s.meeting_decisions[0].owner === 'Smoke Owner', 'import did not restore decisions');
    assert(s.template.dimensions.length === 21 && s.template.dimensions[0].id === 'D02', 'import did not restore template');
    assert(JSON.stringify(s.knowledge_records) === JSON.stringify(bundle.knowledge_records), 'records differ after import');
    assert(JSON.stringify(s.care_plan_example) === JSON.stringify(bundle.care_plan_example), 'example differs after import');
  });

  await check('no console errors and no external network requests', async () => {
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
    assert(externalRequests.length === 0, `external requests: ${externalRequests.join(', ')}`);
  });
} finally {
  await browser.close();
  await server.close();
}

console.log(results.join('\n'));
console.log(`\n${results.length - failed} passed, ${failed} failed. Screenshots: ${out}`);
process.exit(failed === 0 ? 0 : 1);
