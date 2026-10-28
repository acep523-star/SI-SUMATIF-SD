import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  HeadingLevel,
  Packer,
} from 'docx';
import { AssessmentPackage, SchoolIdentity, AssessmentItem } from '../types/index.ts';

// 1 cm = 567 DXA
const MARGIN_LEFT = 1701; // 3 cm
const MARGIN_RIGHT = 1417; // 2.5 cm
const MARGIN_TOP = 1417; // 2.5 cm
const MARGIN_BOTTOM = 1417; // 2.5 cm
const FONT_FAMILY = 'Times New Roman';

function createSchoolKop(school: SchoolIdentity, assessmentTitle: string, isTeacherDoc = false): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Top header text
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: `PEMERINTAH KABUPATEN/KOTA ${school.cityRegency?.toUpperCase() || ''}`,
          font: FONT_FAMILY,
          size: 22, // 11pt
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: `DINAS PENDIDIKAN DAN KEBUDAYAAN`,
          font: FONT_FAMILY,
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: school.schoolName?.toUpperCase() || 'SEKOLAH DASAR',
          font: FONT_FAMILY,
          size: 26, // 13pt
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 240 },
      children: [
        new TextRun({
          text: `Alamat: ${school.address || '-'}, Desa/Kel. ${school.village || '-'}, Kec. ${school.district || '-'}, ${school.cityRegency || '-'}`,
          font: FONT_FAMILY,
          size: 18,
          italics: true,
        }),
        new TextRun({
          text: school.npsn ? ` | NPSN: ${school.npsn}` : '',
          font: FONT_FAMILY,
          size: 18,
          italics: true,
        }),
      ],
    })
  );

  // Double horizontal rule under Kop
  elements.push(
    new Paragraph({
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.DOUBLE,
          size: 24, // 3pt double line
        },
      },
      spacing: { after: 200 },
      children: [],
    })
  );

  // Assessment Banner Title
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: assessmentTitle.toUpperCase(),
          font: FONT_FAMILY,
          size: 24,
          bold: true,
        }),
      ],
    })
  );

  if (isTeacherDoc) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: '[ DOKUMEN RAHASIA — KHUSUS GURU / PENDIDIK ]',
            font: FONT_FAMILY,
            size: 20,
            bold: true,
            color: 'C00000',
          }),
        ],
      })
    );
  }

  return elements;
}

