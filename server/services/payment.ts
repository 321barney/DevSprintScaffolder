import crypto from "crypto";
import { db } from "../db";
import { 
  transactions, 
  providerSubscriptions,
  SUBSCRIPTION_TIERS,
  type InsertTransaction,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../audit";

/**
 * Phase 1 Payment Service Provider (PSP) Integration
 * Supports Moroccan payment gateways: CMI, PayZone, MTC
 * Uses test mode when PSP_PROVIDER=test
 */

const PSP_PROVIDER = process.env.PSP_PROVIDER || "test";
const PSP_MERCHANT_ID = process.env.PSP_MERCHANT_ID || "test_merchant";
const PSP_SECRET_KEY = process.env.PSP_SECRET_KEY || "test_secret_key";
const PSP_API_URL = process.env.PSP_API_URL || "https://test.payment.example";
const PSP_CALLBACK_URL = process.env.PSP_CALLBACK_URL || "http://localhost:5000/api/payment/callback";

export type PSPProvider = "CMI" | "PayZone" | "MTC" | "test";

export interface PaymentRequest {
  amountMAD: number;
  providerId: string;
  type: "subscription_payment" | "provider_payout" | "refund";
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string; // For redirect-based payments
  status: "pending" | "processing" | "completed" | "failed";
  pspTransactionId?: string;
  error?: string;
}

// Generate HMAC signature for PSP requests
function generateSignature(data: string, secretKey: string): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(data)
    .digest("hex");
}

// Verify PSP callback signature
export function verifyCallbackSignature(
  callbackData: Record<string, any>,
  signature: string
): boolean {
  // Recreate the signature from callback data
  const dataString = JSON.stringify(callbackData);
  const expectedSignature = generateSignature(dataString, PSP_SECRET_KEY);
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Test mode PSP (for development)
async function processTestPayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  // Create transaction record
  const transactionData: InsertTransaction = {
    providerId: request.providerId,
    type: request.type as "subscription_payment" | "provider_payout" | "refund",
    amountMad: request.amountMAD,
    currency: "MAD",
    pspProvider: "test",
    pspTransactionId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    metadata: request.metadata as any,
  };

  const [transaction] = await db
    .insert(transactions)
    .values(transactionData as any)
    .returning();

  // Simulate instant success in test mode
  await db
    .update(transactions)
    .set({ 
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(transactions.id, transaction.id));

  await logAudit({
    userId: undefined,
    action: "payment_test_completed",
    resourceType: "transaction",
    resourceId: transaction.id,
    changes: { 
      amount: request.amountMAD,
      type: request.type,
      providerId: request.providerId,
    },
  });

  return {
    success: true,
    transactionId: transaction.id,
    status: "completed",
    pspTransactionId: transactionData.pspTransactionId || undefined,
  };
}

// CMI Payment Gateway (Morocco)
async function processCMIPayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  try {
    // Create transaction record
    const transactionData: InsertTransaction = {
      providerId: request.providerId,
      type: request.type as "subscription_payment" | "provider_payout" | "refund",
      amountMad: request.amountMAD,
      currency: "MAD",
      pspProvider: "CMI",
      metadata: request.metadata as any,
    };

    const [transaction] = await db
      .insert(transactions)
      .values(transactionData as any)
      .returning();

    // CMI API request payload
    const payload = {
      merchantId: PSP_MERCHANT_ID,
      amount: (request.amountMAD * 100).toString(), // Convert to cents
      currency: "504", // MAD currency code
      orderId: transaction.id,
      callbackUrl: PSP_CALLBACK_URL,
      metadata: request.metadata,
    };

    // Generate signature
    const dataToSign = `${payload.merchantId}|${payload.amount}|${payload.currency}|${payload.orderId}`;
    const signature = generateSignature(dataToSign, PSP_SECRET_KEY);

    // Make API request to CMI
    const response = await fetch(`${PSP_API_URL}/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`CMI API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Update transaction with PSP transaction ID
    await db
      .update(transactions)
      .set({
        pspTransactionId: result.transactionId,
        pspResponse: result,
        status: "processing",
      })
      .where(eq(transactions.id, transaction.id));

    return {
      success: true,
      transactionId: transaction.id,
      paymentUrl: result.paymentUrl,
      status: "processing",
      pspTransactionId: result.transactionId,
    };

  } catch (error: any) {
    console.error("CMI payment failed:", error);
    return {
      success: false,
      transactionId: "",
      status: "failed",
      error: error.message,
    };
  }
}

// Main payment processing function
export async function initiatePayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  // Use test mode if configured
  if (PSP_PROVIDER === "test") {
    return processTestPayment(request);
  }

  // Route to appropriate PSP
  switch (PSP_PROVIDER) {
    case "CMI":
      return processCMIPayment(request);
    
    case "PayZone":
      // TODO: Implement PayZone integration
      throw new Error("PayZone integration not yet implemented. Use PSP_PROVIDER=test for now.");
    
    case "MTC":
      // TODO: Implement MTC Touch integration
      throw new Error("MTC integration not yet implemented. Use PSP_PROVIDER=test for now.");
    
    default:
      throw new Error(`Unsupported PSP provider: ${PSP_PROVIDER}`);
  }
}

// Handle PSP callback (webhook)
export async function handlePaymentCallback(params: {
  transactionId: string;
  pspTransactionId: string;
  status: "completed" | "failed";
  signature: string;
  callbackData: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify signature (skip in test mode)
    if (PSP_PROVIDER !== "test") {
      const isValid = verifyCallbackSignature(params.callbackData, params.signature);
      if (!isValid) {
        throw new Error("Invalid callback signature");
      }
    }

    // Find transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, params.transactionId));

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: params.status,
        completedAt: params.status === "completed" ? new Date() : undefined,
        pspResponse: params.callbackData,
      })
      .where(eq(transactions.id, params.transactionId));

    // If subscription payment succeeded, activate subscription
    if (params.status === "completed" && transaction.type === "subscription_payment") {
      const metadata = transaction.metadata as { tier?: string } | null;
      const tier = metadata?.tier as "basic" | "pro" | undefined;
      if (tier && (tier === "basic" || tier === "pro")) {
        const { upgradeSubscription } = await import("./commission");
        await upgradeSubscription(transaction.providerId, tier, params.transactionId);
      }
    }

    await logAudit({
      userId: undefined,
      action: "payment_callback_processed",
      resourceType: "transaction",
      resourceId: params.transactionId,
      changes: {
        status: params.status,
        pspTransactionId: params.pspTransactionId,
      },
    });

    return { success: true };

  } catch (error: any) {
    console.error("Payment callback handling failed:", error);
    return { success: false, error: error.message };
  }
}

// Purchase subscription
export async function purchaseSubscription(
  providerId: string,
  tier: "basic" | "pro"
): Promise<PaymentResponse> {
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  return initiatePayment({
    amountMAD: tierConfig.priceMAD,
    providerId,
    type: "subscription_payment",
    metadata: { tier },
  });
}

// Get transaction by ID
export async function getTransaction(transactionId: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  return transaction;
}

// Get transactions for a provider
export async function getProviderTransactions(providerId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.providerId, providerId));
}
