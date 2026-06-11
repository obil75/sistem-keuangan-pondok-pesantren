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
      dipaBatch.set(ref, cat);
    });
    await dipaBatch.commit();

    // B: Seed Students in chunks of 50
    if (onProgress) onProgress('Menyimpan data induk santri...');
    for (let i = 0; i < seededStudents.length; i += 50) {
      const chunk = seededStudents.slice(i, i + 50);
      const studentBatch = writeBatch(db);
      chunk.forEach(student => {
        const ref = doc(db, 'students', student.id);
        studentBatch.set(ref, student);
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
        txBatch.set(ref, tx);
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
    batch.set(txRef, tx);

    // Save corresponding students updates
    if (updatedStudents) {
      updatedStudents.forEach(student => {
        const ref = doc(db, 'students', student.id);
        batch.set(ref, student);
      });
    }

    // Save corresponding DIPA updates
    if (updatedDipa) {
      updatedDipa.forEach(dipa => {
        const ref = doc(db, 'dipaCategories', dipa.id);
        batch.set(ref, dipa);
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.id}`);
  }
}

// Update single student
export async function updateStudentInFirestore(student: Student) {
  try {
    const ref = doc(db, 'students', student.id);
    await setDoc(ref, student);
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
        batch.set(ref, student);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'students_multi');
  }
}

// Update DIPA Category
export async function updateDipaInFirestore(dipa: DipaCategory) {
  try {
    const ref = doc(db, 'dipaCategories', dipa.id);
    await setDoc(ref, dipa);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dipaCategories/${dipa.id}`);
  }
}

// Update all Dipa lists
export async function updateDipaListInFirestore(dipa: DipaCategory[]) {
  try {
    const batch = writeBatch(db);
    dipa.forEach(cat => {
      const ref = doc(db, 'dipaCategories', cat.id);
      batch.set(ref, cat);
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
      batch.set(ref, log);
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
    const qTemp = query(collection(db, 'dipaCategories'), limit(1));
    const snap = await getDocs(qTemp);
    if (snap.empty) {
      await seedFirestoreDatabase(onProgress);
      return true; // databases seeded
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
