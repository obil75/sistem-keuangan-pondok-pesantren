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
  pengelola1Nama?: string;
  pengelola1Jabatan?: string;
  pengelola2Nama?: string;
  pengelola2Jabatan?: string;
  pengelola3Nama?: string;
  pengelola3Jabatan?: string;
}

export default function Reports({ 
  students, 
  dipaCategories, 
  transactions,
  pengelola1Nama = 'Ust. Arsyad Hambali',
  pengelola1Jabatan = 'Bendahara Utama',
  pengelola2Nama = 'Ust. Ahmad Syihabuddin, Lc.',
  pengelola2Jabatan = 'Dewan Pengawas Pesantren',
  pengelola3Nama = 'Haj. Fatimah Azzahra, S.E.',
  pengelola3Jabatan = 'Kepala Bagian Keuangan'
}: ReportsProps) {
  const [reportType, setReportType] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);
  const [showExportMenuMonthly, setShowExportMenuMonthly] = useState(false);
  const [showExportMenuAnnual, setShowExportMenuAnnual] = useState(false);

  // Handler exports Monthly Accounting Report data to CSV/Excel
  const handleDownloadMonthlyExcel = () => {
    const headers = ['No', 'Jenis Arus', 'Sumber/Kategori', 'Uraian Kas Bulanan', 'Nominal (Rp)'];
    const rows: string[][] = [headers];

    // 1. Inflows
    rows.push(['Penerimaan (Inflow - Dana Masuk)']);
    rows.push([
      '1',
      'Dana Masuk',
      'Iuran SPP Santri',
      `Realisasi SPP bulanan (${monthlyData.studentCountPaid} dari ${monthlyData.totalStudentCount} Santri)`,
      String(monthlyData.totalSppIncome)
    ]);

    let rowIdx = 2;
    Object.entries(monthlyData.nonSppIncomeBreakdown).forEach(([category, amount]) => {
      rows.push([
        String(rowIdx++),
        'Dana Masuk',
        category,
        'Penerimaan non-Iuran Wajib / Pendapatan Tambahan',
        String(amount)
      ]);
    });
    
    rows.push(['TOTAL PENDAPATAN BULANAN', '', '', '', String(monthlyData.totalIn)]);
    rows.push([]);

    // 2. Outflows
    rows.push(['Pembelanjaan (Outflow - Dana Keluar/DIPA)']);
    let outIdx = 1;
    Object.entries(monthlyData.dipaOutBreakdown).forEach(([catName, amount]) => {
      const dipaObj = dipaCategories.find(d => d.name === catName);
      const code = dipaObj ? dipaObj.code : '5xxxxx';

      rows.push([
        String(outIdx++),
        'Dana Keluar',
        `${code} - ${catName}`,
        'Penyerapan Anggaran Alokasi DIPA',
        String(amount)
      ]);
    });

    rows.push(['TOTAL BELANJA BULANAN', '', '', '', String(monthlyData.totalOut)]);
    rows.push([]);
    rows.push(['SURPLUS/DEFISIT NETTO', '', '', '', String(monthlyData.netSurplus)]);

    const csvContent = '\uFEFF' + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Bulanan_Akuntansi_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler exports Annual Accounting Report data to CSV/Excel
  const handleDownloadAnnualExcel = () => {
    const headers = ['Kode Akun', 'Sub-Bidang Anggaran Belanja', 'Pagu Rencana (Rp)', 'Penyerapan Riil (Rp)', 'Sisa Anggaran (Rp)', 'Persentase (%)'];
    const rows: string[][] = [headers];

    dipaCategories.forEach((cat) => {
      const pct = cat.allocatedAmount > 0 ? (cat.realizedAmount / cat.allocatedAmount) * 100 : 0;
      const sisa = cat.allocatedAmount - cat.realizedAmount;
      rows.push([
        cat.code,
        cat.name,
        String(cat.allocatedAmount),
        String(cat.realizedAmount),
        String(sisa),
        `${Math.round(pct)}%`
      ]);
    });

    const totalPagu = dipaCategories.reduce((s, c) => s + c.allocatedAmount, 0);
    const totalRealized = dipaCategories.reduce((s, c) => s + c.realizedAmount, 0);
    const totalSisa = totalPagu - totalRealized;
    const totalPct = totalPagu > 0 ? (totalRealized / totalPagu) * 100 : 0;

    rows.push([]);
    rows.push([
      'TOTAL',
      'KESELURUHAN PAGU DIPA',
      String(totalPagu),
      String(totalRealized),
      String(totalSisa),
      `${Math.round(totalPct)}%`
    ]);

    rows.push([]);
    rows.push(['Catatan Evaluasi Tahunan & Proyeksi 12 Bulan (Full Year):']);
    rows.push(['Penerimaan SPP & Lainnya (Aktual)', String(annualData.totalIn)]);
    rows.push(['Belanja Alokasi Pagu DIPA (Aktual)', String(annualData.totalOut)]);
    rows.push(['Surplus Kas Riil (Aktual)', String(annualData.netSurplus)]);
    rows.push(['Proyeksi Penerimaan Setahun', String(annualData.projectedAnnualIn)]);
    rows.push(['Proyeksi Penyerapan Belanja Setahun', String(annualData.projectedAnnualOut)]);
    rows.push(['Rencana Cadangan Kas Akhir Tahun', String(annualData.projectedNetSurplus)]);

    const csvContent = '\uFEFF' + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Tahunan_Dipa_Evaluasi_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT HELPER - Opens in a dedicated print window to bypass Iframe sandboxing restrictions
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Harap izinkan pop-up di browser Anda agar dapat mencetak dokumen laporan.');
      return;
    }

    const docDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let reportContentHtml = '';

    if (reportType === 'bulanan') {
      const monthLabel = getMonthName(selectedMonth);
      let revenueRowsHtml = `
        <tr style="border-bottom: 1px solid #eee; background-color: #fafaf9;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Penerimaan Iuran SPP Santri</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #666; font-size: 11px;">Realisasi: ${monthlyData.studentCountPaid} dari ${monthlyData.totalStudentCount} Santri (${Math.round(monthlyData.ratePaid)}% Lunas)</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: #2e6b3e;">${formatRupiah(monthlyData.totalSppIncome)}</td>
        </tr>
      `;

      Object.entries(monthlyData.nonSppIncomeBreakdown).forEach(([category, amount]) => {
        revenueRowsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${category}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #666; font-size: 11px;">Aset Penunjang Non-Iuran Wajib</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: #2e6b3e;">${formatRupiah(amount as number)}</td>
          </tr>
        `;
      });

      let expenseRowsHtml = '';
      Object.entries(monthlyData.dipaOutBreakdown).forEach(([catName, amount]) => {
        const dipaObj = dipaCategories.find(d => d.name === catName);
        const code = dipaObj ? dipaObj.code : '5xxxxx';
        expenseRowsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${code} - ${catName}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #666; font-size: 11px;">Realisasi Alur DIPA Belanja</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: #a66e4e;">${formatRupiah(amount as number)}</td>
          </tr>
        `;
      });

      if (Object.keys(monthlyData.dipaOutBreakdown).length === 0) {
        expenseRowsHtml += `
          <tr>
            <td colspan="3" style="padding: 20px; border: 1px solid #ddd; text-align: center; color: #666; font-style: italic;">Tidak ada belanja alokasi kas pada bulan ini.</td>
          </tr>
        `;
      }

      reportContentHtml = `
        <div class="header">
          <h1>Laporan Bulanan Arus Kas & Realisasi DIPA</h1>
          <p>Pesantren Modern Datok Sulaiman Kota Palopo</p>
          <p style="font-size: 11px; color: #7a7a6a; margin-top:2px;">Periode Audit: ${monthLabel}</p>
        </div>

        <div class="meta-info">
          <div><strong>Dicetak Oleh:</strong> Pengguna Aplikasi</div>
          <div><strong>Tanggal Dokumen:</strong> ${docDate}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span>Total Pendapatan (Inflow)</span>
            <h4 style="color: #2e6b3e;">${formatRupiah(monthlyData.totalIn)}</h4>
          </div>
          <div class="stat-card">
            <span>Total Belanja (Outflow)</span>
            <h4 style="color: #a66e4e;">${formatRupiah(monthlyData.totalOut)}</h4>
          </div>
          <div class="stat-card">
            <span>Surplus / Defisit Kas Net</span>
            <h4 style="color: ${monthlyData.netSurplus >= 0 ? '#2e6b3e' : '#a66e4e'};">${monthlyData.netSurplus < 0 ? '-' : ''}${formatRupiah(Math.abs(monthlyData.netSurplus))}</h4>
          </div>
        </div>

        <h3 style="font-family: serif; font-size: 14px; text-transform: uppercase; color: #5a5a40; border-bottom: 2px solid #5a5a40; padding-bottom: 5px; margin-top: 30px;">I. Rincian Penerimaan Dana (Kredit)</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #5a5a40; color: white;">Sumber Pembayaran</th>
              <th style="text-align: left; padding: 10px; width: 45%; background-color: #5a5a40; color: white;">Keterangan Alur</th>
              <th style="text-align: right; padding: 10px; width: 25%; background-color: #5a5a40; color: white;">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${revenueRowsHtml}
            <tr style="background-color: #f5f4f0; font-weight: bold; border-top: 2px solid #5a5a40;">
              <td colspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: left;">TOTAL INFLOW BULANAN</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; color: #2e6b3e;">${formatRupiah(monthlyData.totalIn)}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-family: serif; font-size: 14px; text-transform: uppercase; color: #5a5a40; border-bottom: 2px solid #5a5a40; padding-bottom: 5px; margin-top: 30px;">II. Rincian Penyerapan Belanja DIPA (Debet)</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #5a5a40; color: white;">Grup Alokasi DIPA</th>
              <th style="text-align: left; padding: 10px; width: 45%; background-color: #5a5a40; color: white;">Keterangan Alur</th>
              <th style="text-align: right; padding: 10px; width: 25%; background-color: #5a5a40; color: white;">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="background-color: #f5f4f0; font-weight: bold; border-top: 2px solid #5a5a40;">
              <td colspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: left;">TOTAL OUTFLOW BULANAN</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; color: #a66e4e;">${formatRupiah(monthlyData.totalOut)}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      let dipaRowsHtml = '';
      dipaCategories.forEach((cat) => {
        const pct = cat.allocatedAmount > 0 ? (cat.realizedAmount / cat.allocatedAmount) * 100 : 0;
        dipaRowsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-family: monospace; font-weight: bold; color: #5a5a40;">${cat.code}</td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${cat.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; color: #666;">${formatRupiah(cat.allocatedAmount)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: #a66e4e;">${formatRupiah(cat.realizedAmount)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-family: monospace; font-weight: bold; color: ${pct > 90 ? '#a66e4e' : '#2e6b3e'};">${Math.round(pct)}%</td>
          </tr>
        `;
      });

      reportContentHtml = `
        <div class="header">
          <h1>Laporan Evaluasi Tahunan & Proyeksi Anggaran</h1>
          <p>Pesantren Modern Datok Sulaiman Kota Palopo</p>
          <p style="font-size: 11px; color: #7a7a6a; margin-top:2px;">Periode Kumulatif Pencatatan: Tahun Buku 2026</p>
        </div>

        <div class="meta-info">
          <div><strong>Dicetak Oleh:</strong> Pengguna Aplikasi</div>
          <div><strong>Tanggal Dokumen:</strong> ${docDate}</div>
        </div>

        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="stat-card" style="background-color: #fafaf9; border-color: #d9d3c7;">
            <span style="font-size: 10px; color: #5a5a40; border-bottom: 1px solid #e5e1da; padding-bottom: 4px; margin-bottom: 8px;">AKTUAL BERJALAN (${annualData.distinctMonthsCount} Bulan Aktif)</span>
            <div style="font-size: 11px; margin-top:6px; display: flex; justify-content: space-between;">Penerimaan SPP & Lain: <strong style="font-family: monospace;">${formatRupiah(annualData.totalIn)}</strong></div>
            <div style="font-size: 11px; margin-top:4px; display: flex; justify-content: space-between;">Belanja Alokasi Pagu: <strong style="font-family: monospace;">${formatRupiah(annualData.totalOut)}</strong></div>
            <div style="font-size: 12px; margin-top:8px; display: flex; justify-content: space-between; font-weight: bold; color: #2e6b3e;">Surplus Kas Aktual: <strong style="font-family: monospace;">${formatRupiah(annualData.netSurplus)}</strong></div>
          </div>
          <div class="stat-card" style="background-color: #fdfaf7; border-color: #f6dfd0;">
            <span style="font-size: 10px; color: #a66e4e; border-bottom: 1px solid #f6dfd0; padding-bottom: 4px; margin-bottom: 8px;">ESTIMASI PROYEKSI 12 BULAN (Full Year)</span>
            <div style="font-size: 11px; margin-top:6px; display: flex; justify-content: space-between;">Proyeksi Penerimaan: <strong style="font-family: monospace;">${formatRupiah(annualData.projectedAnnualIn)}</strong></div>
            <div style="font-size: 11px; margin-top:4px; display: flex; justify-content: space-between;">Proyeksi Belanja: <strong style="font-family: monospace; color: #a66e4e;">${formatRupiah(annualData.projectedAnnualOut)}</strong></div>
            <div style="font-size: 12px; margin-top:8px; display: flex; justify-content: space-between; font-weight: bold; color: #5a5a40;">Proyeksi Cadangan Akhir: <strong style="font-family: monospace;">${formatRupiah(annualData.projectedNetSurplus)}</strong></div>
          </div>
        </div>

        <h3 style="font-family: serif; font-size: 14px; text-transform: uppercase; color: #5a5a40; border-bottom: 2px solid #5a5a40; padding-bottom: 5px; margin-top: 30px;">I. Rasio Penyerapan Alokasi Akun Belanja DIPA Kumulatif</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 15%; text-align: center; background-color: #5a5a40; color: white;">Kode Akun</th>
              <th style="text-align: left; padding: 10px; background-color: #5a5a40; color: white;">Sub-Bidang Anggaran Belanja</th>
              <th style="width: 20%; text-align: right; padding: 10px; background-color: #5a5a40; color: white;">Pagu Rencana (Rp)</th>
              <th style="width: 20%; text-align: right; padding: 10px; background-color: #5a5a40; color: white;">Penyerapan Riil (Rp)</th>
              <th style="width: 15%; text-align: center; background-color: #5a5a40; color: white;">Persentase (%)</th>
            </tr>
          </thead>
          <tbody>
            ${dipaRowsHtml}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan Pesantren</title>
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
            font-size: 20px;
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
            padding: 8px;
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

        ${reportContentHtml}

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
          /* Hide all non-printable wrappers and components */
          .no-print, 
          header, 
          aside,
          nav,
          button,
          select {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* Reset html, body, and all structural layout boxes */
          html, body, #root, .min-h-screen, .flex-1, main, .max-w-7xl, .space-y-6 {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            display: block !important;
            float: none !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Ensure the workspace content has no margin/padding offset (like md:pl-64) */
          div[class*="md:pl-64"], .md\\:pl-64, div.flex-1 {
            padding-left: 0 !important;
          }

          /* Format printable content area specifically */
          #print-area {
            display: block !important;
            visibility: visible !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
          }

          /* Force high-contrast values, hide shadows, specify print borders */
          #print-area * {
            visibility: visible !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* Force colors and borders to remain distinct */
          .border, .border-b, .border-t, .border-l, .border-r {
            border-color: #D9D3C7 !important;
          }
          
          /* Custom print breaks safety */
          h3, h4, tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Control Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Pesantren Modern Datok Sulaiman Kota Palopo</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Jl. H. M. Daud No. 5 Kecamatan Wara Kota Palopo</p>
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
            <h2 className="text-lg font-serif font-bold uppercase text-[#5A5A40] tracking-wider">Pesantren Modern Datok Sulaiman Kota Palopo</h2>
            <p className="text-xs text-[#7A7A6A]">Jl. H. M. Daud No. 5 Kecamatan Wara Kota Palopo</p>
          </div>
          <div className="text-center md:text-right">
            <span className="text-xs font-serif font-extrabold uppercase bg-[#EBE7DF] text-[#5A5A40] px-3.5 py-1.5 rounded-lg border border-[#D9D3C7]">
              Laporan Keuangan
            </span>
          </div>
        </div>

        {/* CONDITION STATE A: MONTHLY REPORT */}
        {reportType === 'bulanan' && (
          <div className="space-y-6">
            
            {/* Monthly Title Block */}
            <div className="relative flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl gap-3">
              <div className="md:text-left text-center flex-1">
                <h3 className="text-md font-bold text-[#2C2C24] font-serif uppercase tracking-widest">Laporan Bulanan Arus Kas & Realisasi Dipa</h3>
                <p className="text-xs text-[#5A5A40] font-bold mt-0.5">Periode Audit: {getMonthName(selectedMonth)}</p>
              </div>
              
              {/* Unduh Laporan Dropdown */}
              <div className="relative no-print shrink-0">
                <button 
                  onClick={() => setShowExportMenuMonthly(!showExportMenuMonthly)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0EFEA] text-[#5A5A40] border border-[#D9D3C7] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                  title="Unduh Laporan Bulanan"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Laporan
                </button>

                {showExportMenuMonthly && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowExportMenuMonthly(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E1DA] rounded-xl shadow-lg py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                      <button
                        onClick={() => {
                          handleDownloadMonthlyExcel();
                          setShowExportMenuMonthly(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#3D3D3D] hover:bg-[#F7F5F0] flex items-center gap-2 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
                        Format Excel (.csv)
                      </button>
                      <button
                        onClick={() => {
                          handlePrint();
                          setShowExportMenuMonthly(false);
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
            <div className="grid grid-cols-3 gap-4 text-center pt-16 text-[10px] sm:text-xs font-sans">
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola2Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola2Nama}</strong>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola3Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola3Nama}</strong>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola1Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola1Nama}</strong>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* CONDITION STATE B: ANNUAL BUDGET REPORT & PROJECTION */}
        {reportType === 'tahunan' && (
          <div className="space-y-6">
            
            {/* Annual Title Block */}
            <div className="relative flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl gap-3">
              <div className="md:text-left text-center flex-1">
                <h3 className="text-md font-bold text-[#2C2C24] font-serif uppercase tracking-widest">Laporan Evaluasi Tahunan & Proyeksi Anggaran Pesantren</h3>
                <p className="text-xs text-[#5A5A40] font-bold mt-0.5">Periode Kumulatif Pencatatan: 2026</p>
              </div>
              
              {/* Unduh Laporan Dropdown */}
              <div className="relative no-print shrink-0">
                <button 
                  onClick={() => setShowExportMenuAnnual(!showExportMenuAnnual)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0EFEA] text-[#5A5A40] border border-[#D9D3C7] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                  title="Unduh Laporan Tahunan"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Laporan
                </button>

                {showExportMenuAnnual && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowExportMenuAnnual(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E1DA] rounded-xl shadow-lg py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                      <button
                        onClick={() => {
                          handleDownloadAnnualExcel();
                          setShowExportMenuAnnual(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#3D3D3D] hover:bg-[#F7F5F0] flex items-center gap-2 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
                        Format Excel (.csv)
                      </button>
                      <button
                        onClick={() => {
                          handlePrint();
                          setShowExportMenuAnnual(false);
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
            <div className="grid grid-cols-3 gap-4 text-center pt-16 text-[10px] sm:text-xs font-sans">
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola2Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola2Nama}</strong>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola3Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola3Nama}</strong>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[#7A7A6A] font-semibold">{pengelola1Jabatan}</p>
                <div>
                  <strong className="text-[#2C2C24] block underline">{pengelola1Nama}</strong>
                </div>
              </div>
            </div>

          </div>
        )}

      {/* Modal warning safety check for print function inside browser sandbox iframe */}
      {showPrintIframeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs no-print">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#F7F5F0] rounded-[28px] border border-[#D9D3C7] shadow-xl max-w-md w-full p-6 space-y-4 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#FDF4EF] text-[#A66E4E] rounded-2xl border border-[#F6DFD0] shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-serif text-[#2C2C24]">Aplikasi Berjalan di Iframe (Preview)</h3>
                <p className="text-xs text-[#7A7A6A] leading-relaxed">
                  Browser mendeteksi aplikasi ini sedang berjalan di dalam penampil simulasi (Iframe AI Studio). Kebijakan keamanan browser memblokir dialog cetak di dalam iframe ini.
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#D9D3C7] rounded-2xl text-xs leading-relaxed space-y-2">
              <span className="font-bold text-[#5A5A40] block">💡 Langkah Mudah Mencetak:</span>
              <ol className="list-decimal list-inside space-y-1.5 text-[#3D3D3D] font-medium">
                <li>Klik tombol <strong className="text-[#5A5A40]">Buka di Tab Baru</strong> di kanan atas untuk membuka link web mandiri.</li>
                <li>Pilih kembali menu <strong className="text-[#5A5A40]">Laporan Akuntansi</strong>.</li>
                <li>Klik tombol <strong className="text-[#5A5A40]">Cetak Laporan (Print)</strong> untuk membuka dialog pencetakan secara normal.</li>
              </ol>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                onClick={() => {
                  setShowPrintIframeWarning(false);
                  try {
                    window.focus();
                    window.print();
                  } catch (err) {
                    console.error("Force print failed: ", err);
                  }
                }}
                className="px-3.5 py-2 hover:bg-[#EBE7DF] text-[#7A7A6A] border border-[#D9D3C7] rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Tetap Cetak (Force)
              </button>
              <button
                onClick={() => setShowPrintIframeWarning(false)}
                className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
              >
                Paham
              </button>
            </div>
          </motion.div>
        </div>
      )}

      </div>
    </div>
  );
}
