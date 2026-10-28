import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, ShieldCheck, CheckCircle2, Calendar } from 'lucide-react';
import { AppRegulation } from '../types/index.ts';

export const RegulationsView: React.FC = () => {
  const [regulations, setRegulations] = useState<AppRegulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/regulations')
      .then(res => res.json())
      .then(data => setRegulations(data.regulations || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span>Rujukan Regulasi & Panduan Asesmen Resmi SD</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Dokumen hukum, standar penilaian, dan Capaian Pembelajaran resmi pemerintah Republik Indonesia yang mendasari sistem asesmen sumatif SD.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regulations.map(reg => (
          <div
            key={reg.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-blue-100 text-blue-800">
                  {reg.code}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Terverifikasi Resmi
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {reg.name}
              </h2>
              <div className="text-xs text-slate-500 mt-1">
                Penerbit: <strong>{reg.publisher}</strong> ({reg.year})
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {reg.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Diperiksa: {reg.lastCheckedDate}
              </span>
              <a
                href={reg.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Dokumen Resmi</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
