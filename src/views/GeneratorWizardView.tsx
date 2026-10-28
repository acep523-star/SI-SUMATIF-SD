import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AssessmentConfig,
  AssessmentPackage,
  AssessmentItem,
  AssessmentType,
  ASSESSMENT_CONFIG,
  getPhaseByGrade,
  ProtaRow,
  ProtaDocument,
  QualityCheckResult,
} from '../types/index.ts';
import { calculateCognitiveDistribution } from '../server/aiGenerator.ts';

interface GeneratorWizardViewProps {
  initialType?: AssessmentType;
  existingPackage?: AssessmentPackage | null;
  onFinished: (pkg: AssessmentPackage) => void;
  onCancel: () => void;
}

export const GeneratorWizardView: React.FC<GeneratorWizardViewProps> = ({
  initialType = 'ASAS_1',
  existingPackage = null,
  onFinished,
  onCancel,
}) => {
  const { user, token, schoolIdentity, isIdentityLocked } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(existingPackage ? 3 : 1);

  // STEP 1 STATE: Configuration
  const [config, setConfig] = useState<AssessmentConfig>({
    assessmentType: initialType,
    grade: ASSESSMENT_CONFIG[initialType].allowedGrades[0],
    phase: getPhaseByGrade(ASSESSMENT_CONFIG[initialType].allowedGrades[0]),
    semester: ASSESSMENT_CONFIG[initialType].defaultSemester,
    subject: 'Matematika',
    academicYear: schoolIdentity?.academicYear || '2026/2027',
    authorName: schoolIdentity?.authorTeacherName || user?.fullName || '',
    examDate: new Date().toISOString().split('T')[0],
    timeAllocationMinutes: 90,
    numMultipleChoice: 10,
    numShortAnswer: 3,
    numEssay: 2,
    lotsPercentage: 30,
    motsPercentage: 50,
    hotsPercentage: 20,
    multipleChoiceOptionsCount: 4,
    scoringFormula: 'Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100',
    weightPG: 1,
    weightIsian: 2,
    weightEssay: 4,
  });

  // STEP 2 STATE: PROTA
  const [protaDoc, setProtaDoc] = useState<ProtaDocument | null>(null);
  const [availableRows, setAvailableRows] = useState<ProtaRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // STEP 3 STATE: Generated Items & Editor
  const [items, setItems] = useState<AssessmentItem[]>(existingPackage?.items || []);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [savedPackage, setSavedPackage] = useState<AssessmentPackage | null>(existingPackage);

  // STEP 4 STATE: QC Check & Export
  const [qcResult, setQcResult] = useState<QualityCheckResult | null>(null);
  const [isCheckingQc, setIsCheckingQc] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Update phase when grade changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      phase: getPhaseByGrade(prev.grade),
    }));
  }, [config.grade]);

  // Load standard PROTA template on step 2 if none uploaded
  useEffect(() => {
    if (currentStep === 2 && availableRows.length === 0) {
      loadStandardTemplate(config.subject, config.grade);
    }
  }, [currentStep]);

  const loadStandardTemplate = async (subject: string, grade: number) => {
    try {
      const res = await fetch(`/api/prota/template?subject=${encodeURIComponent(subject)}&grade=${grade}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableRows(data.rows || []);
        setSelectedRowIds((data.rows || []).map((r: ProtaRow) => r.id));
      }
    } catch (e) {
      console.error('Failed to load standard prota template:', e);
    }
  };

  // Distribution calculation preview
  const totalQuestions = config.numMultipleChoice + config.numShortAnswer + config.numEssay;
  let cognitiveCounts = { lots: 0, mots: 0, hots: 0 };
  let distributionError = '';
  try {
    cognitiveCounts = calculateCognitiveDistribution(
      totalQuestions,
      config.lotsPercentage,
      config.motsPercentage,
      config.hotsPercentage
    );
  } catch (err: any) {
    distributionError = err.message;
  }

  // Handle Assessment Type Change
  const handleTypeChange = (newType: AssessmentType) => {
    const spec = ASSESSMENT_CONFIG[newType];
    const newGrade = spec.allowedGrades[0];
    setConfig(prev => ({
      ...prev,
      assessmentType: newType,
      grade: newGrade,
      phase: getPhaseByGrade(newGrade),
      semester: spec.defaultSemester,
    }));
  };

  // Handle PROTA file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/prota/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            fileBase64: base64,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setProtaDoc(data.document);
          setAvailableRows(data.document.extractedRows || []);
          setSelectedRowIds((data.document.extractedRows || []).map((r: ProtaRow) => r.id));
          showToast(`Berhasil membaca ${data.document.extractedRows.length} baris TP/ATP dari file ${file.name}`, 'success');
        } else {
          showToast(data.error || 'Gagal membaca berkas PROTA.', 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Gagal mengunggah berkas.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRows = () => {
    if (selectedRowIds.length === availableRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(availableRows.map(r => r.id));
    }
  };

  // STEP 3: Generate Questions
  const handleGenerateQuestions = async () => {
    const selectedRows = availableRows.filter(r => selectedRowIds.includes(r.id));
    if (selectedRows.length === 0) {
      showToast('Wajib memilih minimal satu Tujuan Pembelajaran (TP) dari tabel PROTA.', 'error');
      return;
    }

    if (totalQuestions <= 0) {
      showToast('Jumlah butir soal tidak boleh 0.', 'error');
      return;
    }

    if (distributionError) {
      showToast(distributionError, 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config,
          selectedTpRows: selectedRows,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSavedPackage(data.package);
        setItems(data.package.items || []);
        showToast('Naskah soal sumatif berhasil disusun!', 'success');
        setCurrentStep(3);
      } else {
        showToast(data.error || 'Gagal membuat soal asesmen.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat memproses naskah.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Editor Actions
  const handleUpdateItem = (index: number, updated: Partial<AssessmentItem>) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Naskah harus memiliki minimal 1 butir soal.', 'error');
      return;
    }
    setItems(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Renumber consecutive
      return filtered.map((it, i) => ({ ...it, number: i + 1 }));
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    setItems(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((it, i) => ({ ...it, number: i + 1 }));
    });
  };

  const handleSaveEdits = async () => {
    if (!savedPackage) return;
    try {
      const res = await fetch(`/api/assessment/${savedPackage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          config,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedPackage(data.package);
        showToast('Perubahan naskah soal berhasil disimpan.', 'success');
      }
    } catch {
      showToast('Gagal menyimpan perubahan.', 'error');
    }
  };

  // Run QC Check
  const handleRunQc = async () => {
    if (!savedPackage) return;
    setIsCheckingQc(true);
    await handleSaveEdits();
    try {
      const res = await fetch(`/api/assessment/${savedPackage.id}/qc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQcResult(data.result);
        setCurrentStep(4);
      }
    } catch {
      showToast('Gagal menjalankan pemeriksaan kualitas.', 'error');
    } finally {
      setIsCheckingQc(false);
    }
  };

  // Download DOCX
  const handleDownloadDocx = async (exportType: string) => {
    if (!savedPackage) return;
    setIsDownloading(exportType);
    try {
      const res = await fetch(`/api/assessment/${savedPackage.id}/docx/${exportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Gagal mengunduh berkas Word.', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${savedPackage.title}_${exportType}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Dokumen Microsoft Word (.docx) berhasil diunduh.', 'success');
    } catch {
      showToast('Gagal mengunduh dokumen.', 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Wizard Progress Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 1 ? 'bg-blue-600 text-white' : currentStep > 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
              1
            </span>
            <span>Konfigurasi Asesmen</span>
          </button>
          <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 2 ? 'bg-blue-600 text-white' : currentStep > 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
              2
            </span>
            <span>Integrasi PROTA</span>
          </button>
          <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
          <button
            onClick={() => items.length > 0 && setCurrentStep(3)}
            disabled={items.length === 0}
            className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 3 ? 'bg-blue-600 text-white' : currentStep > 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
              3
            </span>
            <span>Editor & Peninjauan Soal</span>
          </button>
          <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
          <button
            onClick={() => savedPackage && setCurrentStep(4)}
            disabled={!savedPackage}
            className={`flex items-center gap-2 ${currentStep === 4 ? 'text-blue-600' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
              4
            </span>
            <span>QC & Ekspor Word</span>
          </button>
        </div>
      </div>

      {/* ================= STEP 1: CONFIGURATION ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Langkah 1: Konfigurasi Jenis Asesmen & Sebaran Soal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pilih jenis asesmen sumatif, alokasi waktu, jumlah butir, dan distribusi kognitif (LOTS/MOTS/HOTS).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['ASAS_1', 'ASAT', 'ASAJ'] as AssessmentType[]).map(t => {
              const spec = ASSESSMENT_CONFIG[t];
              const isSelected = config.assessmentType === t;
              return (
                <div
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-sm">{spec.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Smt {spec.defaultSemester}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">{spec.fullName}</div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Hanya untuk: <strong>Kelas {spec.allowedGrades.join(', ')}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Grade selection (strictly validated) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tingkat Kelas SD *
              </label>
              <select
                value={config.grade}
                onChange={e => setConfig(prev => ({ ...prev, grade: parseInt(e.target.value, 10) }))}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                {ASSESSMENT_CONFIG[config.assessmentType].allowedGrades.map(g => (
                  <option key={g} value={g}>
                    Kelas {g} ({getPhaseByGrade(g)})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Fase otomatis: {config.phase}
              </span>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mata Pelajaran *
              </label>
              <select
                value={config.subject}
                onChange={e => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="Matematika">Matematika</option>
                <option value="IPAS">IPAS (Ilmu Pengetahuan Alam dan Sosial)</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
                <option value="Pendidikan Agama & Budi Pekerti">Pendidikan Agama & Budi Pekerti</option>
                <option value="PJOK">PJOK</option>
                <option value="Seni Rupa">Seni Rupa</option>
              </select>
            </div>

            {/* Time Allocation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alokasi Waktu Pengerjaan (Menit) *
              </label>
              <input
                type="number"
                min={30}
                max={180}
                value={config.timeAllocationMinutes}
                onChange={e => setConfig(prev => ({ ...prev, timeAllocationMinutes: parseInt(e.target.value, 10) || 90 }))}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Question Counts Section */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Komposisi Bentuk Soal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilihan Ganda (PG)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.numMultipleChoice}
                  onChange={e => setConfig(prev => ({ ...prev, numMultipleChoice: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-full p-2 text-base font-bold text-slate-900 rounded-lg border border-slate-300 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Bobot per soal: {config.weightPG} poin</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isian Singkat
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.numShortAnswer}
                  onChange={e => setConfig(prev => ({ ...prev, numShortAnswer: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-full p-2 text-base font-bold text-slate-900 rounded-lg border border-slate-300 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Bobot per soal: {config.weightIsian} poin</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian / Esai
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.numEssay}
                  onChange={e => setConfig(prev => ({ ...prev, numEssay: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-full p-2 text-base font-bold text-slate-900 rounded-lg border border-slate-300 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Bobot per soal: {config.weightEssay} poin</span>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600">
              Total Soal: <strong className="text-blue-600 text-sm font-bold">{totalQuestions} butir</strong>
            </div>
          </div>

          {/* Cognitive Level Percentages (LOTS, MOTS, HOTS) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Proporsi Level Kognitif Berpikir (Wajib Tepat 100%)
              </h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                config.lotsPercentage + config.motsPercentage + config.hotsPercentage === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                Total: {config.lotsPercentage + config.motsPercentage + config.hotsPercentage}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
                  <span>LOTS (C1-C2)</span>
                  <span className="text-blue-700 font-mono">{cognitiveCounts.lots} Butir</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.lotsPercentage}
                  onChange={e => setConfig(prev => ({ ...prev, lotsPercentage: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full p-2 text-sm font-bold text-slate-900 rounded border border-blue-300 font-mono"
                />
                <span className="text-[10px] text-blue-600 mt-1 block">Mengingat & Memahami</span>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900 mb-1">
                  <span>MOTS (C3)</span>
                  <span className="text-teal-700 font-mono">{cognitiveCounts.mots} Butir</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.motsPercentage}
                  onChange={e => setConfig(prev => ({ ...prev, motsPercentage: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full p-2 text-sm font-bold text-slate-900 rounded border border-teal-300 font-mono"
                />
                <span className="text-[10px] text-teal-600 mt-1 block">Menerapkan Konsep</span>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
                  <span>HOTS (C4-C6)</span>
                  <span className="text-purple-700 font-mono">{cognitiveCounts.hots} Butir</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.hotsPercentage}
                  onChange={e => setConfig(prev => ({ ...prev, hotsPercentage: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full p-2 text-sm font-bold text-slate-900 rounded border border-purple-300 font-mono"
                />
                <span className="text-[10px] text-purple-600 mt-1 block">Menganalisis & Mengevaluasi</span>
              </div>
            </div>

            {distributionError && (
              <div className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{distributionError}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (distributionError) {
                  showToast(distributionError, 'error');
                  return;
                }
                setCurrentStep(2);
              }}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
            >
              <span>Lanjut: Integrasi PROTA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PROTA INTEGRATION ================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Langkah 2: Integrasi File PROTA (Elemen, CP, TP, ATP)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Unggah berkas Program Tahunan (DOCX, XLSX, XLS, CSV, PDF) atau gunakan draf standar kurikulum SD.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadStandardTemplate(config.subject, config.grade)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Draf Standar {config.subject}</span>
            </button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-800">
              Pilih atau Tarik Berkas PROTA ke Sini
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung format Microsoft Word (.docx), Excel (.xlsx, .xls), CSV, atau PDF (Maks. 20 MB)
            </p>
            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isUploading ? 'Memproses Berkas...' : 'Pilih Berkas dari Komputer'}</span>
              <input
                type="file"
                accept=".docx,.xlsx,.xls,.csv,.pdf"
                disabled={isUploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Table Preview & TP/ATP Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Tujuan Pembelajaran (TP) Teridentifikasi
                </h3>
                <span className="text-xs text-slate-500">
                  Pilih TP/ATP yang akan diujikan pada asesmen sumatif ini ({selectedRowIds.length} dipilih)
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSelectAllRows}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                {selectedRowIds.length === availableRows.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>Pilih Semua TP</span>
              </button>
            </div>

            {availableRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Belum ada data TP yang terbaca. Silakan unggah file PROTA Anda atau muat template standar di atas.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                      <th className="py-2.5 px-3 w-32">Elemen</th>
                      <th className="py-2.5 px-4">Tujuan Pembelajaran (TP) & Alur (ATP)</th>
                      <th className="py-2.5 px-4 w-40">Materi Pokok</th>
                      <th className="py-2.5 px-3 w-20 text-center">Smt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableRows.map(row => {
                      const isChecked = selectedRowIds.includes(row.id);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => toggleSelectRow(row.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded text-blue-600 pointer-events-none"
                            />
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {row.element}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{row.tp}</div>
                            {row.atp && row.atp !== row.tp && (
                              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                Alur: {row.atp}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {row.material || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                            {row.semester || config.semester}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Konfigurasi</span>
            </button>

            <button
              type="button"
              disabled={isGenerating || selectedRowIds.length === 0}
              onClick={handleGenerateQuestions}
              className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'AI Sedang Menyusun Naskah...' : 'Analisis PROTA & Buat Naskah'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: QUESTION EDITOR ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Editor Naskah Soal & Rubrik Penskoran</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {items.length} Butir Soal
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Periksa stimulus, teks butir soal, opsi A-D, kunci jawaban, dan rubrik analitik sebelum diekspor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveEdits}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Simpan Draf
              </button>
              <button
                type="button"
                disabled={isCheckingQc}
                onClick={handleRunQc}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCheckingQc ? 'Memeriksa...' : 'Lanjut ke Kontrol Kualitas'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                      {item.number}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      Bentuk: {item.type}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.cognitiveLevel === 'LOTS'
                        ? 'bg-blue-100 text-blue-800'
                        : item.cognitiveLevel === 'MOTS'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.cognitiveLevel} ({item.thinkingSkill})
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Bobot: {item.weight} Poin
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveItem(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Geser ke atas"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMoveItem(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Geser ke bawah"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded ml-2"
                      title="Hapus butir soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* PROTA Traceability Metadata */}
                <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong>Elemen:</strong> {item.element}</span>
                  <span><strong>TP:</strong> {item.tp}</span>
                  <span><strong>Indikator:</strong> {item.indicator}</span>
                </div>

                {/* Stimulus (if exists) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Stimulus / Konteks Cerita (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={item.stimulus || ''}
                    onChange={e => handleUpdateItem(idx, { stimulus: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 italic focus:ring-2 focus:ring-blue-500"
                    placeholder="Tuliskan stimulus/bacaan pendukung di sini jika diperlukan..."
                  />
                </div>

                {/* Question Stem */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Teks Pokok Soal (Stem) *
                  </label>
                  <textarea
                    rows={2}
                    value={item.stem}
                    onChange={e => handleUpdateItem(idx, { stem: e.target.value })}
                    className="w-full p-2.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Multiple Choice Options */}
                {item.type === 'PG' && item.options && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Opsi Pilihan Jawaban (Pilih Kunci yang Benar)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.options.map(opt => {
                        const isKey = item.correctKey === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`flex items-center gap-2 p-2 rounded-lg border ${
                              isKey ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, { correctKey: opt.key })}
                              className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                isKey ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {opt.key}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const newOpts = item.options!.map(o =>
                                  o.key === opt.key ? { ...o, text: e.target.value } : o
                                );
                                handleUpdateItem(idx, { options: newOpts });
                              }}
                              className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-900"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Short Answer / Essay Key */}
                {item.type !== 'PG' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Kunci Jawaban Ideal / Acuan Penskoran
                    </label>
                    <input
                      type="text"
                      value={item.correctKey}
                      onChange={e => handleUpdateItem(idx, {
                        correctKey: e.target.value,
                        scoringRubric: { ...item.scoringRubric, idealAnswer: e.target.value },
                      })}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 font-semibold text-slate-900"
                    />
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Pembahasan dan Alasan Kunci
                  </label>
                  <input
                    type="text"
                    value={item.explanation}
                    onChange={e => handleUpdateItem(idx, { explanation: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 text-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke PROTA</span>
            </button>
            <button
              type="button"
              onClick={handleRunQc}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center gap-2"
            >
              <span>Uji Kontrol Kualitas & Ekspor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: QUALITY CONTROL & DOCX EXPORT ================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Langkah 4: Hasil Kontrol Kualitas & Ekspor Microsoft Word (.docx)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Validasi otomatis kepatuhan naskah soal terhadap standar asesmen sumatif SD, diikuti opsi pengunduhan berkas Word asli.
            </p>
          </div>

          {/* QC Status Checklist Banner */}
          {qcResult && (
            <div className={`p-5 rounded-xl border ${
              qcResult.isReady
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/70 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {qcResult.isReady ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                  <div>
                    <h3 className="font-bold text-base">
                      {qcResult.isReady
                        ? 'Status: Lolos Uji Kontrol Kualitas — Siap Diekspor'
                        : 'Status: Terdapat Catatan Pemeriksaan'}
                    </h3>
                    <p className="text-xs opacity-90">
                      {qcResult.passedChecks} dari {qcResult.totalChecks} parameter pemeriksaan kualitas terpenuhi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-3 py-1.5 bg-white text-xs font-bold rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50"
                >
                  Kembali ke Editor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-black/10">
                {qcResult.items.map(check => (
                  <div
                    key={check.code}
                    className="flex items-start gap-2 text-xs bg-white/70 p-2.5 rounded-lg border border-black/5"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{check.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{check.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCX Download Options */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Pilihan Ekspor Dokumen Microsoft Word Asli (.docx)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              File dihasilkan dalam format .docx berstandar resmi A4, Times New Roman 12 pt, kop sekolah, pembatas kop, dan nomor halaman.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Student Exam */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 w-fit mb-2">
                    Untuk Siswa
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Naskah Soal Peserta Didik</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Memuat kop sekolah, identitas siswa, petunjuk pengerjaan, dan soal tanpa menampilkan kunci jawaban.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDownloading !== null}
                  onClick={() => handleDownloadDocx('student')}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading === 'student' ? 'Membuat...' : 'Unduh Naskah Soal'}</span>
                </button>
              </div>

              {/* 2. Teacher Key */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 w-fit mb-2">
                    Khusus Guru
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Kunci Jawaban & Pembahasan</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Memuat tabel kunci jawaban, bobot butir, level kognitif, dan alasan/pembahasan lengkap.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDownloading !== null}
                  onClick={() => handleDownloadDocx('teacher_key')}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading === 'teacher_key' ? 'Membuat...' : 'Unduh Kunci Jawaban'}</span>
                </button>
              </div>

              {/* 3. Kisi-Kisi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 w-fit mb-2">
                    Dokumen Kurikulum
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Kisi-Kisi Penulisan Soal</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Tabel matriks menghubungkan Elemen, CP, TP, ATP, materi, indikator soal, level, dan bentuk soal.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDownloading !== null}
                  onClick={() => handleDownloadDocx('grid')}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading === 'grid' ? 'Membuat...' : 'Unduh Kisi-Kisi'}</span>
                </button>
              </div>

              {/* 4. Rubrik Penskoran */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 w-fit mb-2">
                    Pedoman Penilaian
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Pedoman Penskoran & Rubrik</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rubrik analitik berjenjang untuk soal esai dan kriteria penilaian parsial isian singkat.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDownloading !== null}
                  onClick={() => handleDownloadDocx('rubric')}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading === 'rubric' ? 'Membuat...' : 'Unduh Rubrik'}</span>
                </button>
              </div>

              {/* 5. Complete Package */}
              <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:shadow-md transition-all flex flex-col justify-between sm:col-span-2">
                <div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white w-fit mb-2">
                    Paket Lengkap Asesmen
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Paket Lengkap Seluruh Dokumen</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Mengunduh seluruh dokumen asesmen sumatif resmi untuk kelengkapan administrasi guru dan pengawas sekolah.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDownloading !== null}
                  onClick={() => handleDownloadDocx('complete_package')}
                  className="mt-4 w-full py-2 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading === 'complete_package' ? 'Membuat Paket...' : 'Unduh Paket Lengkap (.docx)'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Editor</span>
            </button>
            <button
              type="button"
              onClick={() => savedPackage && onFinished(savedPackage)}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesai & Lihat Riwayat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
