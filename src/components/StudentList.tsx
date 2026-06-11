/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  PhoneCall,
  Save,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react';
import { Student } from '../types';
import { formatRupiah } from '../utils/financeHelpers';

interface StudentListProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
  onNavigateToTab: (tab: string, state?: any) => void;
}

const CLASSES = [
  'Kelas VII-A (Ula)', 'Kelas VII-B (Ula)',
  'Kelas VIII-A (Ula)', 'Kelas VIII-B (Ula)',
  'Kelas IX-A (Ula)', 'Kelas IX-B (Ula)',
  'Kelas X-Ulya 1', 'Kelas X-Ulya 2',
  'Kelas XI-Ulya 1', 'Kelas XI-Ulya 2',
  'Kelas XII-Ulya 1', 'Kelas XII-Ulya 2'
];

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

export default function StudentList({ students, onUpdateStudents, onNavigateToTab }: StudentListProps) {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [paymentFilterMonth, setPaymentFilterMonth] = useState('2026-06');
  const [paymentFilterStatus, setPaymentFilterStatus] = useState('All'); // All, Lunas, Tunggakan
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Edit fields modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Excel Import states
  const [isImporting, setIsImporting] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importStatusList, setImportStatusList] = useState<{
    status: 'valid' | 'warning' | 'error';
    message: string;
    student: Student;
  }[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'overwrite' | 'skip'>('overwrite');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    className: CLASSES[0],
    parentName: '',
    parentPhone: '',
  });

  // Filter & Search logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Search term (NIS, name, parent phone, parent name)
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nis.includes(searchTerm) ||
        student.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentPhone.includes(searchTerm);

      // 2. Class filter
      const matchesClass = selectedClass === 'All' || student.className === selectedClass;

      // 3. Payment status filter
      const paidInMonth = student.monthlyFeePaid[paymentFilterMonth] || false;
      let matchesPayment = true;
      if (paymentFilterStatus === 'Lunas') {
        matchesPayment = paidInMonth === true;
      } else if (paymentFilterStatus === 'Tunggakan') {
        matchesPayment = paidInMonth === false;
      }

      return matchesSearch && matchesClass && matchesPayment;
    });
  }, [students, searchTerm, selectedClass, paymentFilterMonth, paymentFilterStatus]);

  // Reset pagination on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, paymentFilterMonth, paymentFilterStatus]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;

  // Toggle singular month payment status instantly from table grid
  const handleTogglePayment = (studentId: string, month: string) => {
    const updated = students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          monthlyFeePaid: {
            ...s.monthlyFeePaid,
            [month]: !s.monthlyFeePaid[month],
          },
        };
      }
      return s;
    });
    onUpdateStudents(updated);
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const headers = [
      "No",
      "NIS", 
      "Nama Lengkap", 
      "Kelas / Jenjang"
    ];
    
    const sampleRows = [
      [1, "26.101", "Ahmad Fauzi", "Kelas VII-A (Ula)"],
      [2, "26.102", "Siti Aminah", "Kelas X-Ulya 1"],
      [3, "26.103", "Rizky Pratama", "Kelas XII-Ulya 1"]
    ];

    const instructionRows = [
      ["PANDUAN PENGISIAN TEMPLATE IMPORT SANTRI"],
      ["1. Jangan mengubah nama kolom pada baris pertama."],
      ["2. Nomor Induk Santri (NIS) wajib diisi dan harus unik untuk setiap santri."],
      ["3. Nama Lengkap wajib diisi."],
      ["4. Kolom 'Kelas / Jenjang' harus diisi dari salah satu daftar kelas berikut:"],
      ...CLASSES.map(cls => [`   - ${cls}`]),
      ["5. Seluruh santri baru yang diimpor akan didefaultkan memiliki status BELUM membayar iuran bulanan."]
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths so content is legible
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 15 }, // NIS
      { wch: 30 }, // Nama Lengkap
      { wch: 25 }  // Kelas / Jenjang
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Santri");
    
    // Add instruction sheet
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Petunjuk Penggunaan");

    XLSX.writeFile(wb, "Templat_Impor_Santri_Daarul_Al_Hambra.xlsx");
  };

  // Parse excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (rows.length <= 1) {
          alert("File Excel kosong atau tidak memiliki data santri di bawah baris header.");
          return;
        }

        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        
        // Find Column Indices
        const nisIdx = headers.findIndex(h => h.includes('nis') || h.includes('nomor induk') || h.includes('no. induk') || h === 'no induk');
        const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('nama lengkap') || h.includes('singkat') || h === 'nama');
        const classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('jenjang') || h.includes('grade'));

        if (nisIdx === -1 || nameIdx === -1) {
          alert("Gagal mengimpor: Pastikan Excel memiliki kolom 'NIS' dan 'Nama Lengkap' pada baris pertama.");
          return;
        }

        const parsed: typeof importStatusList = [];

        // Parse rows starting from Index 1
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Check if key elements are empty (like NIS and Name)
          const rawNis = String(row[nisIdx] || '').trim();
          const rawName = String(row[nameIdx] || '').trim();
          if (!rawNis && !rawName) continue; // Skip empty rows

          if (!rawNis) {
            parsed.push({
              status: 'error',
              message: `Baris ${i + 1}: NIS kosong.`,
              student: { id: '', nis: '', name: rawName, className: '', parentName: '', parentPhone: '', monthlyFeePaid: {} }
            });
            continue;
          }

          if (!rawName) {
            parsed.push({
              status: 'error',
              message: `Baris ${i + 1}: Nama santri kosong.`,
              student: { id: '', nis: rawNis, name: '', className: '', parentName: '', parentPhone: '', monthlyFeePaid: {} }
            });
            continue;
          }

          // Try to map class name
          const rawClass = String(row[classIdx] || '').trim();
          let matchedClass = CLASSES[0];
          let classWarning = '';
          if (rawClass) {
            const cleanRawClass = rawClass.toLowerCase().replace(/[\s-]/g, '');
            const found = CLASSES.find(c => c.toLowerCase().replace(/[\s-]/g, '').includes(cleanRawClass) || cleanRawClass.includes(c.toLowerCase().replace(/[\s-]/g, '')));
            if (found) {
              matchedClass = found;
            } else {
              classWarning = `Kelas "${rawClass}" tidak dikenal, diatur ke default "${CLASSES[0]}".`;
            }
          }

          // Default parent info since they are omitted from Excel
          const rawParentName = `Bp/Ibu ${rawName}`;
          const cleanedPhone = '628123456789';

          // Monthly payments default to FALSE as per user request ("belum melakukan pembayaran")
          const monthlyFeePaid: { [key: string]: boolean } = {
            '2026-01': false,
            '2026-02': false,
            '2026-03': false,
            '2026-04': false,
            '2026-05': false,
            '2026-06': false,
          };

          // Check if already exists in main database
          const existing = students.find(s => s.nis === rawNis);
          let itemStatus: 'valid' | 'warning' | 'error' = 'valid';
          let msg = 'Siap diimpor.';

          if (existing) {
            itemStatus = 'warning';
            msg = `Siswa dengan NIS "${rawNis}" sudah ada (${existing.name}). Data profil akan diperbarui.`;
          }

          if (classWarning) {
            itemStatus = 'warning';
            msg = [msg !== 'Siap diimpor.' ? msg : '', classWarning].filter(Boolean).join(' ');
          }

          parsed.push({
            status: itemStatus,
            message: msg || 'Siap diimpor.',
            student: {
              id: existing ? existing.id : `santri-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              nis: rawNis,
              name: rawName,
              className: matchedClass,
              parentName: rawParentName,
              parentPhone: cleanedPhone,
              monthlyFeePaid
            }
          });
        }

        setImportStatusList(parsed);

      } catch (err) {
        console.error(err);
        alert("Gagal memproses file Excel. Pastikan format spreadsheet Anda valid.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = () => {
    const toImport = importStatusList.filter(row => row.status !== 'error');
    if (toImport.length === 0) {
      alert("Tidak ada data valid yang bisa diimpor.");
      return;
    }

    let updatedList = [...students];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    toImport.forEach((item) => {
      const matchIdx = updatedList.findIndex(s => s.nis === item.student.nis);
      
      if (matchIdx !== -1) {
        if (duplicateMode === 'overwrite') {
          const existingStudent = updatedList[matchIdx];
          updatedList[matchIdx] = {
            ...existingStudent,
            name: item.student.name,
            className: item.student.className,
            // Keep existingStudent.monthlyFeePaid untouched since Excel template does not contain payment columns
          };
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        updatedList.unshift(item.student);
        createdCount++;
      }
    });

    onUpdateStudents(updatedList);
    alert(`Sukses mengimpor!\n• Registrasi Baru: ${createdCount} santri\n• Diperbarui: ${updatedCount} santri\n• Dilewati: ${skippedCount} santri`);
    
    // Reset and close
    setIsImporting(false);
    setExcelFile(null);
    setImportStatusList([]);
  };

  const resetExcelImportState = () => {
    setExcelFile(null);
    setImportStatusList([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nis: student.nis,
      name: student.name,
      className: student.className,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
    });
    setIsAddingStudent(false);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setFormData({
      nis: `26.${String(1000 + students.length + 1).substring(1)}`,
      name: '',
      className: CLASSES[0],
      parentName: '',
      parentPhone: '6281',
    });
    setEditingStudent(null);
    setIsAddingStudent(true);
  };

  // Save edit or new student
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nis.trim() || !formData.parentPhone.trim()) {
      alert('Harap isi semua kolom wajib!');
      return;
    }

    if (isAddingStudent) {
      // create new
      const newStudent: Student = {
        id: `santri-${Date.now()}`,
        nis: formData.nis,
        name: formData.name,
        className: formData.className,
        parentName: formData.parentName || `Bp/Ibu ${formData.name}`,
        parentPhone: formData.parentPhone,
        monthlyFeePaid: {
          '2026-01': true,
          '2026-02': true,
          '2026-03': true,
          '2026-04': false,
          '2026-05': false,
          '2026-06': false,
        }
      };
      onUpdateStudents([newStudent, ...students]);
      setIsAddingStudent(false);
    } else if (editingStudent) {
      // edit
      const updated = students.map((s) => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            nis: formData.nis,
            name: formData.name,
            className: formData.className,
            parentName: formData.parentName,
            parentPhone: formData.parentPhone,
          };
        }
        return s;
      });
      onUpdateStudents(updated);
      setEditingStudent(null);
    }
  };

  // Delete student with confirmation
  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data santri ini? Semua riwayat iuran juga akan dihapus.')) {
      const updated = students.filter(s => s.id !== studentId);
      onUpdateStudents(updated);
      setEditingStudent(null);
    }
  };

  // Quick Action: Mark all students in the filtered view as paid for selected month
  const handleMarkAllFilterAsPaid = () => {
    const confirmation = window.confirm(`Apakah Anda yakin ingin menandai LUNAS iuran bulan ${paymentFilterMonth} untuk semua ${filteredStudents.length} santri dalam filter saat ini?`);
    if (!confirmation) return;

    const filteredIds = new Set(filteredStudents.map(s => s.id));
    const updated = students.map(s => {
      if (filteredIds.has(s.id)) {
        return {
          ...s,
          monthlyFeePaid: {
            ...s.monthlyFeePaid,
            [paymentFilterMonth]: true,
          }
        };
      }
      return s;
    });
    onUpdateStudents(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Database Santri Pondok Pesantren</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Kelola data {students.length} santri terdaftar dan pencatatan iuran bulanan Rp 750.000,-.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0 mt-2 sm:mt-0">
          <button 
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F7F5F0] text-[#5A5A40] border border-[#D9D3C7] rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E6B3E]" />
            Impor dari Excel
          </button>
          
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F7F5F0] text-[#7A7A6A] border border-[#D9D3C7] rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            title="Unduh templat file Excel untuk pengisian data santri massal"
          >
            <Download className="w-3.5 h-3.5 text-[#A66E4E]" />
            Unduh Templat Excel
          </button>

          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registrasi Santri Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-[24px] border border-[#E5E1DA] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#7A7A6A]" />
            <input 
              type="text"
              placeholder="Cari Santri (Nama, NIS, Wali, No. WA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40]"
            >
              <option value="All">Semua Jenjang Kelas</option>
              {CLASSES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Month Selector */}
          <div>
            <select
              value={paymentFilterMonth}
              onChange={(e) => setPaymentFilterMonth(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs font-semibold text-[#5A5A40] focus:outline-none"
            >
              <option value="2026-01">Cek Status: Januari 2026</option>
              <option value="2026-02">Cek Status: Februari 2026</option>
              <option value="2026-03">Cek Status: Maret 2026</option>
              <option value="2026-04">Cek Status: April 2026</option>
              <option value="2026-05">Cek Status: Mei 2026</option>
              <option value="2026-06">Cek Status: Juni 2026</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F0EFEA]">
          <div className="flex items-center gap-1.5 text-xs text-[#7A7A6A]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status Iuran ({paymentFilterMonth}):</span>
            <div className="flex bg-[#F7F5F0] p-0.5 rounded-lg ml-2 border border-[#D9D3C7]">
              {['All', 'Lunas', 'Tunggakan'].map((status) => (
                <button
                  key={status}
                  onClick={() => setPaymentFilterStatus(status)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                    paymentFilterStatus === status 
                      ? 'bg-white text-[#5A5A40] shadow-xs border border-[#D9D3C7]' 
                      : 'text-[#7A7A6A] hover:text-[#5A5A40]'
                  }`}
                >
                  {status === 'All' ? 'Semua' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A7A6A]">Ditemukan: <strong>{filteredStudents.length}</strong></span>
            
            {paymentFilterStatus === 'Tunggakan' && filteredStudents.length > 0 && (
              <button
                onClick={() => onNavigateToTab('notifikasi', { filterClass: selectedClass, filterMonth: paymentFilterMonth })}
                className="text-[11px] bg-[#FDF4EF] text-[#A66E4E] border border-[#F6DFD0] px-3 py-1 rounded-lg font-bold hover:bg-[#FCEDE4] transition flex items-center gap-1 cursor-pointer"
              >
                <PhoneCall className="w-3" />
                Hubungi {filteredStudents.length} Penunggak
              </button>
            )}

            {filteredStudents.length > 0 && (
              <button
                onClick={handleMarkAllFilterAsPaid}
                className="text-[11px] bg-[#EBE7DF] text-[#5A5A40] border border-[#D9D3C7] px-3 py-1 rounded-lg font-bold hover:bg-[#E2DDD5] transition flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3" />
                Tandai Lunas Massal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Students Records Table */}
      <div className="bg-white rounded-[24px] border border-[#E5E1DA] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EBE7DF]/30 border-b border-[#D9D3C7] text-xs text-[#7A7A6A] font-semibold py-3.5 uppercase tracking-wider">
                <th className="py-3.5 pl-4 w-12 text-center">No</th>
                <th className="py-3.5 pl-2 w-32">NIS</th>
                <th className="py-3.5">Nama Lengkap</th>
                <th className="py-3.5">Kelas / Jenjang</th>
                <th className="py-3.5 text-center">Rekap Pembayaran (Jan - Jun)</th>
                <th className="py-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFEA] text-xs text-[#3D3D3D]">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A7A6A]">
                    <XCircle className="w-8 h-8 text-[#A66E4E] opacity-70 mx-auto mb-2 animate-bounce" />
                    Tidak ada data santri yang cocok dengan kriteria filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => {
                  const num = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={student.id} className="hover:bg-[#F7F5F0]/60 transition group">
                      <td className="py-3 pl-4 text-center text-[#7A7A6A] font-medium">{num}</td>
                      <td className="py-3 pl-2 font-mono text-[#7A7A6A]">{student.nis}</td>
                      <td className="py-3 font-semibold text-[#2C2C24] group-hover:text-[#5A5A40] transition">
                        {student.name}
                      </td>
                      <td className="py-3 text-[#3D3D3D]">{student.className}</td>
                      <td className="py-3">
                        {/* Interactive Month-by-month Checkbox Grid */}
                        <div className="flex justify-center gap-1.5">
                          {MONTHS.map((m, idx) => {
                            const isPaid = student.monthlyFeePaid[m];
                            const label = MONTH_LABELS[idx];
                            return (
                              <button
                                key={m}
                                onClick={() => handleTogglePayment(student.id, m)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex flex-col items-center gap-0.5 border cursor-pointer select-none transition-all ${
                                  isPaid 
                                    ? 'bg-[#E3EFE5] border-[#C3DFC8] text-[#2E6B3E] hover:bg-[#D5EAD9]' 
                                    : 'bg-[#FDF4EF] border-[#F6DFD0] text-[#A66E4E] hover:bg-[#FCEDE4]'
                                }`}
                                title={`${label} 2026: Ubah status`}
                              >
                                <span>{label}</span>
                                {isPaid ? <CheckCircle2 className="w-3" /> : <XCircle className="w-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 text-[#5A5A40] hover:text-[#4A4A34] hover:bg-[#EBE7DF] rounded-lg transition mr-2 cursor-pointer"
                          title="Edit Profil"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0EFEA] bg-[#EBE7DF]/20">
            <div className="text-xs text-[#7A7A6A]">
              Menampilkan <strong>{Math.min(filteredStudents.length, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong>{Math.min(filteredStudents.length, currentPage * itemsPerPage)}</strong> dari <strong>{filteredStudents.length}</strong> santri
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 px-2.5 bg-white border border-[#D9D3C7] rounded-lg text-xs text-gray-600 hover:bg-[#F7F5F0] disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-700 font-semibold font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 px-2.5 bg-white border border-[#D9D3C7] rounded-lg text-xs text-gray-600 hover:bg-[#F7F5F0] disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Overlay Panel / Slide-over Modal */}
      {(editingStudent || isAddingStudent) && (
        <div className="fixed inset-0 bg-[#3d3d2f]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-[24px] shadow-xl border border-[#E5E1DA] overflow-hidden"
          >
            <div className="bg-[#5A5A40] text-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider font-sans">
                {isAddingStudent ? 'Registrasi Santri Baru' : 'Perbarui Profil Santri'}
              </h3>
              <p className="text-[11px] text-[#EBE7DF]">Silakan isi detail data induk kependidikan santri.</p>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 text-xs text-gray-700">
              {/* NIS input */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Nomor Induk Santri (NIS) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.nis} 
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Contoh: 26.001"
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                />
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Nama Lengkap Santri *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap santri..."
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                />
              </div>

              {/* Class Selection */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Jenjang Kelas *</label>
                <select 
                  value={formData.className} 
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                >
                  {CLASSES.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Parent Name */}
              <div className="space-y-1">
                <label className="font-bold text-[#3D3D3D]">Nama Orang Tua / Wali *</label>
                <input 
                  type="text" 
                  required
                  value={formData.parentName} 
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="Nama Ibu / Bapak / Wali santri..."
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none"
                />
              </div>

              {/* Parent Phone */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-[#3D3D3D]">No. HP / WhatsApp Orang Tua *</label>
                  <span className="text-[10px] text-gray-400">Format KD Negara, contoh: 62812xxx</span>
                </div>
                <input 
                  type="text" 
                  required
                  value={formData.parentPhone} 
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="628123456789"
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl focus:border-[#5A5A40] focus:outline-none font-mono"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#F0EFEA]">
                {!isAddingStudent && editingStudent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(editingStudent.id)}
                    className="flex items-center gap-1 text-[#A66E4E] hover:text-white hover:bg-[#A66E4E] px-3 py-1.5 rounded-lg border border-[#F6DFD0] transition cursor-pointer font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
                
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setEditingStudent(null); setIsAddingStudent(false); }}
                    className="px-3 py-1.5 text-[#7A7A6A] bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg hover:bg-[#EBE7DF] transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-lg font-semibold transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 bg-[#3d3d2f]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white rounded-[24px] shadow-2xl border border-[#E5E1DA] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider font-sans flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Impor Massal Santri via Excel
                </h3>
                <p className="text-[11px] text-[#EBE7DF]">Tambahkan atau perbarui data santri secara instan dengan file spreadsheet.</p>
              </div>
              <button 
                onClick={() => { setIsImporting(false); resetExcelImportState(); }}
                className="text-white hover:text-gray-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Stepper / Instructions */}
              <div className="bg-[#F7F5F0] border border-[#D9D3C7] rounded-2xl p-4 text-xs text-[#2C2C24] space-y-2.5">
                <p className="font-bold text-[#5A5A40]">Panduan Mengimpor Data Santri:</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#5A5A51]">
                  <li>Unduh file templat resmi agar susunan kolom sesuai dengan sistem. 
                    <button 
                      onClick={handleDownloadTemplate} 
                      className="ml-1.5 text-xs text-[#A66E4E] hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh Templat Excel
                    </button>
                  </li>
                  <li>Isi nama, NIS, kelas, nama wali, dan nomor WhatsApp wali di file tersebut.</li>
                  <li>Simpan sebagai file excel (<strong>.xlsx</strong> atau <strong>.xls</strong>) lalu klik unggah di bawah ini.</li>
                </ol>
              </div>

              {/* Upload Dropzone / Target */}
              {!excelFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D9D3C7] hover:border-[#5A5A40] bg-[#F7F5F0]/55 hover:bg-[#F7F5F0]/80 rounded-[20px] p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-1">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2C2C24]">Klik atau Seret file Excel Anda di sini</p>
                    <p className="text-[11px] text-[#7A7A6A] mt-1">Mendukung file berformat .xlsx dan .xls</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info Card */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#E3EFE5]/40 border border-[#C3DFC8] rounded-xl p-4 gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 text-[#2E6B3E] rounded-lg">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-[#2C2C24]">{excelFile.name}</p>
                        <p className="text-[10px] text-[#5A5A51] font-mono">{(excelFile.size / 1024).toFixed(1)} KB • Terbaca {importStatusList.length} data santri</p>
                      </div>
                    </div>
                    <button 
                      onClick={resetExcelImportState}
                      className="px-3 py-1 bg-white border border-[#D9D3C7] hover:bg-[#FDF4EF] text-[#A66E4E] hover:text-red-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      Ganti File
                    </button>
                  </div>

                  {/* Duplicate Handle Strategy Option */}
                  <div className="bg-white border border-[#E5E1DA] rounded-xl p-4 text-xs space-y-2.5">
                    <p className="font-bold text-[#2C2C24]">Pengaturan Duplikasi NIS:</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="duplicateMode" 
                          value="overwrite"
                          checked={duplicateMode === 'overwrite'}
                          onChange={() => setDuplicateMode('overwrite')}
                          className="accent-[#5A5A40]"
                        />
                        <span className="font-medium">Perbarui Profil Santri & Gabung Status Iuran <span className="text-[10px] text-[#7A7A6A]">(Rekomendasi)</span></span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="duplicateMode" 
                          value="skip"
                          checked={duplicateMode === 'skip'}
                          onChange={() => setDuplicateMode('skip')}
                          className="accent-[#5A5A40]"
                        />
                        <span className="font-medium">Abaikan data jika NIS sudah terdaftar</span>
                      </label>
                    </div>
                  </div>

                  {/* Parsed Preview List */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#2C2C24] flex items-center gap-1">
                      <span>Daftar Santri yang Terdeteksi ({importStatusList.length}):</span>
                    </p>
                    <div className="border border-[#E5E1DA] rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#EBE7DF]/30 border-b border-[#D9D3C7] text-[11px] text-[#7A7A6A] font-semibold uppercase">
                            <th className="p-3 w-10 text-center">No</th>
                            <th className="p-3 w-28">NIS</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3 w-32">Kelas</th>
                            <th className="p-3">Status Izin Impor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EFEA] text-[11px] text-[#3D3D3D]">
                          {importStatusList.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-[#5A5A40]">{row.student.nis || '-'}</td>
                              <td className="p-3 font-semibold">{row.student.name || '-'}</td>
                              <td className="p-3 text-gray-600">{row.student.className || '-'}</td>
                              <td className="p-3">
                                {row.status === 'valid' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E3EFE5] text-[#2E6B3E] font-bold text-[10px]">
                                    <Check className="w-3 h-3" /> Baru & Valid
                                  </span>
                                )}
                                {row.status === 'warning' && (
                                  <span className="inline-flex flex-col text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded-lg w-full">
                                    <span className="flex items-center gap-1 font-bold">
                                      <AlertTriangle className="w-3 h-3 shrink-0" /> Ada Penyesuaian
                                    </span>
                                    <span className="text-[9px] mt-0.5 leading-tight font-normal text-amber-600">{row.message}</span>
                                  </span>
                                )}
                                {row.status === 'error' && (
                                  <span className="inline-flex flex-col text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 p-1.5 rounded-lg w-full">
                                    <span className="flex items-center gap-1 font-bold">
                                      <XCircle className="w-3 h-3 shrink-0" /> Error
                                    </span>
                                    <span className="text-[9px] mt-0.5 leading-tight font-normal text-red-600">{row.message}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F7F5F0] border-t border-[#E5E1DA] p-4 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-[#7A7A6A] font-mono">
                {excelFile && `${importStatusList.filter(r => r.status !== 'error').length} data siap dimasukkan.`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsImporting(false); resetExcelImportState(); }}
                  className="px-4 py-2 text-xs font-bold text-[#7A7A6A] bg-white border border-[#D9D3C7] rounded-xl hover:bg-[#EBE7DF] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!excelFile || importStatusList.filter(r => r.status !== 'error').length === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 text-xs font-bold bg-[#5A5A40] text-white rounded-xl hover:bg-[#4A4A34] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Proses Impor
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
