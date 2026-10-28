import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileText,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  ArrowRight,
  BookOpen,
  Lock,
  Unlock,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { AssessmentPackage, AssessmentType, ASSESSMENT_CONFIG } from '../types/index.ts';

interface DashboardViewProps {
  onStartGenerator: (type: AssessmentType) => void;
  onNavigate: (view: string) => void;
  onSelectAssessment: (pkg: AssessmentPackage) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartGenerator,
  onNavigate,
  onSelectAssessment,
}) => {
  const { user, token, schoolIdentity, isIdentityLocked } = useAuth();
  const [recentPackages, setRecentPackages] = useState<AssessmentPackage[]>([]);
  const [protaCount, setProtaCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;
      try {
        const [pkgRes, protaRes] = await Promise.all([
          fetch('/api/assessment', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/prota', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          setRecentPackages(pkgData.packages || []);
        }
        if (protaRes.ok) {
          const protaData = await protaRes.json();
          setProtaCount((protaData.documents || []).length);
        }
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome & School Overview Hero */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>PPA Edisi Revisi 2025 Kemendikdasmen • Kurikulum Merdeka</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.fullName}!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            {schoolIdentity ? (
              <span>
                Pendidik pada <strong>{schoolIdentity.schoolName}</strong> ({schoolIdentity.cityRegency}). Siap menyusun naskah soal asesmen sumatif terstandar dengan integrasi tabel PROTA, kisi-kisi, kunci, dan rubrik analitik.
              </span>
            ) : (
              <span>
                Silakan lengkapi identitas satuan pendidikan Anda untuk memulai pembuatan naskah asesmen sumatif.
              </span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/80">
              <span className="text-slate-400">Status Identitas:</span>
              {isIdentityLocked ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Terkunci Resmi
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> Belum Dikunci
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/80">
              <span className="text-slate-400">Tahun Ajaran:</span>
              <span className="text-white font-mono font-bold">
                {schoolIdentity?.academicYear || '2026/2027'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/80">
              <span className="text-slate-400">Naskah Dihasilkan:</span>
              <span className="text-teal-400 font-bold">{recentPackages.length} Dokumen</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Assessment Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pilihan Jenis Asesmen Sumatif
            </h2>
            <p className="text-xs text-slate-500">
              Pilih jenis asesmen sumatif yang ingin Anda susun naskah soalnya
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. ASAS 1 */}
          <div
            onClick={() => onStartGenerator('ASAS_1')}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-500 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-md text-xs font-black tracking-wider bg-blue-100 text-blue-800 uppercase">
                  Semester 1
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Kelas 1 - 6
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                ASAS 1
              </h3>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Asesmen Sumatif Akhir Semester 1
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Penilaian capaian hasil belajar murid di akhir semester gasal untuk seluruh jenjang kelas 1 sampai 6 SD sesuai Capaian Pembelajaran semester 1.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Mulai Susun ASAS 1</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 2. ASAT */}
          <div
            onClick={() => onStartGenerator('ASAT')}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-teal-500 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-md text-xs font-black tracking-wider bg-teal-100 text-teal-800 uppercase">
                  Semester 2
                </span>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  Kelas 1 - 5 Saja
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-teal-600 transition-colors">
                ASAT
              </h3>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Asesmen Sumatif Akhir Tahun
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Penilaian capaian hasil belajar murid di akhir tahun ajaran (Semester 2) untuk penentuan kenaikan kelas (Hanya berlaku untuk kelas 1, 2, 3, 4, dan 5).
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
              <span>Mulai Susun ASAT</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 3. ASAJ */}
          <div
            onClick={() => onStartGenerator('ASAJ')}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-purple-500 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-md text-xs font-black tracking-wider bg-purple-100 text-purple-800 uppercase">
                  Kelulusan
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  Kelas 6 Khusus
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                ASAJ
              </h3>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Asesmen Sumatif Akhir Jenjang
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Penilaian akhir jenjang pendidikan sekolah dasar untuk peserta didik kelas 6 semester 2 sebagai dasar utama kriteria kelulusan peserta didik.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              <span>Mulai Susun ASAJ</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assessment Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Riwayat Naskah Asesmen Terkini
            </h2>
            <p className="text-xs text-slate-500">
              Naskah soal yang siap diekspor ke Microsoft Word (.docx) atau disunting kembali
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Lihat Semua Riwayat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPackages.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Belum Ada Naskah Soal</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Pilih salah satu kartu asesmen di atas untuk mulai membuat kisi-kisi dan naskah soal berbasis PROTA.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Judul Naskah</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Kelas / Fase</th>
                  <th className="py-3 px-4">Jumlah Soal</th>
                  <th className="py-3 px-4">Total Skor</th>
                  <th className="py-3 px-4">Waktu Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPackages.slice(0, 5).map(pkg => (
                  <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {pkg.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                        {pkg.config.assessmentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      Kelas {pkg.config.grade} ({pkg.config.phase})
                    </td>
                    <td className="py-3.5 px-4">
                      {pkg.items.length} Butir (PG: {pkg.config.numMultipleChoice}, Isian: {pkg.config.numShortAnswer}, Esai: {pkg.config.numEssay})
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {pkg.totalScore} Poin
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(pkg.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectAssessment(pkg)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Buka Editor / Ekspor</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
