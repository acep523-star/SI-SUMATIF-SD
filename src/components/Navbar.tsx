import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock, Unlock, LogOut, ShieldCheck, UserCheck, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenIdentityModal?: () => void;
  onNavigate: (view: string) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenIdentityModal,
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const { user, schoolIdentity, isIdentityLocked, logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center font-black text-teal-400 text-xl tracking-tight">
              SD
            </div>
            <div>
              <div className="font-extrabold text-base tracking-wide flex items-center gap-2">
                <span>SI-SUMATIF SD</span>
                <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded uppercase">
                  Revisi 2025/2026
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md hidden sm:block">
                {schoolIdentity?.schoolName || 'Sistem Generator Asesmen Sumatif Sekolah Dasar'}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Identity lock badge */}
          {schoolIdentity && (
            <button
              onClick={() => onNavigate('school-identity')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                isIdentityLocked
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
              }`}
              title={isIdentityLocked ? 'Identitas sekolah telah dikunci resmi' : 'Identitas belum dikunci. Klik untuk mengunci.'}
            >
              {isIdentityLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Identitas Terkunci</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Belum Dikunci</span>
                </>
              )}
            </button>
          )}

          {/* User profile capsule */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 text-left hover:opacity-90"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {user.fullName.substring(0, 2)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>{user.fullName}</span>
                    {user.role === 'admin' ? (
                      <span className="bg-purple-900/80 text-purple-300 border border-purple-700 text-[10px] px-1 py-0.2 rounded font-semibold">
                        Admin
                      </span>
                    ) : (
                      <span className="bg-blue-900/80 text-blue-300 border border-blue-700 text-[10px] px-1 py-0.2 rounded font-semibold">
                        Guru
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    NIP/NIK: {user.nipNik}
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                title="Keluar dari akun"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
