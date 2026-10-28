import React, { useState } from 'react';
import { useToast } from '../components/Toast.tsx';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ResetPasswordViewProps {
  onBackToLogin: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onBackToLogin }) => {
  const { showToast } = useToast();
  const [nipNik, setNipNik] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nipNik || nipNik.trim().length < 4) {
      showToast('Masukkan NIP/NIK yang terdaftar.', 'error');
      return;
    }
    // Simulation / guidance for secure reset
    setIsSubmitted(true);
    showToast('Permintaan reset kata sandi telah diproses.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 font-bold mb-3">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">
          Pemulihan Kata Sandi
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Prosedur pengaturan ulang akun terverifikasi untuk pendidik SD
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-700">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  NIP / NIK Anda
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan NIP atau NIK"
                  value={nipNik}
                  onChange={e => setNipNik(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                Untuk menjaga privasi data guru dan siswa, penggantian kata sandi dapat disetujui melalui Administrator Sekolah / Administrator Sistem Anda melalui Panel Audit Keamanan.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-colors"
              >
                Kirim Permintaan Reset
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Instruksi Terkirim</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Silakan hubungi Administrator Sistem dengan menyampaikan NIP/NIK <strong>{nipNik}</strong>. Administrator dapat memverifikasi dan mereset kata sandi Anda melalui Panel Kelola Akun.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-medium text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
