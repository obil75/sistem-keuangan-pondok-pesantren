/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  RotateCcw, 
  Download, 
  Upload, 
  Database, 
  ShieldCheck, 
  Save, 
  FileJson, 
  AlertTriangle,
  CheckCircle,
  Users,
  LineChart,
  Settings,
  Bell
} from 'lucide-react';
import { restoreFullFirestoreFromBackup } from '../utils/firebaseSync';
import { Student, DipaCategory, Transaction, NotificationLog } from '../types';
import { formatRupiah } from '../utils/financeHelpers';

interface SistemBackupProps {
  students: Student[];
  dipaCategories: DipaCategory[];
  transactions: Transaction[];
  notificationQueue: NotificationLog[];
  jumlahIuran: number;
  iuranMap: Record<string, number>;
  pengelola1Nama: string;
  pengelola1Jabatan: string;
  pengelola2Nama: string;
  pengelola2Jabatan: string;
  pengelola3Nama: string;
  pengelola3Jabatan: string;
  onUpdateStates: (payload: {
    jumlahIuran?: number;
    iuranMap?: Record<string, number>;
    pengelola1Nama?: string;
    pengelola1Jabatan?: string;
    pengelola2Nama?: string;
    pengelola2Jabatan?: string;
    pengelola3Nama?: string;
    pengelola3Jabatan?: string;
  }) => void;
  onResetDb: () => Promise<void>;
}

