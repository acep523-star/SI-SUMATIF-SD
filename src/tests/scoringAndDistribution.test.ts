import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCognitiveDistribution } from '../server/aiGenerator.ts';
import { runQualityControlCheck } from '../server/qualityControl.ts';
import { AssessmentPackage } from '../types/index.ts';

test('Cognitive distribution calculates exact integer sum matching total questions', () => {
  // Test case 1: 15 items with 30% LOTS, 50% MOTS, 20% HOTS
  // 15 * 0.3 = 4.5, 15 * 0.5 = 7.5, 15 * 0.2 = 3.0 -> floor is 4, 7, 3 (sum 14), remainders 0.5, 0.5 -> lots=5, mots=8 or 7+hots=3
  const dist1 = calculateCognitiveDistribution(15, 30, 50, 20);
  assert.equal(dist1.lots + dist1.mots + dist1.hots, 15);
  assert.equal(dist1.lots >= 4, true);
  assert.equal(dist1.mots >= 7, true);
  assert.equal(dist1.hots, 3);

  // Test case 2: 25 items with 25% LOTS, 50% MOTS, 25% HOTS
  const dist2 = calculateCognitiveDistribution(25, 25, 50, 25);
  assert.equal(dist2.lots + dist2.mots + dist2.hots, 25);

  // Test case 3: 10 items with 40% LOTS, 40% MOTS, 20% HOTS
  const dist3 = calculateCognitiveDistribution(10, 40, 40, 20);
  assert.equal(dist3.lots, 4);
  assert.equal(dist3.mots, 4);
  assert.equal(dist3.hots, 2);
  assert.equal(dist3.lots + dist3.mots + dist3.hots, 10);
});

test('Cognitive distribution throws error if percentage does not sum to 100', () => {
  assert.throws(() => {
    calculateCognitiveDistribution(20, 30, 30, 30); // 90%
  }, /100%/);
});

test('Quality Control check validates compliant assessment package', () => {
  const dummyPkg: AssessmentPackage = {
    id: 'test-pkg-1',
    userId: 'user-1',
    title: 'Test ASAS 1 Matematika',
    config: {
      assessmentType: 'ASAS_1',
      grade: 4,
      phase: 'Fase B',
      semester: 1,
      subject: 'Matematika',
      academicYear: '2026/2027',
      authorName: 'Acep Guru SD',
      timeAllocationMinutes: 90,
      numMultipleChoice: 2,
      numShortAnswer: 1,
      numEssay: 1,
      lotsPercentage: 50,
      motsPercentage: 25,
      hotsPercentage: 25,
      multipleChoiceOptionsCount: 4,
      scoringFormula: 'Nilai = Skor / Max * 100',
      weightPG: 1,
      weightIsian: 2,
      weightEssay: 4,
    },
    schoolSnapshot: {
      id: 'sch-1',
      userId: 'user-1',
      schoolName: 'SD Negeri 1 Contoh',
      npsn: '20202020',
      address: 'Jl. Merdeka No. 1',
      village: 'Sukamaju',
      district: 'Cibiru',
      cityRegency: 'Kota Bandung',
      province: 'Jawa Barat',
      principalName: 'Budi Santoso, M.Pd.',
      authorTeacherName: 'Acep Guru SD',
      authorTeacherNipNik: '198501012010011002',
      academicYear: '2026/2027',
      isLocked: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    selectedTpIds: ['tp-1'],
    items: [
      {
        number: 1,
        type: 'PG',
        stem: 'Berapakah hasil dari 25 + 30?',
        options: [
          { key: 'A', text: '55' },
          { key: 'B', text: '50' },
          { key: 'C', text: '60' },
          { key: 'D', text: '65' },
        ],
        correctKey: 'A',
        explanation: '25 + 30 = 55',
        element: 'Bilangan',
        cp: 'CP Bilangan',
        tp: 'Menghitung penjumlahan',
        atp: '4.1 Alur penjumlahan',
        indicator: 'Disajikan soal penjumlahan, siswa dapat menghitung hasil',
        material: 'Penjumlahan Bilangan',
        cognitiveLevel: 'LOTS',
        thinkingSkill: 'C2 - Memahami',
        weight: 1,
        scoringRubric: { idealAnswer: 'A' },
      },
      {
        number: 2,
        type: 'PG',
        stem: 'Berapakah hasil dari 100 - 45?',
        options: [
          { key: 'A', text: '55' },
          { key: 'B', text: '45' },
          { key: 'C', text: '65' },
          { key: 'D', text: '50' },
        ],
        correctKey: 'A',
        explanation: '100 - 45 = 55',
        element: 'Bilangan',
        cp: 'CP Bilangan',
        tp: 'Menghitung pengurangan',
        atp: '4.2 Alur pengurangan',
        indicator: 'Disajikan soal pengurangan, siswa dapat menghitung hasil',
        material: 'Pengurangan Bilangan',
        cognitiveLevel: 'LOTS',
        thinkingSkill: 'C2 - Memahami',
        weight: 1,
        scoringRubric: { idealAnswer: 'A' },
      },
      {
        number: 3,
        type: 'ISIAN',
        stem: 'Ibu memiliki 3 kantong permen, masing-masing berisi 10 permen. Jumlah permen adalah ... butir.',
        correctKey: '30',
        explanation: '3 x 10 = 30',
        element: 'Bilangan',
        cp: 'CP Bilangan',
        tp: 'Menyelesaikan perkalian',
        atp: '4.3 Alur perkalian',
        indicator: 'Disajikan soal cerita perkalian sederhana, siswa dapat mengisi jawaban singkat',
        material: 'Perkalian Dasar',
        cognitiveLevel: 'MOTS',
        thinkingSkill: 'C3 - Menerapkan',
        weight: 2,
        scoringRubric: { idealAnswer: '30' },
      },
      {
        number: 4,
        type: 'ESAI',
        stem: 'Jelaskan dua strategi berbeda untuk menghitung 48 x 5 secara cepat!',
        correctKey: 'Strategi 1: (50 x 5) - (2 x 5) = 240. Strategi 2: (48 / 2) x 10 = 240.',
        explanation: 'Dua strategi dekomposisi atau kompensasi bilangan.',
        element: 'Bilangan',
        cp: 'CP Bilangan',
        tp: 'Menganalisis strategi perkalian',
        atp: '4.4 Alur strategi perkalian',
        indicator: 'Disajikan permasalahan, siswa dapat menguraikan strategi pemecahan masalah',
        material: 'Strategi Hitung Cepat',
        cognitiveLevel: 'HOTS',
        thinkingSkill: 'C4 - Menganalisis',
        weight: 4,
        scoringRubric: {
          idealAnswer: 'Strategi dekomposisi atau kompensasi yang runtut.',
          analyticRubric: [
            {
              criterion: 'Ketepatan Strategi',
              maxScore: 2,
              descriptions: [
                { level: 'Sangat Baik', score: 2, description: 'Menjelaskan 2 strategi dengan tepat.' },
              ],
            },
            {
              criterion: 'Langkah Perhitungan',
              maxScore: 2,
              descriptions: [
                { level: 'Sangat Baik', score: 2, description: 'Perhitungan benar tanpa kesalahan.' },
              ],
            },
          ],
        },
      },
    ],
    totalScore: 8, // 1 + 1 + 2 + 4 = 8
    status: 'ready_to_export',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const qc = runQualityControlCheck(dummyPkg);
  assert.equal(qc.isReady, true);
  assert.equal(qc.passedChecks >= 7, true);
});
