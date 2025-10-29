import { db } from "../db";
import { escrowLedger, transactions, type InsertEscrowLedger } from "../../shared/schema";
import { eq, and, sum } from "drizzle-orm";
import { logAudit, AUDIT_ACTIONS } from "../audit";

/**
 * Escrow Service - Hold and release funds for secure transactions
 * Morocco Payment Protection System
 */

export async function holdInEscrow(
  transactionId: string, 
  amount: number,
  releaseDate?: Date
): Promise<string> {
  const escrowEntry: InsertEscrowLedger = {
    transactionId,
    heldAmount: amount,
    releaseDate: releaseDate || null,
  };

  const [entry] = await db
    .insert(escrowLedger)
    .values(escrowEntry)
    .returning();

  await logAudit({
    action: AUDIT_ACTIONS.ESCROW_HOLD,
    resourceType: 'escrow',
    resourceId: entry.id,
    changes: {
      transactionId,
      amount,
      releaseDate,
    },
  });

  return entry.id;
}

export async function releaseFromEscrow(
  transactionId: string,
  reason?: string
): Promise<boolean> {
  const [entry] = await db
    .select()
    .from(escrowLedger)
    .where(
      and(
        eq(escrowLedger.transactionId, transactionId),
        eq(escrowLedger.status, 'held')
      )
    );

  if (!entry) {
    throw new Error('No held escrow found for this transaction');
  }

  await db
    .update(escrowLedger)
    .set({
      status: 'released',
      releasedAt: new Date(),
      releaseReason: reason || null,
    })
    .where(eq(escrowLedger.id, entry.id));

  await logAudit({
    action: AUDIT_ACTIONS.ESCROW_RELEASE,
    resourceType: 'escrow',
    resourceId: entry.id,
    changes: {
      transactionId,
      reason,
      amount: entry.heldAmount,
    },
  });

  return true;
}

export async function getEscrowBalance(providerId: string): Promise<number> {
  const result = await db
    .select({
      total: sum(escrowLedger.heldAmount),
    })
    .from(escrowLedger)
    .innerJoin(transactions, eq(escrowLedger.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.providerId, providerId),
        eq(escrowLedger.status, 'held')
      )
    );

  return result[0]?.total ? parseInt(result[0].total as string, 10) : 0;
}

export async function refundEscrow(
  transactionId: string,
  reason: string
): Promise<boolean> {
  const [entry] = await db
    .select()
    .from(escrowLedger)
    .where(
      and(
        eq(escrowLedger.transactionId, transactionId),
        eq(escrowLedger.status, 'held')
      )
    );

  if (!entry) {
    throw new Error('No held escrow found for this transaction');
  }

  await db
    .update(escrowLedger)
    .set({
      status: 'refunded',
      releasedAt: new Date(),
      releaseReason: reason,
    })
    .where(eq(escrowLedger.id, entry.id));

  await logAudit({
    action: AUDIT_ACTIONS.PAYMENT_REFUND,
    resourceType: 'escrow',
    resourceId: entry.id,
    changes: {
      transactionId,
      reason,
      amount: entry.heldAmount,
    },
  });

  return true;
}
