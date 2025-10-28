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
  
  // Admin
  ROLE_CHANGE: 'user.role_change',
  ADMIN_ACTION: 'admin.action',
} as const;
