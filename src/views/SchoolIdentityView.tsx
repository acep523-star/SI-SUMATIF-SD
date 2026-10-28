import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  History,
  Save,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { SchoolIdentity } from '../types/index.ts';

interface SchoolIdentityViewProps {
  onCompleted?: () => void;
  isWizardMode?: boolean;
}

export const SchoolIdentityView: React.FC<SchoolIdentityViewProps> = ({ onCompleted, isWizardMode = false }) => {
  const { user, token, schoolIdentity, isIdentityLocked, setSchoolIdentityData } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    schoolName: '',
    npsn: '',
    address: '',
    village: '',
    district: '',
    cityRegency: '',
    province: 'Jawa Barat',
    principalName: '',
    principalNip: '',
    authorTeacherName: '',
    authorTeacherNipNik: '',
    academicYear: '2026/2027',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (schoolIdentity) {
      setFormData({
        schoolName: schoolIdentity.schoolName || '',
        npsn: schoolIdentity.npsn || '',
        address: schoolIdentity.address || '',
        village: schoolIdentity.village || '',
        district: schoolIdentity.district || '',
        cityRegency: schoolIdentity.cityRegency || '',
        province: schoolIdentity.province || 'Jawa Barat',
        principalName: schoolIdentity.principalName || '',
        principalNip: schoolIdentity.principalNip || '',
        authorTeacherName: schoolIdentity.authorTeacherName || user?.fullName || '',
        authorTeacherNipNik: schoolIdentity.authorTeacherNipNik || user?.nipNik || '',
        academicYear: schoolIdentity.academicYear || '2026/2027',
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        schoolName: user.schoolName || '',
        authorTeacherName: user.fullName || '',
        authorTeacherNipNik: user.nipNik || '',
      }));
    }
  }, [schoolIdentity, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isIdentityLocked) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (lockNow = false) => {
    if (!formData.schoolName || !formData.npsn || !formData.address || !formData.authorTeacherName || !formData.academicYear) {
      showToast('Mohon lengkapi seluruh kolom wajib yang bertanda bintang (*).', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/school-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          lockNow,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSchoolIdentityData(data.identity);
        showToast(
          lockNow
            ? 'Identitas sekolah berhasil disimpan dan DIKUNCI sebagai sumber kop resmi naskah sumatif.'
            : 'Identitas sekolah berhasil diperbarui.',
          'success'
        );
        if (onCompleted) {
          onCompleted();
        }
      } else {
        showToast(data.error || 'Gagal menyimpan identitas sekolah.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason || unlockReason.trim().length < 5) {
      showToast('Alasan pembukaan kunci minimal 5 karakter.', 'error');
      return;
    }
    if (!unlockPassword) {
      showToast('Konfirmasi kata sandi akun Anda diperlukan.', 'error');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/school-identity/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: unlockReason,
          password: unlockPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolIdentityData(data.identity);
        setShowUnlockModal(false);
        setUnlockReason('');
        setUnlockPassword('');
        showToast('Kunci identitas berhasil dibuka. Catatan audit telah tersimpan.', 'success');
      } else {
        showToast(data.error || 'Gagal membuka kunci.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Wizard alert banner if identity is incomplete */}
      {isWizardMode && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-xl border border-blue-700 shadow-md flex items-start gap-4">
          <div className="p-2 bg-blue-800 rounded-lg shrink-0">
            <Building2 className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Langkah Wajib: Identitas Satuan Pendidikan & Kop Soal</h2>
            <p className="text-sm text-blue-100 mt-1 leading-relaxed">
              Selamat datang di SI-SUMATIF SD! Sebelum Anda dapat menyusun naskah asesmen sumatif, silakan isi dan kunci identitas resmi sekolah. Data ini akan menjadi standar kop baku untuk seluruh dokumen naskah soal, kisi-kisi, kunci jawaban, dan rubrik penskoran.
            </p>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Identitas Resmi Satuan Pendidikan
              </h1>
              <p className="text-xs text-slate-500">
                Sumber master kop surat seluruh naskah asesmen sumatif (ASAS 1, ASAT, ASAJ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isIdentityLocked ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Lock className="w-3.5 h-3.5" />
                  Identitas Terkunci
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  Buka Kunci
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <Unlock className="w-3.5 h-3.5" />
                Dapat Disunting
              </span>
            )}
          </div>
        </div>

        {isIdentityLocked && (
          <div className="bg-emerald-50/70 border-b border-emerald-200 px-6 py-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Identitas ini terkunci resmi sejak <strong>{schoolIdentity?.lockedAt ? new Date(schoolIdentity.lockedAt).toLocaleString('id-ID') : '-'}</strong>. Perubahan naskah baru tidak akan mengubah snapshot dokumen yang telah dibuat sebelumnya.
            </span>
          </div>
        )}

        <form className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Resmi Satuan Pendidikan *
              </label>
              <input
                type="text"
                name="schoolName"
                disabled={isIdentityLocked}
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="Contoh: SD Negeri 1 Merdeka Belajar"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            {/* NPSN */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                NPSN (Nomor Pokok Sekolah Nasional) *
              </label>
              <input
                type="text"
                name="npsn"
                disabled={isIdentityLocked}
                value={formData.npsn}
                onChange={handleChange}
                placeholder="8 digit angka, contoh: 20212345"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600 font-mono"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Alamat Lengkap Sekolah *
              </label>
              <input
                type="text"
                name="address"
                disabled={isIdentityLocked}
                value={formData.address}
                onChange={handleChange}
                placeholder="Jalan, nomor, atau RT/RW"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            {/* Village & District */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Desa / Kelurahan
              </label>
              <input
                type="text"
                name="village"
                disabled={isIdentityLocked}
                value={formData.village}
                onChange={handleChange}
                placeholder="Contoh: Sukamaju"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kecamatan
              </label>
              <input
                type="text"
                name="district"
                disabled={isIdentityLocked}
                value={formData.district}
                onChange={handleChange}
                placeholder="Contoh: Cibiru"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            {/* City & Province */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kabupaten / Kota *
              </label>
              <input
                type="text"
                name="cityRegency"
                disabled={isIdentityLocked}
                value={formData.cityRegency}
                onChange={handleChange}
                placeholder="Contoh: Kota Bandung"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Provinsi *
              </label>
              <input
                type="text"
                name="province"
                disabled={isIdentityLocked}
                value={formData.province}
                onChange={handleChange}
                placeholder="Contoh: Jawa Barat"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            {/* Principal Name & NIP */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Kepala Sekolah *
              </label>
              <input
                type="text"
                name="principalName"
                disabled={isIdentityLocked}
                value={formData.principalName}
                onChange={handleChange}
                placeholder="Contoh: Drs. H. Suryana, M.Pd."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                NIP Kepala Sekolah (Jika Ada)
              </label>
              <input
                type="text"
                name="principalNip"
                disabled={isIdentityLocked}
                value={formData.principalNip}
                onChange={handleChange}
                placeholder="18 digit NIP"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600 font-mono"
              />
            </div>

            {/* Author Teacher Name & NIP */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Guru Penyusun Asesmen *
              </label>
              <input
                type="text"
                name="authorTeacherName"
                disabled={isIdentityLocked}
                value={formData.authorTeacherName}
                onChange={handleChange}
                placeholder="Nama guru penyusun"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                NIP / NIK Guru Penyusun *
              </label>
              <input
                type="text"
                name="authorTeacherNipNik"
                disabled={isIdentityLocked}
                value={formData.authorTeacherNipNik}
                onChange={handleChange}
                placeholder="NIP/NIK guru"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600 font-mono"
              />
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tahun Ajaran Resmi *
              </label>
              <input
                type="text"
                name="academicYear"
                disabled={isIdentityLocked}
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="Contoh: 2026/2027"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600 font-mono"
              />
            </div>
          </div>

          {!isIdentityLocked && (
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-slate-500" />
                <span>Simpan Sementara (Draft)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Simpan dan Kunci Identitas</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-900">Prosedur Buka Kunci Identitas</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Membuka kunci identitas akan mengizinkan pengubahan data kop sekolah. Setiap perubahan akan dicatat dalam log audit resmi dan tidak mengubah naskah lama yang telah di-generate sebelumnya.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Perubahan / Pembukaan Kunci *
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  placeholder="Contoh: Terjadi pergantian Kepala Sekolah definitif atau revisi NPSN."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Akun Anda *
                </label>
                <input
                  type="password"
                  required
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm"
                >
                  {isUnlocking ? 'Memverifikasi...' : 'Buka Kunci Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
