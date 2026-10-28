import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { ProtaRow, ProtaDocument } from '../types/index.ts';

interface ColumnMapping {
  elementIdx: number;
  cpIdx: number;
  tpIdx: number;
  atpIdx: number;
  materialIdx: number;
  semesterIdx: number;
}

// Helper to clean and normalize text
function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Fuzzy header detection
function detectHeaderIndices(headers: string[]): ColumnMapping {
  const norm = headers.map(h => cleanText(h).toLowerCase());

  let elementIdx = -1;
  let cpIdx = -1;
  let tpIdx = -1;
  let atpIdx = -1;
  let materialIdx = -1;
  let semesterIdx = -1;

  norm.forEach((h, idx) => {
    if (elementIdx === -1 && (h.includes('elemen') || h.includes('domain') || h.includes('bidang'))) {
      elementIdx = idx;
    } else if (cpIdx === -1 && (h.includes('capaian') || h.includes('cp') || h.includes('kompetensi'))) {
      cpIdx = idx;
    } else if (tpIdx === -1 && (h.includes('tujuan pembelajaran') || h === 'tp' || h.includes('tujuan'))) {
      tpIdx = idx;
    } else if (atpIdx === -1 && (h.includes('alur tujuan') || h.includes('atp') || h.includes('alur'))) {
      atpIdx = idx;
    } else if (materialIdx === -1 && (h.includes('materi') || h.includes('pokok bahasan') || h.includes('konten') || h.includes('topik'))) {
      materialIdx = idx;
    } else if (semesterIdx === -1 && (h.includes('semester') || h.includes('smt') || h === 'sem')) {
      semesterIdx = idx;
    }
  });

  // Fallback defaults if table lacks explicit header names
  if (tpIdx === -1 && norm.length >= 3) tpIdx = 2;
  if (atpIdx === -1 && norm.length >= 4) atpIdx = 3;
  if (cpIdx === -1 && norm.length >= 2) cpIdx = 1;
  if (elementIdx === -1 && norm.length >= 1) elementIdx = 0;

  return { elementIdx, cpIdx, tpIdx, atpIdx, materialIdx, semesterIdx };
}

