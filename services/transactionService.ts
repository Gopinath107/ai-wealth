
import { Transaction } from '../types';
import { MOCK_TRANSACTIONS } from './mockData';
import { BASE_URL, ENDPOINTS, getHeaders, simulateDelay, shouldUseBackend } from './apiConfig';

export const transactionService = {
  // GET /transactions
  getAll: async (): Promise<Transaction[]> => {
    if (shouldUseBackend()) {
        try {
          const res = await fetch(`${BASE_URL}${ENDPOINTS.TRANSACTIONS.GET}`, { headers: getHeaders() });
          const data = await res.json();
          return Array.isArray(data.result) ? data.result : [];
        } catch (e) {
          console.error("Transactions API Error", e);
          return [];
        }
    }
    await simulateDelay();
    return [...MOCK_TRANSACTIONS];
  },

  // PUT /transactions/:id
  update: async (transaction: Transaction) => {
      if (shouldUseBackend()) {
          const res = await fetch(`${BASE_URL}${ENDPOINTS.TRANSACTIONS.UPDATE.replace(':id', transaction.id)}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify(transaction)
          });
          const data = await res.json();
          if(!data.success) throw new Error('Update failed');
          return data;
      }

      await simulateDelay(800);
      // Mock update in-place logic if needed, but array is reference
      const index = MOCK_TRANSACTIONS.findIndex(t => t.id === transaction.id);
      if (index !== -1) MOCK_TRANSACTIONS[index] = transaction;
      return { success: true, transaction };
  }
};
