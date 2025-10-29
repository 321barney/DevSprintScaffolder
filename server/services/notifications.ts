import type { NotificationPreference } from "@shared/schema";

export interface NotificationPayload {
  eventType: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  recipientEmail?: string;
  recipientName?: string;
}

// Email Templates for Sprint 1-2
const EMAIL_TEMPLATES = {
  rfp_deadline: {
    subject: (data: any) => `RFP Deadline Approaching: ${data.rfpTitle}`,
    body: (data: any) => `
Dear ${data.recipientName || 'User'},

This is a reminder that the RFP "${data.rfpTitle}" deadline is approaching.

Deadline: ${data.deadline}
Time Remaining: ${data.timeRemaining}

Please submit your proposal before the deadline.

Best regards,
SoukMatch Team
    `.trim(),
  },
  approval_needed: {
    subject: (data: any) => `Approval Required: ${data.itemType}`,
    body: (data: any) => `
Dear ${data.approverName || 'Approver'},

An approval is required for the following item:

Type: ${data.itemType}
Submitted by: ${data.submitterName}
Amount: ${data.amount} MAD
Date: ${data.date}

Please review and approve or reject this request.

Best regards,
SoukMatch Team
    `.trim(),
  },
  payment_received: {
    subject: (data: any) => `Payment Received: ${data.amount} MAD`,
    body: (data: any) => `
Dear ${data.recipientName || 'Customer'},

We have received your payment.

Amount: ${data.amount} MAD
Transaction ID: ${data.transactionId}
Date: ${data.date}

Thank you for your business!

Best regards,
SoukMatch Team
    `.trim(),
  },
  order_status: {
    subject: (data: any) => `Order Status Update: ${data.status}`,
    body: (data: any) => `
Dear ${data.recipientName || 'Customer'},

Your order status has been updated.

Order ID: ${data.orderId}
Status: ${data.status}
Updated: ${data.updatedAt}

${data.message || ''}

Best regards,
SoukMatch Team
    `.trim(),
  },
};

export async function sendEmailNotification(
  recipientEmail: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const template = EMAIL_TEMPLATES[payload.eventType as keyof typeof EMAIL_TEMPLATES];
    
    if (!template) {
      console.error(`No email template found for event type: ${payload.eventType}`);
      return false;
    }

    const subject = template.subject(payload.data || {});
    const body = template.body({
      ...(payload.data || {}),
      recipientName: payload.recipientName,
    });

    console.log('Sending email notification:');
    console.log('To:', recipientEmail);
    console.log('Subject:', subject);
    console.log('Body:', body);

    return true;
  } catch (error) {
    console.error('Email notification failed:', error);
    return false;
  }
}

export async function sendSlackNotification(
  webhook: NotificationPreference,
  payload: NotificationPayload
): Promise<boolean> {
  if (!webhook.slackWebhookUrl) {
    throw new Error("Slack webhook URL not configured");
  }

  try {
    const response = await fetch(webhook.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.title,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: payload.title }
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: payload.message }
          }
        ]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Slack notification failed:', error);
    return false;
  }
}

export async function sendTeamsNotification(
  webhook: NotificationPreference,
  payload: NotificationPayload
): Promise<boolean> {
  if (!webhook.teamsWebhookUrl) {
    throw new Error("Teams webhook URL not configured");
  }

  try {
    const response = await fetch(webhook.teamsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        summary: payload.title,
        title: payload.title,
        text: payload.message,
        themeColor: "0078D7"
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Teams notification failed:', error);
    return false;
  }
}

export async function dispatchNotification(
  preference: NotificationPreference,
  payload: NotificationPayload
): Promise<boolean> {
  if (!preference.enabled) {
    return false;
  }

  const eventTypes = preference.eventTypes as string[];
  if (!eventTypes.includes(payload.eventType)) {
    return false;
  }

  switch (preference.channel) {
    case 'slack':
      return await sendSlackNotification(preference, payload);
    case 'teams':
      return await sendTeamsNotification(preference, payload);
    case 'email':
      if (payload.recipientEmail) {
        return await sendEmailNotification(payload.recipientEmail, payload);
      }
      console.log('Email notification skipped: no recipient email provided');
      return false;
    case 'sms':
      console.log('SMS notifications not yet implemented');
      return false;
    default:
      return false;
  }
}
