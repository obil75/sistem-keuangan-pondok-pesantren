/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Student, DipaCategory, Transaction } from '../types';
import { formatRupiah, calculateStats, getMonthName, formatDate } from '../utils/financeHelpers';

interface DashboardProps {
  students: Student[];
  dipaCategories: DipaCategory[];
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ students, dipaCategories, transactions, onNavigate }: DashboardProps) {
  const currentMonth = '2026-06';
  
  // Calculate stats
  const stats = useMemo(() => {
    return calculateStats(students, dipaCategories, transactions, currentMonth);
  }, [students, dipaCategories, transactions, currentMonth]);

  // Compute DIPA budget usage rates
  const dipaRealizationSummary = useMemo(() => {
    let totalAlloc = 0;
    let totalRealized = 0;
    dipaCategories.forEach(cat => {
      totalAlloc += cat.allocatedAmount;
      totalRealized += cat.realizedAmount;
    });
    return {
      totalAlloc,
      totalRealized,
      percent: totalAlloc > 0 ? (totalRealized / totalAlloc) * 100 : 0
    };
  }, [dipaCategories]);

  // Get recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Calculate SPP payment rate
  const paymentRate = useMemo(() => {
    const total = students.length;
    const lunas = stats.sppLunasCount;
    return total > 0 ? (lunas / total) * 100 : 0;
  }, [students, stats.sppLunasCount]);

  // Generate automated financial insights
  const insights = useMemo(() => {
    const healthIndex = (stats.sisaDana / stats.totalMasuk) * 100;
    const remainingBudgetPct = 100 - dipaRealizationSummary.percent;
    
    let statusText = 'Sangat Sehat';
    let statusColor = 'text-[#5A5A40] bg-[#EBE7DF] border-[#D9D3C7]';
    let recommendations = [];

    if (healthIndex > 30) {
      statusText = 'Sangat Prima (Cadangan Kas Berlebih)';
      statusColor = 'text-[#5A5A40] bg-[#EBE7DF] border-[#D9D3C7]';
      recommendations.push('Kas surplus dapat dialokasikan ke DIPA modal Sarpras (Kode 532111) untuk ekspansi asrama.');
    } else if (healthIndex > 15) {
      statusText = 'Stabil & Sehat';
      statusColor = 'text-[#5A5A40] bg-[#EBE7DF]/60 border-[#D9D3C7]';
      recommendations.push('Pertahankan kontrol pengeluaran operasional dapur agar tetap sesuai batas DIPA.');
    } else {
      statusText = 'Defisit / Waspada Aliran Kas';
      statusColor = 'text-[#A66E4E] bg-[#F9F4F0] border-[#EEDDCC]';
      recommendations.push('Perketat kebijakan belanja dinas non-operasional untuk mendongkrak sisa dana.');
    }

    if (stats.sppTunggakanCount > 150) {
      recommendations.push(`Terdapat ${stats.sppTunggakanCount} santri menunggak di bulan ini. Segera optimalkan sistem pengiriman notifikasi otomatis.`);
    }

    return {
      healthIndex: Math.round(healthIndex),
      statusText,
      statusColor,
      remainingDipa: formatRupiah(dipaRealizationSummary.totalAlloc - dipaRealizationSummary.totalRealized),
      remainingBudgetPct: Math.round(remainingBudgetPct),
      recommendations
    };
  }, [stats, dipaRealizationSummary]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#5A5A40] text-white p-6 rounded-3xl shadow-sm border border-[#4A4A34]">
        <div>
          <h1 className="text-2xl font-serif italic text-white font-semibold">Portal Keuangan Pesantren</h1>
          <p className="text-[#EBE7DF] text-xs tracking-wide mt-1">
            Data statistik komprehensif Pondok Pesantren per <span className="font-semibold underline underline-offset-2">{getMonthName(currentMonth)}</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('notifikasi')}
            className="px-4 py-2 bg-[#F7F5F0] text-[#5A5A40] rounded-xl text-xs font-bold hover:bg-white transition shadow-sm cursor-pointer border border-[#D9D3C7]"
          >
            Kirim Tagihan Tunggakan
          </button>
          <button 
            onClick={() => onNavigate('transaksi')}
            className="px-4 py-2 bg-[#A66E4E] hover:bg-[#925F41] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border border-[#925F41]"
          >
            Input Transaksi Baru
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dana Masuk */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-5 rounded-3xl border border-[#E5E1DA] shadow-sm flex items-start gap-4"
          id="stat-card-income"
        >
          <div className="p-3 bg-[#EBE7DF] text-[#5A5A40] rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#7A7A6A] font-bold">Total Dana Masuk</p>
            <h3 className="text-md font-serif font-bold mt-1 text-[#2C2C24]">{formatRupiah(stats.totalMasuk)}</h3>
            <span className="text-[9px] text-[#5A5A40] bg-[#EBE7DF] px-2 py-0.5 rounded-md font-semibold mt-1.5 inline-block">
              Kumulatif Berjalan
            </span>
          </div>
        </motion.div>

        {/* Card 2: Total Dana Keluar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white p-5 rounded-3xl border border-[#E5E1DA] shadow-sm flex items-start gap-4"
          id="stat-card-expenses"
        >
          <div className="p-3 bg-[#F9F4F0] text-[#A66E4E] rounded-2xl">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#7A7A6A] font-bold">Total Belanja (Keluar)</p>
            <h3 className="text-md font-serif font-bold mt-1 text-[#2C2C24]">{formatRupiah(stats.totalKeluar)}</h3>
            <span className="text-[9px] text-[#A66E4E] bg-[#F9F4F0] px-2 py-0.5 rounded-md font-semibold mt-1.5 inline-block">
              Terealisasi DIPA
            </span>
          </div>
        </motion.div>

        {/* Card 3: Saldo Bersih */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-5 rounded-3xl border border-[#E5E1DA] shadow-sm flex items-start gap-4"
          id="stat-card-balance"
        >
          <div className="p-3 bg-[#EBE7DF] text-[#5A5A40] rounded-2xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#7A7A6A] font-bold">Sisa Kas Saat Ini</p>
            <h3 className="text-md font-serif font-bold mt-1 text-[#2C2C24]">{formatRupiah(stats.sisaDana)}</h3>
            <span className="text-[9px] text-[#5A5A40] bg-[#EBE7DF] px-2 py-0.5 rounded-md font-semibold mt-1.5 inline-block">
              Kas Operasional
            </span>
          </div>
        </motion.div>

        {/* Card 4: Tunggakan SPP Bulan Ini */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-[#F9F4F0] p-5 rounded-3xl border border-[#EEDDCC] shadow-sm flex items-start gap-4"
          id="stat-card-arrears"
        >
          <div className="p-3 bg-[#EEDDCC] text-[#A66E4E] rounded-2xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A66E4E] font-bold">Tunggakan {getMonthName(currentMonth)}</p>
            <h3 className="text-md font-serif font-bold mt-1 text-[#A66E4E]">{formatRupiah(stats.totalTunggakanAmount)}</h3>
            <span className="text-[9px] text-[#A66E4E] bg-white border border-[#EEDDCC] px-2 py-0.5 rounded-md font-semibold mt-1.5 inline-block">
              {stats.sppTunggakanCount} Santri Belum Bayar
            </span>
          </div>
        </motion.div>
      </div>

      {/* Main Content Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SPP Progress Gauge */}
        <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm">
          <h2 className="text-md font-sans font-bold text-[#2C2C24] flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#5A5A40]" />
            Realisasi Iuran SPP Santri
          </h2>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center">
              {/* Custom SVG Circle Indicator */}
              <svg className="w-40 h-40 transform -rotate-90">
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  className="stroke-[#EBE7DF]" 
                  strokeWidth="12" 
                  fill="transparent" 
                />
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  className="stroke-[#5A5A40] transition-all duration-1000 ease-out" 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - paymentRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold font-mono text-[#2C2C24]">{Math.round(paymentRate)}%</span>
                <p className="text-[10px] text-[#7A7A6A] font-bold uppercase tracking-wider">Lunas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-6 text-center border-t border-[#F0EFEA] pt-4">
              <div className="border-r border-[#F0EFEA]">
                <span className="text-xl font-bold font-mono text-[#5A5A40] flex justify-center items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {stats.sppLunasCount}
                </span>
                <p className="text-[11px] text-[#7A7A6A] mt-0.5">Lunas (750k/bln)</p>
              </div>
              <div>
                <span className="text-xl font-bold font-mono text-[#A66E4E] flex justify-center items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {stats.sppTunggakanCount}
                </span>
                <p className="text-[11px] text-[#7A7A6A] mt-0.5">Sisa Tunggakan</p>
              </div>
            </div>
          </div>

          <div className="bg-[#EBE7DF]/50 p-4 rounded-xl border border-[#D9D3C7] mt-2 flex items-start gap-2.5">
            <Activity className="w-4.5 h-4.5 text-[#5A5A40] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#3D3D3D] leading-relaxed">
              <strong>Info SPP Juni:</strong> Target penerimaan iuran dari <strong>764 santri</strong> adalah sebesar <strong>{formatRupiah(764 * 750000)}</strong>. Realisasi saat ini: <strong>{formatRupiah(stats.sppLunasCount * 750000)}</strong>.
            </div>
          </div>
        </div>

        {/* DIPA Budget Allocation Progress */}
        <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-md font-sans font-bold text-[#2C2C24] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#5A5A40]" />
                Alokasi & Realisasi Belanja DIPA
              </h2>
              <button 
                onClick={() => onNavigate('dipa')}
                className="text-xs text-[#5A5A40] font-bold underline underline-offset-4 flex items-center gap-1 cursor-pointer"
              >
                Sesuaikan Alokasi
                <ArrowRight className="w-3" />
              </button>
            </div>

            {/* DIPA progress bars */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {dipaCategories.slice(0, 5).map((cat) => {
                const capPct = cat.allocatedAmount > 0 ? (cat.realizedAmount / cat.allocatedAmount) * 100 : 0;
                const barColor = capPct > 90 ? 'bg-[#A66E4E]' : capPct > 70 ? 'bg-[#8A8A6A]' : 'bg-[#5A5A40]';
                
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-[#3D3D3D]">
                      <span className="truncate max-w-[250px] md:max-w-md">{cat.code} - {cat.name}</span>
                      <span className="font-mono font-bold">{formatRupiah(cat.realizedAmount)} / {formatRupiah(cat.allocatedAmount)}</span>
                    </div>
                    <div className="relative w-full h-3 bg-[#EBE7DF] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(capPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#7A7A6A]">
                      <span>Pemakaian Anggaran Pesantren</span>
                      <span className="font-semibold font-mono">{Math.round(capPct)}% Terpakai</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-[#F0EFEA] pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs text-[#7A7A6A]">
              Total Alokasi Rencana Belanja DIPA: <strong className="font-mono text-[#3D3D3D]">{formatRupiah(dipaRealizationSummary.totalAlloc)}</strong>
            </div>
            <div className="text-xs text-[#5A5A40] font-bold bg-[#EBE7DF] px-3 py-1 rounded-lg border border-[#D9D3C7]">
              Sisa Kuota Belanja: {insights.remainingDipa} ({insights.remainingBudgetPct}% Sisa)
            </div>
          </div>
        </div>
      </div>

      {/* Under Section: Recent Transactions & General Advisor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-md font-sans font-bold text-[#2C2C24] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#5A5A40]" />
              Arus Kas Jurnal Terbaru
            </h2>
            <button 
              onClick={() => onNavigate('transaksi')}
              className="text-xs text-[#5A5A40] font-bold underline underline-offset-4 flex items-center gap-1 cursor-pointer"
            >
              Lihat Jurnal Buku Kas
              <ArrowRight className="w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EFEA] text-[10px] text-[#7A7A6A] font-bold py-3 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tanggal</th>
                  <th className="pb-3">Kategori</th>
                  <th className="pb-3">Keterangan</th>
                  <th className="pb-3 text-right pr-2">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] text-xs text-[#3D3D3D]">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F7F5F0]/50 transition">
                    <td className="py-2.5 pl-2 text-[#7A7A6A] font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-md font-medium text-[9px] border ${
                        tx.type === 'masuk' 
                          ? 'bg-[#E3EFE5] text-[#2E6B3E] border-[#C3DFC8]' 
                          : 'bg-[#FDF4EF] text-[#A66E4E] border-[#F6DFD0]'
                      }`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-2.5 max-w-[200px] truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className={`py-2.5 text-right pr-2 font-bold font-mono ${
                      tx.type === 'masuk' ? 'text-[#3E744A]' : 'text-[#A66E4E]'
                    }`}>
                      {tx.type === 'masuk' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Financial Health Insights */}
        <div className="bg-white p-6 rounded-[28px] border border-[#E5E1DA] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#5A5A40] bg-[#EBE7DF] border border-[#D9D3C7] px-3 py-1.5 rounded-xl text-xs font-semibold self-start mb-4">
              <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
              Sistem Analisis Mandiri
            </div>
            
            <h3 className="text-md font-serif font-bold text-[#2C2C24] mb-2">Evaluasi Keuangan</h3>
            
            {/* Status Health */}
            <div className={`p-4 rounded-xl border mb-4 text-xs ${insights.statusColor}`}>
              <div className="font-bold uppercase tracking-wider text-[9px] opacity-75">Indeks Kesehatan Kas</div>
              <div className="text-xl font-serif font-bold italic leading-tight mt-1">{insights.statusText}</div>
              <p className="mt-1 text-[11px] opacity-90">Surplus Kas sebesar <strong className="font-mono">{insights.healthIndex}%</strong> dari total dana masuk.</p>
            </div>

            {/* Recommendations Bullet list */}
            <h4 className="text-xs font-bold text-[#7A7A6A] uppercase tracking-wider mb-2">Rekomendasi Strategis</h4>
            <ul className="space-y-2 text-xs text-[#3D3D3D] list-disc pl-4 leading-relaxed">
              {insights.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#F0EFEA] pt-4 mt-4 text-[10px] text-[#7A7A6A] text-center italic">
            Engine Evaluasi SIKEU Pesantren Terverifikasi Akurat
          </div>
        </div>

      </div>
    </div>
  );
}
