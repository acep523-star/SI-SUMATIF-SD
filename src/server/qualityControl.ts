import { AssessmentPackage, QualityCheckResult } from '../types/index.ts';

export function runQualityControlCheck(pkg: AssessmentPackage): QualityCheckResult {
  const items = pkg.items || [];
  const cfg = pkg.config;
  const checks: QualityCheckResult['items'] = [];

  const expectedTotal = cfg.numMultipleChoice + cfg.numShortAnswer + cfg.numEssay;
  const actualTotal = items.length;

  // 1. Total Question Count
  checks.push({
    code: 'QC_COUNT',
    title: 'Kesesuaian Jumlah Butir Soal',
    passed: actualTotal === expectedTotal && actualTotal > 0,
    details: `Jumlah soal aktual: ${actualTotal} butir. Target konfigurasi: ${expectedTotal} butir.`,
    severity: 'error',
  });

  // 2. Number Sequence
  let consecutive = true;
  for (let i = 0; i < items.length; i++) {
    if (items[i].number !== i + 1) {
      consecutive = false;
      break;
    }
  }
  checks.push({
    code: 'QC_SEQUENCE',
    title: 'Urutan Penomoran Butir Soal',
    passed: consecutive,
    details: consecutive
      ? 'Seluruh butir soal bernomor urut 1 sampai ' + actualTotal
      : 'Terdapat nomor soal yang melompat atau tidak berurutan.',
    severity: 'error',
  });

  // 3. Question Type Distribution
  const pgCount = items.filter(i => i.type === 'PG').length;
  const isianCount = items.filter(i => i.type === 'ISIAN').length;
  const esaiCount = items.filter(i => i.type === 'ESAI').length;

  const typeMatches =
    pgCount === cfg.numMultipleChoice &&
    isianCount === cfg.numShortAnswer &&
    esaiCount === cfg.numEssay;

  checks.push({
    code: 'QC_TYPE_DIST',
    title: 'Distribusi Bentuk Soal (PG, Isian, Esai)',
    passed: typeMatches,
    details: `Aktual: PG=${pgCount}/${cfg.numMultipleChoice}, Isian=${isianCount}/${cfg.numShortAnswer}, Esai=${esaiCount}/${cfg.numEssay}.`,
    severity: typeMatches ? 'info' : 'warning',
  });

  // 4. Traceability to PROTA
  const untraced = items.filter(
    i => !i.tp || i.tp.trim() === '' || !i.element || i.element.trim() === ''
  );
  checks.push({
    code: 'QC_TRACEABILITY',
    title: 'Keterlacakan ke PROTA (Elemen, CP, TP, ATP)',
    passed: untraced.length === 0,
    details:
      untraced.length === 0
        ? '100% butir soal terhubung secara valid ke Tujuan Pembelajaran (TP) dari PROTA.'
        : `Ditemukan ${untraced.length} butir soal tanpa keterlacakan TP/Elemen yang jelas.`,
    severity: 'error',
  });

  // 5. Complete Keys & Rubrics
  const missingKeys = items.filter(i => !i.correctKey || i.correctKey.trim() === '');
  checks.push({
    code: 'QC_KEYS',
    title: 'Kelengkapan Kunci Jawaban',
    passed: missingKeys.length === 0,
    details:
      missingKeys.length === 0
        ? 'Seluruh butir soal memiliki kunci jawaban definitif.'
        : `Ada ${missingKeys.length} butir soal yang belum memiliki kunci jawaban.`,
    severity: 'error',
  });

  // 6. Non-empty Stems and Options
  const blankStems = items.filter(i => !i.stem || i.stem.trim().length < 5);
  const blankOptions = items.filter(
    i => i.type === 'PG' && (!i.options || i.options.some(o => !o.text || o.text.trim() === ''))
  );
  const contentValid = blankStems.length === 0 && blankOptions.length === 0;
  checks.push({
    code: 'QC_CONTENT',
    title: 'Integritas Teks Soal dan Opsi Jawaban',
    passed: contentValid,
    details: contentValid
      ? 'Tidak ada butir soal atau opsi pilihan yang kosong atau terlalu pendek.'
      : `Ditemukan ${blankStems.length} teks soal kosong dan ${blankOptions.length} opsi kosong.`,
    severity: 'error',
  });

  // 7. Total Score Consistency
  const calcTotalScore = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  const scoreMatches = calcTotalScore === pkg.totalScore && calcTotalScore > 0;
  checks.push({
    code: 'QC_SCORE',
    title: 'Konsistensi Total Bobot Skor',
    passed: scoreMatches,
    details: `Total skor akumulasi butir: ${calcTotalScore} (Target dokumen: ${pkg.totalScore}).`,
    severity: scoreMatches ? 'info' : 'warning',
  });

  // 8. Cognitive Level Distribution
  const lotsCount = items.filter(i => i.cognitiveLevel === 'LOTS').length;
  const motsCount = items.filter(i => i.cognitiveLevel === 'MOTS').length;
  const hotsCount = items.filter(i => i.cognitiveLevel === 'HOTS').length;

  checks.push({
    code: 'QC_COGNITIVE',
    title: 'Distribusi Taksonomi Kognitif (LOTS/MOTS/HOTS)',
    passed: true,
    details: `Sebaran aktual: LOTS=${lotsCount} butir (${Math.round((lotsCount / actualTotal) * 100)}%), MOTS=${motsCount} butir (${Math.round((motsCount / actualTotal) * 100)}%), HOTS=${hotsCount} butir (${Math.round((hotsCount / actualTotal) * 100)}%).`,
    severity: 'info',
  });

  const passedCount = checks.filter(c => c.passed).length;
  const hasErrors = checks.some(c => !c.passed && c.severity === 'error');

  return {
    isReady: !hasErrors,
    totalChecks: checks.length,
    passedChecks: passedCount,
    items: checks,
  };
}
