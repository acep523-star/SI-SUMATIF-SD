import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  SchoolIdentity,
  ProtaDocument,
  AssessmentPackage,
  AuditLog,
  AppRegulation,
} from '../types/index.ts';

interface UserAiSetting {
  userId: string;
  userApiKey?: string;
  selectedModel: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  schoolIdentities: SchoolIdentity[];
  protaDocuments: ProtaDocument[];
  assessmentPackages: AssessmentPackage[];
  auditLogs: AuditLog[];
  userAiSettings: UserAiSetting[];
  regulations: AppRegulation[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_REGULATIONS: AppRegulation[] = [
  {
    id: 'reg-1',
    name: 'Panduan Pembelajaran dan Asesmen (PPA) Edisi Revisi',
    code: 'PPA Revisi 2025',
    year: 2025,
    publisher: 'BSKAP Kemendikdasmen RI',
    url: 'https://kurikulum.kemdikbud.go.id/rujukan/panduan-pembelajaran-dan-asesmen',
    verificationStatus: 'verified',
    lastCheckedDate: '2026-01-15',
    summary: 'Memuat prinsip pembelajaran berkesadaran, asesmen diagnostik, formatif, serta sumatif (ASAS, ASAT, ASAJ) dengan penguatan proses berpikir tingkat tinggi dan rubrik analitik.',
  },
  {
    id: 'reg-2',
    name: 'Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi tentang Kurikulum pada Pendidikan Anak Usia Dini, Pendidikan Dasar, dan Menengah',
    code: 'Permendikbudristek No. 12 Tahun 2024',
    year: 2024,
    publisher: 'Kemendikbudristek RI',
    url: 'https://jdih.kemdikbud.go.id/detail_peraturan?main=3311',
    verificationStatus: 'verified',
    lastCheckedDate: '2026-02-10',
    summary: 'Landasan hukum implementasi Kurikulum Merdeka secara nasional dengan penetapan struktur kurikulum, fase A, B, C untuk jenjang Sekolah Dasar.',
  },
  {
    id: 'reg-3',
    name: 'Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah',
    code: 'Permendikbudristek No. 21 Tahun 2022',
    year: 2022,
    publisher: 'Kemendikbudristek RI',
    url: 'https://jdih.kemdikbud.go.id/detail_peraturan?main=3160',
    verificationStatus: 'verified',
    lastCheckedDate: '2026-01-20',
    summary: 'Ketentuan standar penilaian hasil belajar murid: penilaian sumatif bertujuan menilai pencapaian hasil belajar peserta didik sebagai dasar penentuan kenaikan kelas dan kelulusan.',
  },
  {
    id: 'reg-4',
    name: 'Keputusan Kepala BSKAP tentang Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah',
    code: 'Keputusan Kepala BSKAP No. 032/H/KR/2024',
    year: 2024,
    publisher: 'Badan Standar, Kurikulum, dan Asesmen Pendidikan',
    url: 'https://kurikulum.kemdikbud.go.id/unduhan',
    verificationStatus: 'verified',
    lastCheckedDate: '2026-03-01',
    summary: 'Rincian deskripsi Capaian Pembelajaran (CP) untuk semua mata pelajaran Fase A (Kelas 1-2), Fase B (Kelas 3-4), dan Fase C (Kelas 5-6).',
  },
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    this.initDefaultAdminAndRegulations();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, initializing empty:', err);
    }

    return {
      users: [],
      schoolIdentities: [],
      protaDocuments: [],
      assessmentPackages: [],
      auditLogs: [],
      userAiSettings: [],
      regulations: INITIAL_REGULATIONS,
    };
  }

