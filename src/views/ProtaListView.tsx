import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import {
  FileSpreadsheet,
  Trash2,
  Eye,
  Upload,
  PlusCircle,
  FileCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { ProtaDocument } from '../types/index.ts';

interface ProtaListViewProps {
  onStartGeneratorWithProta: (doc: ProtaDocument) => void;
}

export const ProtaListView: React.FC<ProtaListViewProps> = ({ onStartGeneratorWithProta }) => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<ProtaDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDoc, setSelectedDoc] = useState<ProtaDocument | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/prota', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      showToast('Gagal memuat daftar berkas PROTA.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus berkas PROTA "${name}"?`)) return;

    try {
      const res = await fetch(`/api/prota/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (selectedDoc?.id === id) setSelectedDoc(null);
        showToast('Berkas PROTA berhasil dihapus.', 'success');
      }
    } catch {
      showToast('Gagal menghapus berkas.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <span>Manajemen Berkas Program Tahunan (PROTA)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar tabel integrasi Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP) yang telah diunggah.
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Berkas PROTA</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Berkas PROTA akan otomatis tersimpan ketika Anda mengunggah file pada menu Buat Naskah Sumatif.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedDoc?.id === doc.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    {doc.fileFormat}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id, doc.filename);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Hapus berkas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-bold text-sm text-slate-900 truncate">
                  {doc.filename}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{doc.totalRows} Baris TP/ATP Terekstraksi</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Diupload: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedDoc.filename}</h3>
                    <p className="text-xs text-slate-500">
                      Total {selectedDoc.totalRows} Tujuan Pembelajaran siap digunakan
                    </p>
                  </div>
                  <button
                    onClick={() => onStartGeneratorWithProta(selectedDoc)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Susun Naskah dari PROTA Ini</span>
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Elemen</th>
                        <th className="p-2.5">Tujuan Pembelajaran (TP)</th>
                        <th className="p-2.5">Materi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDoc.extractedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900 align-top">{r.element}</td>
                          <td className="p-2.5 align-top">
                            <div className="text-slate-800">{r.tp}</div>
                            {r.atp && r.atp !== r.tp && (
                              <div className="text-[10px] text-slate-400 mt-0.5">Alur: {r.atp}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 align-top">{r.material || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500">
                Pilih salah satu berkas PROTA di samping untuk melihat rincian tabel ekstraksi.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
