import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { ShieldCheck, LogIn, UserPlus, KeyRound, ShieldAlert, Info } from 'lucide-react';

interface LoginViewProps {
  onSwitchToSignup: () => void;
  onSwitchToReset: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToSignup, onSwitchToReset }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [nipNik, setNipNik] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nipNik || !password) {
      showToast('Username/NIP/NIK dan kata sandi wajib diisi.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nipNik: nipNik.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast(`Selamat datang, ${data.user.fullName}!`, 'success');
      } else {
        showToast(
          data.error || 'Akun belum terdaftar atau kata sandi tidak cocok. Silakan daftar terlebih dahulu.',
          'error'
        );
      }
    } catch {
      showToast('Koneksi ke server gagal. Pastikan jaringan Anda terhubung.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 font-black text-3xl mb-4 shadow-lg shadow-teal-500/10">
          SD
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          SI-SUMATIF SD
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          Sistem Generator Naskah Asesmen Sumatif Sekolah Dasar Berbasis PROTA & Kurikulum Resmi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-700/80 backdrop-blur-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nipNik" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Username / NIP / NIK Guru
              </label>
              <div className="mt-1.5">
                <input
                  id="nipNik"
                  name="nipNik"
                  type="text"
                  required
                  placeholder="NIP/NIK terdaftar atau 'admin'"
                  value={nipNik}
                  onChange={e => setNipNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pengguna wajib terdaftar sebelum dapat masuk ke halaman utama.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={onSwitchToReset}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memvalidasi Akun...' : 'Masuk ke Sistem'}</span>
            </button>
          </form>

          {/* Admin Info Banner */}
          <div className="mt-5 p-3 rounded-lg bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Akses Administrator:</span> Masuk dengan username: <code className="bg-purple-900/60 px-1 py-0.5 rounded font-mono text-white">admin</code> dan sandi: <code className="bg-purple-900/60 px-1 py-0.5 rounded font-mono text-white">admin</code> untuk mengontrol dan mengelola seluruh akun pengguna.
            </div>
          </div>

          <div className="mt-6 text-center pt-4 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-xs font-medium text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-teal-400" />
              <span>Belum memiliki akun? <strong className="text-teal-400 underline">Daftar Guru Baru di Sini</strong></span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Autentikasi terenkripsi server-side dengan hashing bcrypt & proteksi JWT.
        </div>
      </div>
    </div>
  );
};
