/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  query, 
  limit, 
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, DipaCategory, Transaction, NotificationLog } from '../types';
import { generateInitialMockData } from './mockData';

// Helper to strip any keys with undefined values so that Firestore operations don't throw "Unsupported field value: undefined" errors.
function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

// 1. Database Seeder to ensure cold-start databases have high-fidelity content
export async function seedFirestoreDatabase(onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Menyiapkan data awal pesantren...');
    
    // Generate mock data
    const mock = generateInitialMockData();
    // To protect Firestore quota, we will seed 120 students and their associated transactions
    const countToSeed = 120;
    const seededStudents = mock.students.slice(0, countToSeed);
    
    // Keep only transactions matching the seeded students or general inflow/outflow
    const studentIds = new Set(seededStudents.map(s => s.id));
    const seededTransactions = mock.transactions.filter(tx => {
      if (tx.category === 'Iuran Santri') {
        return tx.refId && studentIds.has(tx.refId);
      }
      return true; // Keep general DIPA and other cash entries
    });

    const seededDipa = [...mock.dipaCategories];

    if (onProgress) onProgress('Memulai transfer data ke cloud...');

    // A: Seed DIPA categories
    const dipaBatch = writeBatch(db);
    seededDipa.forEach(cat => {
      const ref = doc(db, 'dipaCategories', cat.id);
      dipaBatch.set(ref, cleanFirestoreData(cat));
    });
    await dipaBatch.commit();

    // B: Seed Students in chunks of 50
    if (onProgress) onProgress('Menyimpan data induk santri...');
    for (let i = 0; i < seededStudents.length; i += 50) {
      const chunk = seededStudents.slice(i, i + 50);
      const studentBatch = writeBatch(db);
      chunk.forEach(student => {
        const ref = doc(db, 'students', student.id);
        studentBatch.set(ref, cleanFirestoreData(student));
      });
      await studentBatch.commit();
    }

    // C: Seed Transactions in chunks of 50
    if (onProgress) onProgress('Menyulis buku jurnal kas...');
    for (let i = 0; i < seededTransactions.length; i += 50) {
      const chunk = seededTransactions.slice(i, i + 50);
      const txBatch = writeBatch(db);
      chunk.forEach(tx => {
        const ref = doc(db, 'transactions', tx.id);
        txBatch.set(ref, cleanFirestoreData(tx));
      });
      await txBatch.commit();
    }

    if (onProgress) onProgress('Konfigurasi awal berhasil dimuat!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedDatabase');
  }
}

// 2. Real-time subscriptions
export function subscribeToStudents(onUpdate: (students: Student[]) => void, onError: (err: any) => void) {
  const q = collection(db, 'students');
  return onSnapshot(q, (snapshot) => {
    const list: Student[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Student);
    });
    // Sort by name or ID
    list.sort((a, b) => {
      const numA = parseInt(a.id.replace('santri-', '')) || 0;
      const numB = parseInt(b.id.replace('santri-', '')) || 0;
      return numA - numB;
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'students');
    onError(error);
  });
}

export function subscribeToDipaCategories(onUpdate: (dipa: DipaCategory[]) => void, onError: (err: any) => void) {
  const q = collection(db, 'dipaCategories');
  return onSnapshot(q, (snapshot) => {
    const list: DipaCategory[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as DipaCategory);
    });
    list.sort((a, b) => a.code.localeCompare(b.code));
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'dipaCategories');
    onError(error);
  });
}

export function subscribeToTransactions(onUpdate: (txs: Transaction[]) => void, onError: (err: any) => void) {
  const q = collection(db, 'transactions');
  return onSnapshot(q, (snapshot) => {
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Transaction);
    });
    // Sort transactions by date descending
    list.sort((a, b) => b.date.localeCompare(a.date));
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'transactions');
    onError(error);
  });
}

export function subscribeToNotificationLogs(onUpdate: (logs: NotificationLog[]) => void, onError: (err: any) => void) {
  const q = collection(db, 'notificationLogs');
  return onSnapshot(q, (snapshot) => {
    const list: NotificationLog[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as NotificationLog);
    });
    // Sort by sentAt descending
    list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'notificationLogs');
    onError(error);
  });
}

