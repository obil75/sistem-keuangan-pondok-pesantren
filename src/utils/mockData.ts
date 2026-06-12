/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, DipaCategory, Transaction, NotificationLog } from '../types';

// Simple deterministic pseudo-random generator
function createRandom(seed: number) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const firstNames = [
  'Muhammad', 'Ahmad', 'Ali', 'Umar', 'Usman', 'Abdurrahman', 'Yusuf', 'Ibrahim',
  'Hasan', 'Husein', 'Zainal', 'Abdul', 'Hamzah', 'Fathan', 'Hilman', 'Luqman',
  'Faiz', 'Zikri', 'Farhan', 'Rizky', 'Aditya', 'Rian', 'Fikri', 'Ilham',
  'Fatimah', 'Aisyah', 'Khadijah', 'Zahra', 'Siti', 'Aminah', 'Safiyah', 'Marwah',
  'Naila', 'Anisa', 'Rania', 'Salma', 'Yasmin', 'Hana', 'Zhafira', 'Farida',
  'Alia', 'Dina', 'Luthfia', 'Amalia', 'Putri', 'Salsabila', 'Syifa', 'Meutia'
];

const lastNames = [
  'Arifin', 'Hidayat', 'Fauzi', 'Pratama', 'Saputra', 'Wijaya', 'Siregar', 'Lubis',
  'Nasution', 'Sari', 'Lestari', 'Rahayu', 'Putra', 'Putri', 'Kurniawan', 'Setiawan',
  'Mahendra', 'Zulkarnaen', 'Fitri', 'Utami', 'Nugroho', 'Budiman', 'Wibowo', 'Hadi',
  'Mubarok', 'Assegaf', 'Shodiq', 'Yasin', 'Ghazali', 'Syafi\'i', 'Maliki', 'Hanafi',
  'Hambali', 'Rabbani', 'Zuhdi', 'Muttaqin', 'Nafis', 'Munir', 'Rizal', 'Wahid'
];

const classes = [
  'Kelas VII-A (Ula)', 'Kelas VII-B (Ula)',
  'Kelas VIII-A (Ula)', 'Kelas VIII-B (Ula)',
  'Kelas IX-A (Ula)', 'Kelas IX-B (Ula)',
  'Kelas X-Ulya 1', 'Kelas X-Ulya 2',
  'Kelas XI-Ulya 1', 'Kelas XI-Ulya 2',
  'Kelas XII-Ulya 1', 'Kelas XII-Ulya 2'
];

const parentFirstNames = [
  'Bambang', 'Slamet', 'Heri', 'Agus', 'Dedi', 'Rudi', 'Budi', 'Supriadi',
  'Mulyono', 'Subagyo', 'Herman', 'Yanto', 'Iwan', 'Joko', 'Andi', 'Hartono',
  'Sri', 'Indah', 'Yati', 'Sumiati', 'Kartini', 'Dewi', 'Endang', 'Ratna'
];

