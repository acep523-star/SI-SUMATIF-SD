import { z } from 'zod';

export type UserRole = 'guru' | 'admin';

export interface User {
  id: string;
  nipNik: string; // NIP or NIK as string to preserve leading zeroes
  fullName: string;
  schoolName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordHash?: string; // only stored server-side
}

export interface SchoolIdentity {
  id: string;
  userId: string;
  schoolName: string;
  npsn: string;
  address: string;
  village: string; // desa/kelurahan
  district: string; // kecamatan
  cityRegency: string; // kabupaten/kota
  province: string;
  principalName: string;
  principalNip?: string;
  authorTeacherName: string;
  authorTeacherNipNik: string;
  academicYear: string; // e.g. 2026/2027
  schoolLogoBase64?: string;
  isLocked: boolean;
  lockedAt?: string;
  unlockedAt?: string;
  unlockReason?: string;
  unlockHistory?: {
    unlockedAt: string;
    reason: string;
    unlockedBy: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export type AssessmentType = 'ASAS_1' | 'ASAT' | 'ASAJ';

export const ASSESSMENT_CONFIG: Record<AssessmentType, {
  name: string;
  fullName: string;
  description: string;
  allowedGrades: number[];
  defaultSemester: 1 | 2;
}> = {
  ASAS_1: {
    name: 'ASAS 1',
    fullName: 'Asesmen Sumatif Akhir Semester 1',
    description: 'Penilaian capaian hasil belajar murid di akhir semester gasal untuk semua jenjang kelas SD.',
    allowedGrades: [1, 2, 3, 4, 5, 6],
    defaultSemester: 1,
  },
  ASAT: {
    name: 'ASAT',
    fullName: 'Asesmen Sumatif Akhir Tahun',
    description: 'Penilaian capaian hasil belajar murid di akhir tahun ajaran (Semester 2) untuk penentuan kenaikan kelas.',
    allowedGrades: [1, 2, 3, 4, 5],
    defaultSemester: 2,
  },
  ASAJ: {
    name: 'ASAJ',
    fullName: 'Asesmen Sumatif Akhir Jenjang Semester 2',
    description: 'Penilaian akhir jenjang pendidikan sekolah dasar untuk peserta didik kelas akhir (Kelulusan).',
    allowedGrades: [6],
    defaultSemester: 2,
  },
};

export type Phase = 'Fase A' | 'Fase B' | 'Fase C';

export function getPhaseByGrade(grade: number): Phase {
  if (grade <= 2) return 'Fase A';
  if (grade <= 4) return 'Fase B';
  return 'Fase C';
}

export type CognitiveLevel = 'LOTS' | 'MOTS' | 'HOTS';

export type QuestionType = 'PG' | 'ISIAN' | 'ESAI';

export interface ProtaRow {
  id: string;
  element: string; // Elemen
  cp: string; // Capaian Pembelajaran
  tp: string; // Tujuan Pembelajaran
  atp: string; // Alur Tujuan Pembelajaran
  semester?: number;
  grade?: number;
  subject?: string;
  material?: string; // Materi Pokok
  hoursAllocation?: string; // Alokasi Waktu
  isSelected?: boolean;
}

export interface ProtaDocument {
  id: string;
  userId: string;
  filename: string;
  fileFormat: string;
  fileSizeBytes: number;
  uploadedAt: string;
  extractedRows: ProtaRow[];
  totalRows: number;
  detectedSubject?: string;
  detectedGrade?: number;
  detectedSemester?: number;
  mappingStatus: 'valid' | 'warning' | 'needs_mapping';
  warningMessage?: string;
}

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface AnalyticRubricCriterion {
  criterion: string;
  maxScore: number;
  descriptions: {
    level: string; // e.g. "Sangat Baik (Skor 4)", "Baik (Skor 3)", dsb.
    score: number;
    description: string;
  }[];
}

export interface AssessmentItem {
  number: number;
  type: QuestionType;
  stem: string; // teks soal
  stimulus?: string; // konteks/cerita/tabel/gambar
  options?: QuestionOption[]; // untuk PG
  correctKey: string; // 'A' | 'B' | 'C' | 'D' untuk PG, atau kata kunci jawaban
  explanation: string; // Pembahasan / alasan kunci
  element: string; // Elemen dari PROTA
  cp: string; // Capaian Pembelajaran
  tp: string; // Tujuan Pembelajaran
  atp: string; // Alur Tujuan Pembelajaran
  indicator: string; // Indikator Soal
  material: string; // Materi
  cognitiveLevel: CognitiveLevel; // LOTS / MOTS / HOTS
  thinkingSkill: string; // misal: C2 - Memahami, C3 - Menerapkan, C4 - Menganalisis
  weight: number; // Bobot skor
  scoringRubric: {
    idealAnswer: string;
    partialCriteria?: string[];
    analyticRubric?: AnalyticRubricCriterion[];
    formulaDescription?: string;
  };
}

export interface AssessmentConfig {
  assessmentType: AssessmentType;
  grade: number;
  phase: Phase;
  semester: 1 | 2;
  subject: string;
  academicYear: string;
  authorName: string;
  examDate?: string;
  timeAllocationMinutes: number; // misal 90 menit
  numMultipleChoice: number; // Jumlah PG
  numShortAnswer: number; // Jumlah Isian Singkat
  numEssay: number; // Jumlah Esai
  lotsPercentage: number; // % LOTS
  motsPercentage: number; // % MOTS
  hotsPercentage: number; // % HOTS
  multipleChoiceOptionsCount: 3 | 4; // 3 untuk kelas 1-2 jika diinginkan, 4 untuk kelas 3-6
  scoringFormula: string; // e.g. "Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100"
  weightPG: number; // bobot PG per soal
  weightIsian: number; // bobot isian per soal
  weightEssay: number; // bobot esai per soal
}

export interface AssessmentPackage {
  id: string;
  userId: string;
  title: string;
  config: AssessmentConfig;
  schoolSnapshot: SchoolIdentity;
  selectedTpIds: string[];
  items: AssessmentItem[];
  totalScore: number;
  status: 'draft' | 'ready_to_export';
  createdAt: string;
  updatedAt: string;
}

export interface QualityCheckResult {
  isReady: boolean;
  totalChecks: number;
  passedChecks: number;
  items: {
    code: string;
    title: string;
    passed: boolean;
    details: string;
    severity: 'error' | 'warning' | 'info';
  }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface AppRegulation {
  id: string;
  name: string;
  code: string;
  year: number;
  publisher: string;
  url: string;
  verificationStatus: 'verified' | 'unverified';
  lastCheckedDate: string;
  summary: string;
}
