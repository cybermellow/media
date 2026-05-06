export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    brokerage,
    listingUrl,
    notes,
    promoCode,
    finalPrice
  } = req.body;

  // Basic validation
  if (!firstName || !email || !listingUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isLifetime = promoCode && promoCode.toUpperCase() === 'LIFETIME';

  // Build the email HTML
  const emailHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1A1C;">

      <div style="border-bottom: 2px solid #8C6A32; padding-bottom: 16px; margin-bottom: 28px;">
        <h1 style="font-size: 28px; font-weight: 300; color: #8C6A32; margin: 0; letter-spacing: 0.1em;">LUXARE'</h1>
        <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin: 4px 0 0;">New Video Order</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; width: 160px;">Client Name</td>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 14px; color: #1A1A1C; font-weight: 400;">${firstName} ${lastName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Email</td>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 14px; color: #1A1A1C;"><a href="mailto:${email}" style="color: #8C6A32;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Phone</td>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 14px; color: #1A1A1C;">${phone || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Brokerage</td>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 14px; color: #1A1A1C;">${brokerage || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Listing URL</td>
          <td style="padding: 12px 16px; background: #F1F1F2; font-size: 14px;"><a href="${listingUrl}" style="color: #8C6A32; word-break: break-all;">${listingUrl}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Notes</td>
          <td style="padding: 12px 16px; background: #EBEBEC; font-size: 14px; color: #1A1A1C;">${notes || '—'}</td>
        </tr>
      </table>

      <div style="background: #1A1A1C; padding: 20px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin: 0 0 4px;">Invoice Amount</p>
          <p style="font-family: Georgia, serif; font-size: 36px; font-weight: 300; color: #C9A96E; margin: 0;">$${finalPrice || 200}</p>
        </div>
        ${isLifetime ? `
        <div style="background: #8C6A32; padding: 8px 16px;">
          <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #fff; margin: 0;">★ Lifetime Rate</p>
        </div>` : ''}
      </div>

      ${promoCode ? `
      <div style="border-left: 3px solid #8C6A32; padding: 10px 16px; background: #f9f6f0; margin-bottom: 24px;">
        <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; margin: 0 0 4px;">Promo Code Used</p>
        <p style="font-size: 14px; color: #1A1A1C; margin: 0; font-weight: 500;">${promoCode.toUpperCase()}${isLifetime ? ' — Lifetime deal. Lock this client in at $100/video.' : ''}</p>
      </div>` : ''}

      <div style="border-top: 1px solid #DFDFE1; padding-top: 20px; margin-top: 8px;">
        <p style="font-size: 11px; color: #888; margin: 0 0 4px;">Reply directly to this email to contact the client.</p>
        <p style="font-size: 11px; color: #888; margin: 0;">Order submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} ET</p>
      </div>

    </div>
  `;

  // Send via Resend
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'support@luxaremedia.com',       // ← replace with your verified Resend domain
        to: 'support@luxaremedia.com',                // ← replace with your email
        reply_to: email,
        subject: `New Order — ${firstName} ${lastName} · $${finalPrice || 200}${isLifetime ? ' (Lifetime)' : ''}`,
        html: emailHtml
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
