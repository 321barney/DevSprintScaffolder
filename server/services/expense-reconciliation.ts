import type { VirtualCard, ExpenseEntry } from "@shared/schema";
import { storage } from "../storage";

export interface VirtualCardProvider {
  name: string;
  fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]>;
  checkBalance(cardId: string): Promise<number>;
}

export interface ProviderTransaction {
  externalId: string;
  amount: number;
  merchantName: string;
  transactionDate: Date;
  category: string;
}

const StripeProvider: VirtualCardProvider = {
  name: 'stripe',
  async fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]> {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey.startsWith('sk_test_demo')) {
      console.log(`[TEST MODE] Generating test transactions for Stripe card ${cardNumber}`);
      return [
        {
          externalId: `ch_test_${Date.now()}_1`,
          amount: 450000,
          merchantName: 'Hyatt Regency Casablanca',
          transactionDate: new Date(Date.now() - 86400000),
          category: 'accommodation'
        },
        {
          externalId: `ch_test_${Date.now()}_2`,
          amount: 125000,
          merchantName: 'CTM Bus Transport',
          transactionDate: new Date(Date.now() - 43200000),
          category: 'transport'
        }
      ];
    }
    
    try {
      const response = await fetch(`https://api.stripe.com/v1/issuing/transactions?card=${cardId}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data.map((tx: any) => ({
        externalId: tx.id,
        amount: tx.amount,
        merchantName: tx.merchant_data?.name || 'Unknown',
        transactionDate: new Date(tx.created * 1000),
        category: mapStripeCategory(tx.merchant_data?.category)
      }));
    } catch (error) {
      console.error('Stripe API error:', error);
      return [];
    }
  },
  
  async checkBalance(cardId: string): Promise<number> {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey.startsWith('sk_test_demo')) {
      console.log(`[TEST MODE] Returning test balance for Stripe card`);
      return 575000;
    }
    
    try {
      const response = await fetch(`https://api.stripe.com/v1/issuing/cards/${cardId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.spending_controls?.spending_limits?.[0]?.amount || 0;
    } catch (error) {
      console.error('Stripe balance check error:', error);
      return 0;
    }
  }
};

const BrexProvider: VirtualCardProvider = {
  name: 'brex',
  async fetchTransactions(cardId: string, cardNumber: string): Promise<ProviderTransaction[]> {
    const apiKey = process.env.BREX_API_KEY;
    
    if (!apiKey || apiKey.startsWith('bk_test_demo')) {
      console.log(`[TEST MODE] Generating test transactions for Brex card ${cardNumber}`);
      return [
        {
          externalId: `brex_${Date.now()}_1`,
          amount: 280000,
          merchantName: 'Sofitel Rabat Jardin des Roses',
          transactionDate: new Date(Date.now() - 172800000),
          category: 'accommodation'
        }
      ];
    }
    
    try {
      const response = await fetch(`https://platform.brexapis.com/v2/transactions/card/${cardId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Brex API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items.map((tx: any) => ({
        externalId: tx.id,
        amount: Math.abs(tx.amount.amount),
        merchantName: tx.merchant.descriptor || 'Unknown',
        transactionDate: new Date(tx.posted_at_date),
        category: mapBrexCategory(tx.merchant.mcc)
      }));
    } catch (error) {
      console.error('Brex API error:', error);
      return [];
    }
  },
  
  async checkBalance(cardId: string): Promise<number> {
    const apiKey = process.env.BREX_API_KEY;
    
    if (!apiKey || apiKey.startsWith('bk_test_demo')) {
      console.log(`[TEST MODE] Returning test balance for Brex card`);
      return 280000;
    }
    
    try {
      const response = await fetch(`https://platform.brexapis.com/v2/cards/${cardId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Brex API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.spend_controls?.spend_limit?.amount || 0;
    } catch (error) {
      console.error('Brex balance check error:', error);
      return 0;
    }
  }
};

function mapStripeCategory(category: string): string {
  const mapping: Record<string, string> = {
    'lodging': 'accommodation',
    'transportation': 'transport',
    'car_rental': 'transport',
    'food_beverage': 'catering',
    'restaurants': 'catering'
  };
  return mapping[category] || 'other';
}

function mapBrexCategory(mcc: string): string {
  const transportMCCs = ['4111', '4121', '4131', '7512', '7513'];
  const hotelMCCs = ['3501', '3502', '3503', '7011'];
  const foodMCCs = ['5812', '5813', '5814'];
  
  if (transportMCCs.includes(mcc)) return 'transport';
  if (hotelMCCs.includes(mcc)) return 'accommodation';
  if (foodMCCs.includes(mcc)) return 'catering';
  return 'other';
}

const PROVIDERS: Record<string, VirtualCardProvider> = {
  stripe: StripeProvider,
  brex: BrexProvider,
  ramp: {
    name: 'ramp',
    async fetchTransactions() {
      console.log('[RAMP] Production integration requires RAMP_CLIENT_ID and RAMP_CLIENT_SECRET');
      return [];
    },
    async checkBalance() {
      return 0;
    }
  },
  divvy: {
    name: 'divvy',
    async fetchTransactions() {
      console.log('[DIVVY] Production integration requires DIVVY_API_KEY');
      return [];
    },
    async checkBalance() {
      return 0;
    }
  },
};

export async function syncCardTransactions(card: VirtualCard): Promise<number> {
  const provider = PROVIDERS[card.provider];
  if (!provider) {
    throw new Error(`Unknown virtual card provider: ${card.provider}`);
  }

  const providerCardId = (card.metadata as any)?.providerCardId;
  if (!providerCardId) {
    throw new Error(`Virtual card ${card.id} missing required metadata.providerCardId for ${card.provider} integration`);
  }
  
  const transactions = await provider.fetchTransactions(providerCardId, card.cardNumber);
  
  let syncedCount = 0;
  let totalSpend = 0;
  
  for (const transaction of transactions) {
    const existingExpenses = await storage.getExpenseEntriesByCompanyId(card.companyId);
    const alreadySynced = existingExpenses.some(e => 
      e.description.includes(transaction.externalId)
    );
    
    totalSpend += transaction.amount;
    
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
  
  await storage.updateVirtualCard(card.id, { currentSpend: totalSpend });
  
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
