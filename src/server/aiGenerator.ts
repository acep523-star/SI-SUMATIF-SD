import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import {
  AssessmentConfig,
  AssessmentItem,
  ProtaRow,
  CognitiveLevel,
  QuestionType,
} from '../types/index.ts';

// Deterministic rounding algorithm for integer item count from percentage
export function calculateCognitiveDistribution(
  totalQuestions: number,
  lotsPct: number,
  motsPct: number,
  hotsPct: number
): { lots: number; mots: number; hots: number } {
  const sumPct = lotsPct + motsPct + hotsPct;
  if (Math.abs(sumPct - 100) > 0.01) {
    throw new Error('Total persentase LOTS + MOTS + HOTS harus tepat 100%.');
  }

  const rawLots = (totalQuestions * lotsPct) / 100;
  const rawMots = (totalQuestions * motsPct) / 100;
  const rawHots = (totalQuestions * hotsPct) / 100;

  let lots = Math.floor(rawLots);
  let mots = Math.floor(rawMots);
  let hots = Math.floor(rawHots);

  let remainder = totalQuestions - (lots + mots + hots);

  // Assign remainders to highest fractional parts
  const fractions = [
    { type: 'lots' as const, frac: rawLots - lots },
    { type: 'mots' as const, frac: rawMots - mots },
    { type: 'hots' as const, frac: rawHots - hots },
  ].sort((a, b) => b.frac - a.frac);

  let i = 0;
  while (remainder > 0 && i < fractions.length) {
    if (fractions[i].type === 'lots') lots++;
    else if (fractions[i].type === 'mots') mots++;
    else if (fractions[i].type === 'hots') hots++;
    remainder--;
    i++;
  }

  return { lots, mots, hots };
}

// Zod schema for single generated question item
const ItemSchema = z.object({
  type: z.enum(['PG', 'ISIAN', 'ESAI']),
  stem: z.string().min(5),
  stimulus: z.string().optional(),
  options: z.array(z.object({
    key: z.enum(['A', 'B', 'C', 'D']),
    text: z.string().min(1),
  })).optional(),
  correctKey: z.string().min(1),
  explanation: z.string().min(5),
  element: z.string(),
  cp: z.string(),
  tp: z.string(),
  atp: z.string(),
  indicator: z.string().min(5),
  material: z.string().min(2),
  cognitiveLevel: z.enum(['LOTS', 'MOTS', 'HOTS']),
  thinkingSkill: z.string().min(2),
  scoringRubric: z.object({
    idealAnswer: z.string(),
    partialCriteria: z.array(z.string()).optional(),
    analyticRubric: z.array(z.object({
      criterion: z.string(),
      maxScore: z.number(),
      descriptions: z.array(z.object({
        level: z.string(),
        score: z.number(),
        description: z.string(),
      })),
    })).optional(),
    formulaDescription: z.string().optional(),
  }),
});

