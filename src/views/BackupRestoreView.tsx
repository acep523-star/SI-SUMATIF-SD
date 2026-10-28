import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  DatabaseBackup,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreReport, setRestoreReport] = useState<any | null>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast('Gagal membuat data cadangan.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SISUMATIF_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Cadangan data berhasil diekspor dan diverifikasi aman (tanpa password/kunci rahasia).', 'success');
    } catch {
      showToast('Terjadi kesalahan saat mengekspor data.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setDryRunResult(null);
    setRestoreReport(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (!json.version) {
          showToast('File tidak memiliki format cadangan SI-SUMATIF yang valid.', 'error');
          setParsedData(null);
          return;
        }
        setParsedData(json);
        showToast('File cadangan valid dan siap disimulasikan.', 'info');
      } catch {
        showToast('File bukan format JSON yang valid.', 'error');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDryRunSimulation = async () => {
    if (!parsedData) return;
    setIsDryRunning(true);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          backupData: parsedData,
          strategy,
          isDryRun: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDryRunResult(data);
        showToast('Simulasi validasi file cadangan berhasil!', 'success');
      } else {
        showToast(data.error || 'Simulasi gagal.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat simulasi.', 'error');
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!parsedData) return;
    if (strategy === 'replace') {
      if (!confirm('PERINGATAN: Strategi Replace akan menimpa data yang ada. Apakah Anda yakin ingin melanjutkan?')) {
        return;
      }
    }

    setIsRestoring(true);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          backupData: parsedData,
          strategy,
          isDryRun: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRestoreReport(data);
        showToast('Pemulihan data cadangan berhasil diselesaikan!', 'success');
      } else {
        showToast(data.error || 'Pemulihan data gagal.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memulihkan data.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-blue-600" />
          <span>Pusat Cadangan Data & Pemulihan (Backup & Restore)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Simpan cadangan data naskah, identitas sekolah, dan riwayat asesmen Anda, atau pulihkan data dengan simulasi pra-impor yang aman.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BACKUP EXPORT CARD */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Ekspor Data Cadangan (.json)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Mengunduh seluruh berkas PROTA, riwayat naskah asesmen, dan identitas sekolah Anda dalam format JSON terverifikasi.
            </p>

            <div className="mt-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Jaminan Privasi & Keamanan:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Kata sandi pengguna, token sesi, kunci API rahasia, dan kredensial sensitif secara otomatis dibersihkan dan <strong>tidak pernah dimasukkan</strong> ke dalam file backup.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportBackup}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Memproses Ekspor...' : 'Unduh File Cadangan'}</span>
          </button>
        </div>

        {/* RESTORE IMPORT CARD */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Pemulihan Data (Restore)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pulihkan data asesmen dari file cadangan resmi dengan simulasi dry-run sebelum perubahan diterapkan.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih File Cadangan (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Strategi Penggabungan Data
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={strategy === 'merge'}
                      onChange={() => setStrategy('merge')}
                      className="text-blue-600"
                    />
                    <span><strong>Gabungkan (Merge)</strong> — Aman</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={strategy === 'replace'}
                      onChange={() => setStrategy('replace')}
                      className="text-blue-600"
                    />
                    <span><strong>Timpa (Replace)</strong></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={!parsedData || isDryRunning}
              onClick={handleDryRunSimulation}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isDryRunning ? 'Mensimulasikan...' : 'Jalankan Simulasi (Dry-Run)'}</span>
            </button>

            <button
              type="button"
              disabled={!parsedData || isRestoring}
              onClick={handleExecuteRestore}
              className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isRestoring ? 'Memulihkan Data...' : 'Eksekusi Pemulihan Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dry Run / Restore Results */}
      {dryRunResult && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs space-y-2 text-blue-900">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Hasil Simulasi Pra-Impor (Dry-Run):</span>
          </div>
          <p>{dryRunResult.message}</p>
          <div className="flex gap-4 font-mono pt-1 text-slate-800">
            <span>Identitas Sekolah: {dryRunResult.summary.schoolsCount}</span>
            <span>Berkas PROTA: {dryRunResult.summary.protaCount}</span>
            <span>Naskah Asesmen: {dryRunResult.summary.assessmentsCount}</span>
          </div>
        </div>
      )}

      {restoreReport && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2 text-emerald-900">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Laporan Pemulihan Data:</span>
          </div>
          <p>{restoreReport.message}</p>
          <div className="flex gap-4 font-mono pt-1 text-emerald-800">
            <span>Sekolah: {restoreReport.count.schools} record</span>
            <span>PROTA: {restoreReport.count.prota} record</span>
            <span>Asesmen: {restoreReport.count.assessments} record</span>
          </div>
        </div>
      )}
    </div>
  );
};
