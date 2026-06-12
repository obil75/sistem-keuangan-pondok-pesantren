/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Filter, 
  Calendar, 
  Tag, 
  Check, 
  BookOpen,
  ArrowRight,
  User,
  Info,
  Edit2,
  Trash,
  Download,
  FileText,
  Printer
} from 'lucide-react';
import { Transaction, Student, DipaCategory } from '../types';
import { formatRupiah, formatDate } from '../utils/financeHelpers';

interface TransactionsProps {
  transactions: Transaction[];
  students: Student[];
  dipaCategories: DipaCategory[];
  onAddTransaction: (newTx: Transaction, updatedStudents?: Student[], updatedDipa?: DipaCategory[]) => void;
  onUpdateTransaction?: (tx: Transaction, updatedStudents?: Student[], updatedDipa?: DipaCategory[]) => void;
  onDeleteTransaction?: (txId: string, updatedStudents?: Student[], updatedDipa?: DipaCategory[]) => void;
  pricePerStudent?: number;
  iuranMap?: Record<string, number>;
  pengelola1Nama?: string;
  pengelola1Jabatan?: string;
  pengelola2Nama?: string;
  pengelola2Jabatan?: string;
  pengelola3Nama?: string;
  pengelola3Jabatan?: string;
}

const INCOME_CATEGORIES = [
  'Dana Hibah Yayasan',
  'Donasi Publik & Alumni',
  'Unit Bisnis Pesantren',
  'Infaq Khusus',
  'Lain-lain'
];

