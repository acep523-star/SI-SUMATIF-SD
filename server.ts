import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/db.ts';
import {
  authMiddleware,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  AuthRequest,
} from './src/server/auth.ts';
import { parseProtaBuffer, getStandardProtaTemplate } from './src/server/protaParser.ts';
import { generateAssessmentItems, calculateCognitiveDistribution } from './src/server/aiGenerator.ts';
import {
  generateStudentExamDocx,
  generateTeacherKeyDocx,
  generateKisiKisiDocx,
  generateRubricDocx,
} from './src/server/docxGenerator.ts';
import { runQualityControlCheck } from './src/server/qualityControl.ts';
import {
  AssessmentConfig,
  AssessmentPackage,
  SchoolIdentity,
  ASSESSMENT_CONFIG,
  User,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API ROUTES ---

// 1. AUTHENTICATION
app.post('/api/auth/signup', (req: Request, res: Response) => {
  try {
    const { nipNik, password, fullName, schoolName, agreeTerms } = req.body;

    if (!nipNik || String(nipNik).trim().length < 4) {
      return res.status(400).json({ error: 'NIP/NIK wajib diisi dengan benar (minimal 4 digit).' });
    }
    if (!password || String(password).length < 5) {
      return res.status(400).json({ error: 'Kata sandi minimal 5 karakter.' });
    }
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ error: 'Nama lengkap guru wajib diisi.' });
    }
    if (!schoolName || String(schoolName).trim().length < 2) {
      return res.status(400).json({ error: 'Nama satuan pendidikan wajib diisi.' });
    }
    if (!agreeTerms) {
      return res.status(400).json({ error: 'Anda harus menyetujui kebijakan privasi dan ketentuan penggunaan.' });
    }

    const cleanNipNik = String(nipNik).trim();
    const existing = db.findUserByNipNik(cleanNipNik);
    if (existing) {
      return res.status(400).json({ error: `NIP/NIK "${cleanNipNik}" sudah terdaftar pada sistem.` });
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      nipNik: cleanNipNik,
      fullName: String(fullName).trim(),
      schoolName: String(schoolName).trim(),
      role: 'guru',
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    };

    db.createUser(newUser);
    db.addAuditLog(newUser.id, newUser.nipNik, 'AUTH_SIGNUP', `Pendaftaran guru baru: ${newUser.fullName} (${newUser.schoolName})`);

    const token = generateToken(newUser);
    const { passwordHash, ...userClean } = newUser;
    return res.status(201).json({ user: userClean, token });
  } catch (err: any) {
    return res.status(500).json({ error: 'Terjadi kesalahan pada server: ' + err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { nipNik, password } = req.body;
    if (!nipNik || !password) {
      return res.status(400).json({ error: 'NIP/NIK dan kata sandi wajib diisi.' });
    }

    const cleanNipNik = String(nipNik).trim();
    const user = db.findUserByNipNik(cleanNipNik);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'NIP/NIK atau kata sandi tidak sesuai.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh administrator.' });
    }

    const isValid = comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'NIP/NIK atau kata sandi tidak sesuai.' });
    }

    user.lastLoginAt = new Date().toISOString();
    db.updateUser(user.id, { lastLoginAt: user.lastLoginAt });
    db.addAuditLog(user.id, user.nipNik, 'AUTH_LOGIN', `Pengguna berhasil masuk ke sistem`);

    const token = generateToken(user);
    const { passwordHash, ...userClean } = user;
    return res.json({ user: userClean, token });
  } catch (err: any) {
    return res.status(500).json({ error: 'Gagal melakukan otentikasi: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const school = db.getSchoolIdentityByUserId(user.id);
  const { passwordHash, ...userClean } = user;
  return res.json({ user: userClean, hasSchoolIdentity: !!school, isIdentityLocked: !!school?.isLocked });
});

app.post('/api/auth/reset-password', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword, targetUserId } = req.body;
    const currentUser = req.user!;

    if (currentUser.role === 'admin' && targetUserId) {
      // Admin resetting another user
      if (!newPassword || newPassword.length < 5) {
        return res.status(400).json({ error: 'Kata sandi baru minimal 5 karakter.' });
      }
      const targetUser = db.findUserById(targetUserId);
      if (!targetUser) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      db.updateUser(targetUserId, { passwordHash: hashPassword(newPassword) });
      db.addAuditLog(currentUser.id, currentUser.nipNik, 'ADMIN_PASSWORD_RESET', `Admin mereset kata sandi pengguna ${targetUser.nipNik}`);
      return res.json({ success: true, message: 'Kata sandi pengguna berhasil diubah.' });
    }

    // User resetting own password
    if (!oldPassword || !newPassword || newPassword.length < 5) {
      return res.status(400).json({ error: 'Kata sandi lama dan kata sandi baru (min 5 karakter) wajib diisi.' });
    }
    const userFromDb = db.findUserById(currentUser.id);
    if (!userFromDb || !userFromDb.passwordHash || !comparePassword(oldPassword, userFromDb.passwordHash)) {
      return res.status(400).json({ error: 'Kata sandi lama tidak tepat.' });
    }

    db.updateUser(currentUser.id, { passwordHash: hashPassword(newPassword) });
    db.addAuditLog(currentUser.id, currentUser.nipNik, 'AUTH_PASSWORD_CHANGE', 'Pengguna memperbarui kata sandi akun.');
    return res.json({ success: true, message: 'Kata sandi Anda berhasil diperbarui.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. SCHOOL IDENTITY
app.get('/api/school-identity', authMiddleware, (req: AuthRequest, res: Response) => {
  const identity = db.getSchoolIdentityByUserId(req.user!.id);
  return res.json({ identity: identity || null });
});

app.post('/api/school-identity', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const existing = db.getSchoolIdentityByUserId(userId);

    if (existing && existing.isLocked) {
      return res.status(400).json({
        error: 'Identitas sekolah berstatus terkunci. Gunakan prosedur buka kunci dengan menyertakan alasan untuk melakukan pengeditan.',
      });
    }

    const {
      schoolName,
      npsn,
      address,
      village,
      district,
      cityRegency,
      province,
      principalName,
      principalNip,
      authorTeacherName,
      authorTeacherNipNik,
      academicYear,
      schoolLogoBase64,
      lockNow,
    } = req.body;

    if (!schoolName || !npsn || !address || !authorTeacherName || !academicYear) {
      return res.status(400).json({ error: 'Nama sekolah, NPSN, alamat, nama guru penyusun, dan tahun ajaran wajib diisi.' });
    }

    const now = new Date().toISOString();
    const updated: SchoolIdentity = {
      id: existing?.id || 'sch-' + Date.now(),
      userId,
      schoolName: String(schoolName).trim(),
      npsn: String(npsn).trim(),
      address: String(address).trim(),
      village: String(village || '').trim(),
      district: String(district || '').trim(),
      cityRegency: String(cityRegency || '').trim(),
      province: String(province || '').trim(),
      principalName: String(principalName || '').trim(),
      principalNip: principalNip ? String(principalNip).trim() : undefined,
      authorTeacherName: String(authorTeacherName).trim(),
      authorTeacherNipNik: String(authorTeacherNipNik || req.user!.nipNik).trim(),
      academicYear: String(academicYear).trim(),
      schoolLogoBase64: schoolLogoBase64 || existing?.schoolLogoBase64,
      isLocked: Boolean(lockNow || existing?.isLocked),
      lockedAt: lockNow ? now : existing?.lockedAt,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      unlockHistory: existing?.unlockHistory || [],
    };

    db.saveSchoolIdentity(updated);
    db.addAuditLog(
      userId,
      req.user!.nipNik,
      lockNow ? 'SCHOOL_IDENTITY_LOCKED' : 'SCHOOL_IDENTITY_SAVED',
      `Identitas sekolah ${updated.schoolName} diperbarui ${lockNow ? '(Terkunci)' : ''}`
    );

    return res.json({ identity: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/school-identity/unlock', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { reason, password } = req.body;
    const user = req.user!;

    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({ error: 'Alasan pembukaan kunci identitas wajib diisi dengan jelas (minimal 5 karakter).' });
    }

    // Verify current user's password for safety
    const userDb = db.findUserById(user.id);
    if (!userDb || !userDb.passwordHash || !comparePassword(password, userDb.passwordHash)) {
      return res.status(401).json({ error: 'Konfirmasi kata sandi salah. Pembukaan kunci dibatalkan.' });
    }

    const existing = db.getSchoolIdentityByUserId(user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Identitas sekolah belum pernah disimpan.' });
    }

    const now = new Date().toISOString();
    existing.isLocked = false;
    existing.unlockedAt = now;
    existing.unlockReason = String(reason).trim();
    if (!existing.unlockHistory) existing.unlockHistory = [];
    existing.unlockHistory.push({
      unlockedAt: now,
      reason: String(reason).trim(),
      unlockedBy: user.nipNik,
    });
    existing.updatedAt = now;

    db.saveSchoolIdentity(existing);
    db.addAuditLog(
      user.id,
      user.nipNik,
      'SCHOOL_IDENTITY_UNLOCKED',
      `Pembukaan kunci identitas sekolah. Alasan: "${reason}"`
    );

    return res.json({ success: true, identity: existing });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. PROTA UPLOAD & ANALYSIS
app.post('/api/prota/upload', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { filename, fileBase64, customMapping } = req.body;
    if (!filename || !fileBase64) {
      return res.status(400).json({ error: 'Nama file dan konten berkas PROTA wajib disertakan.' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const protaDoc = await parseProtaBuffer(buffer, filename, req.user!.id, customMapping);

    db.saveProtaDocument(protaDoc);
    db.addAuditLog(
      req.user!.id,
      req.user!.nipNik,
      'PROTA_UPLOADED',
      `Unggah berkas PROTA: ${filename} (${protaDoc.totalRows} baris TP/ATP diekstraksi)`
    );

    return res.json({ document: protaDoc });
  } catch (err: any) {
    return res.status(400).json({ error: 'Gagal memproses berkas PROTA: ' + err.message });
  }
});

app.get('/api/prota/template', (req: Request, res: Response) => {
  const subject = String(req.query.subject || 'Matematika');
  const grade = parseInt(String(req.query.grade || '4'), 10);
  const rows = getStandardProtaTemplate(subject, grade);
  return res.json({ rows });
});

app.get('/api/prota', authMiddleware, (req: AuthRequest, res: Response) => {
  const docs = db.getProtaDocumentsByUserId(req.user!.id);
  return res.json({ documents: docs });
});

app.delete('/api/prota/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const success = db.deleteProtaDocument(req.params.id, req.user!.id);
  if (!success) return res.status(404).json({ error: 'Dokumen PROTA tidak ditemukan.' });
  return res.json({ success: true });
});

// 4. AI CONFIGURATION & TEST CONNECTION
app.get('/api/ai/config', authMiddleware, (req: AuthRequest, res: Response) => {
  const setting = db.getUserAiSetting(req.user!.id);
  const hasSystemKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5;
  return res.json({
    hasUserKey: !!setting?.userApiKey,
    selectedModel: setting?.selectedModel || 'gemini-2.5-flash',
    hasSystemKey,
    updatedAt: setting?.updatedAt || null,
  });
});

app.post('/api/ai/config', authMiddleware, (req: AuthRequest, res: Response) => {
  const { apiKey, selectedModel } = req.body;
  db.saveUserAiSetting(req.user!.id, apiKey, selectedModel || 'gemini-2.5-flash');
  db.addAuditLog(req.user!.id, req.user!.nipNik, 'AI_CONFIG_UPDATED', 'Pengaturan model dan API key AI diperbarui.');
  return res.json({ success: true, message: 'Pengaturan AI berhasil disimpan secara aman di sisi server.' });
});

app.post('/api/ai/test-connection', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userSetting = db.getUserAiSetting(req.user!.id);
    const keyToTest = userSetting?.userApiKey || process.env.GEMINI_API_KEY;

    if (!keyToTest || keyToTest.length < 5) {
      return res.status(400).json({ error: 'Belum ada API Key Gemini yang dikonfigurasi. Masukkan API Key Anda.' });
    }

    const ai = new (await import('@google/genai')).GoogleGenAI({ apiKey: keyToTest });
    const result = await ai.models.generateContent({
      model: userSetting?.selectedModel || 'gemini-2.5-flash',
      contents: 'Jawablah satu kata dalam Bahasa Indonesia: OK',
    });

    return res.json({
      success: true,
      message: 'Koneksi ke Gemini API berhasil diverifikasi!',
      responseSample: result.text?.trim() || 'OK',
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'Uji koneksi gagal: ' + (err.message || 'Periksa kembali API key atau kuota akun Anda.'),
    });
  }
});

// 5. ASSESSMENT GENERATOR & MANAGEMENT
app.post('/api/assessment/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { config, selectedTpRows } = req.body as {
      config: AssessmentConfig;
      selectedTpRows: any[];
    };

    if (!config) {
      return res.status(400).json({ error: 'Konfigurasi asesmen wajib diisi.' });
    }

    // Validate assessment type restrictions
    const spec = ASSESSMENT_CONFIG[config.assessmentType];
    if (!spec) {
      return res.status(400).json({ error: 'Jenis asesmen tidak dikenali.' });
    }
    if (!spec.allowedGrades.includes(config.grade)) {
      return res.status(400).json({
        error: `Jenis asesmen ${spec.name} (${spec.fullName}) hanya diizinkan untuk Kelas ${spec.allowedGrades.join(', ')}. Kelas ${config.grade} tidak diperbolehkan.`,
      });
    }

    // Validate identity snapshot
    const school = db.getSchoolIdentityByUserId(req.user!.id);
    if (!school) {
      return res.status(400).json({
        error: 'Identitas sekolah belum diisi. Anda wajib melengkapi dan mengunci identitas sekolah terlebih dahulu.',
      });
    }

    const userSetting = db.getUserAiSetting(req.user!.id);
    const generatedItems = await generateAssessmentItems(config, selectedTpRows, userSetting?.userApiKey);

    const totalScore = generatedItems.reduce((acc, it) => acc + (it.weight || 0), 0);

    const pkg: AssessmentPackage = {
      id: 'pkg-' + Date.now(),
      userId: req.user!.id,
      title: `Naskah ${config.assessmentType} ${config.subject} Kelas ${config.grade}`,
      config,
      schoolSnapshot: JSON.parse(JSON.stringify(school)), // Snapshot
      selectedTpIds: selectedTpRows.map(r => r.id),
      items: generatedItems,
      totalScore,
      status: 'ready_to_export',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveAssessmentPackage(pkg);
    db.addAuditLog(
      req.user!.id,
      req.user!.nipNik,
      'ASSESSMENT_GENERATED',
      `Membuat naskah asesmen: ${pkg.title} (${generatedItems.length} butir soal, total skor ${totalScore})`
    );

    return res.status(201).json({ package: pkg });
  } catch (err: any) {
    return res.status(500).json({ error: 'Gagal membuat naskah asesmen: ' + err.message });
  }
});

app.get('/api/assessment', authMiddleware, (req: AuthRequest, res: Response) => {
  const pkgs = db.getAssessmentPackagesByUserId(req.user!.id);
  return res.json({ packages: pkgs });
});

app.get('/api/assessment/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const pkg = db.getAssessmentPackageById(req.params.id);
  if (!pkg || pkg.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Naskah asesmen tidak ditemukan.' });
  }
  return res.json({ package: pkg });
});

