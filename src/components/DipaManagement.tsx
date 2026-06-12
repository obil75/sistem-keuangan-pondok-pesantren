/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Trash,
  Download,
  Printer,
  FileText
} from 'lucide-react';
import { DipaCategory, Student, Transaction } from '../types';
import { formatRupiah, calculateStats } from '../utils/financeHelpers';

interface DipaManagementProps {
  dipaCategories: DipaCategory[];
  onUpdateDipa: (updated: DipaCategory[]) => void;
  students?: Student[];
  transactions?: Transaction[];
  pricePerStudent?: number;
  iuranMap?: Record<string, number>;
  pengelola1Nama?: string;
  pengelola1Jabatan?: string;
  pengelola2Nama?: string;
  pengelola2Jabatan?: string;
  pengelola3Nama?: string;
  pengelola3Jabatan?: string;
}

export default function DipaManagement({ 
  dipaCategories, 
  onUpdateDipa,
  students = [],
  transactions = [],
  pricePerStudent = 750000,
  iuranMap = {},
  pengelola1Nama = 'Ust. Arsyad Hambali',
  pengelola1Jabatan = 'Bendahara Utama',
  pengelola2Nama = 'Ust. Ahmad Syihabuddin, Lc.',
  pengelola2Jabatan = 'Dewan Pengawas Pesantren',
  pengelola3Nama = 'Haj. Fatimah Azzahra, S.E.',
  pengelola3Jabatan = 'Kepala Bagian Keuangan'
}: DipaManagementProps) {
  // Modal states
  const [editingCategory, setEditingCategory] = useState<DipaCategory | null>(null);
  const [isAddingDipa, setIsAddingDipa] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    allocatedAmount: 0,
    volume: '',
    unitPrice: 0
  });

  const parseVolumeNumber = (input: string | number) => {
    if (typeof input === 'number') return input;
    const match = input.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const formatNumeric = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // List Builder states for editing/creating modal
  const [subCategoriesList, setSubCategoriesList] = useState<string[]>([]);
  const [subCategoriesDetails, setSubCategoriesDetails] = useState<Record<string, { volume?: string, unitPrice?: number }>>({});
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  const [tempSubCategory, setTempSubCategory] = useState('');

  // Auto calculate allocatedAmount when volume or unitPrice changes OR through sub-category details totals
  useEffect(() => {
    let subTotals = 0;
    let hasDetails = false;
    subCategoriesList.forEach(name => {
      const detail = subCategoriesDetails[name];
      if (detail) {
        const vol = parseVolumeNumber(detail.volume || '');
        const price = Number(detail.unitPrice) || 0;
        if (vol > 0 && price > 0) {
          subTotals += (vol * price);
          hasDetails = true;
        }
      }
    });

    if (hasDetails && subTotals > 0) {
      setFormData(prev => ({ ...prev, allocatedAmount: subTotals }));
    } else {
      const vol = parseVolumeNumber(formData.volume);
      const price = Number(formData.unitPrice) || 0;
      if (vol > 0 && price > 0) {
        setFormData(prev => ({ ...prev, allocatedAmount: vol * price }));
      }
    }
  }, [formData.volume, formData.unitPrice, subCategoriesDetails, subCategoriesList]);

  // Custom interactive dialog states (for iframe-safe Alerts and Confirms)
  const [activeConfirm, setActiveConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [activeAlert, setActiveAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const triggerAlert = (title: string, message: string) => {
    setActiveAlert({ title, message });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setActiveConfirm({ title, message, onConfirm });
  };

  // Inline quick-add sub-category state under each individual category row
  const [inlineAddId, setInlineAddId] = useState<string | null>(null);
  const [inlineSubValue, setInlineSubValue] = useState('');

  const saveInlineSubCategory = (catId: string) => {
    if (!inlineSubValue.trim()) return;
    const trimmed = inlineSubValue.trim();

    const updated = dipaCategories.map(c => {
      if (c.id === catId) {
        const subs = c.subCategories || [];
        if (subs.includes(trimmed)) {
          triggerAlert('Duplikasi Sub-Belanja', 'Sub-belanja tersebut sudah terdaftar!');
          return c;
        }
        return {
          ...c,
          subCategories: [...subs, trimmed]
        };
      }
      return c;
    });

    onUpdateDipa(updated);
    setInlineAddId(null);
    setInlineSubValue('');
  };

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

  // Calculate total funding/income received ("dana masuk")
  const totalDanaMasuk = useMemo(() => {
    const stats = calculateStats(students, dipaCategories, transactions, '2026-06', pricePerStudent, iuranMap);
    return stats.totalMasuk;
  }, [students, dipaCategories, transactions, pricePerStudent, iuranMap]);

  // Handler to export current DIPA registry as a simple Excel-compatible CSV file
  const handleDownloadExcel = () => {
    const headers = ['Kode DIPA', 'Uraian Belanja', 'Volume', 'Harga Satuan (Rp)', 'Pagu Alokasi (Rp)', 'Jenis'];
    const rows: string[][] = [headers];

    dipaCategories.forEach(cat => {
      const isSubEmpty = !cat.subCategories || cat.subCategories.length === 0;
      rows.push([
        cat.code || '',
        cat.name,
        isSubEmpty ? (cat.volume || '-') : '-',
        isSubEmpty ? (cat.unitPrice ? String(cat.unitPrice) : '-') : '-',
        String(cat.allocatedAmount),
        'Bidang Utama'
      ]);

      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          const detail = cat.subCategoriesDetail?.find(d => d.name === sub);
          const subVolume = detail?.volume || '';
          const subPrice = detail?.unitPrice || 0;
          const subTotalVal = parseVolumeNumber(subVolume) * subPrice;

          rows.push([
            '',
            `  - ${sub}`,
            subVolume || '-',
            subPrice ? String(subPrice) : '-',
            String(subTotalVal),
            'Sub Belanja Alokasi'
          ]);
        });
      }
    });

    rows.push([]);
    rows.push(['TOTAL PAGU DIPA', '', '', '', String(totals.totalAlloc), '']);
    rows.push(['ANGGARAN TERSEDIA', '', '', '', String(totalDanaMasuk), '']);
    rows.push(['SISA KUOTA ANGGARAN', '', '', '', String(totalDanaMasuk - totals.totalAlloc), '']);

    // Construct CSV using semicolon as separator (safest for direct Excel opening in ID-ID locale)
    const csvContent = '\uFEFF' + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Alokasi_Belanja_DIPA_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler to open printable/PDF version of the DIPA report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerAlert('Pop-up Terblokir', 'Harap izinkan pop-up di browser Anda agar dapat mencetak dokumen laporan.');
      return;
    }

    let tableRowsHtml = '';
    dipaCategories.forEach(cat => {
      // Main row
      tableRowsHtml += `
        <tr style="background-color: #fcfbf9; font-weight: bold; border-bottom: 2px solid #e1ded8;">
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${cat.code || '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${cat.name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${(!cat.subCategories || cat.subCategories.length === 0) ? (cat.volume || '-') : '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${(!cat.subCategories || cat.subCategories.length === 0) ? (cat.unitPrice ? formatRupiah(cat.unitPrice) : '-') : '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatRupiah(cat.allocatedAmount)}</td>
        </tr>
      `;

      // Sub rows
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          const detail = cat.subCategoriesDetail?.find(d => d.name === sub);
          const subVolume = detail?.volume || '';
          const subPrice = detail?.unitPrice || 0;
          const subTotalVal = parseVolumeNumber(subVolume) * subPrice;

          tableRowsHtml += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: left; color: #555;"></td>
              <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: left; padding-left: 25px; color: #555;">&bull; ${sub}</td>
              <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: center; color: #555;">${subVolume || '-'}</td>
              <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; color: #555;">${subPrice ? formatRupiah(subPrice) : '-'}</td>
              <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; color: #555;">${formatRupiah(subTotalVal)}</td>
            </tr>
          `;
        });
      }
    });

    const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Alokasi Anggaran Belanja DIPA</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #333;
            margin: 40px;
            padding: 0;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #5a5a40;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            color: #2c2c24;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 13px;
            color: #666;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            font-size: 12px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-card {
            border: 1px solid #e5e1da;
            background-color: #fbfbfa;
            padding: 12px 15px;
            border-radius: 8px;
          }
          .stat-card span {
            font-size: 9px;
            text-transform: uppercase;
            color: #7a7a6a;
            font-weight: bold;
            display: block;
          }
          .stat-card h4 {
            margin: 5px 0 0 0;
            font-size: 15px;
            color: #2c2c24;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 40px;
          }
          th {
            background-color: #5a5a40;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            padding: 10px;
            border: 1px solid #5a5a40;
          }
          td {
            border: 1px solid #ddd;
          }
          .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            page-break-inside: avoid;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            margin-top: 60px;
            border-top: 1px solid #444;
            font-weight: bold;
            padding-top: 5px;
          }
          .no-print-btn {
            padding: 8px 16px;
            background-color: #5a5a40;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            font-size: 11px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .no-print-close {
            padding: 8px 16px;
            background-color: #f0efeaa0;
            color: #333;
            border: 1px solid #d9d3c7;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            margin-left: 8px;
            font-size: 11px;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 25px; text-align: right;">
          <button class="no-print-btn" onclick="window.print()">Cetak Dokumen</button>
          <button class="no-print-close" onclick="window.close()">Tutup Halaman</button>
        </div>
        <div class="header">
          <h1>Laporan Alokasi Anggaran Belanja DIPA</h1>
          <p>Sistem Pengelolaan Keuangan & Anggaran Operasional Madrasah</p>
        </div>
        <div class="meta-info">
          <div><strong>Dicetak Oleh:</strong> Pengguna Aplikasi</div>
          <div><strong>Tanggal Dokumen:</strong> ${currentDate}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <span>Total Pagu DIPA</span>
            <h4>${formatRupiah(totals.totalAlloc)}</h4>
          </div>
          <div class="stat-card">
            <span>Anggaran Tersedia</span>
            <h4>${formatRupiah(totalDanaMasuk)}</h4>
          </div>
          <div class="stat-card">
            <span>Sisa Kuota Anggaran</span>
            <h4>${formatRupiah(totalDanaMasuk - totals.totalAlloc)}</h4>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%; text-align: center;">Kode DIPA</th>
              <th style="text-align: left;">Uraian Belanja</th>
              <th style="width: 10%; text-align: center;">Volume</th>
              <th style="width: 20%; text-align: right; padding-right: 10px;">Harga Satuan</th>
              <th style="width: 20%; text-align: right; padding-right: 10px;">Pagu Alokasi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature-box">
            <p>Mengetahui,</p>
            <p style="margin-bottom: 45px; font-weight: 500;">${pengelola2Jabatan}</p>
            <div class="signature-line">( ${pengelola2Nama} )</div>
          </div>
          <div class="signature-box">
            <p>Diperiksa Oleh,</p>
            <p style="margin-bottom: 45px; font-weight: 500;">${pengelola3Jabatan}</p>
            <div class="signature-line">( ${pengelola3Nama} )</div>
          </div>
          <div class="signature-box">
            <p>Disetujui Oleh,</p>
            <p style="margin-bottom: 45px; font-weight: 500;">${pengelola1Jabatan}</p>
            <div class="signature-line">( ${pengelola1Nama} )</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle open editor
  const handleOpenEdit = (cat: DipaCategory) => {
    setEditingCategory(cat);
    setFormData({
      code: cat.code,
      name: cat.name,
      allocatedAmount: cat.allocatedAmount,
      volume: cat.volume || '',
      unitPrice: cat.unitPrice || 0
    });
    setSubCategoriesList(cat.subCategories || []);
    
    // Populate details from subCategoriesDetail
    const detailsMap: Record<string, { volume?: string, unitPrice?: number }> = {};
    if (cat.subCategoriesDetail) {
      cat.subCategoriesDetail.forEach(detail => {
        detailsMap[detail.name] = {
          volume: detail.volume || '',
          unitPrice: detail.unitPrice || 0
        };
      });
    }
    setSubCategoriesDetails(detailsMap);
    
    setTempSubCategory('');
    setSelectedSubIndex(null);
    setIsAddingDipa(false);
  };

  // Handle open creator
  const handleOpenCreate = () => {
    setFormData({
      code: '',
      name: '',
      allocatedAmount: 100000000,
      volume: '',
      unitPrice: 0
    });
    setSubCategoriesList([]);
    setSubCategoriesDetails({});
    setTempSubCategory('');
    setSelectedSubIndex(null);
    setEditingCategory(null);
    setIsAddingDipa(true);
  };

  const handleAddSubCategoryItem = () => {
    if (tempSubCategory.trim() === '') return;
    const trimmed = tempSubCategory.trim();
    if (subCategoriesList.includes(trimmed)) {
      triggerAlert('Duplikasi Sub-Belanja', 'Sub-belanja tersebut sudah ditambahkan!');
      return;
    }
    setSubCategoriesList([...subCategoriesList, trimmed]);
    setTempSubCategory('');
  };

  const handleRemoveSubCategoryItem = (index: number) => {
    setSubCategoriesList(subCategoriesList.filter((_, idx) => idx !== index));
  };

  // Save DIPA (Create / Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate a valid unique numeric code if adding a new DIPA category
    const finalCode = isAddingDipa
      ? (() => {
          let maxCodeNum = 5000;
          dipaCategories.forEach(c => {
            const num = parseInt(c.code);
            if (!isNaN(num) && num > maxCodeNum) {
              maxCodeNum = num;
            }
          });
          return (maxCodeNum + 100).toString();
        })()
      : formData.code.trim();

    if (!finalCode || !formData.name.trim()) {
      triggerAlert('Masukan Tidak Valid', 'Harap masukkan Nama Sub-Bidang Belanja!');
      return;
    }

    const subCategoriesDetail = subCategoriesList.map(name => ({
      name,
      volume: subCategoriesDetails[name]?.volume || '',
      unitPrice: Number(subCategoriesDetails[name]?.unitPrice) || 0
    }));

    if (isAddingDipa) {
      const newDipa: DipaCategory = {
        id: `dipa-${Date.now()}`,
        code: finalCode,
        name: formData.name.trim(),
        allocatedAmount: Number(formData.allocatedAmount) || 0,
        realizedAmount: 0,
        subCategories: subCategoriesList,
        volume: formData.volume.trim(),
        unitPrice: Number(formData.unitPrice) || 0,
        subCategoriesDetail
      };
      onUpdateDipa([...dipaCategories, newDipa]);
      setIsAddingDipa(false);
    } else if (editingCategory) {
      const updated = dipaCategories.map(d => {
        if (d.id === editingCategory.id) {
          return {
            ...d,
            code: finalCode,
            name: formData.name.trim(),
            allocatedAmount: Number(formData.allocatedAmount) || 0,
            subCategories: subCategoriesList,
            volume: formData.volume.trim(),
            unitPrice: Number(formData.unitPrice) || 0,
            subCategoriesDetail
          };
        }
        return d;
      });
      onUpdateDipa(updated);
      setEditingCategory(null);
    }
  };

  // Delete category with confirmation (removes the entire row)
  const handleDelete = (id: string) => {
    const category = dipaCategories.find(c => c.id === id);
    if (!category) return;

    triggerConfirm(
      'Konfirmasi Hapus Bidang Belanja',
      'Yakin ingin menghapus seluruh baris anggaran belanja ini? Kategori DIPA, pagu alokasi, realisasi penyerapan, dan seluruh sub-belanja terkait akan dihapus secara permanen.',
      () => {
        onUpdateDipa(dipaCategories.filter(c => c.id !== id));
        setEditingCategory(null);
      }
    );
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
            <span className="text-[10px] text-[#7A7A6A] uppercase font-bold tracking-wider">ANGGARAN TERSEDIA</span>
            <h4 className="text-md font-serif font-bold text-[#2C2C24] mt-0.5">{formatRupiah(totalDanaMasuk)}</h4>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E5E1DA] shadow-xs rounded-[24px] flex items-center gap-4">
          <div className="p-3 bg-[#EBE7DF] text-[#5A5A40] rounded-2xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7A6A] uppercase font-bold tracking-wider">Sisa Kuota Anggaran</span>
            <h4 className="text-md font-serif font-bold text-[#5A5A40] mt-0.5">{formatRupiah(totalDanaMasuk - totals.totalAlloc)}</h4>
          </div>
        </div>
      </div>



      {/* DIPA Categories list accounts board */}
      <div className="bg-white rounded-[24px] border border-[#E5E1DA] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#F0EFEA] flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[#EBE7DF]/10">
          <h3 className="text-sm font-bold text-[#2C2C24] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5A5A40]" />
            Daftar Alokasi Rekor Belanja DIPA
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#7A7A6A] hidden sm:inline">Total Bagan Akun: <strong>{dipaCategories.length}</strong></span>
            
            {/* Unduh Laporan Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0EFEA] text-[#5A5A40] border border-[#D9D3C7] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Unduh Laporan DIPA"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Laporan
              </button>

              {showExportMenu && (
                <>
                  {/* Backdrop to close the menu on clicking outside */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E1DA] rounded-xl shadow-lg py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      onClick={() => {
                        handleDownloadExcel();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#3D3D3D] hover:bg-[#F7F5F0] flex items-center gap-2 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
                      Format Excel (.csv)
                    </button>
                    <button
                      onClick={() => {
                        handlePrintReport();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#3D3D3D] hover:bg-[#F7F5F0] flex items-center gap-2 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#5A5A40]" />
                      Cetak Siap Dokumen
                    </button>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Bidang Belanja Baru
            </button>
          </div>
        </div>

        {/* Table Header Row */}
        <div className="hidden md:flex bg-[#F7F5F0] border-b border-[#E5E1DA] px-5 py-3 text-[11px] font-bold text-[#5A5A40] tracking-wider uppercase font-sans items-center gap-6">
          <div className="flex-1">Uraian Belanja</div>
          <div className="w-20 shrink-0 text-center">Volume</div>
          <div className="w-28 shrink-0 text-center">Harga Satuan</div>
          <div className="w-36 shrink-0 text-center">Pagu/Realisasi</div>
          <div className="shrink-0 w-20 text-center">Aksi</div>
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
              <React.Fragment key={cat.id}>
                {/* Main Card row for DIPA Category */}
                <div className="px-5 py-3 md:py-2.5 hover:bg-[#F7F5F0]/50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* Info and Code */}
                  <div className="space-y-1.5 w-full md:flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#2C2C24] leading-snug">
                      {cat.code ? `${cat.code} - ` : ''}{cat.name || <span className="text-[#8D8D7D] italic font-normal">(Rincian Belanja Kosong)</span>}
                    </h4>
                  </div>

                  {/* Volume Column */}
                  <div className="w-full md:w-20 shrink-0 text-left md:text-center text-xs text-[#3D3D3D] font-medium font-sans">
                    <span className="md:hidden text-[10px] text-[#7A7A6A] font-bold uppercase block mb-0.5">Volume</span>
                    {(!cat.subCategories || cat.subCategories.length === 0) ? (cat.volume || <span className="text-[#8D8D7D] italic font-normal">-</span>) : <span className="text-[#8D8D7D] italic font-normal">-</span>}
                  </div>

                  {/* Harga Satuan Column */}
                  <div className="w-full md:w-28 shrink-0 text-left md:text-right text-xs text-[#3D3D3D] font-mono pr-2">
                    <span className="md:hidden text-[10px] text-[#7A7A6A] font-bold uppercase block mb-0.5">Harga Satuan</span>
                    {(!cat.subCategories || cat.subCategories.length === 0) ? (cat.unitPrice ? formatNumeric(cat.unitPrice) : <span className="text-[#8D8D7D] italic font-normal">-</span>) : <span className="text-[#8D8D7D] italic font-normal">-</span>}
                  </div>

                  {/* Total Allocated Amount Column */}
                  <div className="w-full md:w-36 shrink-0 text-left md:text-right text-xs text-[#3D3D3D] font-mono pr-2">
                    <span className="md:hidden text-[10px] text-[#7A7A6A] font-bold uppercase block mb-1">Pagu/Realisasi</span>
                    <span className="font-mono font-bold text-[#3D3D3D] text-xs">
                      {formatNumeric(cat.allocatedAmount)}
                    </span>
                  </div>

                  {/* Actions (Edit & Delete) */}
                  <div className="shrink-0 w-full md:w-20 flex items-center justify-end md:justify-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="flex items-center justify-center p-1.5 bg-white text-[#5A5A40] hover:text-[#3D3D2F] hover:bg-[#F0EFEA] rounded-lg border border-[#D9D3C7] transition shadow-2xs cursor-pointer"
                      title="Sesuaikan Pagu"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="flex items-center justify-center p-1.5 bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg border border-rose-200 transition shadow-2xs cursor-pointer"
                      title="Hapus"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

                {/* Sub-Category Detail Rows (each aligned perfectly with column templates) */}
                {cat.subCategories && cat.subCategories.length > 0 && cat.subCategories.map((sub, sIdx) => {
                  const detail = cat.subCategoriesDetail?.find(d => d.name === sub);
                  const subVolume = detail?.volume || '';
                  const subPrice = detail?.unitPrice || 0;
                  const subTotalVal = parseVolumeNumber(subVolume) * subPrice;

                  return (
                    <div 
                      key={`${cat.id}-sub-${sIdx}`} 
                      className="pl-8 pr-5 py-3 md:py-2.5 bg-[#FAF9F6]/40 border-t border-[#F0EFEA] hover:bg-[#F7F5F0]/60 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      {/* Column 1: Sub Uraian Belanja */}
                      <div className="w-full md:flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#5A5A40] truncate" title={sub}>{sub}</span>
                      </div>

                      {/* Column 2: Volume */}
                      <div className="w-full md:w-20 shrink-0 text-left md:text-center text-xs text-[#3D3D3D] font-medium font-sans">
                        <span className="md:hidden text-[10px] text-[#7A7A6A] font-bold uppercase block mb-0.5">Volume</span>
                        {subVolume || <span className="text-[#8D8D7D] italic font-normal">-</span>}
                      </div>

                      {/* Column 3: Harga Satuan */}
                      <div className="w-full md:w-28 shrink-0 text-left md:text-right text-xs text-[#3D3D3D] font-mono pr-2">
                        <span className="md:hidden text-[10px] text-[#7A7A6A] font-bold uppercase block mb-0.5">Harga Satuan</span>
                        {subPrice ? formatNumeric(subPrice) : <span className="text-[#8D8D7D] italic font-normal">-</span>}
                      </div>

                      {/* Column 4: Sub-Pagu Sub-Anggaran Detail */}
                      <div className="w-full md:w-36 shrink-0 text-left md:text-right text-xs text-[#3D3D3D] font-mono pr-2">
                        <span className="font-mono font-bold text-[#3D3D3D] text-xs">
                          {formatNumeric(subTotalVal)}
                        </span>
                      </div>

                      {/* Column 5: Actions offset spacer */}
                      <div className="shrink-0 w-full md:w-20"></div>
                    </div>
                  );
                })}
              </React.Fragment>
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

              {/* Sub-Belanja Category field / List Builder */}
              <div className="space-y-2">
                <label className="font-bold text-[#3D3D3D] flex justify-between items-center">
                  <span>Daftar Sub-Belanja Alokasi</span>
                  <span className="text-[10px] text-[#7A7A6A] font-normal">({subCategoriesList.length} item)</span>
                </label>
                
                {/* Input row */}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={tempSubCategory}
                    onChange={(e) => setTempSubCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubCategoryItem();
                      }
                    }}
                    placeholder="Tambah beberapa sub belanja..."
                    className="flex-1 px-3 py-1.5 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubCategoryItem}
                    className="px-3 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    Tambah
                  </button>
                </div>

                {/* Badges / Items List */}
                {subCategoriesList.length > 0 ? (
                  <div className="space-y-1.5 p-2 bg-[#F7F5F0] border border-[#E5E1DA] rounded-xl">
                    <p className="text-[10px] text-[#7A7A6A] font-medium leading-normal mb-1">
                      💡 Klik item sub-belanja di bawah untuk mengisi Volume & Harga Satuan individunya:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {subCategoriesList.map((item, index) => {
                        const isSelected = selectedSubIndex === index;
                        const spec = subCategoriesDetails[item];
                        const hasSpec = spec && (spec.volume || spec.unitPrice);
                        return (
                          <button
                            key={index} 
                            type="button"
                            onClick={() => setSelectedSubIndex(isSelected ? null : index)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition cursor-pointer ${
                              isSelected 
                                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm' 
                                : 'bg-white hover:bg-[#EBE7DF]/40 text-[#5A5A40] border-[#D9D3C7] shadow-3xs'
                            }`}
                          >
                            <span>{item}</span>
                            {hasSpec ? (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-[#E3EFE5] text-[#2E6B3E]'}`}>
                                ✓
                              </span>
                            ) : null}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSubCategoryItem(index);
                                if (selectedSubIndex === index) setSelectedSubIndex(null);
                              }}
                              className={`text-xs hover:text-rose-600 transition ml-1 pl-1 border-l focus:outline-none ${isSelected ? 'border-white/30 text-white/80' : 'border-[#E5E1DA] text-[#7A7A6A]'}`}
                              title="Hapus sub-belanja"
                            >
                              ×
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-2.5 bg-[#F7F5F0]/50 border border-dashed border-[#D9D3C7] rounded-xl text-[10px] text-[#7A7A6A] select-none">
                    Belum ada sub-belanja ditambahkan. Tambahkan beberapa di atas!
                  </div>
                )}
              </div>

              {/* Sub-Belanja Specific Inputs (Only when selected) */}
              {selectedSubIndex !== null && subCategoriesList[selectedSubIndex] && (() => {
                const subName = subCategoriesList[selectedSubIndex];
                const currentDetail = subCategoriesDetails[subName] || { volume: '', unitPrice: 0 };
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-[#EBE7DF]/30 border border-[#D9D3C7] rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-[#D9D3C7]/60 pb-1 mb-1">
                      <span className="font-bold text-[#3D3D3D] text-[11px]">🔧 Atur Detail sub: <span className="underline text-[#5A5A40]">{subName}</span></span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedSubIndex(null)}
                        className="text-[10px] text-[#7A7A6A] hover:text-[#3D3D3D] font-bold underline"
                      >
                        Selesai
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-[#5A5A40] text-[10px]">Volume Sub-Belanja</label>
                        <input 
                          type="text" 
                          value={currentDetail.volume || ''} 
                          onChange={(e) => {
                            setSubCategoriesDetails(prev => ({
                              ...prev,
                              [subName]: {
                                ...prev[subName],
                                volume: e.target.value
                              }
                            }));
                          }}
                          placeholder="Misal: 12 bln, 2 paket"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#5A5A40] text-[10px]">Harga Satuan Sub Rp</label>
                        <input 
                          type="number" 
                          min="0"
                          value={currentDetail.unitPrice || ''} 
                          onChange={(e) => {
                            setSubCategoriesDetails(prev => ({
                              ...prev,
                              [subName]: {
                                ...prev[subName],
                                unitPrice: Math.max(0, parseInt(e.target.value) || 0)
                              }
                            }));
                          }}
                          placeholder="Misal: 500000"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none text-xs font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

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

      {/* Custom Alert Modal */}
      {activeAlert && (
        <div className="fixed inset-0 bg-[#3d3d2f]/35 backdrop-blur-xs flex items-center justify-center z-[150] p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden p-6 text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
              <HelpCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#2C2C24]">{activeAlert.title}</h4>
              <p className="text-xs text-[#7A7A6A] leading-relaxed">{activeAlert.message}</p>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="w-full py-2 bg-[#5A5A40] text-white text-xs font-semibold rounded-xl hover:bg-[#4A4A34] transition cursor-pointer"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {activeConfirm && (
        <div className="fixed inset-0 bg-[#3d3d2f]/35 backdrop-blur-xs flex items-center justify-center z-[150] p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden p-6 text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
              <Trash className="w-6 h-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#2C2C24]">{activeConfirm.title}</h4>
              <p className="text-xs text-[#7A7A6A] leading-relaxed">{activeConfirm.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveConfirm(null)}
                className="flex-1 py-2 bg-[#F7F5F0] text-[#7A7A6A] text-xs font-semibold rounded-xl hover:bg-[#EBE7DF] border border-[#D9D3C7] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  activeConfirm.onConfirm();
                  setActiveConfirm(null);
                }}
                className="flex-1 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
