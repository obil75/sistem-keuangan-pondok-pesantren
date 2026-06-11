/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  PhoneCall, 
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Student, NotificationLog } from '../types';
import { formatRupiah, getMonthName } from '../utils/financeHelpers';

interface NotificationsProps {
  students: Student[];
  notificationQueue: NotificationLog[];
  onAddNotificationLogs: (logs: NotificationLog[]) => void;
  onClearNotificationLogs: () => void;
  initialState?: { filterClass?: string; filterMonth?: string };
}

const DEFAULT_TEMPLATES = {
  sppRemind: `Assalamualaikum Wr. Wb. Yth. {NamaWali}, wali dari santri kami {NamaSantri} (NIS: {NIS}, {Kelas}).\n\nDiberitahukan bahwa terdapat tunggakan iuran bulanan (SPP) untuk bulan {Bulan} sebesar {JumlahTunggakan}.\n\nPembayaran dapat dilakukan via transfer Bank Syariah Indonesia (BSI) Rek. 7647500000 an. Pondok Pesantren, atau cash ke Kantor Bendahara.\n\nSyukran katsiran atas perhatian Bapak/Ibu. Wassalamualaikum Wr. Wb.`
};

export default function Notifications({ 
  students, 
  notificationQueue, 
  onAddNotificationLogs, 
  onClearNotificationLogs,
  initialState
}: NotificationsProps) {
  
  // Selection States
  const [selectedMonth, setSelectedMonth] = useState(initialState?.filterMonth || '2026-06');
  const [selectedClass, setSelectedClass] = useState(initialState?.filterClass || 'All');
  const [searchTerm, setSearchTerm] = useState('');

  // Template State
  const [msgTemplate, setMsgTemplate] = useState(DEFAULT_TEMPLATES.sppRemind);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  // Bulk dispatch simulation states
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [currentNodeIdx, setCurrentNodeIdx] = useState(0);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);

  // Distinct classes list for filter
  const classesList = useMemo(() => {
    const list = new Set<string>();
    students.forEach(s => list.add(s.className));
    return Array.from(list);
  }, [students]);

  // Compute list of students with arrears (Tunggakan) for the selected month & class
  const studentsWithArrears = useMemo(() => {
    return students.filter(s => {
      const isPaid = s.monthlyFeePaid[selectedMonth] === true;
      const matchesClass = selectedClass === 'All' || s.className === selectedClass;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.nis.includes(searchTerm) || 
                            s.parentName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return !isPaid && matchesClass && matchesSearch;
    });
  }, [students, selectedMonth, selectedClass, searchTerm]);

  // Interpolate single message template helper
  const interpolateTemplate = (student: Student, monthStr: string) => {
    let result = msgTemplate;
    result = result.replace(/{NamaWali}/g, student.parentName);
    result = result.replace(/{NamaSantri}/g, student.name);
    result = result.replace(/{NIS}/g, student.nis);
    result = result.replace(/{Kelas}/g, student.className);
    result = result.replace(/{Bulan}/g, getMonthName(monthStr));
    result = result.replace(/{JumlahTunggakan}/g, formatRupiah(750000));
    return result;
  };

  // Automated dispatch simulation
  const handleBulkDispatch = () => {
    const totalCount = studentsWithArrears.length;
    if (totalCount === 0) {
      alert('Tidak ada wali santri dengan tunggakan pembayaran yang memenuhi kriteria filter saat ini.');
      return;
    }

    const conf = window.confirm(`Apakah Anda ingin menjalankan sistem pengiriman notifikasi otomatis kepada ${totalCount} wali santri?`);
    if (!conf) return;

    setIsDispatching(true);
    setDispatchProgress(0);
    setCurrentNodeIdx(0);
    setDispatchLogs(['Menghubungkan ke gateway SMS & WhatsApp Pesantren...', 'Sistem siap melepas pesan otomatis...']);

    let index = 0;
    const newLogs: NotificationLog[] = [];

    const interval = setInterval(() => {
      if (index < totalCount) {
        const student = studentsWithArrears[index];
        const rawMsg = interpolateTemplate(student, selectedMonth);
        
        // Simulating random success dispatch rate
        const success = Math.random() > 0.04; // 96% success rate

        newLogs.push({
          id: `log-${Date.now()}-${index}`,
          studentId: student.id,
          studentName: student.name,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          month: selectedMonth,
          amount: 750000,
          sentAt: new Date().toISOString(),
          status: success ? 'sukses' : 'gagal',
          message: rawMsg
        });

        setDispatchLogs(prev => [
          `[${index + 1}/${totalCount}] Mengirim tagihan ke ${student.parentName} (${student.name}): ${success ? 'SUKSES' : 'GAGAL'}`,
          ...prev
        ]);

        index++;
        setCurrentNodeIdx(index);
        setDispatchProgress(Math.round((index / totalCount) * 100));
      } else {
        clearInterval(interval);
        setIsDispatching(false);
        onAddNotificationLogs(newLogs);
        alert(`Pengiriman notifikasi selesai! ${newLogs.filter(l => l.status === 'sukses').length} sukses, ${newLogs.filter(l => l.status === 'gagal').length} gagal.`);
      }
    }, 400); // 400ms per simulated dispatch to look realistic
  };

  // WhatsApp click-to-manual helper
  const handleTriggerWhatsApp = (student: Student) => {
    const customizedText = interpolateTemplate(student, selectedMonth);
    const encodedText = encodeURIComponent(customizedText);
    // standard wa.me redirect link format
    const waUrl = `https://wa.me/${student.parentPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2C2C24]">Notifikasi Otomatis Tunggakan SPP</h1>
          <p className="text-xs text-[#7A7A6A] mt-0.5">Sistem cerdas penyebaran tagihan iuran bulanan untuk orang tua/wali santri secara massal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Messages Template Editor (Left Column) */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E5E1DA] shadow-sm flex flex-col justify-between h-fit lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F0EFEA]">
              <h2 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#5A5A40]" />
                Template Tagihan SPP
              </h2>
              <button
                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                className="text-xs text-[#5A5A40] font-bold hover:underline hover:text-[#4A4A34] cursor-pointer"
              >
                {isEditingTemplate ? 'Selesai Edit' : 'Modifikasi'}
              </button>
            </div>

            {isEditingTemplate ? (
              <div className="space-y-3">
                <textarea
                  rows={10}
                  value={msgTemplate}
                  onChange={(e) => setMsgTemplate(e.target.value)}
                  className="w-full p-3 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-mono leading-relaxed"
                />
                <button
                  onClick={() => {
                    setMsgTemplate(DEFAULT_TEMPLATES.sppRemind);
                    setIsEditingTemplate(false);
                  }}
                  className="text-[10px] text-[#A66E4E] font-semibold flex items-center gap-1 hover:underline ml-auto cursor-pointer"
                >
                  Reset ke Bawaan
                </button>
              </div>
            ) : (
              <div className="bg-[#F7F5F0]/80 p-4 rounded-xl border border-[#D9D3C7] text-xs text-[#3D3D3D] leading-relaxed whitespace-pre-wrap font-sans">
                {msgTemplate}
              </div>
            )}

            {/* Template dynamic placeholders documentation tag system */}
            <div className="mt-4 p-3.5 bg-[#FDF4EF] border border-[#F6DFD0] rounded-xl space-y-1.5 text-[11px] text-[#8C5D3E]">
              <p className="font-bold flex items-center gap-1 text-[#A66E4E]">
                <FileText className="w-3.5 h-3.5 text-[#A66E4E]" />
                Daftar Tag Dinamis (Placeholders)
              </p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-center">
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{NamaWali}'}</code></div>
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{NamaSantri}'}</code></div>
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{NIS}'}</code></div>
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{Kelas}'}</code></div>
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{Bulan}'}</code></div>
                <div><code className="bg-white px-1.5 py-0.5 border border-[#F6DFD0] text-[#A66E4E] rounded">{'{JumlahTunggakan}'}</code></div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#F0EFEA] pt-4 flex gap-2">
            <button
              disabled={isDispatching || studentsWithArrears.length === 0}
              onClick={handleBulkDispatch}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] disabled:bg-[#EBE7DF] disabled:text-[#7A7A6A]/60 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Kirim Notifikasi Massal ({studentsWithArrears.length})
            </button>
          </div>
        </div>

        {/* Filters and List of Arrears (Right Column) */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E5E1DA] shadow-sm lg:col-span-2 space-y-4">
          
          {/* Quick Header and selects */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest flex items-center gap-1 bg-white">
              <MessageSquare className="w-4 h-4 text-[#5A5A40] shrink-0" />
              <span>Santri Menunggak SPP:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="ml-1 bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg text-xs py-1 px-2.5 text-[#5A5A40] font-bold focus:outline-none"
              >
                <option value="2026-01">Januari 2026</option>
                <option value="2026-02">Februari 2026</option>
                <option value="2026-03">Maret 2026</option>
                <option value="2026-04">April 2026</option>
                <option value="2026-05">Mei 2026</option>
                <option value="2026-06">Juni 2026</option>
              </select>
            </h2>

            {/* Class select */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-[#F7F5F0] border border-[#D9D3C7] rounded-lg text-[11px] py-1 px-2 text-[#3D3D3D] focus:outline-none"
            >
              <option value="All">Semua Jenjang Kelas</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Local Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#7A7A6A]" />
            <input
              type="text"
              placeholder="Saring berdasarkan nama santri atau orang tua..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F7F5F0] border border-[#D9D3C7] rounded-xl text-xs text-[#3D3D3D] focus:outline-none focus:border-[#5A5A40]"
            />
          </div>

          {/* Arrears List Container */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {studentsWithArrears.length === 0 ? (
              <div className="py-20 text-center text-[#7A7A6A] border border-dashed border-[#D9D3C7] rounded-[20px] flex flex-col items-center justify-center bg-[#F7F5F0]/20">
                <CheckCircle2 className="w-8 h-8 text-[#5A5A40] mb-2 animate-pulse" />
                <p className="text-xs leading-5 max-w-sm px-4">Alhamdulillah, seluruh santri pada jenjang ini telah <strong>menyelesaikan iuran SPP bulanan</strong> untuk periode {getMonthName(selectedMonth)}.</p>
              </div>
            ) : (
              studentsWithArrears.map((s) => (
                <div 
                  key={s.id} 
                  className="p-4 border border-[#E5E1DA] bg-[#F7F5F0]/30 hover:bg-[#F7F5F0]/80 hover:border-[#D9D3C7] transition rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="font-bold text-[#2C2C24] text-xs">{s.name}</span>
                       <span className="text-[9px] font-mono font-medium text-[#5A5A40] bg-[#EBE7DF] px-2 py-0.2 rounded border border-[#D9D3C7]">{s.nis}</span>
                       <span className="text-[9px] text-[#5A5A40] font-bold bg-[#EBE7DF]/70 px-2 py-0.2 rounded border border-[#D9D3C7]/35">{s.className}</span>
                    </div>
                    <div className="text-[10px] text-[#7A7A6A] leading-relaxed">
                      Wali Santri: <strong className="text-[#3D3D3D]">{s.parentName}</strong> ({s.parentPhone})
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-[#A66E4E] font-bold font-mono">{formatRupiah(750000)}</div>
                      <div className="text-[9px] text-[#7A7A6A]">Tunggakan {getMonthName(selectedMonth)}</div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleTriggerWhatsApp(s)}
                      className="px-3 py-1.5 bg-[#E3EFE5] text-[#2E6B3E] border border-[#C3DFC8] hover:bg-[#C3DFC8] transition rounded-lg flex items-center justify-center gap-1 cursor-pointer text-xs font-semibold shadow-2xs"
                      title="Kirim Pesan Tagihan Melalui Jalur Instan WhatsApp"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Kirim WA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dispatched Notification Progress Bar Overlay */}
      {isDispatching && (
        <div className="fixed inset-0 bg-[#3d3d2f]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#E5E1DA] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#2C2C24] uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#5A5A40] animate-spin" />
                  Mengaktifkan Pengiriman Tagihan Otomatis
                </h3>
                <p className="text-[11px] text-[#7A7A6A] mt-0.5">Sistem membagi beban server dan meluncurkan antrean pesan...</p>
              </div>
              <span className="font-mono text-xs font-extrabold text-[#5A5A40] bg-[#EBE7DF] px-2 py-0.5 rounded-lg border border-[#D9D3C7]">
                {dispatchProgress}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-[#F7F5F0] border border-[#D9D3C7] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5A5A40] transition-all duration-300"
                style={{ width: `${dispatchProgress}%` }}
              />
            </div>

            {/* Live activity console log */}
            <div className="bg-[#2C2C24] text-[#EBE7DF] border border-[#3d3d2f] font-mono text-[10px] p-4 rounded-xl h-44 overflow-y-auto leading-relaxed space-y-1 select-all">
              {dispatchLogs.map((log, index) => (
                <div key={index} className="opacity-95">{log}</div>
              ))}
            </div>

            <div className="text-[10px] text-[#7A7A6A] text-center italic">
              * Harap tidak menutup tab aplikasi selama proses transmisi server iuran berlangsung.
            </div>
          </div>
        </div>
      )}

      {/* Notification Histories Log Table */}
      <div className="bg-white rounded-[24px] border border-[#E5E1DA] shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-[#F0EFEA] flex items-center justify-between bg-[#EBE7DF]/20">
          <h3 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5A5A40]" />
            Riwayat Log Notifikasi Terkirim ({notificationQueue.length})
          </h3>
          {notificationQueue.length > 0 && (
            <button
              onClick={onClearNotificationLogs}
              className="text-[10px] text-[#A66E4E] font-bold border border-[#F6DFD0] hover:bg-[#FDF4EF] px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              Hapus Semua Riwayat
            </button>
          )}
        </div>

        <div className="max-h-[250px] overflow-y-auto">
          {notificationQueue.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7A7A6A]">
              Belum ada log transmisi notifikasi yang tercatat hari ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EFEA] text-[9px] text-[#7A7A6A] font-bold uppercase tracking-wider bg-[#EBE7DF]/10">
                  <th className="py-2.5 pl-4">Metode</th>
                  <th className="py-2.5">Wali Santri</th>
                  <th className="py-2.5">No. HP WA</th>
                  <th className="py-2.5">Bulan Tagihan</th>
                  <th className="py-2.5">Dikirim Pada</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 pr-4 text-center">Tipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] text-[11px] text-[#3D3D3D]">
                {notificationQueue.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F5F0]/30 transition">
                    <td className="py-2.5 pl-4 font-semibold text-[#5A5A40]">WhatsApp Direct</td>
                    <td className="py-2.5">
                      <div className="font-semibold text-[#2C2C24]">{log.parentName}</div>
                      <div className="text-[9px] text-[#7A7A6A]">Santri: {log.studentName}</div>
                    </td>
                    <td className="py-2.5 font-mono text-[#7A7A6A]">+{log.parentPhone}</td>
                    <td className="py-2.5 font-bold text-[#2C2C24]">{getMonthName(log.month)}</td>
                    <td className="py-2.5 font-mono text-[#7A7A6A]">{new Date(log.sentAt).toLocaleTimeString('id-ID')}</td>
                    <td className="py-2.5 font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                        log.status === 'sukses' 
                          ? 'bg-[#E3EFE5] text-[#2E6B3E] border border-[#C3DFC8]' 
                          : 'bg-[#FDF4EF] text-[#A66E4E] border border-[#F6DFD0]'
                      }`}>
                        {log.status === 'sukses' ? 'SUKSES' : 'GAGAL'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className="text-[9px] bg-[#F7F5F0] text-[#5A5A40] border border-[#D9D3C7] px-1.5 py-0.2 rounded">Otomatis Terpadu</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