export function generateInitialMockData(): {
  students: Student[];
  dipaCategories: DipaCategory[];
  transactions: Transaction[];
  notificationQueue: NotificationLog[];
} {
  const random = createRandom(1412); // fixed seed for reproducibility

  // Generate 764 students
  const students: Student[] = [];
  const totalSantri = 764;
  const iuranBulanan = 750000;

  // Active months for 2026 (Jan to Jun)
  const activeMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

  for (let i = 1; i <= totalSantri; i++) {
    const fn = firstNames[Math.floor(random() * firstNames.length)];
    const ln = lastNames[Math.floor(random() * lastNames.length)];
    const name = `${fn} ${ln}`;
    const parentFn = parentFirstNames[Math.floor(random() * parentFirstNames.length)];
    const parentLn = lastNames[Math.floor(random() * lastNames.length)];
    const parentName = `Bp. ${parentFn} ${parentLn}`;

    // Code for phone: 6281xxxxxxxxx
    const randomDigits = Math.floor(100000000 + random() * 900000000).toString();
    const parentPhone = `6281${randomDigits}`;

    const nis = `26.${String(1000 + i).substring(1)}`;
    const className = classes[Math.floor(random() * classes.length)];

    // Payments status logic (Jan to Jun)
    // Most students pay, but some have arrears (especially in May and June)
    const monthlyFeePaid: Record<string, boolean> = {};
    activeMonths.forEach((month, idx) => {
      // Younger indices (Jan, Feb, Mar) have higher payment rate (95%)
      // Recent months (Apr, May) have moderate paid rate (90%, 85%)
      // Current month (Jun) has 60% payment rate (since it is ongoing)
      let payChance = 0.96;
      if (month === '2026-04') payChance = 0.90;
      if (month === '2026-05') payChance = 0.84;
      if (month === '2026-06') payChance = 0.55;

      // Ensure some student profiles are consistently late or early
      const studentFactor = random();
      if (studentFactor > 0.97) {
        // chronic arrears student (unpaid for last 3-4 months)
        monthlyFeePaid[month] = idx < 2; // only paid Jan, Feb
      } else if (studentFactor < 0.5) {
        // perfect payer
        monthlyFeePaid[month] = true;
      } else {
        monthlyFeePaid[month] = studentFactor <= payChance;
      }
    });

    students.push({
      id: `santri-${i}`,
      nis,
      name,
      className,
      parentName,
      parentPhone,
      monthlyFeePaid,
    });
  }

  // DIPA Alokasi Belanja Categories (Format DIPA Kementerian Agama / Lembaga Pesantren)
  const dipaCategories: DipaCategory[] = [
    {
      id: 'dipa-1',
      code: '5100',
      name: 'Belanja Operasional Pendidikan',
      allocatedAmount: 150000000,
      realizedAmount: 75000000,
    },
    {
      id: 'dipa-2',
      code: '5200',
      name: 'Belanja Operasional Kepesantrenan',
      allocatedAmount: 300000000,
      realizedAmount: 165000000,
    },
    {
      id: 'dipa-3',
      code: '5300',
      name: 'Belanja Pegawai dan SDM',
      allocatedAmount: 1250000000,
      realizedAmount: 625000000,
    },
    {
      id: 'dipa-4',
      code: '5400',
      name: 'Belanja Administrasi & Perkantoran',
      allocatedAmount: 120000000,
      realizedAmount: 54200000,
    },
    {
      id: 'dipa-5',
      code: '5500',
      name: 'Belanja Beban Daya dan Jasa',
      allocatedAmount: 400000000,
      realizedAmount: 182400000,
      subCategories: ['Listrik', 'Air PDAM', 'Internet/Wifi'],
    },
    {
      id: 'dipa-6',
      code: '5600',
      name: 'Belanja Pemeliharaan',
      allocatedAmount: 200000000,
      realizedAmount: 85000000,
    },
    {
      id: 'dipa-7',
      code: '5700',
      name: 'Belanja Aset/Investasi',
      allocatedAmount: 750000000,
      realizedAmount: 380120000,
    },
    {
      id: 'dipa-8',
      code: '5800',
      name: 'Belanja Kegiatan Santri',
      allocatedAmount: 320000000,
      realizedAmount: 145000000,
    },
    {
      id: 'dipa-9',
      code: '5900',
      name: 'Belanja Sosial & Dakwah',
      allocatedAmount: 250000000,
      realizedAmount: 95000000,
    },
    {
      id: 'dipa-10',
      code: '6000',
      name: 'Belanja Kesehatan',
      allocatedAmount: 100000000,
      realizedAmount: 45000000,
    },
    {
      id: 'dipa-11',
      code: '6100',
      name: 'Belanja Transportasi',
      allocatedAmount: 110000000,
      realizedAmount: 32500000,
    },
    {
      id: 'dipa-12',
      code: '6200',
      name: 'Belanja Tak Terduga',
      allocatedAmount: 80000000,
      realizedAmount: 12000000,
    }
  ];

  // Pre-populate some historical transactions
  // We compute total SPP paid historically to back-feed into Transaction ledger
  const transactions: Transaction[] = [];

  // Generate historical payments based on student payment records
  students.forEach((s) => {
    activeMonths.forEach((m) => {
      if (s.monthlyFeePaid[m]) {
        // Date of SPP payment is usually between 1st to 10th of that month
        let daySeed = parseInt(s.id.replace('santri-', ''));
        const day = String((daySeed % 9) + 2).padStart(2, '0');
        const dateStr = `${m}-${day}`;

        transactions.push({
          id: `tx-spp-${s.id}-${m}`,
          type: 'masuk',
          category: 'Iuran Santri',
          amount: iuranBulanan,
          date: dateStr,
          description: `Pembayaran Iuran SPP Bulanan ${m} - ${s.name} (${s.nis})`,
          refId: s.id,
          paymentMonth: m
        });
      }
    });
  });

  // Also include general non-spp income (Donations, Yayasan, Unit Usaha)
  const periodicIncomes = [
    { date: '2026-01-15', amount: 45000000, cat: 'Dana Hibah Yayasan', desc: 'Suntikan dana operasional awal tahun dari Yayasan' },
    { date: '2026-02-28', amount: 15500000, cat: 'Donasi Publik & Alumni', desc: 'Sedekah/Infaq jumat berjamaah & donatur tetap' },
    { date: '2026-03-10', amount: 28000000, cat: 'Unit Bisnis Pesantren', desc: 'Bagi hasil dari Toko/Koperasi & Unit Air Minum Pesantren' },
    { date: '2026-04-18', amount: 65000000, cat: 'Dana Hibah Yayasan', desc: 'Bantuan pembangunan gedung asrama putri' },
    { date: '2026-05-25', amount: 21200000, cat: 'Donasi Publik & Alumni', desc: 'Infaq khusus penyediaan karpet masjid pesantren' },
    { date: '2026-06-03', amount: 32500000, cat: 'Unit Bisnis Pesantren', desc: 'Pendapatan Koperasi & Toko kitab awal pekan Syawal' }
  ];

  periodicIncomes.forEach((inc, idx) => {
    transactions.push({
      id: `tx-inc-other-${idx}`,
      type: 'masuk',
      category: inc.cat,
      amount: inc.amount,
      date: inc.date,
      description: inc.desc
    });
  });

  // Generate expenditure transactions that sum up to exactly the realized amount in DIPA
  dipaCategories.forEach((cat) => {
    // Distribute realized amount across active months
    const realization = cat.realizedAmount;
    const monthlyAlloc = realization / 5.5; // spread over 5.5 months

    activeMonths.forEach((m, idx) => {
      // For June (idx = 5), only write half
      let factor = m === '2026-06' ? 0.6 : 1.0;
      let monthAmount = Math.round((monthlyAlloc * factor) + ((idx % 3 - 1) * (monthlyAlloc * 0.1)));

      transactions.push({
        id: `tx-out-${cat.id}-${m}`,
        type: 'keluar',
        category: cat.name,
        amount: monthAmount,
        date: `${m}-12`,
        description: `Belanja Kegiatan / Realisasi DIPA Sub-Bagian ${cat.code}: ${cat.name} periode ${m}`
      });
    });
  });

  return {
    students,
    dipaCategories,
    transactions,
    notificationQueue: []
  };
}

// LocalStorage helpers to statefully read & write pesantren finance database
export function loadPesantrenDb() {
  const SP_KEY = 'pesantren_finance_db_v1';
  try {
    const data = localStorage.getItem(SP_KEY);
    if (!data) {
      const generated = generateInitialMockData();
      localStorage.setItem(SP_KEY, JSON.stringify(generated));
      return generated;
    }
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('Failed to load storage db', error);
    return generateInitialMockData();
  }
}

export function savePesantrenDb(data: {
  students: Student[];
  dipaCategories: DipaCategory[];
  transactions: Transaction[];
  notificationQueue: NotificationLog[];
}) {
  const SP_KEY = 'pesantren_finance_db_v1';
  try {
    localStorage.setItem(SP_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage db', error);
  }
}
