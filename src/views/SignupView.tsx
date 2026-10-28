import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

interface SignupViewProps {
  onSwitchToLogin: () => void;
}

export const SignupView: React.FC<SignupViewProps> = ({ onSwitchToLogin }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [nipNik, setNipNik] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nipNik || nipNik.trim().length < 4) {
      showToast('NIP/NIK wajib diisi minimal 4 digit.', 'error');
      return;
    }
    if (!password || password.length < 5) {
      showToast('Kata sandi minimal 5 karakter.', 'error');
      return;
    }
    if (!fullName || fullName.trim().length < 2) {
      showToast('Nama lengkap guru wajib diisi.', 'error');
      return;
    }
    if (!schoolName || schoolName.trim().length < 2) {
      showToast('Nama satuan pendidikan wajib diisi.', 'error');
      return;
    }
    if (!agreeTerms) {
      showToast('Anda harus menyetujui kebijakan privasi dan ketentuan penggunaan.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nipNik: nipNik.trim(),
          password,
          fullName: fullName.trim(),
          schoolName: schoolName.trim(),
          agreeTerms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast('Pendaftaran berhasil! Silakan lengkapi identitas sekolah Anda.', 'success');
      } else {
        showToast(data.error || 'Pendaftaran gagal.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-2xl font-extrabold text-white">
          Pendaftaran Guru Baru
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Buat akun pendidik untuk menyusun naskah asesmen sumatif SD
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-700/80">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                NIP / NIK Guru (Username Unik)
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 198503142010012015 atau 3201..."
                value={nipNik}
                onChange={e => setNipNik(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[11px] text-slate-400">
                Disimpan sebagai teks utuh agar angka nol di awal tidak hilang.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Nama Lengkap Guru (dengan Gelar)
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Sri Wahyuni, S.Pd.SD"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Nama Satuan Pendidikan (Sekolah)
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SD Negeri 2 Harapan Bangsa"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Kata Sandi (Minimal 5 Karakter)
              </label>
              <input
                type="password"
                required
                placeholder="Buat kata sandi yang aman"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Saya menyetujui kebijakan privasi, pengelolaan data naskah asesmen, dan ketentuan penggunaan SI-SUMATIF SD.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all focus:outline-none disabled:opacity-50 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-xs font-medium text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sudah memiliki akun? Masuk ke sini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