app.put('/api/assessment/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const pkg = db.getAssessmentPackageById(req.params.id);
    if (!pkg || pkg.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Naskah asesmen tidak ditemukan.' });
    }

    const { items, config } = req.body;
    if (items) pkg.items = items;
    if (config) pkg.config = config;

    pkg.totalScore = pkg.items.reduce((sum, it) => sum + (it.weight || 0), 0);
    pkg.updatedAt = new Date().toISOString();

    db.saveAssessmentPackage(pkg);
    db.addAuditLog(req.user!.id, req.user!.nipNik, 'ASSESSMENT_UPDATED', `Menyunting naskah soal: ${pkg.title}`);

    return res.json({ package: pkg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assessment/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const success = db.deleteAssessmentPackage(req.params.id, req.user!.id);
  if (!success) return res.status(404).json({ error: 'Naskah asesmen tidak ditemukan.' });
  return res.json({ success: true });
});

app.get('/api/assessment/:id/qc', authMiddleware, (req: AuthRequest, res: Response) => {
  const pkg = db.getAssessmentPackageById(req.params.id);
  if (!pkg || pkg.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Naskah asesmen tidak ditemukan.' });
  }
  const qcResult = runQualityControlCheck(pkg);
  return res.json({ result: qcResult });
});

// 6. DOCX EXPORT (Real Microsoft Word generation)
app.get('/api/assessment/:id/docx/:exportType', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const pkg = db.getAssessmentPackageById(req.params.id);
    if (!pkg || pkg.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Naskah asesmen tidak ditemukan.' });
    }

    const exportType = req.params.exportType; // 'student' | 'teacher_key' | 'grid' | 'rubric' | 'complete_package'
    let buffer: Buffer;
    let filenameSuffix = '';

    if (exportType === 'student') {
      buffer = await generateStudentExamDocx(pkg);
      filenameSuffix = 'Naskah-Soal-Siswa';
    } else if (exportType === 'teacher_key') {
      buffer = await generateTeacherKeyDocx(pkg);
      filenameSuffix = 'Kunci-Jawaban-Guru';
    } else if (exportType === 'grid') {
      buffer = await generateKisiKisiDocx(pkg);
      filenameSuffix = 'Kisi-Kisi-Soal';
    } else if (exportType === 'rubric') {
      buffer = await generateRubricDocx(pkg);
      filenameSuffix = 'Rubrik-Penskoran';
    } else {
      // Complete student docx fallback
      buffer = await generateStudentExamDocx(pkg);
      filenameSuffix = 'Paket-Lengkap';
    }

    const cleanTitle = pkg.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `${cleanTitle}_${filenameSuffix}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    console.error('Error exporting DOCX:', err);
    return res.status(500).json({ error: 'Gagal menghasilkan dokumen Microsoft Word: ' + err.message });
  }
});

// 7. REGULATIONS & CURRICULUM REFERENCE
app.get('/api/regulations', (req: Request, res: Response) => {
  return res.json({ regulations: db.getRegulations() });
});

// 8. BACKUP & RESTORE
app.get('/api/backup/export', authMiddleware, (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin';
  const backupData = db.getRawDataForBackup(req.user!.id, isAdmin);
  db.addAuditLog(req.user!.id, req.user!.nipNik, 'BACKUP_EXPORT', `Ekspor data cadangan (${backupData.backupType})`);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="SISUMATIF_Backup_${new Date().toISOString().split('T')[0]}.json"`);
  return res.json(backupData);
});