export async function generateAssessmentItems(
  config: AssessmentConfig,
  selectedTpRows: ProtaRow[],
  userApiKey?: string
): Promise<AssessmentItem[]> {
  const totalQuestions = config.numMultipleChoice + config.numShortAnswer + config.numEssay;
  if (totalQuestions <= 0) {
    throw new Error('Jumlah total butir soal harus lebih besar dari 0.');
  }

  if (selectedTpRows.length === 0) {
    throw new Error('Wajib memilih minimal satu Tujuan Pembelajaran (TP) dari PROTA.');
  }

  const distribution = calculateCognitiveDistribution(
    totalQuestions,
    config.lotsPercentage,
    config.motsPercentage,
    config.hotsPercentage
  );

  // Construct item targets
  const itemTargets: { number: number; type: QuestionType; cognitiveLevel: CognitiveLevel; tpRow: ProtaRow; weight: number }[] = [];

  let qNum = 1;
  // Multiple Choice items
  for (let i = 0; i < config.numMultipleChoice; i++) {
    const tpRow = selectedTpRows[i % selectedTpRows.length];
    itemTargets.push({
      number: qNum++,
      type: 'PG',
      cognitiveLevel: 'LOTS', // will adjust to meet distribution
      tpRow,
      weight: config.weightPG || 1,
    });
  }
  // Short Answer items
  for (let i = 0; i < config.numShortAnswer; i++) {
    const tpRow = selectedTpRows[i % selectedTpRows.length];
    itemTargets.push({
      number: qNum++,
      type: 'ISIAN',
      cognitiveLevel: 'MOTS',
      tpRow,
      weight: config.weightIsian || 2,
    });
  }
  // Essay items
  for (let i = 0; i < config.numEssay; i++) {
    const tpRow = selectedTpRows[i % selectedTpRows.length];
    itemTargets.push({
      number: qNum++,
      type: 'ESAI',
      cognitiveLevel: 'HOTS',
      tpRow,
      weight: config.weightEssay || 4,
    });
  }

  // Allocate cognitive levels strictly matching target distribution
  let lotsNeeded = distribution.lots;
  let motsNeeded = distribution.mots;
  let hotsNeeded = distribution.hots;

  itemTargets.forEach(t => {
    if (lotsNeeded > 0) {
      t.cognitiveLevel = 'LOTS';
      lotsNeeded--;
    } else if (motsNeeded > 0) {
      t.cognitiveLevel = 'MOTS';
      motsNeeded--;
    } else {
      t.cognitiveLevel = 'HOTS';
      hotsNeeded--;
    }
  });

  const effectiveApiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;

  if (effectiveApiKey && effectiveApiKey.length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

      const prompt = `Anda adalah Ahli Asesmen Pendidikan Dasar dan Ahli Kurikulum SD Indonesia.
Tugas Anda adalah menyusun naskah soal asesmen sumatif SD (${config.assessmentType}) untuk:
Mata Pelajaran: ${config.subject}
Kelas: ${config.grade} (${config.phase})
Semester: ${config.semester}
Tahun Ajaran: ${config.academicYear}

Daftar Elemen, CP, TP, ATP terpilih dari PROTA:
${selectedTpRows.map((r, i) => `[${i + 1}] Elemen: ${r.element} | CP: ${r.cp} | TP: ${r.tp} | ATP: ${r.atp} | Materi: ${r.material || '-'}`).join('\n')}

Susunlah ${itemTargets.length} butir soal dengan spesifikasi persis:
${itemTargets.map(t => `No ${t.number}: Bentuk ${t.type}, Level ${t.cognitiveLevel}, Bobot ${t.weight}, Berdasarkan TP: "${t.tpRow.tp}" (Elemen: ${t.tpRow.element})`).join('\n')}

ATURAN WAJIB:
1. Bahasa Indonesia baku dan komunikatif untuk peserta didik SD kelas ${config.grade}.
2. Untuk Pilihan Ganda: buat stimulus kontekstual, opsi A, B, C, D (atau A, B, C jika opsi = 3), hanya satu jawaban benar, pengecoh logis dan mendidik.
3. Untuk Isian Singkat: jawaban ideal pendek, jelas, tidak multi-tafsir.
4. Untuk Esai: sertakan stimulus naratif/kasus nyata dan rubrik analitik per kriteria skor.
5. Klasifikasi kognitif:
   - LOTS: C1-C2 (Mengingat, Memahami)
   - MOTS: C3 (Menerapkan)
   - HOTS: C4-C6 (Menganalisis, Mengevaluasi, Mencipta)
6. Kembalikan array JSON valid berisi tepat ${itemTargets.length} butir soal.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                type: { type: Type.STRING },
                stem: { type: Type.STRING },
                stimulus: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['key', 'text'],
                  },
                },
                correctKey: { type: Type.STRING },
                explanation: { type: Type.STRING },
                element: { type: Type.STRING },
                cp: { type: Type.STRING },
                tp: { type: Type.STRING },
                atp: { type: Type.STRING },
                indicator: { type: Type.STRING },
                material: { type: Type.STRING },
                cognitiveLevel: { type: Type.STRING },
                thinkingSkill: { type: Type.STRING },
                weight: { type: Type.NUMBER },
                scoringRubric: {
                  type: Type.OBJECT,
                  properties: {
                    idealAnswer: { type: Type.STRING },
                    partialCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                    formulaDescription: { type: Type.STRING },
                  },
                  required: ['idealAnswer'],
                },
              },
              required: [
                'type',
                'stem',
                'correctKey',
                'explanation',
                'element',
                'cp',
                'tp',
                'atp',
                'indicator',
                'material',
                'cognitiveLevel',
                'thinkingSkill',
                'weight',
                'scoringRubric',
              ],
            },
          },
        },
      });

      const parsedJson = JSON.parse(response.text || '[]');
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        return parsedJson.map((item, idx) => {
          const target = itemTargets[idx] || itemTargets[0];
          return {
            number: target.number,
            type: target.type,
            stem: item.stem || 'Soal Asesmen Sumatif',
            stimulus: item.stimulus || undefined,
            options: target.type === 'PG' ? (item.options || [
              { key: 'A', text: 'Pilihan A' },
              { key: 'B', text: 'Pilihan B' },
              { key: 'C', text: 'Pilihan C' },
              { key: 'D', text: 'Pilihan D' },
            ]) : undefined,
            correctKey: item.correctKey || (target.type === 'PG' ? 'A' : 'Kunci Jawaban'),
            explanation: item.explanation || 'Pembahasan kunci jawaban berdasarkan konsep dasar.',
            element: target.tpRow.element,
            cp: target.tpRow.cp,
            tp: target.tpRow.tp,
            atp: target.tpRow.atp,
            indicator: item.indicator || `Disajikan stimulus, peserta didik dapat menentukan konsep terkait ${target.tpRow.tp}`,
            material: item.material || target.tpRow.material || 'Materi Pokok Pembelajaran',
            cognitiveLevel: target.cognitiveLevel,
            thinkingSkill: item.thinkingSkill || (target.cognitiveLevel === 'LOTS' ? 'C2 - Memahami' : target.cognitiveLevel === 'MOTS' ? 'C3 - Menerapkan' : 'C4 - Menganalisis'),
            weight: target.weight,
            scoringRubric: {
              idealAnswer: item.scoringRubric?.idealAnswer || item.correctKey,
              partialCriteria: item.scoringRubric?.partialCriteria || [
                'Skor 2: Jawaban benar, lengkap, dan disertai langkah penyelesaian logis.',
                'Skor 1: Jawaban sebagian benar atau konsep tepat namun perhitungan kurang teliti.',
                'Skor 0: Jawaban salah atau tidak menjawab.',
              ],
              analyticRubric: target.type === 'ESAI' ? [
                {
                  criterion: 'Ketepatan Konsep dan Pemahaman Masalah',
                  maxScore: Math.ceil(target.weight * 0.4),
                  descriptions: [
                    { level: 'Sangat Baik', score: Math.ceil(target.weight * 0.4), description: 'Menjelaskan konsep dengan tepat, menyeluruh, dan mengidentifikasi seluruh variabel soal.' },
                    { level: 'Cukup', score: Math.ceil(target.weight * 0.2), description: 'Menjelaskan sebagian konsep dengan benar namun kurang mendalam.' },
                    { level: 'Perlu Bimbingan', score: 0, description: 'Konsep yang disajikan keliru atau tidak relevan.' },
                  ],
                },
                {
                  criterion: 'Langkah Penyelesaian dan Penalaran',
                  maxScore: Math.ceil(target.weight * 0.6),
                  descriptions: [
                    { level: 'Sangat Baik', score: Math.ceil(target.weight * 0.6), description: 'Menunjukkan tahapan penyelesaian runtut, sistematis, dan kesimpulan akurat.' },
                    { level: 'Cukup', score: Math.ceil(target.weight * 0.3), description: 'Tahapan ada yang terlewati namun hasil akhir mengarah ke jawaban benar.' },
                    { level: 'Perlu Bimbingan', score: 0, description: 'Tidak menunjukkan alur penalaran.' },
                  ],
                },
              ] : undefined,
              formulaDescription: `Skor Perolehan / ${target.weight} x 100`,
            },
          };
        });
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed or schema mismatch, employing pedagogical standard generator:', apiErr);
    }
  }

  // Pedagogical high-standard generator fallback when offline or API key absent
  return itemTargets.map(target => createPedagogicalItem(target, config));
}

function createPedagogicalItem(
  target: { number: number; type: QuestionType; cognitiveLevel: CognitiveLevel; tpRow: ProtaRow; weight: number },
  config: AssessmentConfig
): AssessmentItem {
  const tp = target.tpRow;
  const isMath = (config.subject || '').toLowerCase().includes('mat') || (tp.element || '').toLowerCase().includes('bilang');

  if (target.type === 'PG') {
    if (target.cognitiveLevel === 'LOTS') {
      return {
        number: target.number,
        type: 'PG',
        stem: `Berdasarkan pembelajaran tentang "${tp.tp}", manakah pernyataan berikut yang paling tepat?`,
        stimulus: `Perhatikan pernyataan berikut dengan saksama mengenai materi ${tp.material || tp.element}.`,
        options: [
          { key: 'A', text: `Konsep utama terkait ${tp.material || tp.tp} diterapkan secara tepat sesuai aturan dasar.` },
          { key: 'B', text: `Semua unsur diabaikan dan tidak memperhatikan karakteristik materi pokok.` },
          { key: 'C', text: `Hanya bagian awal yang diperhatikan tanpa memperhatikan alur penyelesaian.` },
          { key: 'D', text: `Pernyataan tidak memiliki keterkaitan dengan tujuan pembelajaran.` },
        ],
        correctKey: 'A',
        explanation: `Opsi A merupakan jawaban yang benar karena menyatakan pemahaman konsep dasar sesuai Capaian Pembelajaran pada materi ${tp.material || tp.element}.`,
        element: tp.element,
        cp: tp.cp,
        tp: tp.tp,
        atp: tp.atp,
        indicator: `Peserta didik dapat mengidentifikasi konsep dasar mengenai ${tp.material || tp.tp} dengan tepat.`,
        material: tp.material || tp.element,
        cognitiveLevel: 'LOTS',
        thinkingSkill: 'C2 - Memahami',
        weight: target.weight,
        scoringRubric: {
          idealAnswer: 'A',
          formulaDescription: 'Skor 1 jika memilih A, skor 0 jika memilih opsi lain.',
        },
      };
    } else if (target.cognitiveLevel === 'MOTS') {
      return {
        number: target.number,
        type: 'PG',
        stem: `Pak Budi bersama peserta didik kelas ${config.grade} sedang melakukan kegiatan di sekolah. Jika mereka menerapkan konsep "${tp.tp}", langkah yang harus dilakukan adalah ....`,
        stimulus: `Di sebuah kelas, guru membimbing siswa menghubungkan materi ${tp.material || tp.tp} dengan pemecahan masalah sehari-hari secara langsung.`,
        options: [
          { key: 'A', text: `Menerapkan rumus atau prosedur penyelesaian langkah demi langkah hingga mendapatkan solusi tepat.` },
          { key: 'B', text: `Memilih jalan pintas tanpa melakukan perhitungan atau pengamatan yang benar.` },
          { key: 'C', text: `Menghentikan proses ketika menemui kesulitan di tahap awal.` },
          { key: 'D', text: `Menyalin hasil pekerjaan kelompok lain tanpa memahami maknanya.` },
        ],
        correctKey: 'A',
        explanation: `Opsi A mencerminkan kemampuan C3 (Menerapkan) di mana murid mengaplikasikan prosedur yang tepat dalam menyelesaikan situasi kontekstual.`,
        element: tp.element,
        cp: tp.cp,
        tp: tp.tp,
        atp: tp.atp,
        indicator: `Disajikan narasi kontekstual, peserta didik dapat menerapkan prosedur terkait ${tp.material || tp.tp} secara akurat.`,
        material: tp.material || tp.element,
        cognitiveLevel: 'MOTS',
        thinkingSkill: 'C3 - Menerapkan',
        weight: target.weight,
        scoringRubric: {
          idealAnswer: 'A',
          formulaDescription: 'Skor 1 jika memilih A, skor 0 jika memilih opsi lain.',
        },
      };
    } else {
      // HOTS
      return {
        number: target.number,
        type: 'PG',
        stem: `Berdasarkan kasus tersebut, apa kesimpulan paling kritis dan mendalam yang dapat diambil terkait materi "${tp.tp}"?`,
        stimulus: `Dua kelompok siswa melakukan pengamatan dan membandingkan hasil terkait ${tp.material || tp.tp}. Kelompok A memperoleh data yang berbeda dari Kelompok B karena terdapat perbedaan variabel perlakuan.`,
        options: [
          { key: 'A', text: `Perbedaan data terjadi karena adanya pengaruh faktor kondisi lingkungan dan ketelitian pengukuran yang harus dianalisis secara kritis.` },
          { key: 'B', text: `Semua data kedua kelompok salah dan harus dibuang tanpa diteliti penyebabnya.` },
          { key: 'C', text: `Kelompok A pasti lebih benar karena anggotanya lebih banyak.` },
          { key: 'D', text: `Hasil pengamatan tidak memerlukan pengujian lebih lanjut.` },
        ],
        correctKey: 'A',
        explanation: `Opsi A menguji kemampuan berpikir tingkat tinggi (C4 - Menganalisis) dengan mengevaluasi hubungan sebab-akibat dari dua data yang berbeda.`,
        element: tp.element,
        cp: tp.cp,
        tp: tp.tp,
        atp: tp.atp,
        indicator: `Disajikan data komparatif, peserta didik dapat menganalisis faktor penyebab dan menarik simpulan kritis.`,
        material: tp.material || tp.element,
        cognitiveLevel: 'HOTS',
        thinkingSkill: 'C4 - Menganalisis',
        weight: target.weight,
        scoringRubric: {
          idealAnswer: 'A',
          formulaDescription: 'Skor 1 jika memilih A, skor 0 jika memilih opsi lain.',
        },
      };
    }
  } else if (target.type === 'ISIAN') {
    return {
      number: target.number,
      type: 'ISIAN',
      stem: `Tuliskan istilah atau hasil akhir yang tepat saat menerapkan materi "${tp.tp}" pada kegiatan belajar!`,
      stimulus: `Lengkapilah kalimat berikut dengan jawaban singkat dan tepat berdasarkan pemahaman materi ${tp.material || tp.tp}.`,
      correctKey: isMath ? '4.500 atau satuan baku yang sesuai' : 'Konsep inti materi yang tepat',
      explanation: `Jawaban harus menyebutkan kata kunci esensial atau besaran angka yang tepat sesuai konteks pembelajaran.`,
      element: tp.element,
      cp: tp.cp,
      tp: tp.tp,
      atp: tp.atp,
      indicator: `Peserta didik dapat menentukan jawaban isian singkat secara tepat mengenai ${tp.material || tp.tp}.`,
      material: tp.material || tp.element,
      cognitiveLevel: target.cognitiveLevel,
      thinkingSkill: target.cognitiveLevel === 'LOTS' ? 'C1 - Mengingat' : 'C3 - Menerapkan',
      weight: target.weight,
      scoringRubric: {
        idealAnswer: isMath ? 'Hasil perhitungan tepat disertai satuan.' : 'Menyebutkan istilah baku sesuai materi.',
        partialCriteria: [
          `Skor ${target.weight}: Menuliskan jawaban ideal secara tepat dan lengkap.`,
          `Skor ${Math.floor(target.weight / 2)}: Menuliskan jawaban yang mendekati atau istilah sinonim tanpa satuan baku.`,
          'Skor 0: Jawaban keliru atau tidak diisi.',
        ],
        formulaDescription: `Skor perolehan antara 0 hingga ${target.weight}.`,
      },
    };
  } else {
    // ESAI
    return {
      number: target.number,
      type: 'ESAI',
      stem: `Jelaskan secara runtut bagaimana cara menyelesaikan permasalahan terkait "${tp.tp}", dan berikan alasan logis mengapa langkah-langkah tersebut harus dilakukan!`,
      stimulus: `Dalam kehidupan sehari-hari, peserta didik sering menemukan fenomena nyata yang berkaitan dengan ${tp.material || tp.tp}. Dibutuhkan pemahaman konsep dan penalaran ilmiah untuk memecahkan masalah tersebut.`,
      correctKey: 'Uraian terstruktur memuat: 1) Identifikasi masalah, 2) Tahapan penyelesaian konsep, 3) Alasan/argumentasi logis, 4) Simpulan.',
      explanation: `Jawaban esai dinilai menggunakan rubrik analitik yang mengukur kedalaman analisis, keruntutan berpikir, dan argumentasi ilmiah peserta didik.`,
      element: tp.element,
      cp: tp.cp,
      tp: tp.tp,
      atp: tp.atp,
      indicator: `Disajikan permasalahan nyata, peserta didik dapat menguraikan langkah pemecahan masalah serta memberikan argumentasi logis secara komprehensif.`,
      material: tp.material || tp.element,
      cognitiveLevel: 'HOTS',
      thinkingSkill: 'C5 - Mengevaluasi & C6 - Mengkreasi Solusi',
      weight: target.weight,
      scoringRubric: {
        idealAnswer: 'Menyajikan identifikasi masalah dengan jelas, memaparkan minimal 3 tahapan pemecahan logis, dan menyimpulkan hasil dengan penalaran yang valid.',
        analyticRubric: [
          {
            criterion: 'Penguasaan Konsep dan Kejelasan Masalah',
            maxScore: 2,
            descriptions: [
              { level: 'Sangat Baik (Skor 2)', score: 2, description: 'Konsep dipaparkan secara sangat jelas, akurat, dan menyeluruh.' },
              { level: 'Cukup (Skor 1)', score: 1, description: 'Konsep dipaparkan sebagian benar namun terdapat kekurangan minor.' },
              { level: 'Perlu Bimbingan (Skor 0)', score: 0, description: 'Konsep salah atau tidak relevan dengan permasalahan.' },
            ],
          },
          {
            criterion: 'Sistematika Penalaran dan Solusi',
            maxScore: 2,
            descriptions: [
              { level: 'Sangat Baik (Skor 2)', score: 2, description: 'Langkah pemecahan masalah runtut, disertai argumentasi logis dan dapat diterapkan.' },
              { level: 'Cukup (Skor 1)', score: 1, description: 'Langkah pemecahan kurang terstruktur namun kesimpulan mengarah ke solusi.' },
              { level: 'Perlu Bimbingan (Skor 0)', score: 0, description: 'Tidak menunjukkan alur penalaran yang masuk akal.' },
            ],
          },
        ],
        formulaDescription: `Total Skor Maksimal = ${target.weight}. Nilai Butir = Skor Perolehan.`,
      },
    };
  }
}