export async function parseProtaBuffer(
  buffer: Buffer,
  filename: string,
  userId: string,
  customMapping?: Partial<ColumnMapping>
): Promise<ProtaDocument> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const rows: ProtaRow[] = [];
  let warningMessage: string | undefined;

  let rawTableData: string[][] = [];

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    rawTableData = jsonRows.map(row => (Array.isArray(row) ? row.map(cleanText) : []));
  } else if (ext === 'docx') {
    // Extract using mammoth to HTML to preserve <tr> and <td>
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    // Simple regex parser for <tr>...</tr> and <td>...</td>
    const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const tr of trMatches) {
      const cellMatches = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cells = cellMatches.map(cell =>
        cleanText(cell.replace(/<[^>]+>/g, ' '))
      );
      if (cells.length > 0) {
        rawTableData.push(cells);
      }
    }
  } else if (ext === 'pdf') {
    // Basic text buffer parser for PDF text streams
    const textContent = buffer.toString('utf-8');
    const lines = textContent
      .split(/\n/)
      .map(cleanText)
      .filter(l => l.length > 0);

    // Group lines into chunks or rows
    rawTableData = lines.map(line => line.split(/\t| {3,}/).map(cleanText));
  } else {
    // Plain text or CSV fallback
    const textContent = buffer.toString('utf-8');
    const lines = textContent.split(/\r?\n/).filter(Boolean);
    rawTableData = lines.map(line => line.split(/[,;\t]/).map(cleanText));
  }

  // Filter empty rows
  rawTableData = rawTableData.filter(row => row.some(cell => cell.length > 0));

  if (rawTableData.length < 2) {
    throw new Error('File tidak memuat data tabel PROTA yang cukup untuk dianalisis.');
  }

  // Find header row (usually row 0 or row 1)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, rawTableData.length); i++) {
    const rowStr = rawTableData[i].join(' ').toLowerCase();
    if (rowStr.includes('tujuan') || rowStr.includes('capaian') || rowStr.includes('elemen') || rowStr.includes('tp')) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = rawTableData[headerRowIdx];
  const detectedMapping = detectHeaderIndices(headers);
  const mapping: ColumnMapping = {
    elementIdx: customMapping?.elementIdx ?? detectedMapping.elementIdx,
    cpIdx: customMapping?.cpIdx ?? detectedMapping.cpIdx,
    tpIdx: customMapping?.tpIdx ?? detectedMapping.tpIdx,
    atpIdx: customMapping?.atpIdx ?? detectedMapping.atpIdx,
    materialIdx: customMapping?.materialIdx ?? detectedMapping.materialIdx,
    semesterIdx: customMapping?.semesterIdx ?? detectedMapping.semesterIdx,
  };

  const dataRows = rawTableData.slice(headerRowIdx + 1);

  let currentElement = '';
  let currentCp = '';

  dataRows.forEach((r, idx) => {
    const rawElement = mapping.elementIdx >= 0 ? r[mapping.elementIdx] || '' : '';
    const rawCp = mapping.cpIdx >= 0 ? r[mapping.cpIdx] || '' : '';
    const rawTp = mapping.tpIdx >= 0 ? r[mapping.tpIdx] || '' : '';
    const rawAtp = mapping.atpIdx >= 0 ? r[mapping.atpIdx] || '' : '';
    const rawMaterial = mapping.materialIdx >= 0 ? r[mapping.materialIdx] || '' : '';
    const rawSemester = mapping.semesterIdx >= 0 ? r[mapping.semesterIdx] || '' : '';

    if (rawElement) currentElement = rawElement;
    if (rawCp) currentCp = rawCp;

    // A row is valid if it has at least TP or ATP
    if (rawTp || rawAtp) {
      let parsedSemester: number | undefined = undefined;
      if (rawSemester.includes('1') || rawSemester.toLowerCase().includes('ganjil') || rawSemester.toLowerCase().includes('gasal')) {
        parsedSemester = 1;
      } else if (rawSemester.includes('2') || rawSemester.toLowerCase().includes('genap')) {
        parsedSemester = 2;
      }

      rows.push({
        id: `prota-${Date.now()}-${idx}`,
        element: currentElement || 'Elemen Terpadu',
        cp: currentCp || 'Capaian Pembelajaran Terintegrasi',
        tp: rawTp || rawAtp,
        atp: rawAtp || rawTp,
        material: rawMaterial || undefined,
        semester: parsedSemester,
        isSelected: true,
      });
    }
  });

  if (rows.length === 0) {
    warningMessage = 'Tidak ditemukan baris TP/ATP yang terbaca dengan jelas. Periksa pemetaan kolom tabel Anda.';
  }

  const protaDoc: ProtaDocument = {
    id: 'prota-doc-' + Date.now(),
    userId,
    filename,
    fileFormat: ext.toUpperCase(),
    fileSizeBytes: buffer.length,
    uploadedAt: new Date().toISOString(),
    extractedRows: rows,
    totalRows: rows.length,
    mappingStatus: rows.length > 0 ? 'valid' : 'needs_mapping',
    warningMessage,
  };

  return protaDoc;
}

