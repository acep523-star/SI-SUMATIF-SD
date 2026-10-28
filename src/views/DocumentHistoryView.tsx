import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  History,
  FileText,
  Download,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { AssessmentPackage } from '../types/index.ts';

interface DocumentHistoryViewProps {
  onEditAssessment: (pkg: AssessmentPackage) => void;
}

export const DocumentHistoryView: React.FC<DocumentHistoryViewProps> = ({ onEditAssessment }) => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<AssessmentPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/assessment', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch {
      showToast('Gagal memuat riwayat dokumen.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [token]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus naskah "${title}"?`)) return;

    try {
      const res = await fetch(`/api/assessment/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPackages(prev => prev.filter(p => p.id !== id));
        showToast('Naskah soal berhasil dihapus.', 'success');
      }
    } catch {
      showToast('Gagal menghapus naskah.', 'error');
    }
  };

  const handleDownloadDocx = async (pkg: AssessmentPackage, exportType: string) => {
    const key = `${pkg.id}-${exportType}`;
    setDownloadingId(key);
    try {
      const res = await fetch(`/api/assessment/${pkg.id}/docx/${exportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast('Gagal mengunduh berkas Word.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pkg.title}_${exportType}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Dokumen Word (.docx) berhasil diunduh.', 'success');
    } catch {
      showToast('Terjadi kesalahan saat mengunduh berkas.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-blue-600" />
          <span>Riwayat Naskah Asesmen Sumatif</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Daftar seluruh naskah soal, kisi-kisi, kunci jawaban, dan rubrik yang telah dibuat dan tersimpan aman di database.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Naskah</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Gunakan tombol Buat Naskah Sumatif pada menu utama untuk mulai menghasilkan naskah asesmen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800">
                    {pkg.config.assessmentType}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Kelas {pkg.config.grade} ({pkg.config.phase}) • Semester {pkg.config.semester}
                  </span>
                  <span className="text-xs text-slate-400">
                    • TA {pkg.config.academicYear}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{pkg.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Penyusun: <strong>{pkg.config.authorName}</strong></span>
                  <span>•</span>
                  <span>{pkg.items.length} Soal (PG: {pkg.config.numMultipleChoice}, Isian: {pkg.config.numShortAnswer}, Esai: {pkg.config.numEssay})</span>
                  <span>•</span>
                  <span>Total Skor: <strong>{pkg.totalScore} Poin</strong></span>
                  <span>•</span>
                  <span className="text-slate-400">
                    Dibuat: {new Date(pkg.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditAssessment(pkg)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingId !== null}
                  onClick={() => handleDownloadDocx(pkg, 'student')}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5"
                  title="Unduh Naskah Soal Peserta Didik (.docx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Soal (.docx)</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingId !== null}
                  onClick={() => handleDownloadDocx(pkg, 'teacher_key')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5"
                  title="Unduh Kunci Jawaban Guru (.docx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Kunci (.docx)</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingId !== null}
                  onClick={() => handleDownloadDocx(pkg, 'complete_package')}
                  className="px-3 py-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="Unduh Paket Lengkap Asesmen (.docx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Paket Lengkap</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(pkg.id, pkg.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                  title="Hapus naskah"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
