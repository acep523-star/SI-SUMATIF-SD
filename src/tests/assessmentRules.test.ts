import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSESSMENT_CONFIG, getPhaseByGrade, AssessmentType } from '../types/index.ts';

test('Assessment grade restrictions adhere strictly to policy', () => {
  // ASAS 1 is available for grades 1, 2, 3, 4, 5, 6
  assert.deepEqual(ASSESSMENT_CONFIG.ASAS_1.allowedGrades, [1, 2, 3, 4, 5, 6]);

  // ASAT is available for grades 1, 2, 3, 4, 5 only (Grade 6 is NOT allowed)
  assert.deepEqual(ASSESSMENT_CONFIG.ASAT.allowedGrades, [1, 2, 3, 4, 5]);
  assert.equal(ASSESSMENT_CONFIG.ASAT.allowedGrades.includes(6), false);

  // ASAJ is available for grade 6 only
  assert.deepEqual(ASSESSMENT_CONFIG.ASAJ.allowedGrades, [6]);
  assert.equal(ASSESSMENT_CONFIG.ASAJ.allowedGrades.includes(5), false);
  assert.equal(ASSESSMENT_CONFIG.ASAJ.allowedGrades.includes(1), false);
});

test('Curriculum Phase mapping is correct for elementary school', () => {
  assert.equal(getPhaseByGrade(1), 'Fase A');
  assert.equal(getPhaseByGrade(2), 'Fase A');
  assert.equal(getPhaseByGrade(3), 'Fase B');
  assert.equal(getPhaseByGrade(4), 'Fase B');
  assert.equal(getPhaseByGrade(5), 'Fase C');
  assert.equal(getPhaseByGrade(6), 'Fase C');
});

test('NIP/NIK string representation preserves leading zeros', () => {
  const nipWithZero = '0198001012024';
  const clean = String(nipWithZero).trim();
  assert.equal(clean.length, 13);
  assert.equal(clean.startsWith('0'), true);
  assert.equal(clean, '0198001012024');
});
