/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Check, Award, DollarSign } from 'lucide-react';
import { formatRupiah } from '../utils/financeHelpers';

interface ReferensiProps {
  jumlahIuran: number;
  iuranMap: Record<string, number>;
  pengelola1Nama: string;
  pengelola1Jabatan: string;
  pengelola2Nama: string;
  pengelola2Jabatan: string;
  pengelola3Nama: string;
  pengelola3Jabatan: string;
  onSave: (params: {
    jumlahIuran: number;
    iuranMap: Record<string, number>;
    pengelola1Nama: string;
    pengelola1Jabatan: string;
    pengelola2Nama: string;
    pengelola2Jabatan: string;
    pengelola3Nama: string;
    pengelola3Jabatan: string;
  }) => void;
}

export default function Referensi({
  jumlahIuran,
  iuranMap,
  pengelola1Nama,
  pengelola1Jabatan,
  pengelola2Nama,
  pengelola2Jabatan,
  pengelola3Nama,
  pengelola3Jabatan,
  onSave
}: ReferensiProps) {
  // Local state for edit forms
  const [localIuran, setLocalIuran] = useState<number>(jumlahIuran);
  const [localIuranMap, setLocalIuranMap] = useState<Record<string, number>>(() => {
    const base = { ...iuranMap };
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
    months.forEach((m) => {
      if (base[m] === undefined) {
        base[m] = jumlahIuran;
      }
    });
    return base;
  });
  const [localNama1, setLocalNama1] = useState<string>(pengelola1Nama);
  const [localJabatan1, setLocalJabatan1] = useState<string>(pengelola1Jabatan);
  const [localNama2, setLocalNama2] = useState<string>(pengelola2Nama);
  const [localJabatan2, setLocalJabatan2] = useState<string>(pengelola2Jabatan);
  const [localNama3, setLocalNama3] = useState<string>(pengelola3Nama);
  const [localJabatan3, setLocalJabatan3] = useState<string>(pengelola3Jabatan);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const MONTHS_OF_YEAR = [
    { key: '2026-01', name: 'Januari 2026' },
    { key: '2026-02', name: 'Februari 2026' },
    { key: '2026-03', name: 'Maret 2026' },
    { key: '2026-04', name: 'April 2026' },
    { key: '2026-05', name: 'Mei 2026' },
    { key: '2026-06', name: 'Juni 2026' },
    { key: '2026-07', name: 'Juli 2026' },
    { key: '2026-08', name: 'Agustus 2026' },
    { key: '2026-09', name: 'September 2026' },
    { key: '2026-10', name: 'Oktober 2026' },
    { key: '2026-11', name: 'November 2026' },
    { key: '2026-12', name: 'Desember 2026' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      jumlahIuran: localIuran,
      iuranMap: localIuranMap,
      pengelola1Nama: localNama1,
      pengelola1Jabatan: localJabatan1,
      pengelola2Nama: localNama2,
      pengelola2Jabatan: localJabatan2,
      pengelola3Nama: localNama3,
      pengelola3Jabatan: localJabatan3,
    });

    // Show temporary feedback success message
    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header segment with background decoration */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EBE7DF] text-[#3D3D3D] p-6 rounded-3xl shadow-xs border border-[#D9D3C7]">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#5A5A40]" />
            Referensi & Konfigurasi Dasar
          </h1>
          <p className="text-[#7A7A6A] text-xs mt-0.5">
            Kelola parameter sistem keuangan kustom seperti besaran iuran santri bulanan dan identitas pengelola/bendahara penandatangan laporan akuntansi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Entry Form */}
        <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section A: Global Tuition Rate */}
            <div className="space-y-4">
              <div className="border-b border-[#F0EFEA] pb-2">
                <h3 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-2">
                  1. Nilai Tarif Iuran Santri (SPP)
                </h3>
                <p className="text-[10px] text-[#7A7A6A] mt-0.5">
                  Besaran tarif tunggal iuran bulanan untuk setiap santri aktif pondok pesantren.
                </p>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="font-bold text-xs text-[#3D3D3D] block">Jumlah Iuran Bulanan Standar (Rupiah) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-xs text-[#7A7A6A] font-mono">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Contoh: 750000"
                    value={localIuran || ''}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, '');
                      setLocalIuran(cleanVal ? parseInt(cleanVal, 10) : 0);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-mono font-bold focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                  />
                </div>
                <p className="text-[10px] text-[#7A7A6A] italic">
                  Format Berjalan: <strong className="text-[#2E6B3E] font-mono">{formatRupiah(localIuran)}</strong> per bulan
                </p>

                {/* Monthly configuration grid of year 2026 */}
                <div className="bg-[#5A5A40]/10 p-4 rounded-2xl border border-[#5A5A40]/20 space-y-3 mt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-[#5A5A40] flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-[#5A5A40]" />
                        Penyesuaian Tarif Kustom Per Bulan
                      </h4>
                      <p className="text-[10px] text-[#7A7A6A] mt-0.5">
                        Sistem mendukung perubahan tarif kustom yang berbeda sewaktu-waktu. Ubah nominal di bawah ini untuk periode bulan tertentu:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...localIuranMap };
                        Object.keys(updated).forEach((k) => {
                          updated[k] = localIuran;
                        });
                        setLocalIuranMap(updated);
                      }}
                      className="shrink-0 px-2.5 py-1 text-[10px] font-bold bg-[#EBE7DF] hover:bg-[#D9D3C7] text-[#5A5A40] rounded-lg transition cursor-pointer"
                    >
                      Reset Semua ke {formatRupiah(localIuran)}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    {MONTHS_OF_YEAR.map((m) => {
                      const price = localIuranMap[m.key] !== undefined ? localIuranMap[m.key] : localIuran;
                      return (
                        <div key={m.key} className="bg-white p-2.5 rounded-xl border border-[#D9D3C7]/85 space-y-1">
                          <span className="font-semibold text-[10px] text-[#5A5A40] block">{m.name}</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-[10px] font-bold text-[#7A7A6A] font-mono">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              required
                              value={price || ''}
                              onChange={(e) => {
                                const cleanVal = e.target.value.replace(/\D/g, '');
                                const numVal = cleanVal ? parseInt(cleanVal, 10) : 0;
                                setLocalIuranMap((prev) => ({
                                  ...prev,
                                  [m.key]: numVal,
                                }));
                              }}
                              className="w-full pl-6 pr-2 py-1 bg-[#F7F5F0] border border-[#D9D3C7]/60 rounded-lg text-[10px] text-[#3D3D3D] font-mono font-bold focus:outline-none focus:border-[#5A5A40] transition"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Report Signatory Identity */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-[#F0EFEA] pb-2">
                <h3 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-2">
                  2. Identitas Pengelola & Penanggung Jawab
                </h3>
                <p className="text-[10px] text-[#7A7A6A] mt-0.5">
                  Pejabat penandatangan berkas yang dicantumkan sebagai pengelola di laporan operasional, tanda terima iuran, dan laporan audit bulanan (3 Tingkat Pengelola).
                </p>
              </div>

              {/* Combined Pengelola / Penanggung Jawab Form Table */}
              <div className="bg-[#F7F5F0]/50 rounded-2xl border border-[#D9D3C7]/60 overflow-hidden">
                <div className="bg-[#EBE7DF]/80 px-4 py-3 border-b border-[#D9D3C7] font-bold text-xs text-[#5A5A40] uppercase tracking-wider">
                  Pengelola / Penanggung Jawab
                </div>
                <div className="p-4 space-y-4">
                  {/* Table Headers inside desktop screen size */}
                  <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-[#D9D3C7]/60 text-xs font-bold text-[#5A5A40]">
                    <div className="col-span-1 text-center">No</div>
                    <div className="col-span-6">Nama Lengkap Pengelola *</div>
                    <div className="col-span-5">Jabatan Pengelola *</div>
                  </div>

                  <div className="space-y-4 md:space-y-3">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-1 text-xs font-bold text-[#5A5A40] md:text-center flex items-center md:justify-center gap-1">
                        <span className="md:hidden">Pengelola</span> 1.
                      </div>
                      <div className="md:col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Ust. Arsyad Hambali"
                          value={localNama1}
                          onChange={(e) => setLocalNama1(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Bendahara Utama"
                          value={localJabatan1}
                          onChange={(e) => setLocalJabatan1(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-3 md:pt-0 border-t md:border-t-0 border-[#D9D3C7]/45">
                      <div className="md:col-span-1 text-xs font-bold text-[#5A5A40] md:text-center flex items-center md:justify-center gap-1">
                        <span className="md:hidden">Pengelola</span> 2.
                      </div>
                      <div className="md:col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Ust. Ahmad Syihabuddin, Lc."
                          value={localNama2}
                          onChange={(e) => setLocalNama2(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Dewan Pengawas Pesantren"
                          value={localJabatan2}
                          onChange={(e) => setLocalJabatan2(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-3 md:pt-0 border-t md:border-t-0 border-[#D9D3C7]/45">
                      <div className="md:col-span-1 text-xs font-bold text-[#5A5A40] md:text-center flex items-center md:justify-center gap-1">
                        <span className="md:hidden">Pengelola</span> 3.
                      </div>
                      <div className="md:col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Hj. Fatimah Azzahra, S.E."
                          value={localNama3}
                          onChange={(e) => setLocalNama3(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Kepala Bagian Keuangan"
                          value={localJabatan3}
                          onChange={(e) => setLocalJabatan3(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Buttons & Feedback notification banner */}
            <div className="flex items-center justify-between pt-4 border-t border-[#F0EFEA] gap-4">
              <div className="flex-1">
                {showSavedFeedback && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-3 py-2 bg-[#E3EFE5] border border-[#C3DFC8] text-[#2E6B3E] rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-[#2E6B3E] shrink-0" />
                    Referensi sistem keuangan berhasil disimpan ke penyimpanan lokal!
                  </motion.div>
                )}
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Parameter
              </button>
            </div>

          </form>
        </div>

        {/* Info & Helper Sidebar Panel */}
        <div className="space-y-4">
          <div className="bg-[#EBE7DF]/30 p-5 rounded-[28px] border border-[#D9D3C7] space-y-4 text-xs leading-relaxed text-[#3D3D3D]">
            <h4 className="font-bold text-[#5A5A40] text-xs font-serif uppercase tracking-wider">Penerapan Parameter</h4>
            
            <p>
              Dengan merubah nilai di halaman referensi ini, sistem secara otomatis akan merekonfigurasi:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#5A5A40] pl-1 font-bold">
              <li>Pecahan total tagihan SPP bulanan</li>
              <li>Akumulasi tunggakan seluruh bulan berjalan</li>
              <li>Limit nominal default di form Buku Penerimaan Kas</li>
              <li>Identitas tanda tangan di berkas Laporan Akuntansi</li>
            </ul>
            <p className="text-[11px] text-[#7A7A6A]">
              Nilai yang disimpan bersifat statis per browser pengurus pesantren ini dan akan selalu diprioritaskan saat memproses rekapitulasi data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
