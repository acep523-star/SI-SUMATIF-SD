import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Building2,
  Cpu,
  History,
  Shield,
  BookOpen,
  DatabaseBackup,
  User as UserIcon,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'generator', label: 'Buat Naskah Sumatif', icon: PlusCircle, highlight: true },
    { id: 'prota', label: 'File PROTA', icon: FileSpreadsheet },
    { id: 'history', label: 'Riwayat Dokumen', icon: History },
    { id: 'school-identity', label: 'Identitas Sekolah', icon: Building2 },
    { id: 'ai-settings', label: 'Pengaturan AI', icon: Cpu },
    { id: 'regulations', label: 'Regulasi & Panduan', icon: BookOpen },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'profile', label: 'Profil Saya', icon: UserIcon },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Panel Administrator', icon: Shield, highlight: false });
  }

  navItems.push({ id: 'help', label: 'Bantuan & Format', icon: HelpCircle, highlight: false });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 shrink-0 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 top-16' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
            Menu Utama
          </div>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : item.highlight
                    ? 'bg-slate-800/80 text-teal-300 hover:bg-slate-800 hover:text-teal-200'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-teal-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="font-semibold text-slate-400 mb-1">Panduan Asesmen SD</div>
        <p className="leading-relaxed text-[11px]">
          Sesuai PPA Revisi 2025 Kemendikdasmen & Kurikulum Merdeka.
        </p>
      </div>
    </aside>
  </>
  );
};