export default function Transactions({ 
  transactions, 
  students, 
  dipaCategories, 
  onAddTransaction, 
  onUpdateTransaction,
  onDeleteTransaction,
  pricePerStudent = 750000, 
  iuranMap,
  pengelola1Nama = 'Ust. Arsyad Hambali',
  pengelola1Jabatan = 'Bendahara Utama',
  pengelola2Nama = 'Ust. Ahmad Syihabuddin, Lc.',
  pengelola2Jabatan = 'Dewan Pengawas Pesantren',
  pengelola3Nama = 'Haj. Fatimah Azzahra, S.E.',
  pengelola3Jabatan = 'Kepala Bagian Keuangan'
}: TransactionsProps) {
  const getPrice = (m: string) => (iuranMap && iuranMap[m] !== undefined ? iuranMap[m] : pricePerStudent);
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Form toggles
  const [isOpenAddForm, setIsOpenAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Custom Confirmation Dialog State
  const [activeConfirm, setActiveConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setActiveConfirm({ title, message, onConfirm });
  };

  // Form state
  const [txType, setTxType] = useState<'masuk' | 'keluar'>('masuk');
  const [txCategory, setTxCategory] = useState('');
  const [txSubCategory, setTxSubCategory] = useState('');
  const [txAmount, setTxAmount] = useState(pricePerStudent);
  const [txDate, setTxDate] = useState('2026-06-10');
  const [txDesc, setTxDesc] = useState('');

  // Handle click on specific transaction edit
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxSubCategory(tx.subCategory || '');
    setTxAmount(tx.amount);
    setTxDate(tx.date);
    setTxDesc(tx.description);
    
    // Check if it's SPP payment
    const isSpp = !!(tx.paymentMonth && tx.refId);
    setIsSppPayment(isSpp);
    if (isSpp) {
      setSelectedStudentId(tx.refId || '');
      setSppMonth(tx.paymentMonth || '2026-06');
      const stud = students.find(s => s.id === tx.refId);
      if (stud) {
        setStudentSearchInput(`${stud.name} (${stud.nis})`);
      } else {
        setStudentSearchInput('');
      }
    } else {
      setSelectedStudentId('');
      setStudentSearchInput('');
      setSppMonth('2026-06');
    }
    setIsOpenAddForm(true);
  };

  // Handle open form for brand new transaction
  const handleAddClick = () => {
    setEditingTransaction(null);
    setTxType('masuk');
    setTxCategory('Iuran Santri');
    setTxSubCategory('');
    setTxAmount(pricePerStudent);
    setTxDate('2026-06-10');
    setTxDesc('');
    setIsSppPayment(true);
    setSelectedStudentId('');
    setStudentSearchInput('');
    setSppMonth('2026-06');
    setIsOpenAddForm(true);
  };

  // Handle deletion of a transaction
  const handleDeleteClick = (tx: Transaction) => {
    triggerConfirm(
      'Konfirmasi Hapus Transaksi',
      `Apakah Anda yakin ingin menghapus transaksi "${tx.description || tx.category}" senilai ${formatRupiah(tx.amount)} ini secara permanen dari jurnal kas?`,
      () => {
        let updatedStudents: Student[] | undefined;
        let updatedDipa: DipaCategory[] | undefined;

        // Rollback effects
        if (tx.type === 'masuk' && tx.refId && tx.paymentMonth) {
          // Revert paid status of student to false
          updatedStudents = students.map(s => {
            if (s.id === tx.refId) {
              return {
                ...s,
                monthlyFeePaid: {
                  ...s.monthlyFeePaid,
                  [tx.paymentMonth!]: false
                }
              };
            }
            return s;
          });
        } else if (tx.type === 'keluar') {
          // Subtract tx.amount from realizedAmount of Dipa
          updatedDipa = dipaCategories.map(d => {
            if (d.name === tx.category || d.code === tx.category.split(' - ')[0]) {
              return {
                ...d,
                realizedAmount: Math.max(0, d.realizedAmount - tx.amount)
              };
            }
            return d;
          });
        }

        if (onDeleteTransaction) {
          onDeleteTransaction(tx.id, updatedStudents, updatedDipa);
        }
      }
    );
  };
  
  // Specific SPP variables
  const [isSppPayment, setIsSppPayment] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sppMonth, setSppMonth] = useState('2026-06');
  const [studentSearchInput, setStudentSearchInput] = useState('');

  // Automatically synchronize transaction amount to match the collective paid students total in that month
  useEffect(() => {
    if (txType === 'masuk' && isSppPayment) {
      const paidStudents = students.filter(s => s.monthlyFeePaid && s.monthlyFeePaid[sppMonth] === true);
      const totalSppIncome = paidStudents.length * getPrice(sppMonth);
      setTxAmount(totalSppIncome);
      setTxDesc(`Penerimaan Kolektif Iuran SPP Bulanan ${sppMonth} (${paidStudents.length} Santri Lunas)`);
    }
  }, [sppMonth, isSppPayment, txType, students, pricePerStudent, iuranMap]);

  // Dropdown list for filter categories
  const filterCategories = useMemo(() => {
    const list = new Set<string>();
    transactions.forEach(tx => list.add(tx.category));
    return Array.from(list);
  }, [transactions]);

  // Handle student searchable suggestions (max 8)
  const studentSuggestions = useMemo(() => {
    if (!studentSearchInput.trim()) return [];
    return students
      .filter(s => 
        s.name.toLowerCase().includes(studentSearchInput.toLowerCase()) || 
        s.nis.includes(studentSearchInput)
      )
      .slice(0, 8);
  }, [students, studentSearchInput]);

  // Selected student details if any
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Core Filtered list
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesCategory = catFilter === 'all' || tx.category === catFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, typeFilter, catFilter]);

  // Reset pagination on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, catFilter]);

  // Paginated data
  const paginatedTxs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return [...filteredTxs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTxs, currentPage]);

  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage) || 1;

  // Handler to export current Book of Cash register to a CSV/Excel file
  const handleDownloadExcel = () => {
    const headers = ['No', 'Tanggal', 'Jenis Arus', 'Kategori', 'Sub Kategori', 'Deskripsi / Uraian Kegiatan', 'Nominal (Rp)'];
    const rows: string[][] = [headers];

    filteredTxs.forEach((tx, idx) => {
      rows.push([
        String(idx + 1),
        tx.date,
        tx.type === 'masuk' ? 'Dana Masuk' : 'Dana Keluar',
        tx.category,
        tx.subCategory || '-',
        tx.description,
        String(tx.amount)
      ]);
    });

    const totalMasuk = filteredTxs.reduce((sum, tx) => tx.type === 'masuk' ? sum + tx.amount : sum, 0);
    const totalKeluar = filteredTxs.reduce((sum, tx) => tx.type === 'keluar' ? sum + tx.amount : sum, 0);
    const selisih = totalMasuk - totalKeluar;

    rows.push([]);
    rows.push(['TOTAL DANA MASUK', '', '', '', '', '', String(totalMasuk)]);
    rows.push(['TOTAL DANA KELUAR', '', '', '', '', '', String(totalKeluar)]);
    rows.push(['SURPLUS/DEFISIT KAS', '', '', '', '', '', String(selisih)]);

    const csvContent = '\uFEFF' + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Buku_Kas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler to open print view of transactions
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Harap izinkan pop-up di browser Anda agar dapat mencetak dokumen laporan.');
      return;
    }

    let tableRowsHtml = '';
    filteredTxs.forEach((tx, idx) => {
      const isIncoming = tx.type === 'masuk';
      tableRowsHtml += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-family: monospace;">${tx.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${isIncoming ? '#2e6b3e' : '#a66e4e'};">
            ${isIncoming ? 'Masuk' : 'Keluar'}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>${tx.category}</strong>
            ${tx.subCategory ? `<br/><span style="font-size: 10px; color: #7a7a6a;">&nbsp;&nbsp;↳ ${tx.subCategory}</span>` : ''}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; max-width: 300px; word-wrap: break-word;">${tx.description}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: ${isIncoming ? '#2e6b3e' : '#a66e4e'};">
            ${isIncoming ? '+' : '-'}${formatRupiah(tx.amount)}
          </td>
        </tr>
      `;
    });

    const totalMasuk = filteredTxs.reduce((sum, tx) => tx.type === 'masuk' ? sum + tx.amount : sum, 0);
    const totalKeluar = filteredTxs.reduce((sum, tx) => tx.type === 'keluar' ? sum + tx.amount : sum, 0);
    const selisih = totalMasuk - totalKeluar;
    const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Buku Kas & Jurnal Transaksi</title>
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
          <h1>Buku Kas & Jurnal Transaksi</h1>
          <p>Laporan Mutasi Kredit / Debit Keuangan Pesantren</p>
        </div>
        <div class="meta-info">
          <div><strong>Dicetak Oleh:</strong> Pengguna Aplikasi</div>
          <div><strong>Tanggal Dokumen:</strong> ${currentDate}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <span>Total Dana Masuk</span>
            <h4 style="color: #2e6b3e;">${formatRupiah(totalMasuk)}</h4>
          </div>
          <div class="stat-card">
            <span>Total Dana Keluar</span>
            <h4 style="color: #a66e4e;">${formatRupiah(totalKeluar)}</h4>
          </div>
          <div class="stat-card">
            <span>Surplus / Defisit Kas</span>
            <h4 style="color: ${selisih >= 0 ? '#2e6b3e' : '#a66e4e'}; font-weight: bold;">${formatRupiah(selisih)}</h4>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 15%; text-align: center;">Tanggal</th>
              <th style="width: 10%; text-align: center;">Arus</th>
              <th style="width: 25%; text-align: left; padding-left: 10px;">Kategori</th>
              <th style="text-align: left; padding-left: 10px;">Deskripsi / Uraian Kegiatan</th>
              <th style="width: 18%; text-align: right; padding-right: 10px;">Jumlah Nominal</th>
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

  // Autocomplete set category defaults when type changes
  const handleTypeChange = (type: 'masuk' | 'keluar') => {
    setTxType(type);
    if (type === 'masuk') {
      setIsSppPayment(true);
      setTxCategory('Iuran Santri');
      setTxSubCategory('');
      setTxAmount(pricePerStudent);
    } else {
      setIsSppPayment(false);
      const firstCat = dipaCategories[0];
      setTxCategory(firstCat?.name || '');
      setTxSubCategory(firstCat && firstCat.subCategories && firstCat.subCategories[0] ? firstCat.subCategories[0] : '');
      setTxAmount(5000000);
    }
  };

  // Select student suggestion
  const handleSelectStudent = (stud: Student) => {
    setSelectedStudentId(stud.id);
    setStudentSearchInput(`${stud.name} (${stud.nis})`);
    // auto populate description
    setTxDesc(`Pembayaran Iuran SPP Bulanan ${sppMonth} - ${stud.name} (${stud.nis})`);
  };

  // Submit transaction form (supports either adding new or editing existing)
  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      alert('Jumlah nominal transaksi harus lebih besar dari 0!');
      return;
    }

    // Since SPP payment is collective, we no longer require choosing an individual student selection first.

    if (!txCategory) {
      alert('Harap masukkan atau plih kategori!');
      return;
    }

    let updatedStudents: Student[] | undefined;
    let updatedDipa: DipaCategory[] | undefined;

    if (editingTransaction) {
      const originalTx = editingTransaction;
      
      // Perform database rollbacks and rollforwards on copied states
      let tempStudents = [...students];
      let tempDipa = [...dipaCategories];

      // A: Rollback original transaction's effects
      if (originalTx.type === 'masuk' && originalTx.refId && originalTx.paymentMonth) {
        tempStudents = tempStudents.map(s => {
          if (s.id === originalTx.refId) {
            return {
              ...s,
              monthlyFeePaid: {
                ...s.monthlyFeePaid,
                [originalTx.paymentMonth!]: false
              }
            };
          }
          return s;
        });
      } else if (originalTx.type === 'keluar') {
        tempDipa = tempDipa.map(d => {
          if (d.name === originalTx.category || d.code === originalTx.category.split(' - ')[0]) {
            return {
              ...d,
              realizedAmount: Math.max(0, d.realizedAmount - originalTx.amount)
            };
          }
          return d;
        });
      }

      // B: Define updated transaction payload
      const updatedTx: Transaction = {
        ...originalTx,
        type: txType,
        category: txCategory,
        subCategory: txType === 'keluar' && txSubCategory ? txSubCategory : undefined,
        amount: txAmount,
        date: txDate,
        description: txDesc.trim() || `${txType === 'masuk' ? 'Penerimaan' : 'Pengeluaran'} ${txCategory}`,
        refId: isSppPayment ? selectedStudentId : undefined,
        paymentMonth: isSppPayment ? sppMonth : undefined,
      };

      // C: Apply new effects
      if (txType === 'masuk' && isSppPayment && selectedStudentId) {
        tempStudents = tempStudents.map(s => {
          if (s.id === selectedStudentId) {
            return {
              ...s,
              monthlyFeePaid: {
                ...s.monthlyFeePaid,
                [sppMonth]: true
              }
            };
          }
          return s;
        });
        updatedStudents = tempStudents;
      } else {
        // If it was an SPP payment originally, propagate the rollback to the database
        if (originalTx.paymentMonth && originalTx.refId) {
          updatedStudents = tempStudents;
        }
      }

      if (txType === 'keluar') {
        tempDipa = tempDipa.map(d => {
          if (d.name === txCategory || d.code === txCategory.split(' - ')[0]) {
            return {
              ...d,
              realizedAmount: d.realizedAmount + txAmount
            };
          }
          return d;
        });
        updatedDipa = tempDipa;
      } else {
        // If it was an Expense originally, propagate the rollback to the database
        if (originalTx.type === 'keluar') {
          updatedDipa = tempDipa;
        }
      }

      // Trigger update on parent
      if (onUpdateTransaction) {
        onUpdateTransaction(updatedTx, updatedStudents, updatedDipa);
      }
    } else {
      // Build the new Transaction object
      const newTx: Transaction = {
        id: `tx-manual-${Date.now()}`,
        type: txType,
        category: txCategory,
        subCategory: txType === 'keluar' && txSubCategory ? txSubCategory : undefined,
        amount: txAmount,
        date: txDate,
        description: txDesc.trim() || `${txType === 'masuk' ? 'Penerimaan' : 'Pengeluaran'} ${txCategory}`,
        refId: isSppPayment ? selectedStudentId : undefined,
        paymentMonth: isSppPayment ? sppMonth : undefined,
      };

      // SPP marker
      if (txType === 'masuk' && isSppPayment && selectedStudentId) {
        updatedStudents = students.map((s) => {
          if (s.id === selectedStudentId) {
            return {
              ...s,
              monthlyFeePaid: {
                ...s.monthlyFeePaid,
                [sppMonth]: true
              }
            };
          }
          return s;
        });
      }

      // Expense Dipa realizedAmount updates
      if (txType === 'keluar') {
        updatedDipa = dipaCategories.map((d) => {
          if (d.name === txCategory || d.code === txCategory.split(' - ')[0]) {
            return {
              ...d,
              realizedAmount: d.realizedAmount + txAmount
            };
          }
          return d;
        });
      }

      onAddTransaction(newTx, updatedStudents, updatedDipa);
    }

    // Reset Form & Close
    setIsOpenAddForm(false);
    setEditingTransaction(null);
    setTxDesc('');
    setTxSubCategory('');
    setSelectedStudentId('');
    setStudentSearchInput('');
    setTxAmount(pricePerStudent);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Buku Kas & Jurnal Transaksi</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Jurnal pencatatan mutasi kredit/debit keuangan pesantren yang disinkronisasikan ke data DIPA dan SPP.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrasi Transaksi Baru
        </button>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-5 rounded-[24px] border border-[#E5E1DA] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#7A7A6A]" />
            <input 
              type="text"
              placeholder="Cari transaksi berdasarkan catatan atau kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40] transition"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40]"
            >
              <option value="all">Semua Aliran Dana</option>
              <option value="masuk">Dana Masuk (Penerimaan)</option>
              <option value="keluar">Dana Keluar (Belanja)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40]"
            >
              <option value="all">Semua Kategori</option>
              <option value="Iuran Santri">Iuran Santri (SPP)</option>
              {filterCategories.filter(c => c !== 'Iuran Santri').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-[#7A7A6A] pt-2 border-t border-[#F0EFEA]">
          <span>Menampilkan <strong>{filteredTxs.length}</strong> catatan riwayat kas</span>
          <span className="italic text-[10px]">Pemberitahuan: Mutasi berjalan otomatis saat status SPP dirubah.</span>
        </div>
      </div>

      {/* Transactions Table Layout */}
      <div className="bg-white rounded-[24px] border border-[#E5E1DA] shadow-sm overflow-hidden">
        {/* Table Header Bar with Download button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border-b border-[#E5E1DA] px-6 py-4">
          <h3 className="text-md font-bold text-[#2C2C24] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#5A5A40]" />
            Daftar Riwayat Kas & Jurnal Transaksi
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#7A7A6A] hidden sm:inline">Total Transaksi Sesuai Filter: <strong>{filteredTxs.length}</strong></span>
            
            {/* Unduh Laporan Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0EFEA] text-[#5A5A40] border border-[#D9D3C7] rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
                title="Unduh Laporan Buku Kas"
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EBE7DF]/30 border-b border-[#D9D3C7] text-xs text-[#7A7A6A] font-semibold py-3.5 uppercase tracking-wider">
                <th className="py-3.5 pl-4 w-12 text-center">No</th>
                <th className="py-3.5 w-40">Tanggal</th>
                <th className="py-3.5 w-16 text-center">Arus</th>
                <th className="py-3.5 w-48">Kategori</th>
                <th className="py-3.5">Deskripsi / Uraian Kegiatan</th>
                <th className="py-3.5 text-right pr-4 w-44">Jumlah Nominal</th>
                <th className="py-3.5 text-center w-24 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFEA] text-xs text-[#3D3D3D]">
              {paginatedTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7A7A6A]">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum terdapat rekaman transaksi untuk kriteria filter ini.
                  </td>
                </tr>
              ) : (
                paginatedTxs.map((tx, idx) => {
                  const number = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isIncoming = tx.type === 'masuk';

                  return (
                    <tr key={tx.id} className="hover:bg-[#F7F5F0]/60 transition">
                      <td className="py-3 pl-4 text-center text-[#7A7A6A] font-medium">{number}</td>
                      <td className="py-3 font-mono text-[#7A7A6A] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#7A7A6A]" />
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex p-1 rounded-full ${
                          isIncoming 
                            ? 'bg-[#E3EFE5] text-[#2E6B3E] border border-[#C3DFC8]' 
                            : 'bg-[#FDF4EF] text-[#A66E4E] border border-[#F6DFD0]'
                        }`}>
                          {isIncoming ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg font-bold text-[9px] border ${
                            isIncoming 
                              ? 'bg-[#E3EFE5] text-[#2E6B3E] border-[#C3DFC8]' 
                              : 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]'
                          }`}>
                            {tx.category}
                          </span>
                          {tx.subCategory && (
                            <span className="text-[10px] text-[#A66E4E] font-bold font-sans bg-[#FDF4EF] px-1.5 py-0.2 rounded border border-[#F6DFD0] mt-0.5">
                              ↳ {tx.subCategory}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-[#2C2C24] max-w-sm sm:max-w-md truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className={`py-3 text-right pr-4 font-extrabold font-mono text-[13px] ${
                        isIncoming ? 'text-[#3E744A]' : 'text-[#A66E4E]'
                      }`}>
                        {isIncoming ? '+' : '-'}{formatRupiah(tx.amount)}
                      </td>
                      <td className="py-3 text-center pr-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(tx)}
                            className="p-1.5 text-[#7A7A6A] hover:bg-[#EBE7DF]/40 hover:text-[#2C2C24] rounded-lg transition cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0EFEA] bg-[#EBE7DF]/20">
            <div className="text-xs text-[#7A7A6A]">
              Menampilkan Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </div>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-[#D9D3C7] rounded-lg text-xs text-gray-600 hover:bg-[#F7F5F0] disabled:opacity-40 transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-[#D9D3C7] rounded-lg text-xs text-gray-600 hover:bg-[#F7F5F0] disabled:opacity-40 transition cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Entry Form Overlay */}
      {isOpenAddForm && (
        <div className="fixed inset-0 bg-[#3d3d2f]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden"
          >
            <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider font-sans">
                  {editingTransaction ? 'Edit Deskripsi & Rincian Transaksi' : 'Registrasi Transaksi Jurnal Kas'}
                </h3>
                <p className="text-[11px] text-[#EBE7DF]">
                  {editingTransaction ? 'Perbarui pencatatan deskripsi atau nominal mutasi jurnal kas' : 'Catat pemasukan atau alokasi belanja langsung ke pembukuan'}
                </p>
              </div>
              <button 
                onClick={() => setIsOpenAddForm(false)}
                className="text-white bg-[#4A4A35] hover:bg-[#3E3E2B] p-1.5 rounded-full text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTx} className="p-5 space-y-4 text-xs text-gray-700">
              
              {/* Type Switch */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Aliran Arus Kas Pencatatan *</label>
                <div className="grid grid-cols-2 gap-2 bg-[#F7F5F0] border border-[#D9D3C7] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('masuk')}
                    className={`py-2 text-center rounded-lg font-bold border transition cursor-pointer text-xs ${
                      txType === 'masuk' 
                        ? 'bg-white text-[#5A5A40] border-[#D9D3C7] shadow-sm' 
                        : 'text-[#7A7A6A] border-transparent hover:text-[#5A5A40]'
                    }`}
                  >
                    Dana Masuk (Penerimaan)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('keluar')}
                    className={`py-2 text-center rounded-lg font-bold border transition cursor-pointer text-xs ${
                      txType === 'keluar' 
                        ? 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0] shadow-sm' 
                        : 'text-[#7A7A6A] border-transparent hover:text-[#A66E4E]'
                    }`}
                  >
                    Dana Keluar (Belanja DIPA)
                  </button>
                </div>
              </div>

              {/* Sub-group layout for inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1">
                  <label className="font-bold text-[#3D3D3D]">Tanggal Transaksi *</label>
                  <input 
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="font-bold text-[#3D3D3D]">Nominal Transaksi (Rupiah) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    disabled={txType === 'masuk' && isSppPayment} // SPP is locked as per instructions
                    value={txAmount}
                    onChange={(e) => setTxAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-mono font-bold"
                  />
                  {txType === 'masuk' && isSppPayment && (
                    <span className="text-[9px] text-[#7A7A6A]">Terkonfigurasi tetap iuran bulanan {formatRupiah(getPrice(sppMonth))}</span>
                  )}
                </div>
              </div>

              {/* Conditionally reveal Student SPP linking if it's 'masuk' and user toggles SPP */}
              {txType === 'masuk' && (
                <div className="bg-[#EBE7DF]/30 p-4 border border-[#D9D3C7] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#5A5A40] flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#5A5A40]" />
                      Penerimaan Khusus SPP Bulanan?
                    </span>
                    <input 
                      type="checkbox"
                      checked={isSppPayment}
                      onChange={(e) => {
                        setIsSppPayment(e.target.checked);
                        if (e.target.checked) {
                          setTxCategory('Iuran Santri');
                          setTxAmount(getPrice(sppMonth));
                        } else {
                          setTxCategory(INCOME_CATEGORIES[0]);
                          setSelectedStudentId('');
                          setStudentSearchInput('');
                        }
                      }}
                      className="w-4 h-4 rounded text-[#5A5A40] bg-white border-[#D9D3C7] focus:ring-[#5A5A40]"
                    />
                  </div>

                  {isSppPayment && (
                    <div className="space-y-3 text-xs">
                      {/* Select SPP payment month */}
                      <div className="space-y-1">
                        <label className="font-bold text-[#3D3D3D]">Pilih Bulan Tagihan SPP *</label>
                        <select
                          value={sppMonth}
                          onChange={(e) => {
                            setSppMonth(e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                        >
                          <option value="2026-01">Januari 2026</option>
                          <option value="2026-02">Februari 2026</option>
                          <option value="2026-03">Maret 2026</option>
                          <option value="2026-04">April 2026</option>
                          <option value="2026-05">Mei 2026</option>
                          <option value="2026-06">Juni 2026</option>
                        </select>
                      </div>

                      <div className="p-3 bg-[#EAF2EC] border border-[#CBDCCF] rounded-xl text-[#2A5C35] space-y-1">
                        <strong className="block text-xs">📊 Rekap Pelunasan Kolektif:</strong>
                        <p className="text-[11px] leading-relaxed">
                          Terdeteksi sebanyak <strong className="underline">{students.filter(s => s.monthlyFeePaid && s.monthlyFeePaid[sppMonth] === true).length} santri</strong> telah melakukan pelunasan iuran untuk bulan <strong>{sppMonth}</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Category selection for standard Non-SPP (Incomes) OR DIPA allocations (Expenditures) */}
              {(!isSppPayment || txType === 'keluar') && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-[#3D3D3D]">
                      {txType === 'masuk' ? 'Kategori Dana Masuk *' : 'Akun DIPA Alokasi Belanja *'}
                    </label>
                    
                    <select
                      value={txCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTxCategory(val);
                        // Also auto select first subCategory if available
                        const matchingCat = dipaCategories.find(c => c.name === val || c.id === val);
                        if (matchingCat && matchingCat.subCategories && matchingCat.subCategories.length > 0) {
                          setTxSubCategory(matchingCat.subCategories[0]);
                          setTxDesc(`${val} (${matchingCat.subCategories[0]})`);
                        } else {
                          setTxSubCategory('');
                          setTxDesc(`${val}`);
                        }
                      }}
                      required
                      className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-medium text-gray-700"
                    >
                      <option value="" disabled>-- Pilih Kategori --</option>
                      {txType === 'masuk' ? (
                        INCOME_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      ) : (
                        dipaCategories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.code} - {cat.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* SubCategory Selection if matching category has subCategories */}
                  {txType === 'keluar' && (() => {
                    const matchingCat = dipaCategories.find(c => c.name === txCategory || c.id === txCategory);
                    if (matchingCat && matchingCat.subCategories && matchingCat.subCategories.length > 0) {
                      return (
                        <div className="space-y-1 bg-[#F7F5F0]/60 p-3 rounded-xl border border-[#D9D3C7]">
                          <label className="font-bold text-[#5A5A40] text-[11px] block uppercase tracking-wider">Sub-Belanja Alokasi *</label>
                          <select
                            value={txSubCategory}
                            onChange={(e) => {
                              const subval = e.target.value;
                              setTxSubCategory(subval);
                              setTxDesc(`${txCategory} (${subval})`);
                            }}
                            required
                            className="w-full px-3 py-2 bg-white border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-medium text-gray-750"
                          >
                            {matchingCat.subCategories.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Description box */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Catatan Jurnal / Deskripsi Uraian Kegiatan *</label>
                <textarea 
                  required
                  rows={2}
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Keterangan uraian alur kas secara detail..."
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                />
              </div>

              {/* Save Controls */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F0EFEA]">
                <button
                  type="button"
                  onClick={() => setIsOpenAddForm(false)}
                  className="px-4 py-2 text-[#7A7A6A] bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg hover:bg-[#EBE7DF] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi Kas'}
                  {editingTransaction ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Elegantly Coordinated Confirmation Dialog */}
      {activeConfirm && (
        <div className="fixed inset-0 bg-[#3d3d2f]/35 backdrop-blur-xs flex items-center justify-center z-[150] p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden p-6 text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
              <Trash className="w-5 h-5 text-rose-600" />
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