function createStudentIdentityTable(pkg: AssessmentPackage): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Mata Pelajaran\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: pkg.config.subject, font: FONT_FAMILY, size: 20 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Kelas / Fase\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: `${pkg.config.grade} / ${pkg.config.phase}`, font: FONT_FAMILY, size: 20 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Hari, Tanggal\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: pkg.config.examDate || '............................', font: FONT_FAMILY, size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Nama Peserta\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: '............................................', font: FONT_FAMILY, size: 20 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Nomor Absen\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: '............................................', font: FONT_FAMILY, size: 20 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Waktu Pengerjaan\t: ', font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: `${pkg.config.timeAllocationMinutes} Menit`, font: FONT_FAMILY, size: 20 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function generateStudentExamDocx(pkg: AssessmentPackage): Promise<Buffer> {
  const school = pkg.schoolSnapshot;
  const kopElements = createSchoolKop(
    school,
    `NASKAH SOAL ${pkg.config.assessmentType} SEMESTER ${pkg.config.semester} TAHUN AJARAN ${pkg.config.academicYear}`
  );
  const studentTable = createStudentIdentityTable(pkg);

  const instructions = [
    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({ text: 'PETUNJUK PENGERJAAN SOAL:', font: FONT_FAMILY, size: 20, bold: true }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '1. Berdoalah sebelum mulai mengerjakan soal asesmen.', font: FONT_FAMILY, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '2. Tuliskan identitas nama, kelas, dan nomor absen pada kolom yang tersedia.', font: FONT_FAMILY, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '3. Bacalah setiap butir soal dengan cermat dan teliti sebelum menjawab.', font: FONT_FAMILY, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: '4. Periksa kembali seluruh jawaban Anda sebelum diserahkan kepada bapak/ibu guru pengawas.', font: FONT_FAMILY, size: 20 }),
      ],
    }),
  ];

  // Group items by Section: I. PILIHAN GANDA, II. ISIAN SINGKAT, III. URAIAN/ESAI
  const pgItems = pkg.items.filter(i => i.type === 'PG');
  const isianItems = pkg.items.filter(i => i.type === 'ISIAN');
  const esaiItems = pkg.items.filter(i => i.type === 'ESAI');

  const questionElements: Paragraph[] = [];

  // SECTION I: PILIHAN GANDA
  if (pgItems.length > 0) {
    questionElements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'I. PILIHAN GANDA',
            font: FONT_FAMILY,
            size: 22,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: 'Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!',
            font: FONT_FAMILY,
            size: 20,
            italics: true,
          }),
        ],
      })
    );

    for (const item of pgItems) {
      if (item.stimulus) {
        questionElements.push(
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: `[Stimulus Soal No. ${item.number}]`,
                font: FONT_FAMILY,
                size: 19,
                bold: true,
                color: '333333',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60, line: 276 },
            children: [
              new TextRun({
                text: item.stimulus,
                font: FONT_FAMILY,
                size: 20,
                italics: true,
              }),
            ],
          })
        );
      }

      questionElements.push(
        new Paragraph({
          spacing: { before: 80, after: 60, line: 276 },
          children: [
            new TextRun({
              text: `${item.number}. ${item.stem}`,
              font: FONT_FAMILY,
              size: 22,
            }),
          ],
        })
      );

      // Options
      if (item.options) {
        for (const opt of item.options) {
          questionElements.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: `${opt.key}. ${opt.text}`,
                  font: FONT_FAMILY,
                  size: 21,
                }),
              ],
            })
          );
        }
      }
    }
  }

  // SECTION II: ISIAN SINGKAT
  if (isianItems.length > 0) {
    questionElements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 260, after: 100 },
        children: [
          new TextRun({
            text: 'II. ISIAN SINGKAT',
            font: FONT_FAMILY,
            size: 22,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: 'Isilah titik-titik di bawah ini dengan jawaban yang tepat dan singkat!',
            font: FONT_FAMILY,
            size: 20,
            italics: true,
          }),
        ],
      })
    );

    for (const item of isianItems) {
      if (item.stimulus) {
        questionElements.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: item.stimulus,
                font: FONT_FAMILY,
                size: 20,
                italics: true,
              }),
            ],
          })
        );
      }
      questionElements.push(
        new Paragraph({
          spacing: { before: 60, after: 120, line: 276 },
          children: [
            new TextRun({
              text: `${item.number}. ${item.stem}`,
              font: FONT_FAMILY,
              size: 22,
            }),
          ],
        })
      );
    }
  }

  // SECTION III: URAIAN / ESAI
  if (esaiItems.length > 0) {
    questionElements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 260, after: 100 },
        children: [
          new TextRun({
            text: 'III. URAIAN / ESAI',
            font: FONT_FAMILY,
            size: 22,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: 'Jawablah pertanyaan-pertanyaan berikut dengan uraian yang jelas, runtut, dan lengkap!',
            font: FONT_FAMILY,
            size: 20,
            italics: true,
          }),
        ],
      })
    );

    for (const item of esaiItems) {
      if (item.stimulus) {
        questionElements.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: item.stimulus,
                font: FONT_FAMILY,
                size: 20,
                italics: true,
              }),
            ],
          })
        );
      }
      questionElements.push(
        new Paragraph({
          spacing: { before: 80, after: 200, line: 276 },
          children: [
            new TextRun({
              text: `${item.number}. ${item.stem}`,
              font: FONT_FAMILY,
              size: 22,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${pkg.config.subject} Kelas ${pkg.config.grade} - ${pkg.config.assessmentType}`,
                    font: FONT_FAMILY,
                    size: 16,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Halaman ', font: FONT_FAMILY, size: 18 }),
                  new PageNumber(PageNumber.CURRENT),
                  new TextRun({ text: ' dari ', font: FONT_FAMILY, size: 18 }),
                  new PageNumber(PageNumber.TOTAL_PAGES),
                ],
              }),
            ],
          }),
        },
        children: [
          ...kopElements,
          studentTable,
          ...instructions,
          ...questionElements,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateTeacherKeyDocx(pkg: AssessmentPackage): Promise<Buffer> {
  const school = pkg.schoolSnapshot;
  const kopElements = createSchoolKop(
    school,
    `KUNCI JAWABAN DAN PEMBAHASAN ${pkg.config.assessmentType}`,
    true
  );

  const metaParagraph = new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({
        text: `Mata Pelajaran: ${pkg.config.subject} | Kelas/Fase: ${pkg.config.grade}/${pkg.config.phase} | Semester: ${pkg.config.semester} | Tahun Ajaran: ${pkg.config.academicYear}\nPenyusun: ${pkg.config.authorName} | Total Skor Maksimal: ${pkg.totalScore}`,
        font: FONT_FAMILY,
        size: 20,
        bold: true,
      }),
    ],
  });

  // Key Table
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
        new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Bentuk', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Kunci / Jawaban Ideal', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Bobot', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Kognitif', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Pembahasan / Alasan Kunci', bold: true, font: FONT_FAMILY, size: 20 })] })] }),
      ],
    }),
  ];

  for (const item of pkg.items) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.number), font: FONT_FAMILY, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.type, font: FONT_FAMILY, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.correctKey, font: FONT_FAMILY, size: 19, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.weight), font: FONT_FAMILY, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.cognitiveLevel} (${item.thinkingSkill.split(' - ')[0] || ''})`, font: FONT_FAMILY, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.explanation, font: FONT_FAMILY, size: 18 })] })] }),
        ],
      })
    );
  }

  const keyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
            },
          },
        },
        children: [
          ...kopElements,
          metaParagraph,
          keyTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateKisiKisiDocx(pkg: AssessmentPackage): Promise<Buffer> {
  const school = pkg.schoolSnapshot;
  const kopElements = createSchoolKop(
    school,
    `KISI-KISI PENULISAN SOAL ${pkg.config.assessmentType}`
  );

  const metaParagraph = new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({
        text: `Mata Pelajaran: ${pkg.config.subject} | Kelas/Fase: ${pkg.config.grade}/${pkg.config.phase} | Semester: ${pkg.config.semester} | Tahun Ajaran: ${pkg.config.academicYear}\nBerdasarkan Panduan Pembelajaran dan Asesmen Edisi Revisi BSKAP Kemendikdasmen`,
        font: FONT_FAMILY,
        size: 20,
      }),
    ],
  });

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Elemen', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Capaian Pembelajaran (CP)', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran (TP)', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Indikator Soal', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Level', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
        new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Bentuk', bold: true, font: FONT_FAMILY, size: 18 })] })] }),
      ],
    }),
  ];

  for (const item of pkg.items) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.number), font: FONT_FAMILY, size: 17 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.element, font: FONT_FAMILY, size: 17 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.cp, font: FONT_FAMILY, size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.tp, font: FONT_FAMILY, size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.material, font: FONT_FAMILY, size: 17 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.indicator, font: FONT_FAMILY, size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.cognitiveLevel, font: FONT_FAMILY, size: 17, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.type, font: FONT_FAMILY, size: 17 })] })] }),
        ],
      })
    );
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
            },
          },
        },
        children: [
          ...kopElements,
          metaParagraph,
          table,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateRubricDocx(pkg: AssessmentPackage): Promise<Buffer> {
  const school = pkg.schoolSnapshot;
  const kopElements = createSchoolKop(
    school,
    `PEDOMAN PENSKORAN DAN RUBRIK PENILAIAN ${pkg.config.assessmentType}`,
    true
  );

  const formulaParagraph = new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({
        text: `FORMULA PENGHITUNGAN NILAI AKHIR:\n${pkg.config.scoringFormula || 'Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100'}\nTotal Skor Maksimal Asesmen: ${pkg.totalScore}`,
        font: FONT_FAMILY,
        size: 20,
        bold: true,
      }),
    ],
  });

  const rubricContent: Paragraph[] = [];

  for (const item of pkg.items) {
    rubricContent.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 60 },
        children: [
          new TextRun({
            text: `Soal Nomor ${item.number} (Bentuk: ${item.type} | Level: ${item.cognitiveLevel} | Bobot: ${item.weight})`,
            font: FONT_FAMILY,
            size: 22,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'Pertanyaan: ', font: FONT_FAMILY, size: 20, bold: true }),
          new TextRun({ text: item.stem, font: FONT_FAMILY, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'Kunci / Jawaban Ideal: ', font: FONT_FAMILY, size: 20, bold: true }),
          new TextRun({ text: item.scoringRubric.idealAnswer, font: FONT_FAMILY, size: 20, italics: true }),
        ],
      })
    );

    if (item.scoringRubric.partialCriteria && item.scoringRubric.partialCriteria.length > 0) {
      rubricContent.push(
        new Paragraph({
          children: [new TextRun({ text: 'Kriteria Penskoran Parsial:', font: FONT_FAMILY, size: 19, bold: true })],
        })
      );
      for (const crit of item.scoringRubric.partialCriteria) {
        rubricContent.push(
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: `• ${crit}`, font: FONT_FAMILY, size: 19 })],
          })
        );
      }
    }

    if (item.scoringRubric.analyticRubric && item.scoringRubric.analyticRubric.length > 0) {
      rubricContent.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: 'Rubrik Analitik:', font: FONT_FAMILY, size: 19, bold: true })],
        })
      );
      for (const ar of item.scoringRubric.analyticRubric) {
        rubricContent.push(
          new Paragraph({
            indent: { left: 300 },
            children: [new TextRun({ text: `Kriteria: ${ar.criterion} (Maks. ${ar.maxScore} poin)`, font: FONT_FAMILY, size: 19, bold: true })],
          })
        );
        for (const desc of ar.descriptions) {
          rubricContent.push(
            new Paragraph({
              indent: { left: 600 },
              children: [new TextRun({ text: `- [${desc.level} - Skor ${desc.score}]: ${desc.description}`, font: FONT_FAMILY, size: 18 })],
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
            },
          },
        },
        children: [
          ...kopElements,
          formulaParagraph,
          ...rubricContent,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