app.post('/api/backup/restore', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { backupData, strategy, isDryRun } = req.body;
    const isAdmin = req.user!.role === 'admin';

    if (!backupData || !backupData.version) {
      return res.status(400).json({ error: 'Format berkas cadangan tidak valid.' });
    }

    if (isDryRun) {
      // Simulate counts
      const schoolsCount = backupData.schoolIdentity ? 1 : (backupData.schoolIdentities?.length || 0);
      const protaCount = backupData.protaDocuments?.length || 0;
      const assessmentsCount = backupData.assessmentPackages?.length || 0;

      return res.json({
        simulation: true,
        message: 'Simulasi validasi file backup berhasil. Data siap dipulihkan.',
        summary: { schoolsCount, protaCount, assessmentsCount },
      });
    }

    const result = db.restoreData(backupData, strategy || 'merge', req.user!.id, isAdmin);
    db.addAuditLog(req.user!.id, req.user!.nipNik, 'BACKUP_RESTORE', `Restore data dengan strategi ${strategy}: ${JSON.stringify(result.count)}`);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: 'Gagal memulihkan data: ' + err.message });
  }
});

// 9. ADMIN DASHBOARD & USER MANAGEMENT
app.get('/api/admin/users', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const users = db.getAllUsers();
  return res.json({ users });
});

