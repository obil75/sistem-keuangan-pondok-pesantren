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
  selectedMonth: string = '2026-06'
): FinancialStats {
  // Total dana masuk & keluar
  let totalMasuk = 0;
  let totalKeluar = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'masuk') {
      totalMasuk += tx.amount;
    } else {
      totalKeluar += tx.amount;
    }
  });

  const sisaDana = totalMasuk - totalKeluar;

  // SPP Stats for the selected month
  let sppLunasCount = 0;
  let sppTunggakanCount = 0;
  const pricePerStudent = 750000;

  students.forEach((student) => {
    if (student.monthlyFeePaid[selectedMonth]) {
      sppLunasCount++;
    } else {
      sppTunggakanCount++;
    }
  });

  const totalTunggakanAmount = sppTunggakanCount * pricePerStudent;

  return {
    totalMasuk,
    totalKeluar,
    sisaDana,
    sppLunasCount,
    sppTunggakanCount,
    totalTunggakanAmount,
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
