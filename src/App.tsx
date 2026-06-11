/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  History, 
  BellRing, 
  LineChart, 
  Database, 
  Menu, 
  X, 
  RotateCcw,
  BookOpen,
  DollarSign,
  Briefcase,
  AlertCircle,
  LogOut
} from 'lucide-react';

// Firebase core configuration
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './firebase';
import { 
  checkAndSeedFirebase, 
  resetFirestoreDatabase,
  subscribeToStudents, 
  subscribeToDipaCategories, 
  subscribeToTransactions, 
  subscribeToNotificationLogs,
  addTransactionToFirestore,
  updateStudentsInFirestore,
  updateDipaListInFirestore,
  addNotificationLogsToFirestore,
  clearNotificationLogsInFirestore
} from './utils/firebaseSync';

// Custom dependencies & types
import { Student, DipaCategory, Transaction, NotificationLog } from './types';
import { generateInitialMockData } from './utils/mockData';
import { calculateStats } from './utils/financeHelpers';

// Subcomponents
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import DipaManagement from './components/DipaManagement';
import Transactions from './components/Transactions';
import Notifications from './components/Notifications';
import Reports from './components/Reports';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [navState, setNavState] = useState<any>(null); // To pass simple context between tabs
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Database States
  const [students, setStudents] = useState<Student[]>([]);
  const [dipaCategories, setDipaCategories] = useState<DipaCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notificationQueue, setNotificationQueue] = useState<NotificationLog[]>([]);

  // Auth & Seeding states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbSeeding, setDbSeeding] = useState(false);
  const [seedingMessage, setSeedingMessage] = useState('');

  // Track Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync databases if user is logged in
  useEffect(() => {
    if (!user) return;

    let unsubStudents: () => void;
    let unsubDipa: () => void;
    let unsubTx: () => void;
    let unsubLogs: () => void;

    const initDbSync = async () => {
      try {
        setDbSeeding(true);
        // Check if database is empty, seed if it is
        await checkAndSeedFirebase((msg) => setSeedingMessage(msg));
        setDbSeeding(false);

        // Setup real-time subscriptions
        unsubStudents = subscribeToStudents(
          (data) => setStudents(data),
          (err) => console.error(err)
        );
        unsubDipa = subscribeToDipaCategories(
          (data) => setDipaCategories(data),
          (err) => console.error(err)
        );
        unsubTx = subscribeToTransactions(
          (data) => setTransactions(data),
          (err) => console.error(err)
        );
        unsubLogs = subscribeToNotificationLogs(
          (data) => setNotificationQueue(data),
          (err) => console.error(err)
        );
      } catch (err) {
        setDbSeeding(false);
        console.error('Error in Firebase Sync initializing: ', err);
      }
    };

    initDbSync();

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubDipa) unsubDipa();
      if (unsubTx) unsubTx();
      if (unsubLogs) unsubLogs();
    };
  }, [user]);

  // Compute stats for current month's SPP to show warning badge on sidebar
  const sidebarAlerts = useMemo(() => {
    if (!students.length) return 0;
    const currentMonth = '2026-06';
    return students.filter(s => s.monthlyFeePaid[currentMonth] === false).length;
  }, [students]);

  // Handle direct navigation with shared state context
  const handleNavigateWithContext = (tab: string, state?: any) => {
    setNavState(state || null);
    setActiveTab(tab);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  // Add a brand new Transaction (synchronized with Student and DIPA databases)
  const handleAddTransaction = async (newTx: Transaction, updatedStudents?: Student[], updatedDipa?: DipaCategory[]) => {
    try {
      await addTransactionToFirestore(newTx, updatedStudents, updatedDipa);
    } catch (e) {
      alert("Gagal menambahkan transaksi ke cloud: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Update students listing in main db
  const handleUpdateStudents = async (updated: Student[]) => {
    try {
      await updateStudentsInFirestore(updated);
    } catch (e) {
      alert("Gagal memperbarui data santri di cloud: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Update DIPA categories budget listing
  const handleUpdateDipa = async (updated: DipaCategory[]) => {
    try {
      await updateDipaListInFirestore(updated);
    } catch (e) {
      alert("Gagal memperbarui anggaran DIPA di cloud: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Add dispatched notifications to historical log
  const handleAddNotificationLogs = async (logs: NotificationLog[]) => {
    try {
      await addNotificationLogsToFirestore(logs);
    } catch (e) {
      alert("Gagal menyimpan riwayat notifikasi ke cloud: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Clear all notification histories
  const handleClearNotificationLogs = async () => {
    try {
      await clearNotificationLogsInFirestore(notificationQueue);
    } catch (e) {
      alert("Gagal menghapus riwayat notifikasi di cloud: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Reset database entirely with fresh data
  const handleResetDb = async () => {
    const doubleCheck = window.confirm(
      'Apakah Anda yakin ingin memformat ulang pangkalan data cloud? Seluruh perubahan data santri, iuran, realisasi DIPA, dan arus transaksi Anda saat ini di Firestore akan disinkronkan kembali ke konfigurasi data contoh 120 santri asli.'
    );
    if (!doubleCheck) return;

    try {
      setDbSeeding(true);
      await resetFirestoreDatabase((msg) => setSeedingMessage(msg));
      setDbSeeding(false);
      alert('Basis data cloud Pondok Pesantren berhasil di-reset ke kondisi semula!');
      setActiveTab('dashboard');
    } catch (e) {
      setDbSeeding(false);
      alert('Gagal me-reset basis data cloud: ' + (e instanceof Error ? e.message : String(e)));
    }
  };


  // Render current active layout
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            students={students} 
            dipaCategories={dipaCategories} 
            transactions={transactions} 
            onNavigate={(tab) => handleNavigateWithContext(tab)} 
          />
        );
      case 'santri':
        return (
          <StudentList 
            students={students} 
            onUpdateStudents={handleUpdateStudents}
            onNavigateToTab={handleNavigateWithContext}
          />
        );
      case 'dipa':
        return (
          <DipaManagement 
            dipaCategories={dipaCategories} 
            onUpdateDipa={handleUpdateDipa} 
          />
        );
      case 'transaksi':
        return (
          <Transactions 
            transactions={transactions} 
            students={students} 
            dipaCategories={dipaCategories} 
            onAddTransaction={handleAddTransaction} 
          />
        );
      case 'notifikasi':
        return (
          <Notifications 
            students={students} 
            notificationQueue={notificationQueue}
            onAddNotificationLogs={handleAddNotificationLogs}
            onClearNotificationLogs={handleClearNotificationLogs}
            initialState={navState}
          />
        );
      case 'laporan':
        return (
          <Reports 
            students={students} 
            dipaCategories={dipaCategories} 
            transactions={transactions} 
          />
        );
      default:
        return <div className="text-center py-20 text-xs">Menu tidak ditemukan.</div>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-[#3D3D3D]">
        <div className="text-center space-y-4">
          <BookOpen className="w-10 h-10 text-[#5A5A40] animate-pulse mx-auto" />
          <h2 className="text-xl font-serif font-bold italic text-[#5A5A40]">SIKEU Pesantren</h2>
          <p className="text-xs text-[#7A7A6A] font-medium font-mono">Memuat otentikasi Firebase...</p>
        </div>
      </div>
    );
  }

  if (dbSeeding) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-[#3D3D3D]">
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E1DA] shadow-xl max-w-sm w-full text-center space-y-6">
          <Database className="w-12 h-12 text-[#5A5A40] animate-bounce mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-serif font-bold text-[#2C2C24]">Inisialisasi Cloud Ledger</h3>
            <p className="text-xs text-[#7A7A6A] leading-relaxed">
              Pesantren Daarul Al-Hambra mendeteksi database cloud baru. Mengunggah data awal induk santri, pagu DIPA, dan arus kas historis secara real-time.
            </p>
          </div>
          <div className="py-2.5 px-4 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-[10px] font-mono font-bold text-[#5A5A40]">
            {seedingMessage || 'Menghubungkan ke Firestore...'}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-[#3D3D3D]">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-[#E5E1DA] shadow-xl overflow-hidden p-8 md:p-10 space-y-8">
          
          {/* Logo & Headline */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-md mx-auto">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-serif font-bold text-[#2C2C24]">SIKEU Pesantren</h1>
              <p className="text-xs font-bold font-sans uppercase tracking-widest text-[#7A7A6A]">Keuangan & SPP Daarul Al-Hambra</p>
            </div>
          </div>

          <p className="text-xs text-[#7A7A6A] text-center leading-relaxed">
            Sistem akuntansi terpadu pelacakan anggaran DIPA Kemenag serta iuran bulanan santri berbasis cloud. Silakan masuk menggunakan akun Google terverifikasi pengurus pesantren Anda.
          </p>

          {/* Social Sign-in button */}
          <button
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch (e: any) {
                alert("Gagal masuk dengan Google: " + e.message);
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-[#D9D3C7] hover:bg-[#F7F5F0] text-xs font-bold text-[#3D3D3D] rounded-xl shadow-xs transition hover:translate-y-[-1px] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.65 1.57 14.97 1 12 1 7.35 1 3.39 3.65 1.48 7.5l3.86 3C6.27 7.42 8.93 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.44-1.09 2.66-2.31 3.48l3.58 2.78c2.1-1.94 3.78-4.8 3.78-8.36z" />
              <path fill="#FBBC05" d="M5.34 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.48 6.9C.53 8.78 0 10.87 0 13s.53 4.22 1.48 6.1l3.86-3z" />
              <path fill="#34A562" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.58-2.78c-1 .67-2.28 1.07-4.38 1.07-3.07 0-5.73-2.38-6.66-5.46l-3.86 3C3.39 20.35 7.35 23 12 23z" />
            </svg>
            Masuk dengan Akun Google
          </button>

          <div className="pt-4 border-t border-[#F0EFEA] text-center">
            <span className="text-[10px] text-[#7A7A6A] font-mono leading-none bg-[#F7F5F0] px-2.5 py-1.5 rounded-full border border-[#D9D3C7]">
              🔒 Cloud Database Terlindungi AES-256
            </span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#3D3D3D] flex font-sans antialiased">
      
      {/* SIDEBAR NAVIGATION SCREEN SHELL */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#EBE7DF] text-[#3D3D3D] border-r border-[#D9D3C7] flex flex-col justify-between transition-transform transform md:translate-x-0 no-print ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header & Brand Logo */}
        <div>
          <div className="p-5 border-b border-[#D9D3C7] flex items-center justify-between bg-[#E4DFD5]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#5A5A40] rounded-xl flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-serif italic text-[#2E6B3E] font-bold tracking-tight">Pesantren Modern</h2>
                <p className="text-[8px] text-[#7A7A6A] font-bold uppercase tracking-wider font-sans">Datok Sulaiman Kota Palopo</p>
              </div>
            </div>
            {/* Close Mobile Hamburger button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-[#7A7A6A] hover:text-[#5A5A40] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav list */}
          <nav className="p-4 space-y-1">
            
            {/* Dashboard Link */}
            <button
              onClick={() => handleNavigateWithContext('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'dashboard' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
              <span>Dashboard Analitis</span>
            </button>

            {/* Student Database Link */}
            <button
              onClick={() => handleNavigateWithContext('santri')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'santri' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-4 h-4 shrink-0 ${activeTab === 'santri' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
                <span>Data Induk Santri</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'santri' ? 'bg-[#5A5A40] text-white' : 'bg-[#D9D3C7] text-[#3D3D3D]'
              }`}>
                {students.length}
              </span>
            </button>

            {/* DIPA Budgeting Link */}
            <button
              onClick={() => handleNavigateWithContext('dipa')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'dipa' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'dipa' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
                <span>Anggaran Belanja DIPA</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'dipa' ? 'bg-[#5A5A40] text-white' : 'bg-[#D9D3C7] text-[#3D3D3D]'
              }`}>
                {dipaCategories.length}
              </span>
            </button>

            {/* Cashbook Ledger Link */}
            <button
              onClick={() => handleNavigateWithContext('transaksi')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'transaksi' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <History className={`w-4 h-4 shrink-0 ${activeTab === 'transaksi' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
              <span>Buku Jurnal Kas</span>
            </button>

            {/* Notifications alerts queue link */}
            <button
              onClick={() => handleNavigateWithContext('notifikasi')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'notifikasi' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <BellRing className={`w-4 h-4 shrink-0 ${activeTab === 'notifikasi' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
                <span>Notifikasi Tunggakan</span>
              </div>
              {sidebarAlerts > 0 && (
                <span className="text-[10px] font-mono font-bold bg-[#A66E4E] text-white px-2 py-0.5 rounded-full animate-pulse">
                  {sidebarAlerts}
                </span>
              )}
            </button>

            {/* Financial Audits Report printing link */}
            <button
              onClick={() => handleNavigateWithContext('laporan')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === 'laporan' 
                  ? 'bg-[#F7F5F0] text-[#5A5A40] border-[#D9D3C7] shadow-xs' 
                  : 'text-[#3D3D3D] opacity-75 hover:opacity-100 hover:bg-[#E2DDD5]/60 border-transparent'
              }`}
            >
              <LineChart className={`w-4 h-4 shrink-0 ${activeTab === 'laporan' ? 'text-[#5A5A40]' : 'text-[#7A7A6A]'}`} />
              <span>Laporan Akuntansi</span>
            </button>

          </nav>
        </div>

        {/* Sidebar Footer Menu */}
        <div className="p-4 border-t border-[#D9D3C7] space-y-3.5 bg-[#E4DFD5]/45">
          {/* Quick Database Status helper */}
          <div className="p-3 bg-white/40 rounded-xl border border-[#D9D3C7] flex items-center gap-2.5 text-[10px]">
            <Database className="w-4 h-4 text-[#5A5A40] shrink-0" />
            <div>
              <p className="text-[#3D3D3D] font-bold font-sans">STATUS CLOUD DB</p>
              <p className="text-[#7A7A6A] mt-0.5">Aktif & Tersinkronisasi</p>
            </div>
          </div>

          <button
            onClick={handleResetDb}
            className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-[#E2DDD5] text-[11px] text-[#7A7A6A] hover:text-[#A66E4E] font-semibold border border-dashed border-[#D9D3C7] hover:border-[#A66E4E] px-3 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Format Basis Data Cloud
          </button>
        </div>

      </aside>

      {/* SIDEBAR OVERLAY BACKGROUND FOR MOBILE */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#3d3d2f]/20 backdrop-blur-xs z-30 md:hidden no-print"
        />
      )}

      {/* MAIN CONTAINER WORKSPACE SECTION */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* APP WORKSPACE HEADER */}
        <header className="sticky top-0 bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#D9D3C7] px-6 py-4 flex items-center justify-between z-20 shadow-xs no-print">
          
          {/* Left panel: mobile humburger trigger or current routing hint */}
          <div className="flex items-center gap-4">
            <button
               onClick={() => setSidebarOpen(true)}
               className="md:hidden text-[#3D3D3D] hover:text-[#5A5A40] p-1 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-[#7A7A6A] uppercase tracking-widest font-sans">
              <span>Keuangan Pesantren</span>
              <span>/</span>
              <span className="text-[#5A5A40] text-xs font-serif italic font-semibold">{activeTab}</span>
            </div>
          </div>

          {/* Right panel: User Avatar and Identity */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <h4 className="text-xs font-serif font-bold text-[#2C2C24]">
                {user?.displayName || user?.email || 'Ust. Arsyad Hambali'}
              </h4>
              <p className="text-[9px] text-[#5A5A40] font-bold uppercase tracking-widest font-sans">
                {user?.email === 'Arsyblank@gmail.com' ? 'Administrator' : 'Pengurus Keuangan'}
              </p>
            </div>
            
            {/* Dynamic Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#EBE7DF] border border-[#D9D3C7] flex items-center justify-center text-[#5A5A40] font-serif font-extrabold text-xs overflow-hidden shadow-2xs">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User Photo'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'AH'
              )}
            </div>

            {/* Logout button */}
            <button 
              onClick={() => logout()}
              title="Keluar dari Aplikasi (Keluar)"
              className="p-1 px-2.5 py-1.5 hover:bg-[#EBE7DF] text-[#7A7A6A] hover:text-[#A66E4E] border border-[#D9D3C7] hover:border-[#F6DFD0] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          </div>

        </header>

        {/* WORKSPACE CONTENT BODY */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
               initial={{ opacity: 0, scale: 0.995 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.995 }}
               transition={{ duration: 0.15 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
