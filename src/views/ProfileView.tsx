import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { User, KeyRound, Save, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, token, schoolIdentity } = useAuth();
  const { showToast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || newPassword.length < 5) {
      showToast('Kata sandi baru minimal 5 karakter.', 'error');
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Kata sandi akun Anda berhasil diperbarui.', 'success');
        setOldPassword('');
        setNewPassword('');
      } else {
        showToast(data.error || 'Gagal mengubah kata sandi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          <span>Profil Pendidik & Keamanan Akun</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Informasi akun pendidik, hak akses, dan pengaturan kata sandi pribadi Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            Identitas Akun
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block">Nama Lengkap:</span>
              <span className="text-sm font-bold text-slate-800">{user?.fullName}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">NIP / NIK:</span>
              <span className="text-sm font-mono font-bold text-blue-700">{user?.nipNik}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Satuan Pendidikan:</span>
              <span className="text-xs font-semibold text-slate-800">{user?.schoolName}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Hak Akses:</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase">
                {user?.role}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Waktu Pendaftaran:</span>
              <span className="text-slate-600">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString('id-ID') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Ganti Kata Sandi Pribadi</span>
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kata Sandi Lama *
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama"
                className="w-full p-2.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kata Sandi Baru * (Min. 5 Karakter)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Buat kata sandi baru"
                className="w-full p-2.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChanging}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
            >
              <Save className="w-4 h-4" />
              <span>{isChanging ? 'Memproses...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
