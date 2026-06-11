/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  CheckCircle,
  Clock,
  PieChart,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Student, DipaCategory, Transaction } from '../types';
import { formatRupiah, getMonthName } from '../utils/financeHelpers';

interface ReportsProps {
  students: Student[];
  dipaCategories: DipaCategory[];
  transactions: Transaction[];
}

export default function Reports({ students, dipaCategories, transactions }: ReportsProps) {
  const [reportType, setReportType] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  // PRINT HELPER
  const handlePrint = () => {
    window.print();
  };

  // MONTHLY STATS CALCULATIONS (DYNAMIC)
  const monthlyData = useMemo(() => {
    // filter transactions matching YYYY-MM
    const monthlyTxs = transactions.filter(tx => tx.date.startsWith(selectedMonth));
    
    let totalSppIncome = 0;
    const nonSppIncomeBreakdown: Record<string, number> = {};
    const dipaOutBreakdown: Record<string, number> = {};
    let totalIn = 0;
    let totalOut = 0;

    monthlyTxs.forEach(tx => {
      if (tx.type === 'masuk') {
        totalIn += tx.amount;
        if (tx.category === 'Iuran Santri') {
          totalSppIncome += tx.amount;
        } else {
          nonSppIncomeBreakdown[tx.category] = (nonSppIncomeBreakdown[tx.category] || 0) + tx.amount;
        }
      } else {
        totalOut += tx.amount;
        dipaOutBreakdown[tx.category] = (dipaOutBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    const netSurplus = totalIn - totalOut;
    const studentCountPaid = students.filter(s => s.monthlyFeePaid[selectedMonth] === true).length;
    const totalStudentCount = students.length;

    return {
      txs: monthlyTxs,
      totalSppIncome,
      nonSppIncomeBreakdown,
      dipaOutBreakdown,
      totalIn,
      totalOut,
      netSurplus,
      studentCountPaid,
      totalStudentCount,
      ratePaid: totalStudentCount > 0 ? (studentCountPaid / totalStudentCount) * 100 : 0
    };
  }, [transactions, students, selectedMonth]);

  // ANNUAL STATS CALCULATIONS (PROJECTIONS)
  const annualData = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    
    // Breakdowns
    const monthlyInflow: Record<string, number> = {};
    const monthlyOutflow: Record<string, number> = {};

    transactions.forEach(tx => {
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (tx.type === 'masuk') {
        totalIn += tx.amount;
        monthlyInflow[monthKey] = (monthlyInflow[monthKey] || 0) + tx.amount;
      } else {
        totalOut += tx.amount;
        monthlyOutflow[monthKey] = (monthlyOutflow[monthKey] || 0) + tx.amount;
      }
    });

    // Projected totals (extrapolating from average monthly inflow/outflow)
    const distinctMonthsCount = Object.keys(monthlyInflow).length || 6;
    const avgIn = totalIn / distinctMonthsCount;
    const avgOut = totalOut / distinctMonthsCount;

    // Full 12-month projection
    const projectedAnnualIn = totalIn + (avgIn * (12 - distinctMonthsCount));
    const projectedAnnualOut = totalOut + (avgOut * (12 - distinctMonthsCount));

    return {
      totalIn,
      totalOut,
      netSurplus: totalIn - totalOut,
      distinctMonthsCount,
      projectedAnnualIn,
      projectedAnnualOut,
      projectedNetSurplus: projectedAnnualIn - projectedAnnualOut,
      monthlyInflow,
      monthlyOutflow
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Print styles override component (only injected for clean printing layout) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            box-shadow: none;
            border: none;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Laporan Akuntansi Keuangan Pesantren</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Analisis instan pembukuan bulanan, tahunan, serta kuota penyerapan dana DIPA pesantren.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-[#EBE7DF] text-[#5A5A40] bg-white border border-[#D9D3C7] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#5A5A40]" />
            Cetak Laporan (Print)
          </button>
        </div>
      </div>

      {/* Selector and Filter Panel */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E5E1DA] shadow-sm flex flex-wrap gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7A7A6A] font-bold">Jenis Laporan:</span>
          <div className="flex bg-[#F7F5F0] border border-[#D9D3C7] p-0.5 rounded-lg">
            <button
              onClick={() => setReportType('bulanan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition overflow-hidden cursor-pointer ${
                reportType === 'bulanan' 
                  ? 'bg-white text-[#5A5A40] border border-[#D9D3C7]/60 shadow-2xs' 
                  : 'text-[#7A7A6A] hover:text-[#5A5A40]'
              }`}
            >
              Laporan Bulanan
            </button>
            <button
              onClick={() => setReportType('tahunan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition overflow-hidden cursor-pointer ${
                reportType === 'tahunan' 
                  ? 'bg-white text-[#5A5A40] border border-[#D9D3C7]/60 shadow-2xs' 
                  : 'text-[#7A7A6A] hover:text-[#5A5A40]'
              }`}
            >
              Laporan Tahunan / Proyeksi
            </button>
          </div>
        </div>

        {reportType === 'bulanan' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A7A6A] font-bold">Pilih Bulan Pengauditan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] font-bold focus:outline-none focus:border-[#5A5A40]"
            >
              <option value="2026-01">Januari 2026</option>
              <option value="2026-02">Februari 2026</option>
              <option value="2026-03">Maret 2026</option>
              <option value="2026-04">April 2026</option>
              <option value="2026-05">Mei 2026</option>
              <option value="2026-06">Juni 2026</option>
            </select>
          </div>
        )}
      </div>

      {/* printable container section */}
      <div id="print-area" className="bg-white p-8 rounded-[24px] border border-[#E5E1DA] shadow-sm space-y-6">
        
        {/* REPORT HEADER BRAND */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-6 border-b-2 border-[#D9D3C7] gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-lg font-serif font-bold uppercase text-[#5A5A40] tracking-wider">Pondok Pesantren Daarul Al-Hambra</h2>
            <p className="text-xs text-[#7A7A6A]">Jl. Kyai Haji Wahid Hasyim No. 764, Kompleks Pesantren Terpadu</p>
            <p className="text-[10px] text-[#7A7A6A]/80">Email: keuangan@daarul-alhambra.sch.id • Telp: (021) 764-7500</p>
          </div>
          <div className="text-center md:text-right">
            <span className="text-xs font-serif font-extrabold uppercase bg-[#EBE7DF] text-[#5A5A40] px-3.5 py-1.5 rounded-lg border border-[#D9D3C7]">
              Official Ledger Audit
            </span>
            <div className="text-[11px] text-[#7A7A6A] font-mono mt-2">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* CONDITION STATE A: MONTHLY REPORT */}
        {reportType === 'bulanan' && (
          <div className="space-y-6">
            
            {/* Monthly Title Block */}
            <div className="text-center py-3 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl">
              <h3 className="text-md font-bold text-[#2C2C24] font-serif uppercase tracking-widest">Laporan Bulanan Arus Kas & Realisasi Dipa</h3>
              <p className="text-xs text-[#5A5A40] font-bold">Periode Audit: {getMonthName(selectedMonth)}</p>
            </div>

            {/* Quick Balance cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-serif">
              <div className="p-4 bg-[#E3EFE5]/40 border border-[#C3DFC8] rounded-xl">
                <span className="text-[10px] text-[#2E6B3E] font-bold uppercase tracking-wider block font-sans">Total Pendapatan (Inflow)</span>
                <span className="text-lg font-extrabold font-mono text-[#2E6B3E] block mt-1">{formatRupiah(monthlyData.totalIn)}</span>
                <span className="text-[9px] text-[#7A7A6A] mt-0.5 block font-sans">Penerimaan SPP & Kredit Lainnya</span>
              </div>
              <div className="p-4 bg-[#FDF4EF]/45 border border-[#F6DFD0] rounded-xl">
                <span className="text-[10px] text-[#A66E4E] font-bold uppercase tracking-wider block font-sans">Total Belanja Bulanan (Outflow)</span>
                <span className="text-lg font-extrabold font-mono text-[#A66E4E] block mt-1">{formatRupiah(monthlyData.totalOut)}</span>
                <span className="text-[9px] text-[#7A7A6A] mt-0.5 block font-sans">Penyerapan Alokasi Pagu DIPA</span>
              </div>
              <div className="p-4 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl">
                <span className="text-[10px] text-[#7A7A6A] font-bold uppercase tracking-wider block font-sans">Surplus / Defisit Kas Net</span>
                <span className={`text-lg font-extrabold font-mono block mt-1 ${
                  monthlyData.netSurplus >= 0 ? 'text-[#2E6B3E]' : 'text-[#A66E4E]'
                }`}>
                  {monthlyData.netSurplus < 0 ? '-' : ''}{formatRupiah(Math.abs(monthlyData.netSurplus))}
                </span>
                <span className="text-[9px] text-[#7A7A6A] mt-0.5 block font-sans">Selisih Alir Saldo Jurnal Kas</span>
              </div>
            </div>

            {/* Report body splits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              
              {/* Left Segment: Revenue Ledger Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest pb-1.5 border-b border-[#F0EFEA] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
                  Rincian Penerimaan Dana (Kredit)
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Monthly SPP */}
                  <div className="flex justify-between py-2 border-b border-[#F0EFEA] bg-[#F7F5F0]/50 px-2 rounded">
                    <div>
                      <div className="font-bold text-[#3D3D3D]">Penerimaan Iuran SPP Santri</div>
                      <div className="text-[10px] text-[#7A7A6A]">Realisasi: {monthlyData.studentCountPaid} dari {monthlyData.totalStudentCount} Santri ({Math.round(monthlyData.ratePaid)}% Lunas)</div>
                    </div>
                    <span className="font-bold font-mono text-[#2E6B3E]">{formatRupiah(monthlyData.totalSppIncome)}</span>
                  </div>

                  {/* Other non-spp incomes */}
                  {Object.entries(monthlyData.nonSppIncomeBreakdown).map(([category, amount]) => (
                    <div key={category} className="flex justify-between py-2 border-b border-[#F0EFEA] px-2">
                      <div>
                        <div className="font-bold text-[#3D3D3D]">{category}</div>
                        <div className="text-[10px] text-[#7A7A6A]">Aset Penunjang Non-Iuran Wajib</div>
                      </div>
                      <span className="font-bold font-mono text-[#2E6B3E]">{formatRupiah(amount as number)}</span>
                    </div>
                  ))}

                  {Object.keys(monthlyData.nonSppIncomeBreakdown).length === 0 && (
                    <div className="text-[#7A7A6A] italic text-[10px] py-1 text-center">Tidak ada iuran tambahan lainnya.</div>
                  )}

                  <div className="flex justify-between items-center py-2.5 px-3 border border-[#C3DFC8] bg-[#E3EFE5]/20 text-[#2E6B3E] font-bold rounded-xl text-xs mt-4">
                    <span>TOTAL INFLOW BULANAN</span>
                    <span className="font-mono">{formatRupiah(monthlyData.totalIn)}</span>
                  </div>
                </div>
              </div>

              {/* Right Segment: Expense DIPA Ledger Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest pb-1.5 border-b border-[#F0EFEA] flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-[#A66E4E]" />
                  Rincian Penyerapan Belanja DIPA (Debet)
                </h4>

                <div className="space-y-2 text-xs">
                  {Object.entries(monthlyData.dipaOutBreakdown).map(([catName, amount]) => {
                    const dipaObj = dipaCategories.find(d => d.name === catName);
                    const code = dipaObj ? dipaObj.code : '5xxxxx';

                    return (
                      <div key={catName} className="flex justify-between py-2 border-b border-[#F0EFEA] px-2">
                        <div>
                          <div className="font-bold text-[#3D3D3D] truncate max-w-[220px]" title={catName}>{code} - {catName}</div>
                          <div className="text-[10px] text-[#7A7A6A]">Realisasi Alur DIPA Belanja</div>
                        </div>
                        <span className="font-bold font-mono text-[#A66E4E]">{formatRupiah(amount as number)}</span>
                      </div>
                    );
                  })}

                  {Object.keys(monthlyData.dipaOutBreakdown).length === 0 && (
                    <div className="text-[#7A7A6A] italic text-[10px] py-10 text-center">Tidak ada belanja alokasi kas pada bulan ini.</div>
                  )}

                  <div className="flex justify-between items-center py-2.5 px-3 border border-[#F6DFD0] bg-[#FDF4EF]/20 text-[#A66E4E] font-bold rounded-xl text-xs mt-4">
                    <span>TOTAL OUTFLOW BULANAN</span>
                    <span className="font-mono">{formatRupiah(monthlyData.totalOut)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Note signature section */}
            <div className="grid grid-cols-2 gap-8 text-center pt-16 text-xs font-sans">
              <div className="space-y-12">
                <p className="text-[#7A7A6A]">Pemeriksa Keuangan</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">Ust. Ahmad Syihabuddin, Lc.</strong>
                  <span className="text-[10px] text-[#7A7A6A]">Dewan Pengawas Pesantren</span>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A]">Bendahara Pesantren</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">Haj. Fatimah Azzahra, S.E.</strong>
                  <span className="text-[10px] text-[#7A7A6A]">Kepala Bagian Keuangan</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* CONDITION STATE B: ANNUAL BUDGET REPORT & PROJECTION */}
        {reportType === 'tahunan' && (
          <div className="space-y-6">
            
            {/* Annual Title Block */}
            <div className="text-center py-3 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl">
              <h3 className="text-md font-bold text-[#2C2C24] font-serif uppercase tracking-widest">Laporan Evaluasi Tahunan & Proyeksi Anggaran Pesantren</h3>
              <p className="text-xs text-[#5A5A40] font-bold">Periode Kumulatif Pencatatan: 2026</p>
            </div>

            {/* General Description */}
            <div className="p-4 bg-[#EBE7DF]/30 border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] leading-relaxed">
              <strong className="text-[#5A5A40]">Penjelasan Struktur:</strong> Laporan tahunan ini disusun berdasarkan total riil mutasi kas berjalan selama <strong>{annualData.distinctMonthsCount} bulan aktif</strong>, dialokasikan secara periodik, dan memproyeksikan estimasi rasio penyerapan kas hingga akhir tahun 2026.
            </div>

            {/* Real vs Projections Grid comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Col 1: Real Case Today */}
              <div className="p-5 border border-[#D9D3C7] bg-[#F7F5F0]/50 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase text-[#5A5A40] border-b border-[#D9D3C7] pb-2 flex items-center gap-1.5 font-serif">
                  <CheckCircle className="w-4.5 h-4.5 text-[#5A5A40]" />
                  Masa Berjalan Riil (Aktual)
                </h4>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex justify-between border-b border-[#F0EFEA] pb-1">
                    <span className="text-[#7A7A6A]">Penerimaan SPP & Lainnya:</span>
                    <strong className="font-mono text-[#2C2C24]">{formatRupiah(annualData.totalIn)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#F0EFEA] pb-1">
                    <span className="text-[#7A7A6A]">Belanja Alokasi Pagu DIPA:</span>
                    <strong className="font-mono text-[#2C2C24]">{formatRupiah(annualData.totalOut)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-[#2E6B3E] bg-[#E3EFE5]/30 px-2 rounded">
                    <span>Surplus Kas Riil:</span>
                    <span className="font-mono">{formatRupiah(annualData.netSurplus)}</span>
                  </div>
                </div>
              </div>

              {/* Col 2: Projected Future */}
              <div className="p-5 border border-[#F6DFD0] bg-[#FDF4EF]/40 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase text-[#A66E4E] border-b border-[#F6DFD0] pb-2 flex items-center gap-1.5 font-serif">
                  <Clock className="w-4.5 h-4.5 text-[#A66E4E]" />
                  Estimasi Proyeksi 12 Bulan (Full Year)
                </h4>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex justify-between border-b border-[#F6DFD0] pb-1">
                    <span className="text-[#8C5D3E]">Proyeksi Penerimaan Tahunan:</span>
                    <strong className="font-mono text-[#2C2C24]">{formatRupiah(annualData.projectedAnnualIn)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#F6DFD0] pb-1">
                    <span className="text-[#8C5D3E]">Proyeksi Penyerapan Belanja:</span>
                    <strong className="font-mono text-[#A66E4E]">{formatRupiah(annualData.projectedAnnualOut)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-white bg-[#5A5A40] px-2 rounded">
                    <span>Rencana Sisa Cadangan Kas:</span>
                    <span className="font-mono">{formatRupiah(annualData.projectedNetSurplus)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* DIPA Budget Utilization Breakdown Table */}
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest pb-1.5 border-b border-[#F0EFEA] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#5A5A40]" />
                Rasio Penyerapan Alokasi Akun Belanja DIPA Kumulatif
              </h4>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EBE7DF]/35 border-b border-[#D9D3C7] text-[9px] text-[#7A7A6A] font-bold uppercase tracking-wider">
                    <th className="py-2.5 pl-3">Kode Akun</th>
                    <th className="py-2.5">Sub-Bidang Anggaran Belanja</th>
                    <th className="py-2.5 text-right">Pagu Rencana</th>
                    <th className="py-2.5 text-right">Penyerapan Riil</th>
                    <th className="py-2.5 text-right pr-3">Persentase (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA] text-[#3D3D3D]">
                  {dipaCategories.map((cat) => {
                    const pct = cat.allocatedAmount > 0 ? (cat.realizedAmount / cat.allocatedAmount) * 100 : 0;
                    return (
                      <tr key={cat.id} className="hover:bg-[#F7F5F0]/40">
                        <td className="py-2.5 pl-3 font-mono text-[#5A5A40] font-bold">{cat.code}</td>
                        <td className="py-2.5 font-medium text-[#2C2C24]">{cat.name}</td>
                        <td className="py-2.5 text-right font-mono text-[#7A7A6A]">{formatRupiah(cat.allocatedAmount)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-[#A66E4E]">{formatRupiah(cat.realizedAmount)}</td>
                        <td className="py-2.5 text-right pr-3 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded border ${
                            pct > 90 
                              ? 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]' 
                              : pct > 75 
                                ? 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]' 
                                : 'bg-[#E3EFE5] text-[#2E6B3E] border-[#C3DFC8]'
                          }`}>
                            {Math.round(pct)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footnote Signature block */}
            <div className="grid grid-cols-2 gap-8 text-center pt-16 text-xs font-sans">
              <div className="space-y-12">
                <p className="text-[#7A7A6A]">Pemeriksa Keuangan</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">Ust. Ahmad Syihabuddin, Lc.</strong>
                  <span className="text-[10px] text-[#7A7A6A]">Dewan Pengawas Pesantren</span>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A]">Bendahara Pesantren</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">Haj. Fatimah Azzahra, S.E.</strong>
                  <span className="text-[10px] text-[#7A7A6A]">Kepala Bagian Keuangan</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
