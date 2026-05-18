import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body as {
    to: string;
    subject: string;
    html: string;
  };

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY environment variable is not set' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KaamKaaj <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[send-email] Resend API error:', data);
      return res.status(400).json({ error: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