export default function SistemBackup({
  students,
  dipaCategories,
  transactions,
  notificationQueue,
  jumlahIuran,
  iuranMap,
  pengelola1Nama,
  pengelola1Jabatan,
  pengelola2Nama,
  pengelola2Jabatan,
  pengelola3Nama,
  pengelola3Jabatan,
  onUpdateStates,
  onResetDb
}: SistemBackupProps) {
  const [restorePointTime, setRestorePointTime] = useState<string>(() => {
    return localStorage.getItem('sikeu_global_restore_time') || '';
  });
  
  const [restorePointMeta, setRestorePointMeta] = useState<any>(() => {
    const saved = localStorage.getItem('sikeu_global_restore_meta');
    return saved ? JSON.parse(saved) : null;
  });

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' });
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const displayFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: '' }), 5000);
  };

  // Automatically record an initial restore point of this EXACT start state if none exists yet!
  useEffect(() => {
    const checkTime = localStorage.getItem('sikeu_global_restore_time');
    if (!checkTime && students.length > 0 && transactions.length > 0) {
      handleCreateRestorePoint(true); // Silent trigger
    }
  }, [students, transactions]);

  // Capture the complete system snapshot
  const handleCreateRestorePoint = (silent = false) => {
    const snapshot = {
      // Configuration settings
      jumlahIuran,
      iuranMap,
      pengelola1Nama,
      pengelola1Jabatan,
      pengelola2Nama,
      pengelola2Jabatan,
      pengelola3Nama,
      pengelola3Jabatan,
      // Entire database data
      students,
      dipaCategories,
      transactions,
      notificationQueue
    };

    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';

    const meta = {
      studentCount: students.length,
      txCount: transactions.length,
      dipaCount: dipaCategories.length,
      standardIuran: jumlahIuran
    };

    try {
      localStorage.setItem('sikeu_global_restore_data', JSON.stringify(snapshot));
      localStorage.setItem('sikeu_global_restore_time', formattedDate);
      localStorage.setItem('sikeu_global_restore_meta', JSON.stringify(meta));
      
      setRestorePointTime(formattedDate);
      setRestorePointMeta(meta);

      if (!silent) {
        displayFeedback('Restore Point Sistem berhasil diciptakan di titik ini!', 'success');
      }
    } catch (e) {
      console.error(e);
      if (!silent) {
        displayFeedback('Gagal menyimpan restore point ke memori lokal browser (kuota penuh).', 'error');
      }
    }
  };

  // Apply restore point
  const handleApplyRestorePoint = async () => {
    const savedData = localStorage.getItem('sikeu_global_restore_data');
    if (!savedData) return;

    const confirmRollback = window.confirm(
      'PERINGATAN: Apakah Anda yakin ingin mengembalikan seluruh aplikasi ke restore point?\nTindakan ini akan menimpa seluruh data santri, transaksi keuangan, anggaran DIPA, serta pengaturan referensi di database cloud dan menggantikannya dengan keadaan saat point dibuat.'
    );
    if (!confirmRollback) return;

    try {
      setIsRestoring(true);
      setLoadingMsg('Membaca data titik pemulihan...');
      const snapshot = JSON.parse(savedData);

      // Restore configuration variables
      onUpdateStates({
        jumlahIuran: snapshot.jumlahIuran,
        iuranMap: snapshot.iuranMap || {},
        pengelola1Nama: snapshot.pengelola1Nama,
        pengelola1Jabatan: snapshot.pengelola1Jabatan,
        pengelola2Nama: snapshot.pengelola2Nama || '',
        pengelola2Jabatan: snapshot.pengelola2Jabatan || '',
        pengelola3Nama: snapshot.pengelola3Nama || '',
        pengelola3Jabatan: snapshot.pengelola3Jabatan || '',
      });

      // Synchronize in Firestore
      await restoreFullFirestoreFromBackup(
        snapshot.students || [],
        snapshot.dipaCategories || [],
        snapshot.transactions || [],
        snapshot.notificationQueue || [],
        (msg) => setLoadingMsg(msg)
      );

      setIsRestoring(false);
      displayFeedback('Seluruh sistem & pangkalan data berhasil dipulihkan ke restore point!', 'success');
    } catch (error) {
      console.error(error);
      setIsRestoring(false);
      displayFeedback('Gagal memulihkan sistem: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  };

  // Export full JSON Backup file
  const handleExportBackup = () => {
    const dataToExport = {
      appId: 'sikeu-pesantren-v1',
      exportedAt: new Date().toISOString(),
      config: {
        jumlahIuran,
        iuranMap,
        pengelola1Nama,
        pengelola1Jabatan,
        pengelola2Nama,
        pengelola2Jabatan,
        pengelola3Nama,
        pengelola3Jabatan,
      },
      data: {
        students,
        dipaCategories,
        transactions,
        notificationQueue
      }
    };

    try {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SIKEU_Backup_Total_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      displayFeedback('File backup lengkap sistem berhasil diunduh!', 'success');
    } catch (e) {
      displayFeedback('Ekspor file gagal.', 'error');
    }
  };

  // Import JSON Backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmImport = window.confirm(
      'Apakah Anda benar-benar yakin ingin memuat file backup ini?\nSeluruh data dan konfigurasi lama Anda di cloud akan ditulis ulang dengan data dari file cadangan ini. Proses ini tidak dapat dibatalkan.'
    );
    if (!confirmImport) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Validation check
        if (
          parsed.config?.jumlahIuran !== undefined &&
          parsed.data?.students !== undefined &&
          parsed.data?.transactions !== undefined
        ) {
          setIsRestoring(true);
          setLoadingMsg('Membaca file cadangan JSON...');

          // 1. Restore local state configs
          onUpdateStates({
            jumlahIuran: parsed.config.jumlahIuran,
            iuranMap: parsed.config.iuranMap || {},
            pengelola1Nama: parsed.config.pengelola1Nama,
            pengelola1Jabatan: parsed.config.pengelola1Jabatan,
            pengelola2Nama: parsed.config.pengelola2Nama || '',
            pengelola2Jabatan: parsed.config.pengelola2Jabatan || '',
            pengelola3Nama: parsed.config.pengelola3Nama || '',
            pengelola3Jabatan: parsed.config.pengelola3Jabatan || '',
          });

          // 2. Synchronize Firestore
          await restoreFullFirestoreFromBackup(
            parsed.data.students,
            parsed.data.dipaCategories || [],
            parsed.data.transactions,
            parsed.data.notificationQueue || [],
            (msg) => setLoadingMsg(msg)
          );

          // 3. Mark a new active Restore Point for safety
          const now = new Date();
          const formattedDate = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';

          const meta = {
            studentCount: parsed.data.students.length,
            txCount: parsed.data.transactions.length,
            dipaCount: (parsed.data.dipaCategories || []).length,
            standardIuran: parsed.config.jumlahIuran
          };

          const snapshot = {
            ...parsed.config,
            ...parsed.data
          };

          localStorage.setItem('sikeu_global_restore_data', JSON.stringify(snapshot));
          localStorage.setItem('sikeu_global_restore_time', formattedDate);
          localStorage.setItem('sikeu_global_restore_meta', JSON.stringify(meta));
          
          setRestorePointTime(formattedDate);
          setRestorePointMeta(meta);

          setIsRestoring(false);
          displayFeedback('File cadangan total sistem berhasil diimpor & disinkronasikan!', 'success');
        } else {
          setIsRestoring(false);
          displayFeedback('Format berkas cadangan JSON tidak didukung atau tidak lengkap.', 'error');
        }
      } catch (err) {
        console.error(err);
        setIsRestoring(false);
        displayFeedback('Gagal membaca atau memisahkan isi berkas JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (isRestoring) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-[#3D3D3D]">
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E1DA] shadow-lg max-w-sm w-full text-center space-y-6">
          <Database className="w-12 h-12 text-[#2E6B3E] animate-bounce mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-serif font-bold text-[#2C2C24]">Sinkronisasi Pemulihan...</h3>
            <p className="text-xs text-[#7A7A6A] leading-relaxed">
              Sistem sedang memproses transmutasi pangkalan data cloud. Jangan menutup halaman atau mematikan koneksi internet Anda.
            </p>
          </div>
          <div className="py-2.5 px-4 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-[10px] font-mono font-bold text-[#2E6B3E]">
            {loadingMsg || 'Menghubungkan ke Firestore...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EBE7DF] text-[#3D3D3D] p-6 rounded-3xl shadow-xs border border-[#D9D3C7]">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24] flex items-center gap-2.5">
            <RotateCcw className="w-5.5 h-5.5 text-[#5A5A40]" />
            Pengaturan Sistem & Pemulihan Cadangan
          </h1>
          <p className="text-[#7A7A6A] text-xs mt-0.5">
            Kelola backup total, restore point terintegrasi, dan keamanan sinkronisasi database Pondok Pesantren Anda dalam satu panel instan.
          </p>
        </div>
      </div>

      {feedback.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm border ${
            feedback.type === 'success' 
              ? 'bg-[#EBF7EE] border-[#B7E1C3] text-[#2E6B3E]' 
              : feedback.type === 'error'
              ? 'bg-[#FDF2F2] border-[#F2C0C0] text-[#A63A3A]'
              : 'bg-[#F1F3F9] border-[#D1D9E7] text-[#3A5FA6]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle main area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Restore Point System */}
          <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm space-y-6">
            <div className="border-b border-[#F0EFEA] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#2C2C24] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2E6B3E]" />
                Titik Pemulihan Sistem (Integrated Restore Point)
              </h3>
              <p className="text-[11px] text-[#7A7A6A] mt-0.5">
                Ambil snapshot komprehensif dari seluruh data pesantren dan pengaturan untuk mempermudah kembalinya sistem jika terjadi kesalahan input di kemudian hari.
              </p>
            </div>

            {/* Status Information Box */}
            <div className="bg-[#F7F5F0] rounded-2xl border border-[#D9D3C7]/70 p-5 space-y-4">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#7A7A6A] block">
                Status Pemulihan Tersimpan Saat Ini
              </span>

              {restorePointTime ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#7A7A6A] block">Waktu Pengambilan Snapshot:</span>
                    <span className="font-bold text-xs text-[#2E6B3E] flex items-center gap-1.5 leading-snug">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      {restorePointTime}
                    </span>
                  </div>
                  
                  {restorePointMeta && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-[#D9D3C7]/40">
                      <div>
                        <span className="text-[#7A7A6A] block text-[9px]">Data Santri:</span>
                        <strong className="text-[#3D3D3D] font-mono">{restorePointMeta.studentCount} Santri</strong>
                      </div>
                      <div>
                        <span className="text-[#7A7A6A] block text-[9px]">Arus Jurnal Kas:</span>
                        <strong className="text-[#3D3D3D] font-mono">{restorePointMeta.txCount} Transaksi</strong>
                      </div>
                      <div>
                        <span className="text-[#7A7A6A] block text-[9px]">Anggaran DIPA:</span>
                        <strong className="text-[#3D3D3D] font-mono">{restorePointMeta.dipaCount} Kategori</strong>
                      </div>
                      <div>
                        <span className="text-[#7A7A6A] block text-[9px]">Tarif SPP:</span>
                        <strong className="text-[#3D3D3D] font-mono">{formatRupiah(restorePointMeta.standardIuran)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 border border-dashed border-[#D9D3C7] rounded-xl text-center">
                  <span className="text-xs text-orange-600 block italic font-bold">Belum ada Titik Pemulihan Tersimpan.</span>
                  <span className="text-[10px] text-[#7A7A6A] block mt-1">Sistem akan secara otomatis menyarankan snapshot awal setelah database terhubung penuh.</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleCreateRestorePoint(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#5A5A40] hover:bg-[#4A4A34] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Buat Restore Point Baru
              </button>

              {restorePointTime && (
                <button
                  type="button"
                  onClick={handleApplyRestorePoint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#2E6B3E]/10 hover:bg-[#2E6B3E]/20 border border-[#2E6B3E]/30 text-[#2E6B3E] text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#2E6B3E]" />
                  Kembalikan Aplikasi ke Restore Point
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Portability JSON file backup */}
          <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm space-y-6">
            <div className="border-b border-[#F0EFEA] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#2C2C24] flex items-center gap-2">
                <FileJson className="w-5 h-5 text-[#5A5A40]" />
                Pencadangan Berkas Mandiri (JSON Portability Backup)
              </h3>
              <p className="text-[11px] text-[#7A7A6A] mt-0.5">
                Unduh seluruh data dan variabel penataan ke dalam file JSON lokal di komputer Anda, atau unggah file tersebut untuk memulihkan keadaan kapan saja.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Export layout */}
              <div className="border border-[#D9D3C7]/65 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3D3D3D] block">Unduh Cadangan Lengkap (.json)</span>
                  <span className="text-[10px] text-[#7A7A6A] block leading-relaxed">
                    Menyimpan data santri ({students.length}), pagu anggaran DIPA ({dipaCategories.length}), entri kas ({transactions.length}), serta nama bendahara penandatangan ke file terenkripsi.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#EBE7DF] hover:bg-[#DED9CE] border border-[#D9D3C7] text-[#3D3D3D] text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor File JSON
                </button>
              </div>

              {/* Import layout */}
              <div className="border border-[#D9D3C7]/65 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3D3D3D] block">Unggah & Terapkan Cadangan</span>
                  <span className="text-[10px] text-[#7A7A6A] block leading-relaxed">
                    Pilih file `.json` cadangan dari komputer Anda untuk memulihkan seluruh keadaan sistem secara instan di browser dan database cloud Firestore.
                  </span>
                </div>
                <label className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#EBE7DF] hover:bg-[#DED9CE] border border-[#D9D3C7] text-[#3D3D3D] text-xs font-bold rounded-xl transition cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5" />
                  Pilih File & Impor
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

        </div>

        {/* Sidebar Info & stats panel */}
        <div className="space-y-6">
          
          {/* Metadata summary */}
          <div className="bg-[#EBE7DF]/30 p-5 rounded-[28px] border border-[#D9D3C7] space-y-4">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#7A7A6A] block border-b border-[#D9D3C7]/60 pb-2">
              Statistik Konsistensi Database
            </span>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-[#5A5A40]">
                  <Users className="w-3.5 h-3.5" />
                  Data Santri Aktif
                </span>
                <span className="font-mono font-bold">{students.length} record</span>
              </div>
              
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-[#5A5A40]">
                  <LineChart className="w-3.5 h-3.5" />
                  Buku Arus Jurnal Kas
                </span>
                <span className="font-mono font-bold">{transactions.length} baris</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-[#5A5A40]">
                  <Settings className="w-3.5 h-3.5" />
                  Pagu Anggaran DIPA
                </span>
                <span className="font-mono font-bold">{dipaCategories.length} kategori</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-[#5A5A40]">
                  <Bell className="w-3.5 h-3.5" />
                  Data Log Notifikasi
                </span>
                <span className="font-mono font-bold">{notificationQueue.length} baris</span>
              </div>
            </div>

            <p className="text-[10px] text-[#7A7A6A] leading-relaxed pt-2 border-t border-[#D9D3C7]/60">
              ℹ️ Sistem ini menggunakan real-time listeners Google Firebase Firestore, di mana seluruh perubahan data yang diimpor atau dipulihkan di atas akan disinkronisasikan secara real-time ke database seluruh pengurus aktif lainnya.
            </p>
          </div>

          {/* Advanced Danger area */}
          <div className="p-5 border border-red-200 bg-red-50/40 rounded-[28px] space-y-3.5 text-xs">
            <span className="font-bold text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Area Kendali Lanjutan
            </span>
            <p className="text-[11px] text-[#7A7A6A] leading-relaxed">
              Jika Anda merasa data uji coba terlalu tercampur atau ingin memulai kembali keuangan Pesantren dari keadaan murni awal pabrik, Anda dapat melakukan format ulang penuh.
            </p>
            <button
              onClick={onResetDb}
              className="w-full py-2 bg-white text-xs font-bold text-red-600 hover:text-white border border-red-300 hover:bg-red-600 hover:border-red-600 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Format Ulang Database Cloud
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
