import type { NotificationPreference } from "@shared/schema";

export interface NotificationPayload {
  eventType: string;
  title: string;
  message: string;
  data?: Record<string, any>;
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
      console.log('Email notifications not yet implemented');
      return false;
    case 'sms':
      console.log('SMS notifications not yet implemented');
      return false;
    default:
      return false;
  }
}