  private saveDatabase() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  private initDefaultAdminAndRegulations() {
    // Ensure regulations exist
    if (!this.data.regulations || this.data.regulations.length === 0) {
      this.data.regulations = INITIAL_REGULATIONS;
    }

    // Ensure administrator user with username: "admin" and password: "admin"
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('admin', salt);

    let adminUser = this.data.users.find(u => u.nipNik.toLowerCase() === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'admin-system-root',
        nipNik: 'admin',
        fullName: 'Administrator Sistem SI-SUMATIF SD',
        schoolName: 'Dinas Pendidikan & Kebudayaan',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        passwordHash: adminPasswordHash,
      };
      this.data.users.push(adminUser);
      this.addAuditLog(
        adminUser.id,
        adminUser.nipNik,
        'SYSTEM_BOOTSTRAP',
        'Inisialisasi akun Administrator bawaan sistem (admin/admin).'
      );
      this.saveDatabase();
    } else {
      // Ensure credentials and role
      adminUser.passwordHash = adminPasswordHash;
      adminUser.role = 'admin';
      adminUser.isActive = true;
      this.saveDatabase();
    }
  }

  // --- USER OPERATIONS ---
  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByNipNik(nipNik: string): User | undefined {
    // exact string match to preserve leading zero
    const clean = String(nipNik).trim();
    return this.data.users.find(u => u.nipNik === clean);
  }

  public getAllUsers(): User[] {
    // Return sanitized users without password hashes
    return this.data.users.map(({ passwordHash, ...rest }) => rest as User);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.saveDatabase();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.saveDatabase();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    // Also remove user-specific documents & identities
    this.data.schoolIdentities = this.data.schoolIdentities.filter(s => s.userId !== id);
    this.data.protaDocuments = this.data.protaDocuments.filter(p => p.userId !== id);
    this.data.assessmentPackages = this.data.assessmentPackages.filter(a => a.userId !== id);
    this.data.userAiSettings = this.data.userAiSettings.filter(ai => ai.userId !== id);
    this.saveDatabase();
    return this.data.users.length < initialLen;
  }

  // --- SCHOOL IDENTITY OPERATIONS ---
  public getSchoolIdentityByUserId(userId: string): SchoolIdentity | undefined {
    return this.data.schoolIdentities.find(s => s.userId === userId);
  }

  public saveSchoolIdentity(identity: SchoolIdentity): SchoolIdentity {
    const idx = this.data.schoolIdentities.findIndex(s => s.userId === identity.userId);
    if (idx >= 0) {
      this.data.schoolIdentities[idx] = identity;
    } else {
      this.data.schoolIdentities.push(identity);
    }
    this.saveDatabase();
    return identity;
  }

  // --- PROTA DOCUMENTS ---
  public getProtaDocumentsByUserId(userId: string): ProtaDocument[] {
    return this.data.protaDocuments.filter(p => p.userId === userId);
  }

  public getProtaDocumentById(id: string): ProtaDocument | undefined {
    return this.data.protaDocuments.find(p => p.id === id);
  }

  public saveProtaDocument(doc: ProtaDocument): ProtaDocument {
    const idx = this.data.protaDocuments.findIndex(p => p.id === doc.id);
    if (idx >= 0) {
      this.data.protaDocuments[idx] = doc;
    } else {
      this.data.protaDocuments.push(doc);
    }
    this.saveDatabase();
    return doc;
  }

  public deleteProtaDocument(id: string, userId: string): boolean {
    const initLen = this.data.protaDocuments.length;
    this.data.protaDocuments = this.data.protaDocuments.filter(
      p => !(p.id === id && p.userId === userId)
    );
    this.saveDatabase();
    return this.data.protaDocuments.length < initLen;
  }

  // --- ASSESSMENT PACKAGES ---
  public getAssessmentPackagesByUserId(userId: string): AssessmentPackage[] {
    return this.data.assessmentPackages.filter(a => a.userId === userId);
  }

  public getAssessmentPackageById(id: string): AssessmentPackage | undefined {
    return this.data.assessmentPackages.find(a => a.id === id);
  }

  public saveAssessmentPackage(pkg: AssessmentPackage): AssessmentPackage {
    const idx = this.data.assessmentPackages.findIndex(a => a.id === pkg.id);
    if (idx >= 0) {
      this.data.assessmentPackages[idx] = pkg;
    } else {
      this.data.assessmentPackages.push(pkg);
    }
    this.saveDatabase();
    return pkg;
  }

  public deleteAssessmentPackage(id: string, userId: string): boolean {
    const initLen = this.data.assessmentPackages.length;
    this.data.assessmentPackages = this.data.assessmentPackages.filter(
      a => !(a.id === id && a.userId === userId)
    );
    this.saveDatabase();
    return this.data.assessmentPackages.length < initLen;
  }

  // --- USER AI SETTINGS ---
  public getUserAiSetting(userId: string): UserAiSetting | undefined {
    return this.data.userAiSettings.find(s => s.userId === userId);
  }

  public saveUserAiSetting(userId: string, userApiKey?: string, selectedModel = 'gemini-2.5-flash'): void {
    const idx = this.data.userAiSettings.findIndex(s => s.userId === userId);
    const updated: UserAiSetting = {
      userId,
      userApiKey: userApiKey || undefined,
      selectedModel,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      this.data.userAiSettings[idx] = updated;
    } else {
      this.data.userAiSettings.push(updated);
    }
    this.saveDatabase();
  }

  // --- AUDIT LOGS ---
  public addAuditLog(userId: string, username: string, action: string, details: string, ip?: string): AuditLog {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId,
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip,
    };
    this.data.auditLogs.unshift(log);
    // keep max 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.saveDatabase();
    return log;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  // --- REGULATIONS ---
  public getRegulations(): AppRegulation[] {
    return this.data.regulations || INITIAL_REGULATIONS;
  }

  // --- RAW SCHEMA FOR BACKUP ---
  public getRawDataForBackup(requestingUserId: string, isAdmin: boolean) {
    if (isAdmin) {
      // Admin global backup - SANITIZED: remove passwords, remove user API keys
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        backupType: 'GLOBAL_ADMIN',
        users: this.data.users.map(({ passwordHash, ...rest }) => rest),
        schoolIdentities: this.data.schoolIdentities,
        protaDocuments: this.data.protaDocuments,
        assessmentPackages: this.data.assessmentPackages,
        regulations: this.data.regulations,
        auditLogs: this.data.auditLogs.slice(0, 200),
      };
    } else {
      // Teacher self backup - SANITIZED: only own data
      const user = this.findUserById(requestingUserId);
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        backupType: 'USER_SELF',
        user: user ? { id: user.id, nipNik: user.nipNik, fullName: user.fullName, schoolName: user.schoolName } : null,
        schoolIdentity: this.getSchoolIdentityByUserId(requestingUserId),
        protaDocuments: this.getProtaDocumentsByUserId(requestingUserId),
        assessmentPackages: this.getAssessmentPackagesByUserId(requestingUserId),
        regulations: this.data.regulations,
      };
    }
  }

  // --- RESTORE DATA ---
  public restoreData(
    backupData: any,
    strategy: 'merge' | 'replace',
    userId: string,
    isAdmin: boolean
  ): { success: boolean; message: string; count: { schools: number; prota: number; assessments: number } } {
    if (!backupData || !backupData.version) {
      throw new Error('Format file backup tidak valid atau tidak memiliki nomor versi.');
    }

    let schoolsCount = 0;
    let protaCount = 0;
    let assessmentsCount = 0;

    if (isAdmin && backupData.backupType === 'GLOBAL_ADMIN') {
      if (strategy === 'replace') {
        if (backupData.schoolIdentities) this.data.schoolIdentities = backupData.schoolIdentities;
        if (backupData.protaDocuments) this.data.protaDocuments = backupData.protaDocuments;
        if (backupData.assessmentPackages) this.data.assessmentPackages = backupData.assessmentPackages;
      } else {
        // Merge
        for (const s of backupData.schoolIdentities || []) {
          this.saveSchoolIdentity(s);
          schoolsCount++;
        }
        for (const p of backupData.protaDocuments || []) {
          this.saveProtaDocument(p);
          protaCount++;
        }
        for (const a of backupData.assessmentPackages || []) {
          this.saveAssessmentPackage(a);
          assessmentsCount++;
        }
      }
    } else {
      // User self restore
      if (backupData.schoolIdentity) {
        backupData.schoolIdentity.userId = userId;
        this.saveSchoolIdentity(backupData.schoolIdentity);
        schoolsCount++;
      }
      for (const p of backupData.protaDocuments || []) {
        p.userId = userId;
        this.saveProtaDocument(p);
        protaCount++;
      }
      for (const a of backupData.assessmentPackages || []) {
        a.userId = userId;
        this.saveAssessmentPackage(a);
        assessmentsCount++;
      }
    }

    this.saveDatabase();
    return {
      success: true,
      message: 'Restore data berhasil diselesaikan.',
      count: { schools: schoolsCount, prota: protaCount, assessments: assessmentsCount },
    };
  }
}

export const db = new Database();
