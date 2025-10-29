import { db } from "../db";
import { invoices, currencyRates, packageOrders, type InsertInvoice, type InsertCurrencyRate } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logAudit, AUDIT_ACTIONS } from "../audit";

/**
 * Invoice Service - Multi-currency invoicing with VAT
 * Supports FR/AR/EN locales with RTL for Arabic
 * Morocco VAT = 20%
 */

const MOROCCO_VAT_RATE = 0.20; // 20% VAT
const DEFAULT_MAD_TO_EUR = 0.092; // Default exchange rate

export function calculateVAT(amount: number, country: string = 'MA'): number {
  if (country === 'MA' || country === 'Morocco') {
    return Math.round(amount * MOROCCO_VAT_RATE);
  }
  return 0;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const [rate] = await db
    .select()
    .from(currencyRates)
    .where(
      and(
        eq(currencyRates.fromCurrency, fromCurrency),
        eq(currencyRates.toCurrency, toCurrency)
      )
    )
    .orderBy(desc(currencyRates.effectiveDate))
    .limit(1);

  const exchangeRate = rate ? parseFloat(rate.rate) : DEFAULT_MAD_TO_EUR;
  return Math.round(amount * exchangeRate);
}

export async function updateCurrencyRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Promise<void> {
  const rateEntry: InsertCurrencyRate = {
    fromCurrency,
    toCurrency,
    rate: rate.toString(),
    effectiveDate: new Date(),
  };

  await db.insert(currencyRates).values(rateEntry);
}

export async function generateInvoice(
  orderId: string,
  locale: "fr-MA" | "ar-MA" | "en-US" = "fr-MA",
  currency: "MAD" | "EUR" = "MAD"
): Promise<string> {
  const [order] = await db
    .select()
    .from(packageOrders)
    .where(eq(packageOrders.id, orderId));

  if (!order) {
    throw new Error('Order not found');
  }

  const subtotal = order.totalPriceMad;
  let convertedSubtotal = subtotal;

  if (currency === 'EUR') {
    convertedSubtotal = await convertCurrency(subtotal, 'MAD', 'EUR');
  }

  const vatAmount = calculateVAT(convertedSubtotal);
  const total = convertedSubtotal + vatAmount;

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const invoiceData: InsertInvoice = {
    orderId,
    invoiceNumber,
    locale,
    currency,
    subtotal: convertedSubtotal,
    vatAmount,
    total,
    pdfUrl: null,
    metadata: {
      originalAmountMAD: subtotal,
      exchangeRate: currency === 'EUR' ? await getLatestRate('MAD', 'EUR') : 1,
    },
  };

  const [invoice] = await db
    .insert(invoices)
    .values(invoiceData)
    .returning();

  const pdfUrl = await generateInvoicePDF(invoice.id, locale);

  await db
    .update(invoices)
    .set({ pdfUrl })
    .where(eq(invoices.id, invoice.id));

  await logAudit({
    action: AUDIT_ACTIONS.INVOICE_GENERATE,
    resourceType: 'invoice',
    resourceId: invoice.id,
    changes: {
      orderId,
      invoiceNumber,
      total,
      currency,
      locale,
    },
  });

  return invoice.id;
}

async function getLatestRate(fromCurrency: string, toCurrency: string): Promise<number> {
  const [rate] = await db
    .select()
    .from(currencyRates)
    .where(
      and(
        eq(currencyRates.fromCurrency, fromCurrency),
        eq(currencyRates.toCurrency, toCurrency)
      )
    )
    .orderBy(desc(currencyRates.effectiveDate))
    .limit(1);

  return rate ? parseFloat(rate.rate) : DEFAULT_MAD_TO_EUR;
}

async function generateInvoicePDF(invoiceId: string, locale: string): Promise<string> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const templates = {
    'fr-MA': {
      title: 'FACTURE',
      subtotal: 'Sous-total',
      vat: 'TVA (20%)',
      total: 'Total',
      invoiceNum: 'Numéro de facture',
    },
    'ar-MA': {
      title: 'فاتورة',
      subtotal: 'المجموع الفرعي',
      vat: 'ضريبة القيمة المضافة (20%)',
      total: 'المجموع',
      invoiceNum: 'رقم الفاتورة',
    },
    'en-US': {
      title: 'INVOICE',
      subtotal: 'Subtotal',
      vat: 'VAT (20%)',
      total: 'Total',
      invoiceNum: 'Invoice Number',
    },
  };

  const t = templates[locale as keyof typeof templates] || templates['fr-MA'];

  const textInvoice = `
${t.title}
${t.invoiceNum}: ${invoice.invoiceNumber}
Date: ${new Date().toLocaleDateString()}

${t.subtotal}: ${invoice.subtotal / 100} ${invoice.currency}
${t.vat}: ${invoice.vatAmount / 100} ${invoice.currency}
${t.total}: ${invoice.total / 100} ${invoice.currency}
  `.trim();

  console.log('Generated invoice (text-based):', textInvoice);

  return `/invoices/${invoice.id}.pdf`;
}

export async function getInvoiceByOrderId(orderId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  return invoice || null;
}