// 3. Write Transactions
export async function addTransactionToFirestore(
  tx: Transaction, 
  updatedStudents?: Student[], 
  updatedDipa?: DipaCategory[]
) {
  try {
    const batch = writeBatch(db);
    
    // Save transaction
    const txRef = doc(db, 'transactions', tx.id);
    batch.set(txRef, cleanFirestoreData(tx));

    // Save corresponding students updates
    if (updatedStudents) {
      updatedStudents.forEach(student => {
        const ref = doc(db, 'students', student.id);
        batch.set(ref, cleanFirestoreData(student));
      });
    }

    // Save corresponding DIPA updates
    if (updatedDipa) {
      updatedDipa.forEach(dipa => {
        const ref = doc(db, 'dipaCategories', dipa.id);
        batch.set(ref, cleanFirestoreData(dipa));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.id}`);
  }
}

// Update an existing Transaction
export async function updateTransactionInFirestore(
  tx: Transaction,
  updatedStudents?: Student[],
  updatedDipa?: DipaCategory[]
) {
  try {
    const batch = writeBatch(db);
    
    // Update transaction
    const txRef = doc(db, 'transactions', tx.id);
    batch.set(txRef, cleanFirestoreData(tx));

    // Save corresponding students updates if any
    if (updatedStudents) {
      updatedStudents.forEach(student => {
        const ref = doc(db, 'students', student.id);
        batch.set(ref, cleanFirestoreData(student));
      });
    }

    // Save corresponding DIPA updates if any
    if (updatedDipa) {
      updatedDipa.forEach(dipa => {
        const ref = doc(db, 'dipaCategories', dipa.id);
        batch.set(ref, cleanFirestoreData(dipa));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.id}`);
  }
}

// Delete an existing Transaction
export async function deleteTransactionFromFirestore(
  txId: string,
  updatedStudents?: Student[],
  updatedDipa?: DipaCategory[]
) {
  try {
    const batch = writeBatch(db);
    
    // Delete transaction
    const txRef = doc(db, 'transactions', txId);
    batch.delete(txRef);

    // Save corresponding students updates if any
    if (updatedStudents) {
      updatedStudents.forEach(student => {
        const ref = doc(db, 'students', student.id);
        batch.set(ref, cleanFirestoreData(student));
      });
    }

    // Save corresponding DIPA updates if any
    if (updatedDipa) {
      updatedDipa.forEach(dipa => {
        const ref = doc(db, 'dipaCategories', dipa.id);
        batch.set(ref, cleanFirestoreData(dipa));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `transactions/${txId}`);
  }
}

// Update single student
export async function updateStudentInFirestore(student: Student) {
  try {
    const ref = doc(db, 'students', student.id);
    await setDoc(ref, cleanFirestoreData(student));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
  }
}

// Update multiple students in batch
export async function updateStudentsInFirestore(students: Student[]) {
  try {
    for (let i = 0; i < students.length; i += 100) {
      const chunk = students.slice(i, i + 100);
      const batch = writeBatch(db);
      chunk.forEach(student => {
        const ref = doc(db, 'students', student.id);
        batch.set(ref, cleanFirestoreData(student));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'students_multi');
  }
}

// Delete a student from Firestore
export async function deleteStudentFromFirestore(studentId: string) {
  try {
    const ref = doc(db, 'students', studentId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
  }
}

// Update DIPA Category
export async function updateDipaInFirestore(dipa: DipaCategory) {
  try {
    const ref = doc(db, 'dipaCategories', dipa.id);
    await setDoc(ref, cleanFirestoreData(dipa));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dipaCategories/${dipa.id}`);
  }
}

// Update all Dipa lists (with self-healing delete sync)
export async function updateDipaListInFirestore(dipa: DipaCategory[]) {
  try {
    // Fetch currently stored Dipa categories from Firestore to find which ones were deleted
    const querySnapshot = await getDocs(collection(db, 'dipaCategories'));
    const existingIds = querySnapshot.docs.map(doc => doc.id);
    const updatedIds = new Set(dipa.map(c => c.id));
    
    // Deletions: existing Firestore entries that are NOT in the updated local list
    const idsToDelete = existingIds.filter(id => !updatedIds.has(id));

    const batch = writeBatch(db);
    
    // Add or update current items
    dipa.forEach(cat => {
      const ref = doc(db, 'dipaCategories', cat.id);
      batch.set(ref, cleanFirestoreData(cat));
    });
    
    // Handle remote deletions
    idsToDelete.forEach(id => {
      const ref = doc(db, 'dipaCategories', id);
      batch.delete(ref);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dipa_multi');
  }
}

// Add notifications logs
export async function addNotificationLogsToFirestore(logs: NotificationLog[]) {
  try {
    const batch = writeBatch(db);
    logs.forEach(log => {
      const ref = doc(db, 'notificationLogs', log.id);
      batch.set(ref, cleanFirestoreData(log));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notificationLogs_multi');
  }
}

// Clear notifications logs (batch deletes)
export async function clearNotificationLogsInFirestore(logs: NotificationLog[]) {
  try {
    for (let i = 0; i < logs.length; i += 100) {
      const chunk = logs.slice(i, i + 100);
      const batch = writeBatch(db);
      chunk.forEach(log => {
        const ref = doc(db, 'notificationLogs', log.id);
        batch.delete(ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'clearNotificationLogs');
  }
}

// Check database completeness & performs seeder trigger
export async function checkAndSeedFirebase(onProgress?: (msg: string) => void): Promise<boolean> {
  try {
    const qTemp = query(collection(db, 'dipaCategories'));
    const snap = await getDocs(qTemp);
    
    const studentTemp = query(collection(db, 'students'), limit(1));
    const studentSnap = await getDocs(studentTemp);

    if (snap.empty || studentSnap.empty) {
      await seedFirestoreDatabase(onProgress);
      return true; // databases seeded
    }
    
    // Auto-migration check: if old group exists, upgrade automatically
    let needMigration = false;
    let needUtilityMigration = false;
    
    snap.forEach(docSnap => {
      const data = docSnap.data() as DipaCategory;
      if (data.code === '521111' || data.name.includes('Belanja Keperluan Kantor')) {
        needMigration = true;
      }
      if (data.code === '5500' && (data.name === 'Belanja Utilitas' || !data.subCategories)) {
        needUtilityMigration = true;
      }
    });

    if (needMigration) {
      if (onProgress) onProgress('Memigrasikan kategori DIPA ke kelompok belanja baru...');
      
      const batchDelete = writeBatch(db);
      snap.docs.forEach(d => {
        batchDelete.delete(d.ref);
      });
      await batchDelete.commit();

      const mock = generateInitialMockData();
      const batchSet = writeBatch(db);
      mock.dipaCategories.forEach(cat => {
        const ref = doc(db, 'dipaCategories', cat.id);
        batchSet.set(ref, cleanFirestoreData(cat));
      });
      await batchSet.commit();
      
      if (onProgress) onProgress('Migrasi kelompok Dipa baru berhasil!');
      return true;
    }

    if (needUtilityMigration) {
      if (onProgress) onProgress('Memigrasikan Belanja Utilitas ke Belanja Beban Daya dan Jasa...');
      const batchUpdate = writeBatch(db);
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as DipaCategory;
        if (data.code === '5500') {
          batchUpdate.update(docSnap.ref, {
            name: 'Belanja Beban Daya dan Jasa',
            subCategories: ['Listrik', 'Air PDAM', 'Internet/Wifi']
          });
        }
      });
      await batchUpdate.commit();
      if (onProgress) onProgress('Migrasi beban daya dan jasa berhasil!');
    }

    return false; // database already had contents
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'dipaCategories_check');
    return false;
  }
}

// Full reset database
export async function resetFirestoreDatabase(onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Menghapus data lama...');
    
    // Fetch all existing ids to clear them
    const collectionsToClear = ['students', 'dipaCategories', 'transactions', 'notificationLogs'];
    
    for (const collName of collectionsToClear) {
      const snap = await getDocs(collection(db, collName));
      const sizeSnap = snap.size;
      if (sizeSnap > 0) {
        // Delete in batches
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 100) {
          const chunk = docs.slice(i, i + 100);
          const batch = writeBatch(db);
          chunk.forEach(d => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }
    }
    
    // Run seed
    await seedFirestoreDatabase(onProgress);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reset_database');
  }
}

// Full restore database from backup payload
export async function restoreFullFirestoreFromBackup(
  students: Student[],
  dipaCategories: DipaCategory[],
  transactions: Transaction[],
  notificationLogs: NotificationLog[] = [],
  onProgress?: (msg: string) => void
) {
  try {
    if (onProgress) onProgress('Menghapus pangkalan data luhur lama...');
    
    // Clear all existing documents from collections
    const collectionsToClear = ['students', 'dipaCategories', 'transactions', 'notificationLogs'];
    for (const collName of collectionsToClear) {
      const snap = await getDocs(collection(db, collName));
      if (snap.size > 0) {
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 100) {
          const chunk = docs.slice(i, i + 100);
          const batch = writeBatch(db);
          chunk.forEach(d => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }
    }

    // Populate DIPA
    if (onProgress) onProgress('Memulihkan kategori anggaran DIPA...');
    const dipaBatch = writeBatch(db);
    dipaCategories.forEach(cat => {
      const ref = doc(db, 'dipaCategories', cat.id);
      dipaBatch.set(ref, cleanFirestoreData(cat));
    });
    await dipaBatch.commit();

    // Populate Students
    if (onProgress) onProgress(`Memulihkan data ${students.length} induk santri...`);
    for (let i = 0; i < students.length; i += 50) {
      const chunk = students.slice(i, i + 50);
      const studentBatch = writeBatch(db);
      chunk.forEach(student => {
        const ref = doc(db, 'students', student.id);
        studentBatch.set(ref, cleanFirestoreData(student));
      });
      await studentBatch.commit();
    }

    // Populate Transactions
    if (onProgress) onProgress(`Memulihkan ${transactions.length} baris jurnal kas...`);
    for (let i = 0; i < transactions.length; i += 50) {
      const chunk = transactions.slice(i, i + 50);
      const txBatch = writeBatch(db);
      chunk.forEach(tx => {
        const ref = doc(db, 'transactions', tx.id);
        txBatch.set(ref, cleanFirestoreData(tx));
      });
      await txBatch.commit();
    }

    // Populate Notification logs
    if (notificationLogs && notificationLogs.length > 0) {
      if (onProgress) onProgress('Memulihkan rekap log notifikasi...');
      for (let i = 0; i < notificationLogs.length; i += 50) {
        const chunk = notificationLogs.slice(i, i + 50);
        const logBatch = writeBatch(db);
        chunk.forEach(log => {
          const ref = doc(db, 'notificationLogs', log.id);
          logBatch.set(ref, cleanFirestoreData(log));
        });
        await logBatch.commit();
      }
    }

    if (onProgress) onProgress('Seluruh pangkalan data cloud berhasil dipulihkan!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'restore_full_backup');
    throw error;
  }
}
