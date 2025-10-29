// Audit logging for critical operations
import type { Request } from "express";
import { db } from "./db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";

export async function logAudit(params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  req?: Request;
}) {
  try {
    const auditEntry: InsertAuditLog = {
      userId: params.userId || null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      changes: params.changes || null,
      ipAddress: params.req ? (params.req.ip || params.req.socket.remoteAddress) : null,
      userAgent: params.req ? params.req.get('user-agent') : null,
    };

    await db.insert(auditLogs).values(auditEntry);
  } catch (error) {
    // Log audit failures but don't block the operation
    console.error('Audit log failed:', error);
  }
}

// Critical actions to audit
export const AUDIT_ACTIONS = {
  // Auth
  USER_SIGNUP: 'user.signup',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Jobs
  JOB_CREATE: 'job.create',
  JOB_CANCEL: 'job.cancel',
  JOB_ACCEPT: 'job.accept',
  
  // Offers
  OFFER_SUBMIT: 'offer.submit',
  OFFER_ACCEPT: 'offer.accept',
  OFFER_DECLINE: 'offer.decline',
  
  // Provider
  PROVIDER_CREATE: 'provider.create',
  PROVIDER_VERIFY: 'provider.verify',
  PROVIDER_UPDATE_KYC: 'provider.update_kyc',
  
  // Service Packages (Marketplace)
  PACKAGE_CREATE: 'package.create',
  PACKAGE_UPDATE: 'package.update',
  PACKAGE_DELETE: 'package.delete',
  
  // Package Orders (Marketplace)
  ORDER_CREATE: 'order.create',
  ORDER_UPDATE: 'order.update',
  
  // RFP (Request for Proposals)
  RFP_CREATE: 'rfp.create',
  RFP_UPDATE: 'rfp.update',
  RFP_CANCEL: 'rfp.cancel',
  RFP_CLOSE: 'rfp.close',
  
  // Quotes
  QUOTE_SUBMIT: 'quote.submit',
  QUOTE_ACCEPT: 'quote.accept',
  QUOTE_REJECT: 'quote.reject',
  
  // Payments
  PAYMENT_INITIATE: 'payment.initiate',
  PAYMENT_COMPLETE: 'payment.complete',
  PAYMENT_FAIL: 'payment.fail',
  PAYMENT_REFUND: 'payment.refund',
  ESCROW_HOLD: 'escrow.hold',
  ESCROW_RELEASE: 'escrow.release',
  INVOICE_GENERATE: 'invoice.generate',
  
  // Payment Schedules
  SCHEDULE_CREATE: 'schedule.create',
  SCHEDULE_PAYMENT_PROCESS: 'schedule.payment_process',
  
  // Approvals
  APPROVAL_REQUEST: 'approval.request',
  APPROVAL_APPROVE: 'approval.approve',
  APPROVAL_REJECT: 'approval.reject',
  APPROVAL_ESCALATE: 'approval.escalate',
  
  // Community Moderation
  CONTENT_FLAG: 'moderation.flag',
  CONTENT_REMOVE: 'moderation.remove',
  USER_SUSPEND: 'moderation.user_suspend',
  USER_BAN: 'moderation.user_ban',
  USER_REINSTATE: 'moderation.user_reinstate',
  REVIEW_MODERATE: 'moderation.review',
  
  // Admin
  ROLE_CHANGE: 'user.role_change',
  ADMIN_ACTION: 'admin.action',
} as const;

// Query audit trail with filters
export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function queryAuditTrail(filters: AuditLogFilters = {}) {
  const { eq, and, gte, lte, desc } = await import('drizzle-orm');
  
  const conditions = [];
  
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  }
  
  if (filters.resourceId) {
    conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  }
  
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }
  
  let query = db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.offset(filters.offset);
  }
  
  return await query;
}
