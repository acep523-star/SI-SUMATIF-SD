import React from 'react';
import { HelpCircle, BookOpen, CheckCircle2, FileSpreadsheet, Award } from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <span>Panduan Penggunaan SI-SUMATIF SD & Standar Asesmen</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Pedoman praktis bagi guru sekolah dasar dalam menyusun naskah asesmen sumatif terstandar sesuai Panduan Pembelajaran dan Asesmen Edisi Revisi 2025.
        </p>
      </div>

      <div className="space-y-4">
        {/* Card 1: 3 Jenis Asesmen */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span>1. Aturan Jenis Asesmen dan Batasan Kelas</span>
          </h2>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong>ASAS 1 (Asesmen Sumatif Akhir Semester 1):</strong> Diperuntukkan bagi seluruh jenjang Kelas 1 sampai 6 di akhir semester ganjil.
            </p>
            <p>
              • <strong>ASAT (Asesmen Sumatif Akhir Tahun):</strong> Diperuntukkan bagi Kelas 1, 2, 3, 4, dan 5 di akhir semester genap sebagai dasar pertimbangan kenaikan kelas. <em>Kelas 6 tidak diizinkan memilih ASAT.</em>
            </p>
            <p>
              • <strong>ASAJ (Asesmen Sumatif Akhir Jenjang):</strong> Khusus dan wajib bagi Kelas 6 di semester 2 sebagai asesmen akhir penentu kelulusan sekolah dasar.
            </p>
          </div>
        </div>

        {/* Card 2: Struktur Tabel PROTA */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>2. Format Tabel Integrasi PROTA</span>
          </h2>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              Aplikasi mendukung format berkas Word (.docx), Excel (.xlsx, .xls), CSV, dan PDF. Sistem secara otomatis mendeteksi kolom:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 bg-slate-50 rounded border text-center font-bold">Elemen</div>
              <div className="p-2 bg-slate-50 rounded border text-center font-bold">Capaian (CP)</div>
              <div className="p-2 bg-slate-50 rounded border text-center font-bold">Tujuan (TP)</div>
              <div className="p-2 bg-slate-50 rounded border text-center font-bold">Alur (ATP)</div>
            </div>
            <p className="text-[11px] text-slate-500">
              Setiap butir soal yang di-generate wajib memiliki keterlacakan langsung ke salah satu TP yang dipilih oleh guru.
            </p>
          </div>
        </div>

        {/* Card 3: Klasifikasi Kognitif */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>3. Taksonomi Proses Berpikir (LOTS, MOTS, HOTS)</span>
          </h2>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong>LOTS (Low Order Thinking Skills):</strong> Mengukur kemampuan C1 (Mengingat konsep dasar) dan C2 (Memahami materi dan menjelaskan dengan bahasa sendiri).
            </p>
            <p>
              • <strong>MOTS (Middle Order Thinking Skills):</strong> Mengukur kemampuan C3 (Menerapkan rumus, prosedur, atau aturan ke dalam situasi kontekstual baru).
            </p>
            <p>
              • <strong>HOTS (High Order Thinking Skills):</strong> Mengukur kemampuan C4 (Menganalisis hubungan sebab-akibat), C5 (Mengevaluasi kasus/data), dan C6 (Mengkreasi/merumuskan solusi).
            </p>
          </div>
        </div>

        {/* Card 4: Dokumen Word */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>4. Standar Ekspor Microsoft Word (.docx)</span>
          </h2>
          <div className="text-xs text-slate-600 leading-relaxed">
            Seluruh berkas yang diunduh merupakan dokumen Microsoft Word asli yang dapat langsung diedit di Microsoft Word dan LibreOffice. Menggunakan ukuran kertas A4, margin standar (kiri 3 cm, atas/bawah/kanan 2.5 cm), font Times New Roman 12 pt, penomoran halaman otomatis, dan garis pembatas kop resmi.
          </div>
        </div>
      </div>
    </div>
  );
};
