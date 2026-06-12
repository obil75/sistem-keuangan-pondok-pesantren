/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, DipaCategory, Transaction, FinancialStats } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateStats(
  students: Student[],
  dipaCategories: DipaCategory[],
  transactions: Transaction[],
  selectedMonth: string = '2026-06',
  pricePerStudent: number = 750000,
  iuranMap?: Record<string, number>
): FinancialStats {
  const MONTHS_LIST = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

  const getPrice = (m: string) => {
    if (iuranMap && iuranMap[m] !== undefined) {
      return iuranMap[m];
    }
    return pricePerStudent;
  };

  // Total dana keluar (belanja)
  let totalKeluar = 0;
  transactions.forEach((tx) => {
    if (tx.type !== 'masuk') {
      totalKeluar += tx.amount;
    }
  });

  // Calculate global expected tuition fee (Jumlah Total Iuran per student * Jumlah Total Santri)
  const totalSantri = students.length;
  let totalIuranPerSantri = 0;
  MONTHS_LIST.forEach((m) => {
    totalIuranPerSantri += getPrice(m);
  });
  const totalExpectedIuran = totalSantri * totalIuranPerSantri;

  // Calculate global arrears (Jumlah Total Tunggakan) across all months (Jan - Jun) for all students
  let totalTunggakanSemuaBulan = 0;
  students.forEach((student) => {
    MONTHS_LIST.forEach((m) => {
      if (!student.monthlyFeePaid[m]) {
        totalTunggakanSemuaBulan += getPrice(m);
      }
    });
  });

  // SPP / Iuran Santri received = (Jumlah Total Santri * Jumlah Total Iuran) - Jumlah Total Tunggakan
  const iuranSantriMasuk = totalExpectedIuran - totalTunggakanSemuaBulan;

  // Non-SPP (Iuran Santri) incoming transactions (like donations/business income)
  let nonSppMasuk = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'masuk' && tx.category !== 'Iuran Santri') {
      nonSppMasuk += tx.amount;
    }
  });

  // Total Dana Masuk = SPP Masuk + Non-SPP Masuk
  const totalMasuk = iuranSantriMasuk + nonSppMasuk;
  const sisaDana = totalMasuk - totalKeluar;

  // SPP Stats for the selected month
  let sppLunasCount = 0;
  let sppTunggakanCount = 0;

  students.forEach((student) => {
    if (student.monthlyFeePaid[selectedMonth]) {
      sppLunasCount++;
    } else {
      sppTunggakanCount++;
    }
  });

  const totalTunggakanAmount = sppTunggakanCount * getPrice(selectedMonth);

  return {
    totalMasuk,
    totalKeluar,
    sisaDana,
    sppLunasCount,
    sppTunggakanCount,
    totalTunggakanAmount,
    totalTunggakanSemuaBulan,
    totalExpectedIuran,
  };
}

export function formatDate(dateStr: string): string {
  try {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  } catch {
    return dateStr;
  }
}

export function getMonthName(monthStr: string): string {
  // input: "2026-06"
  const [year, month] = monthStr.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const idx = parseInt(month) - 1;
  return `${months[idx]} ${year}`;
}
