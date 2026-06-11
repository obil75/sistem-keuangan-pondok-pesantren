/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { Transaction, Student, DipaCategory } from '../types';
import { formatRupiah, formatDate } from '../utils/financeHelpers';

interface TransactionsProps {
  transactions: Transaction[];
  students: Student[];
  dipaCategories: DipaCategory[];
  onAddTransaction: (newTx: Transaction, updatedStudents?: Student[], updatedDipa?: DipaCategory[]) => void;
}

const INCOME_CATEGORIES = [
  'Dana Hibah Yayasan',
  'Donasi Publik & Alumni',
  'Unit Bisnis Pesantren',
  'Infaq Khusus',
  'Lain-lain'
];

export default function Transactions({ transactions, students, dipaCategories, onAddTransaction }: TransactionsProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [catFilter, setCatFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Form toggles
  const [isOpenAddForm, setIsOpenAddForm] = useState(false);

  // Form state
  const [txType, setTxType] = useState<'masuk' | 'keluar'>('masuk');
  const [txCategory, setTxCategory] = useState('');
  const [txAmount, setTxAmount] = useState(750000);
  const [txDate, setTxDate] = useState('2026-06-10');
  const [txDesc, setTxDesc] = useState('');
  
  // Specific SPP variables
  const [isSppPayment, setIsSppPayment] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sppMonth, setSppMonth] = useState('2026-06');
  const [studentSearchInput, setStudentSearchInput] = useState('');

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

  // Autocomplete set category defaults when type changes
  const handleTypeChange = (type: 'masuk' | 'keluar') => {
    setTxType(type);
    if (type === 'masuk') {
      setIsSppPayment(true);
      setTxCategory('Iuran Santri');
      setTxAmount(750000);
    } else {
      setIsSppPayment(false);
      setTxCategory(dipaCategories[0]?.name || '');
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

  // Submit new transaction
  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      alert('Jumlah nominal transaksi harus lebih besar dari 0!');
      return;
    }

    if (txType === 'masuk' && isSppPayment && !selectedStudentId) {
      alert('Harap pilih santri pembayar iuran SPP terlebih dahulu!');
      return;
    }

    if (!txCategory) {
      alert('Harap masukkan atau plih kategori!');
      return;
    }

    // Build the new Transaction object
    const newTx: Transaction = {
      id: `tx-manual-${Date.now()}`,
      type: txType,
      category: txCategory,
      amount: txAmount,
      date: txDate,
      description: txDesc.trim() || `${txType === 'masuk' ? 'Penerimaan' : 'Pengeluaran'} ${txCategory}`,
      refId: isSppPayment ? selectedStudentId : undefined,
      paymentMonth: isSppPayment ? sppMonth : undefined,
    };

    let updatedStudents: Student[] | undefined;
    let updatedDipa: DipaCategory[] | undefined;

    // SCENARIO 1: It is an SPP PAYMENT -> we must mark this student as PAID in the database
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

    // SCENARIO 2: It is a DEBIT/EXPENSE -> we must update the realized amount for this DIPA category
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

    // Trigger action up to App state
    onAddTransaction(newTx, updatedStudents, updatedDipa);

    // Reset Form & Close
    setIsOpenAddForm(false);
    setTxDesc('');
    setSelectedStudentId('');
    setStudentSearchInput('');
    setTxAmount(750000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Buku Kas & Jurnal Transaksi</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Jurnal pencatatan mutasi kredit/debit keuangan pesantren yang disinkronisasikan ke data DIPA dan SPP.</p>
        </div>
        <button 
          onClick={() => {
            setIsOpenAddForm(true);
            handleTypeChange('masuk'); // default form state
          }}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFEA] text-xs text-[#3D3D3D]">
              {paginatedTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A7A6A]">
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
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg font-bold text-[9px] border ${
                          isIncoming 
                            ? 'bg-[#E3EFE5] text-[#2E6B3E] border-[#C3DFC8]' 
                            : 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-[#2C2C24] max-w-sm sm:max-w-md truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className={`py-3 text-right pr-4 font-extrabold font-mono text-[13px] ${
                        isIncoming ? 'text-[#3E744A]' : 'text-[#A66E4E]'
                      }`}>
                        {isIncoming ? '+' : '-'}{formatRupiah(tx.amount)}
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
                <h3 className="text-sm font-semibold uppercase tracking-wider font-sans">Registrasi Transaksi Jurnal Kas</h3>
                <p className="text-[11px] text-[#EBE7DF]">Catat pemasukan atau alokasi belanja langsung ke pembukuan</p>
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
                    disabled={txType === 'masuk' && isSppPayment} // SPP is locked at 750,000 as per instructions
                    value={txAmount}
                    onChange={(e) => setTxAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-mono font-bold"
                  />
                  {txType === 'masuk' && isSppPayment && (
                    <span className="text-[9px] text-[#7A7A6A]">Terkonfigurasi tetap iuran bulanan Rp 750.000,-</span>
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
                          setTxAmount(750000);
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
                      {/* Search Santri */}
                      <div className="space-y-1 relative">
                        <label className="font-bold text-[#3D3D3D]">Cari Data Santri Pembayar *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#7A7A6A]" />
                          <input 
                            type="text"
                            placeholder="Ketik Nama Santri atau NIS (Contoh: Ahmad)..."
                            value={studentSearchInput}
                            onChange={(e) => {
                              setStudentSearchInput(e.target.value);
                              if (selectedStudentId) {
                                setSelectedStudentId('');
                              }
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>

                        {/* Search recommendations */}
                        {studentSuggestions.length > 0 && !selectedStudentId && (
                           <div className="absolute z-10 w-full bg-white border border-[#D9D3C7] rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto divide-y divide-[#F0EFEA]">
                             {studentSuggestions.map((s) => (
                               <button
                                 key={s.id}
                                 type="button"
                                 onClick={() => handleSelectStudent(s)}
                                 className="w-full text-left px-3 py-2 hover:bg-[#EBE7DF]/50 transition text-xs font-semibold flex justify-between items-center cursor-pointer text-[#3D3D3D]"
                               >
                                 <span>{s.name} <strong className="text-gray-400 font-normal">({s.nis})</strong></span>
                                 <span className="text-[10px] text-[#5A5A40] bg-[#EBE7DF] px-2 py-0.5 rounded font-bold">{s.className}</span>
                               </button>
                             ))}
                           </div>
                        )}
                      </div>

                      {/* Select SPP payment month */}
                      <div className="space-y-1">
                        <label className="font-bold text-[#3D3D3D]">Pilih Bulan Tagihan SPP *</label>
                        <select
                          value={sppMonth}
                          onChange={(e) => {
                            setSppMonth(e.target.value);
                            if (selectedStudent) {
                              setTxDesc(`Pembayaran Iuran SPP Bulanan ${e.target.value} - ${selectedStudent.name} (${selectedStudent.nis})`);
                            }
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

                      {selectedStudent && (
                        <div className="p-3 bg-[#E3EFE5] border border-[#C3DFC8] rounded-xl text-[#2E6B3E] text-[11px] leading-relaxed flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#2E6B3E] mt-0.5 shrink-0" />
                          <div>
                            <strong>Validasi Santri Ditemukan:</strong> {selectedStudent.name} ({selectedStudent.nis}) - {selectedStudent.className}. Wali: {selectedStudent.parentName}. 
                            <br />
                            Status Bulan {sppMonth}: <span className="font-bold underline">{selectedStudent.monthlyFeePaid[sppMonth] ? 'SUDAH LUNAS' : 'MENUNGGAK (Akan diperbarui otomatis setelah simpan)'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Category selection for standard Non-SPP (Incomes) OR DIPA allocations (Expenditures) */}
              {(!isSppPayment || txType === 'keluar') && (
                <div className="space-y-1">
                  <label className="font-bold text-[#3D3D3D]">
                    {txType === 'masuk' ? 'Kategori Dana Masuk *' : 'Akun DIPA Alokasi Belanja *'}
                  </label>
                  
                  <select
                    value={txCategory}
                    onChange={(e) => {
                      setTxCategory(e.target.value);
                      setTxDesc(`Realisasi Penyerapan Belanja DIPA: ${e.target.value}`);
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
                  className="px-4 py-2 text-[#7A7A6A] bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg hover:bg-[#EBE7DF] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-lg font-bold shadow-xs transition"
                >
                  Simpan Transaksi Kas
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
