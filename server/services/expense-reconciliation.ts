import type { VirtualCard, ExpenseEntry } from "@shared/schema";
import { storage } from "../storage";

export interface VirtualCardProvider {
  name: string;
  fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]>;
  checkBalance(cardNumber: string): Promise<number>;
}

export interface ProviderTransaction {
  externalId: string;
  amount: number;
  merchantName: string;
  transactionDate: Date;
  category: string;
}

const MockStripeProvider: VirtualCardProvider = {
  name: 'stripe',
  async fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]> {
    console.log(`[MOCK] Fetching Stripe transactions for card ${cardNumber}`);
    return [];
  },
  async checkBalance(cardNumber: string): Promise<number> {
    console.log(`[MOCK] Checking Stripe card balance for ${cardNumber}`);
    return 0;
  }
};

const MockBrexProvider: VirtualCardProvider = {
  name: 'brex',
  async fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]> {
    console.log(`[MOCK] Fetching Brex transactions for card ${cardNumber}`);
    return [];
  },
  async checkBalance(cardNumber: string): Promise<number> {
    console.log(`[MOCK] Checking Brex card balance for ${cardNumber}`);
    return 0;
  }
};

const PROVIDERS: Record<string, VirtualCardProvider> = {
  stripe: MockStripeProvider,
  brex: MockBrexProvider,
  ramp: { name: 'ramp', fetchTransactions: async () => [], checkBalance: async () => 0 },
  divvy: { name: 'divvy', fetchTransactions: async () => [], checkBalance: async () => 0 },
};

export async function syncCardTransactions(card: VirtualCard): Promise<number> {
  const provider = PROVIDERS[card.provider];
  if (!provider) {
    throw new Error(`Unknown virtual card provider: ${card.provider}`);
  }

  const transactions = await provider.fetchTransactions(card.id, card.cardNumber);
  
  let syncedCount = 0;
  for (const transaction of transactions) {
    const existingExpenses = await storage.getExpenseEntriesByCompanyId(card.companyId);
    const alreadySynced = existingExpenses.some(e => 
      e.description.includes(transaction.externalId)
    );
    
    if (!alreadySynced) {
      await storage.createExpenseEntry({
        companyId: card.companyId,
        virtualCardId: card.id,
        costCenterId: card.costCenterId || undefined,
        userId: card.companyId,
        amountMad: transaction.amount,
        category: transaction.category as any || 'other',
        description: `${transaction.merchantName} [${transaction.externalId}]`,
        transactionDate: transaction.transactionDate,
        status: 'pending',
      });
      syncedCount++;
    }
  }
  
  const currentSpend = await provider.checkBalance(card.cardNumber);
  await storage.updateVirtualCard(card.id, { currentSpend });
  
  return syncedCount;
}

export async function reconcileExpenses(companyId: string): Promise<{
  reconciled: number;
  pending: number;
  rejected: number;
}> {
  const expenses = await storage.getExpenseEntriesByCompanyId(companyId);
  
  const reconciled = expenses.filter(e => e.status === 'reconciled').length;
  const pending = expenses.filter(e => e.status === 'pending').length;
  const rejected = expenses.filter(e => e.status === 'rejected').length;
  
  return { reconciled, pending, rejected };
}

export async function autoReconcileExpense(expenseId: string): Promise<boolean> {
  const expense = await storage.getExpenseEntry(expenseId);
  if (!expense || expense.status !== 'approved') {
    return false;
  }
  
  if (expense.receiptUrl && expense.virtualCardId) {
    await storage.updateExpenseEntry(expenseId, {
      status: 'reconciled',
      reconciliationNotes: 'Auto-reconciled: receipt matched virtual card transaction'
    });
    return true;
  }
  
  return false;
}