// Built-in standard templates for curriculum reference & quick teacher testing
export function getStandardProtaTemplate(subject: string, grade: number): ProtaRow[] {
  if (subject.toLowerCase().includes('matematika')) {
    return [
      {
        id: 'std-mat-1',
        element: 'Bilangan',
        cp: 'Peserta didik dapat memahami bilangan cacah besar sampai 10.000, operasi hitung penjumlahan dan pengurangan dengan nilai tempat yang sesuai.',
        tp: 'Memahami nilai tempat bilangan cacah hingga 10.000 dan membandingkan dua bilangan cacah.',
        atp: '4.1 Membaca, menulis, dan menentukan nilai tempat bilangan cacah sampai 10.000.',
        semester: 1,
        grade,
        subject: 'Matematika',
        material: 'Bilangan Cacah Besar dan Nilai Tempat',
        isSelected: true,
      },
      {
        id: 'std-mat-2',
        element: 'Bilangan',
        cp: 'Peserta didik dapat melakukan operasi perkalian dan pembagian bilangan cacah dengan strategi dekomposisi atau susun ke bawah.',
        tp: 'Menyelesaikan perkalian dan pembagian bilangan cacah sampai 100 dalam kehidupan sehari-hari.',
        atp: '4.2 Menghitung hasil kali dan bagi bilangan cacah serta memecahkan masalah kontekstual.',
        semester: 1,
        grade,
        subject: 'Matematika',
        material: 'Operasi Perkalian dan Pembagian Kontekstual',
        isSelected: true,
      },
      {
        id: 'std-mat-3',
        element: 'Geometri',
        cp: 'Peserta didik dapat mendeskripsikan ciri-ciri berbagai bentuk bangun datar (segi empat, segitiga, segi banyak) dan menyusunnya.',
        tp: 'Mengidentifikasi ciri-ciri bangun datar berdasarkan sisi dan sudutnya.',
        atp: '4.3 Mengklasifikasikan jenis-jenis bangun datar dan menghitung keliling bangun datar.',
        semester: 1,
        grade,
        subject: 'Matematika',
        material: 'Sifat dan Keliling Bangun Datar',
        isSelected: true,
      },
      {
        id: 'std-mat-4',
        element: 'Pengukuran',
        cp: 'Peserta didik dapat mengukur panjang dan berat benda menggunakan satuan baku dan memperkirakan ukuran benda.',
        tp: 'Menggunakan satuan baku panjang (m, cm, mm) dan berat (kg, g) dalam penyelesaian masalah konkret.',
        atp: '4.4 Memperkirakan dan mengukur panjang dan berat benda menggunakan alat ukur baku.',
        semester: 2,
        grade,
        subject: 'Matematika',
        material: 'Pengukuran Satuan Baku Panjang dan Berat',
        isSelected: true,
      },
    ];
  }

  // IPAS standard
  return [
    {
      id: 'std-ipas-1',
      element: 'Pemahaman IPAS (Sains dan Sosial)',
      cp: 'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia (pancaindra, sistem gerak) dan hewan.',
      tp: 'Menganalisis bagian tubuh tumbuhan dan fungsinya dalam fotosintesis serta kelangsungan hidup.',
      atp: '4.1 Mengamati struktur akar, batang, daun, bunga dan mengaitkan dengan fungsinya.',
      semester: 1,
      grade,
      subject: 'IPAS',
      material: 'Bagian Tubuh Tumbuhan dan Fungsinya',
      isSelected: true,
    },
    {
      id: 'std-ipas-2',
      element: 'Pemahaman IPAS (Sains dan Sosial)',
      cp: 'Peserta didik mengidentifikasi wujud zat dan perubahannya serta pemanfaatannya dalam kehidupan sehari-hari.',
      tp: 'Menyelidiki perubahan wujud zat (mencair, membeku, menguap, mengembun, menyublim) melalui percobaan sederhana.',
      atp: '4.2 Menganalisis fenomena perubahan wujud zat di lingkungan sekitar dan peranan kalor.',
      semester: 1,
      grade,
      subject: 'IPAS',
      material: 'Wujud Zat dan Perubahannya',
      isSelected: true,
    },
    {
      id: 'std-ipas-3',
      element: 'Keterampilan Proses',
      cp: 'Peserta didik mendemonstrasikan berbagai jenis gaya (gaya otot, gaya gesek, gaya magnet, gaya gravitasi) dan pengaruhnya terhadap arah gerak serta bentuk benda.',
      tp: 'Mengidentifikasi pengaruh gaya terhadap gerak dan bentuk benda dalam aktivitas sehari-hari.',
      atp: '4.3 Menjelaskan ragam gaya dan membuktikan pengaruhnya terhadap gerak benda di lingkungan sekitar.',
      semester: 2,
      grade,
      subject: 'IPAS',
      material: 'Gaya di Sekitar Kita',
      isSelected: true,
    },
  ];
}
