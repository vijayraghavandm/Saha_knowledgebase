import type { EvidenceState, ReviewState } from '../types';
import type { Tone } from './common';

// Colour is always paired with a text label; these only pick the accent.
export const REVIEW_TONES: Record<ReviewState, Tone> = {
  unreviewed: 'neutral',
  accepted_for_prototype: 'sage',
  edited_and_accepted_for_prototype: 'sage',
  needs_evidence: 'amber',
  needs_patient_information: 'amber',
  deferred: 'outline',
  rejected: 'coral',
  needs_re_review: 'amber',
};

export const EVIDENCE_TONES: Record<EvidenceState, Tone> = {
  not_supplied: 'neutral',
  unverified: 'amber',
  supported: 'sage',
  conflicting: 'coral',
};
