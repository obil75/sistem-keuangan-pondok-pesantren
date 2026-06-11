/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Edit3, 
  DollarSign, 
  PieChart, 
  Coins, 
  Database,
  ArrowRightCircle,
  HelpCircle,
  Trash
} from 'lucide-react';
import { DipaCategory } from '../types';
import { formatRupiah } from '../utils/financeHelpers';

interface DipaManagementProps {
  dipaCategories: DipaCategory[];
  onUpdateDipa: (updated: DipaCategory[]) => void;
}

export default function DipaManagement({ dipaCategories, onUpdateDipa }: DipaManagementProps) {
  // Modal states
  const [editingCategory, setEditingCategory] = useState<DipaCategory | null>(null);
  const [isAddingDipa, setIsAddingDipa] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    allocatedAmount: 0
  });

  // Calculate high-level total DIPA properties
  const totals = useMemo(() => {
    let totalAlloc = 0;
    let totalRealized = 0;
    dipaCategories.forEach(cat => {
      totalAlloc += cat.allocatedAmount;
      totalRealized += cat.realizedAmount;
    });
    return {
      totalAlloc,
      totalRealized,
      remaining: totalAlloc - totalRealized,
      usagePct: totalAlloc > 0 ? (totalRealized / totalAlloc) * 100 : 0
    };
  }, [dipaCategories]);

  // Handle open editor
  const handleOpenEdit = (cat: DipaCategory) => {
    setEditingCategory(cat);
    setFormData({
      code: cat.code,
      name: cat.name,
      allocatedAmount: cat.allocatedAmount
    });
    setIsAddingDipa(false);
  };

  // Handle open creator
  const handleOpenCreate = () => {
    setFormData({
      code: '',
      name: '',
      allocatedAmount: 100000000
    });
    setEditingCategory(null);
    setIsAddingDipa(true);
  };

  // Save DIPA (Create / Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Harap masukkan Kode Akun dan Nama Belanja DIPA!');
      return;
    }

    if (isAddingDipa) {
      // Validate code unique
      if (dipaCategories.some(d => d.code === formData.code.trim())) {
        alert('Kode Akun DIPA tersebut sudah terdaftar!');
        return;
      }
      const newDipa: DipaCategory = {
        id: `dipa-${Date.now()}`,
        code: formData.code.trim(),
        name: formData.name.trim(),
        allocatedAmount: Number(formData.allocatedAmount) || 0,
        realizedAmount: 0
      };
      onUpdateDipa([...dipaCategories, newDipa]);
      setIsAddingDipa(false);
    } else if (editingCategory) {
      const updated = dipaCategories.map(d => {
        if (d.id === editingCategory.id) {
          return {
            ...d,
            code: formData.code.trim(),
            name: formData.name.trim(),
            allocatedAmount: Number(formData.allocatedAmount) || 0
          };
        }
        return d;
      });
      onUpdateDipa(updated);
      setEditingCategory(null);
    }
  };

  // Delete category with confirmation (only if realization is zero or user confirms)
  const handleDelete = (id: string) => {
    const category = dipaCategories.find(c => c.id === id);
    if (!category) return;

    if (category.realizedAmount > 0) {
      if (!window.confirm(`DIPA ini memiliki realisasi Rp ${category.realizedAmount.toLocaleString()}. Menghapus kategori ini akan menyebabkan ketimpangan laporan belanja. Apakah Anda tetap ingin menghapus?`)) {
        return;
      }
    } else {
      if (!window.confirm('Yakin ingin menghapus sub-bagian alokasi belanja DIPA ini?')) {
        return;
      }
    }

    onUpdateDipa(dipaCategories.filter(c => c.id !== id));
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Alokasi & Bagan Akun Belanja DIPA</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Pantau dan sesuaikan pagu anggaran berdasarkan format Daftar Isian Pelaksanaan Anggaran (DIPA).</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrasi Sub-DIPA Baru
        </button>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-[#E5E1DA] shadow-xs rounded-[24px] flex items-center gap-4">
          <div className="p-3 bg-[#EBE7DF] text-[#5A5A40] rounded-2xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7A6A] uppercase font-bold tracking-wider">Total Pagu DIPA</span>
            <h4 className="text-md font-serif font-bold text-[#2C2C24] mt-0.5">{formatRupiah(totals.totalAlloc)}</h4>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E5E1DA] shadow-xs rounded-[24px] flex items-center gap-4">
          <div className="p-3 bg-[#FDF4EF] text-[#A66E4E] rounded-2xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7A6A] uppercase font-bold tracking-wider">Total Realisasi Belanja</span>
            <h4 className="text-md font-serif font-bold text-[#2C2C24] mt-0.5">{formatRupiah(totals.totalRealized)}</h4>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E5E1DA] shadow-xs rounded-[24px] flex items-center gap-4">
          <div className="p-3 bg-[#EBE7DF] text-[#5A5A40] rounded-2xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7A6A] uppercase font-bold tracking-wider">Sisa Kuota Anggaran</span>
            <h4 className="text-md font-serif font-bold text-[#5A5A40] mt-0.5">{formatRupiah(totals.remaining)}</h4>
          </div>
        </div>
      </div>

      {/* Overall Budget Usage Status Alert */}
      <div className="bg-[#EBE7DF]/30 border border-[#D9D3C7] p-5 rounded-[24px] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <span className="text-[10px] font-bold text-[#5A5A40] bg-[#EBE7DF] border border-[#D9D3C7] px-2.5 py-0.5 rounded-md">STATUS ANGGARAN</span>
          <h4 className="font-bold text-xs mt-1.5 text-[#2C2C24]">Perbandingan Kumulatif Rencana vs Pengeluaran Riil</h4>
          <p className="text-[11px] text-[#7A7A6A] mt-0.5">Penyerapan belanja lembaga saat ini berada di rasio optimal.</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-[#3D3D3D]">
            <span>Rasio Penyerapan</span>
            <span className="font-mono font-bold">{Math.round(totals.usagePct)}%</span>
          </div>
          <div className="relative w-full h-3 bg-white border border-[#D9D3C7] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5A5A40] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(totals.usagePct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* DIPA Categories list accounts board */}
      <div className="bg-white rounded-[24px] border border-[#E5E1DA] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#F0EFEA] flex justify-between items-center bg-[#EBE7DF]/10">
          <h3 className="text-sm font-bold text-[#2C2C24] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5A5A40]" />
            Daftar Alokasi Rekor Belanja DIPA
          </h3>
          <span className="text-xs text-[#7A7A6A]">Total Bagan Akun: <strong>{dipaCategories.length}</strong></span>
        </div>

        <div className="divide-y divide-[#F0EFEA]">
          {dipaCategories.map((cat) => {
            const realizationRatio = cat.allocatedAmount > 0 ? (cat.realizedAmount / cat.allocatedAmount) * 100 : 0;
            const remainingBudget = cat.allocatedAmount - cat.realizedAmount;
            
            // Color mapping based on absorption
            let badgeColor = 'bg-[#E3EFE5] text-[#2E6B3E] border-[#C3DFC8]';
            let barColor = 'bg-[#5A5A40]';
            if (realizationRatio > 95) {
              badgeColor = 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]';
              barColor = 'bg-[#A66E4E]';
            } else if (realizationRatio > 80) {
              badgeColor = 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]';
              barColor = 'bg-[#8A8A6A]';
            }

            return (
              <div key={cat.id} className="p-5 hover:bg-[#F7F5F0]/50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                {/* Info and Code */}
                <div className="space-y-1 w-full md:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#5A5A40] font-bold bg-[#EBE7DF] px-2.5 py-0.5 rounded-lg border border-[#D9D3C7]">
                      {cat.code}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                      {Math.round(realizationRatio)}% Terpakai
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#2C2C24] leading-snug">{cat.name}</h4>
                  <p className="text-[10px] text-[#7A7A6A] flex items-center gap-1">
                    <HelpCircle className="w-3" />
                    Kode Sub-Rekening Akun Anggaran Pesantren
                  </p>
                </div>

                {/* Absorption Progress Line */}
                <div className="flex-1 w-full space-y-1.5 md:px-4">
                  <div className="flex justify-between text-[11px] text-[#7A7A6A] font-medium">
                    <span>Realisasi Belanja: <strong className="font-mono text-[#3D3D3D]">{formatRupiah(cat.realizedAmount)}</strong></span>
                    <span>Pagu Sedia: <strong className="font-mono text-[#7A7A6A]">{formatRupiah(cat.allocatedAmount)}</strong></span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F7F5F0] border border-[#F0EFEA] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(realizationRatio, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7A7A6A]">
                    <span className="flex items-center gap-0.5">
                      <ArrowRightCircle className="w-3 text-[#5A5A40]" />
                      Sisa Pagu Anggaran
                    </span>
                    <span className="font-mono font-bold text-[#3D3D3D] bg-[#F7F5F0] px-1.5 py-0.2 rounded border border-[#D9D3C7]">
                      {remainingBudget < 0 ? '-' : ''}{formatRupiah(Math.abs(remainingBudget))}
                    </span>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="shrink-0 w-full md:w-auto text-right">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="flex inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#5A5A40] hover:text-[#4A4A34] hover:bg-[#EBE7DF] rounded-lg text-xs font-semibold border border-[#D9D3C7] transition shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Sesuaikan Pagu
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Modal for DIPA */}
      {(editingCategory || isAddingDipa) && (
        <div className="fixed inset-0 bg-[#3d3d2f]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden"
          >
            <div className="bg-[#5A5A40] text-white p-5 bg-gradient-to-br">
              <h3 className="text-sm font-semibold uppercase tracking-wider font-sans">
                {isAddingDipa ? 'Tambah Anggaran Belanja Baru' : 'Sesuaikan Pagu Rencana DIPA'}
              </h3>
              <p className="text-[11px] text-[#EBE7DF]">Alokasikan target nominal belanja pesantren berdasarkan rencana kerja tahunan.</p>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs text-gray-700">
              
              {/* Account Code */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Kode Akun DIPA (Angka) *</label>
                <input 
                  type="text" 
                  required
                  disabled={!isAddingDipa} // disable modification of code to preserve transactional relationships
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: 521211 atau 521213"
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none disabled:opacity-65"
                />
              </div>

              {/* Account Title */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Nama Sub-Bidang Belanja *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan deskripsi penganggaran..."
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                />
              </div>

              {/* Allocation Nominal */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Jumlah Pagu Anggaran Rp *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.allocatedAmount} 
                  onChange={(e) => setFormData({ ...formData, allocatedAmount: Math.max(0, parseInt(e.target.value)) })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-mono"
                />
                <div className="text-[11px] text-[#7A7A6A] mt-1.5">
                  Nominal Rencana: <span className="font-bold text-[#5A5A40]">{formatRupiah(formData.allocatedAmount)}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[#F0EFEA]">
                {!isAddingDipa && editingCategory && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingCategory.id)}
                    className="flex items-center gap-1 text-[#A66E4E] hover:text-white hover:bg-[#A66E4E] px-3 py-1.5 rounded-lg border border-[#F6DFD0] transition cursor-pointer font-semibold"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
                
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); setIsAddingDipa(false); }}
                    className="px-3 py-1.5 text-[#7A7A6A] bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg hover:bg-[#EBE7DF] transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-lg font-semibold transition cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
