import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

export const getNextReceiptId = (firestore: Firestore) => {
  if (!firestore) {
    throw new Error('Firestore is not initialized');
  }
  const counterRef = doc(firestore, 'counters', 'receipt');
  return runTransaction(firestore, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists()) {
      transaction.set(counterRef, { lastId: 1 });
      return '1';
    }
    const newId = counterDoc.data().lastId + 1;
    transaction.update(counterRef, { lastId: newId });
    return newId.toString();
  });
};

    