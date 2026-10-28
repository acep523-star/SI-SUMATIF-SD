import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  KeyRound,
  History,
  AlertTriangle,
  UserCheck,
  Search,
} from 'lucide-react';
import { User, AuditLog } from '../types/index.ts';

export const AdminView: React.FC = () => {
  const { user: currentAdmin, token } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Control Action Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', schoolName: '', nipNik: '', role: 'guru', isActive: true, newPassword: '' });

  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [directNewPassword, setDirectNewPassword] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
      }
      if (logsRes.ok) {
        const l = await logsRes.json();
        setAuditLogs(l.logs || []);
      }
    } catch {
      showToast('Gagal memuat data pengguna dari server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Open Edit User Modal (Change Username, Full Name, School)
  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName,
      schoolName: u.schoolName,
      nipNik: u.nipNik,
      role: u.role,
      isActive: u.isActive,
      newPassword: '',
    });
  };

  const handleSaveUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.nipNik || editForm.nipNik.trim().length < 3) {
      showToast('Username/NIP/NIK wajib diisi minimal 3 karakter.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Akun ${editForm.nipNik} berhasil diperbarui.`, 'success');
        setEditingUser(null);
        fetchAdminData();
      } else {
        showToast(data.error || 'Gagal memperbarui akun.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Open Direct Password Change Modal
  const handleOpenPasswordModal = (u: User) => {
    setPasswordModalUser(u);
    setDirectNewPassword('');
  };

  const handleSaveDirectPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!directNewPassword || directNewPassword.trim().length < 3) {
      showToast('Kata sandi baru minimal 3 karakter.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: directNewPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Kata sandi akun ${passwordModalUser.nipNik} berhasil diubah!`, 'success');
        setPasswordModalUser(null);
        setDirectNewPassword('');
        fetchAdminData();
      } else {
        showToast(data.error || 'Gagal mengubah kata sandi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleActive = async (targetUser: User) => {
    const updatedStatus = !targetUser.isActive;
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: updatedStatus }),
      });
      if (res.ok) {
        showToast(`Status akun ${targetUser.nipNik} diubah menjadi ${updatedStatus ? 'AKTIF' : 'NONAKTIF'}.`, 'success');
        fetchAdminData();
      }
    } catch {
      showToast('Gagal mengubah status akun.', 'error');
    }
  };

  // Delete User Account Completely from Any Device
  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentAdmin?.id) {
      showToast('Anda tidak dapat menghapus akun administrator Anda sendiri.', 'error');
      return;
    }

    const confirmDelete = confirm(
      `PERINGATAN HAPUS AKUN:\nApakah Anda yakin ingin MENGHAPUS AKUN "${targetUser.fullName}" (Username: ${targetUser.nipNik}) beserta seluruh data naskahnya?\n\nTindakan ini permanen di server dan berlaku di seluruh device.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Akun ${targetUser.nipNik} berhasil dihapus dari sistem.`, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Gagal menghapus akun pengguna.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menghapus akun.', 'error');
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nipNik.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Shield className="w-6 h-6 text-purple-400" />
            <span>Pusat Kontrol Akun Pengguna — Administrator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mengontrol, mengubah username dan kata sandi, serta menghapus akun pengguna terdaftar di seluruh device dan lokasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400">Total Pengguna:</span>{' '}
            <strong className="text-teal-400 font-mono text-sm">{users.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar (Read-only filter, no create input forms) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari akun terdaftar (Username, Nama, Sekolah)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Menampilkan {filteredUsers.length} akun terdaftar
        </span>
      </div>

      {/* Control Table of Registered Users */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Username / NIP / NIK</th>
                <th className="py-3 px-4">Nama Pendidik</th>
                <th className="py-3 px-4">Satuan Pendidikan</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-right">Kontrol Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {u.nipNik}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {u.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {u.schoolName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                      }`}
                      title="Klik untuk mengaktifkan/menonaktifkan akun"
                    >
                      {u.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                      <span>{u.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-colors"
                        title="Ubah Username, Nama, atau Sekolah"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Ubah Data</span>
                      </button>

                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1 border border-amber-200 transition-colors"
                        title="Ganti Kata Sandi Akun Ini"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Ganti Sandi</span>
                      </button>

                      {u.id !== currentAdmin?.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-colors"
                          title="Hapus Akun Pengguna Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <span>Audit Log Kontrol Akun Pengguna</span>
        </h2>
        <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Waktu</th>
                <th className="p-2.5">Pelaksana</th>
                <th className="p-2.5">Aksi</th>
                <th className="p-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2 text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="p-2 font-bold text-slate-800">
                    {log.username}
                  </td>
                  <td className="p-2 text-purple-700 font-bold">
                    {log.action}
                  </td>
                  <td className="p-2 text-slate-700">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Ubah Username & Data Akun Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 border-b border-slate-100 pb-3">
              <Edit className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">Ubah Akun: {editingUser.nipNik}</h3>
            </div>
            <form onSubmit={handleSaveUserUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / NIP / NIK (Dapat Diubah) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nipNik}
                  onChange={e => setEditForm(prev => ({ ...prev, nipNik: e.target.value }))}
                  className="w-full p-2.5 text-xs border rounded-lg border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Pendidik *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full p-2.5 text-xs border rounded-lg border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.schoolName}
                  onChange={e => setEditForm(prev => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full p-2.5 text-xs border rounded-lg border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hak Akses (Role)
                </label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2.5 text-xs border rounded-lg border-slate-300 font-bold"
                >
                  <option value="guru">Guru (Pendidik SD)</option>
                  <option value="admin">Administrator Sistem</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-sm"
                >
                  Simpan Perubahan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Ganti Kata Sandi Akun Pengguna Secara Langsung */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 border-b border-slate-100 pb-3">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">Ganti Sandi: {passwordModalUser.nipNik}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Admin dapat langsung menetapkan kata sandi baru untuk akun pengguna ini.
            </p>
            <form onSubmit={handleSaveDirectPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ketik kata sandi baru"
                  value={directNewPassword}
                  onChange={e => setDirectNewPassword(e.target.value)}
                  className="w-full p-2.5 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
