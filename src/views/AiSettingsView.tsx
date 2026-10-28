import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  Cpu,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const AiSettingsView: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [hasUserKey, setHasUserKey] = useState(false);
  const [hasSystemKey, setHasSystemKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/ai/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasUserKey(data.hasUserKey);
        setSelectedModel(data.selectedModel || 'gemini-2.5-flash');
        setHasSystemKey(data.hasSystemKey);
      }
    } catch {
      showToast('Gagal memuat pengaturan AI.', 'error');
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pengaturan AI berhasil disimpan secara aman di sisi server.', 'success');
        setApiKey('');
        fetchConfig();
      } else {
        showToast(data.error || 'Gagal menyimpan konfigurasi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm('Hapus API Key pribadi Anda dari server?')) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: '',
          selectedModel,
        }),
      });
      if (res.ok) {
        showToast('API Key pribadi berhasil dihapus.', 'info');
        fetchConfig();
      }
    } catch {
      showToast('Gagal menghapus API Key.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
        showToast('Koneksi ke Gemini API berhasil!', 'success');
      } else {
        setTestResult({ success: false, message: data.error });
        showToast(data.error || 'Uji koneksi gagal.', 'error');
      }
    } catch {
      setTestResult({ success: false, message: 'Gagal menghubungi server untuk pengujian.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          <span>Pengaturan Mesin AI (Gemini API)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasikan model generative AI dan kunci akses API pribadi Anda untuk penyusunan butir soal asesmen sumatif otomatis.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              Status API Key Pribadi Anda
            </span>
            <div className="flex items-center gap-2">
              {hasUserKey ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  API Key Pribadi Tersimpan (Server-Side)
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  Belum Dikonfigurasi
                </span>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              Status Kunci Sistem Cadangan (Default)
            </span>
            <div className="flex items-center gap-2">
              {hasSystemKey ? (
                <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Kunci Sistem Server Siap Digunakan
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Mode Standar Pedagogis Otomatis
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Pilihan Model Gemini AI
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full p-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat & Presisi Analitik)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Penalaran Mendalam untuk Soal HOTS Kompleks)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Gemini API Key Pribadi (Opsional)
              </label>
              {hasUserKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kunci Saya</span>
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder={hasUserKey ? '•••••••••••••••••••••••• (Tersimpan aman)' : 'Masukkan API Key dari Google AI Studio'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Kunci API disimpan hanya pada ruang penyimpanan terisolasi server dan tidak pernah diekspos ke frontend, dokumen Word, atau backup.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Gemini API'}</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan AI'}</span>
            </button>
          </div>
        </form>

        {testResult && (
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-bold">{testResult.success ? 'Koneksi Berhasil' : 'Uji Koneksi Gagal'}</div>
              <div className="mt-0.5 leading-relaxed">{testResult.message}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
