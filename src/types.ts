/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  nis: string;
  name: string;
  className: string;
  parentName: string;
  parentPhone: string;
  monthlyFeePaid: Record<string, boolean>; // key: "YYYY-MM", value: true (paid) or false (unpaid)
  isActive?: boolean; // true = aktif, false = non-aktif/keluar
}

export interface SubCategoryDetail {
  name: string;
  volume?: string;
  unitPrice?: number;
}

export interface DipaCategory {
  id: string;
  code: string;
  name: string;
  allocatedAmount: number; // Anggaran yang direncanakan
  realizedAmount: number;  // Anggaran yang sudah terpakai
  subCategories?: string[]; // Optional sub-categories
  volume?: string;         // Volume e.g. "12 bln"
  unitPrice?: number;      // Harga satuan
  subCategoriesDetail?: SubCategoryDetail[];
}

export type TransactionType = 'masuk' | 'keluar';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string; // nama kategori DIPA atau "Iuran Santri"
  subCategory?: string; // sub-kategori belanja jika ada
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  refId?: string; // Menyambung ke ID santri jika "Iuran Santri"
  paymentMonth?: string; // "YYYY-MM" jika jenisnya iuran santri
}

export interface NotificationLog {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  month: string; // "YYYY-MM"
  amount: number;
  sentAt: string; // ISO timestamp
  status: 'sukses' | 'gagal';
  message: string;
}

export interface FinancialStats {
  totalMasuk: number;
  totalKeluar: number;
  sisaDana: number;
  sppLunasCount: number;
  sppTunggakanCount: number;
  totalTunggakanAmount: number;
  totalTunggakanSemuaBulan: number;
  totalExpectedIuran: number;
}