app.put('/api/admin/users/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, schoolName, role, isActive, nipNik, newPassword } = req.body;

    const existing = db.findUserById(id);
    if (!existing) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    // Check nipNik uniqueness if changed
    if (nipNik && nipNik !== existing.nipNik) {
      const dupe = db.findUserByNipNik(nipNik);
      if (dupe && dupe.id !== id) {
        return res.status(400).json({ error: `Username/NIP/NIK "${nipNik}" sudah digunakan oleh akun lain.` });
      }
      existing.nipNik = String(nipNik).trim();
    }

    if (fullName) existing.fullName = String(fullName).trim();
    if (schoolName) existing.schoolName = String(schoolName).trim();
    if (role && (role === 'guru' || role === 'admin')) existing.role = role;
    if (typeof isActive === 'boolean') existing.isActive = isActive;
    if (newPassword && String(newPassword).trim().length >= 3) {
      existing.passwordHash = hashPassword(String(newPassword).trim());
    }

    db.updateUser(id, existing);
    db.addAuditLog(
      req.user!.id,
      req.user!.nipNik,
      'ADMIN_USER_UPDATE',
      `Admin mengubah akun ${existing.nipNik} (nama: ${existing.fullName}, sandi diubah: ${!!newPassword})`
    );

    return res.json({ success: true, user: existing });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) {
    return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
  }
  const success = db.deleteUser(targetId);
  if (!success) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  db.addAuditLog(req.user!.id, req.user!.nipNik, 'ADMIN_USER_DELETE', `Admin menghapus akun ID ${targetId}`);
  return res.json({ success: true, message: 'Akun berhasil dihapus.' });
});

app.get('/api/admin/audit-logs', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const logs = db.getAuditLogs(150);
  return res.json({ logs });
});

// 10. FIREBASE STATUS & INSTRUCTIONS
app.get('/api/firebase/status', (req: Request, res: Response) => {
  return res.json({
    status: 'standalone_server_db',
    message: 'SI-SUMATIF SD saat ini beroperasi menggunakan Server Database terisolasi dengan penyimpanan atomik berkecepatan tinggi.',
    firestoreConfigReady: false,
    instructions: [
      '1. Hubungkan Firebase Project melalui menu integrasi AI Studio jika Anda menghendaki sinkronisasi cloud multi-node.',
      '2. Database server internal tetap menjamin seluruh data pengguna, identitas sekolah, dan naskah tersimpan secara persisten tanpa kehilangan.',
    ],
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SI-SUMATIF SD server berjalan di http://localhost:${PORT}`);
  });
}

startServer();
