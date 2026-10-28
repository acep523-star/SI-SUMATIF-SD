import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginView } from './views/LoginView.tsx';
import { SignupView } from './views/SignupView.tsx';
import { ResetPasswordView } from './views/ResetPasswordView.tsx';
import { SchoolIdentityView } from './views/SchoolIdentityView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { GeneratorWizardView } from './views/GeneratorWizardView.tsx';
import { ProtaListView } from './views/ProtaListView.tsx';
import { DocumentHistoryView } from './views/DocumentHistoryView.tsx';
import { AiSettingsView } from './views/AiSettingsView.tsx';
import { RegulationsView } from './views/RegulationsView.tsx';
import { BackupRestoreView } from './views/BackupRestoreView.tsx';
import { AdminView } from './views/AdminView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { HelpView } from './views/HelpView.tsx';
import { AssessmentType, AssessmentPackage, ProtaDocument } from './types/index.ts';

function MainApp() {
  const { user, isLoading, hasSchoolIdentity, schoolIdentity } = useAuth();

  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'reset'>('login');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType>('ASAS_1');
  const [editingPackage, setEditingPackage] = useState<AssessmentPackage | null>(null);

  // Direct admin to admin view on login
  React.useEffect(() => {
    if (user?.role === 'admin' && currentView === 'dashboard') {
      setCurrentView('admin');
    }
  }, [user, currentView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Memuat Sistem SI-SUMATIF SD...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (authScreen === 'signup') {
      return <SignupView onSwitchToLogin={() => setAuthScreen('login')} />;
    }
    if (authScreen === 'reset') {
      return <ResetPasswordView onBackToLogin={() => setAuthScreen('login')} />;
    }
    return (
      <LoginView
        onSwitchToSignup={() => setAuthScreen('signup')}
        onSwitchToReset={() => setAuthScreen('reset')}
      />
    );
  }

  // Mandatory first-time wizard: teachers must fill school identity before entering generator
  if (user.role !== 'admin' && !hasSchoolIdentity && currentView !== 'school-identity') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar
          onNavigate={setCurrentView}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <SchoolIdentityView
            isWizardMode={true}
            onCompleted={() => setCurrentView('dashboard')}
          />
        </main>
      </div>
    );
  }

  const handleStartGenerator = (type: AssessmentType) => {
    setSelectedAssessmentType(type);
    setEditingPackage(null);
    setCurrentView('generator');
  };

  const handleEditAssessment = (pkg: AssessmentPackage) => {
    setEditingPackage(pkg);
    setSelectedAssessmentType(pkg.config.assessmentType);
    setCurrentView('generator');
  };

  const handleStartWithProta = (doc: ProtaDocument) => {
    setEditingPackage(null);
    setCurrentView('generator');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      <Navbar
        onNavigate={setCurrentView}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      <div className="flex-1 flex flex-col md:flex-row relative">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onStartGenerator={handleStartGenerator}
              onNavigate={setCurrentView}
              onSelectAssessment={handleEditAssessment}
            />
          )}

          {currentView === 'generator' && (
            <GeneratorWizardView
              initialType={selectedAssessmentType}
              existingPackage={editingPackage}
              onFinished={(pkg) => {
                setEditingPackage(null);
                setCurrentView('history');
              }}
              onCancel={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'prota' && (
            <ProtaListView onStartGeneratorWithProta={handleStartWithProta} />
          )}

          {currentView === 'history' && (
            <DocumentHistoryView onEditAssessment={handleEditAssessment} />
          )}

          {currentView === 'school-identity' && (
            <SchoolIdentityView
              onCompleted={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'ai-settings' && <AiSettingsView />}

          {currentView === 'regulations' && <RegulationsView />}

          {currentView === 'backup' && <BackupRestoreView />}

          {currentView === 'admin' && user.role === 'admin' && <AdminView />}

          {currentView === 'profile' && <ProfileView />}

          {currentView === 'help' && <HelpView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
