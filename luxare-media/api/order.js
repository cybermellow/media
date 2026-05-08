export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    firstName, lastName, email, phone,
    brokerage, listingUrl, address, notes,
    promoCode, finalPrice, status
  } = req.body;

  if (!firstName || !email) return res.status(400).json({ error: 'Missing required fields' });

  const isLifetime = promoCode && promoCode.toUpperCase() === 'LIFETIME';
  const isPending  = status === 'pending_payment';
  const price      = finalPrice || 199;
  const displayAddress = address || listingUrl || '—';

  // ── EMAIL TO YOU (owner notification) ──
  const ownerHtml = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1C;">
      <div style="border-bottom:2px solid #8C6A32;padding-bottom:16px;margin-bottom:28px;">
        <h1 style="font-size:26px;font-weight:300;color:#8C6A32;margin:0;letter-spacing:0.1em;">LUXARÉ</h1>
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin:4px 0 0;">
          New Order ${isPending ? '— Awaiting Payment' : '— Payment Confirmed'}
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:11px 14px;background:#F1F1F2;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;width:150px;">Client</td><td style="padding:11px 14px;background:#F1F1F2;font-size:14px;">${firstName} ${lastName}</td></tr>
        <tr><td style="padding:11px 14px;background:#EBEBEC;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Email</td><td style="padding:11px 14px;background:#EBEBEC;font-size:14px;"><a href="mailto:${email}" style="color:#8C6A32;">${email}</a></td></tr>
        <tr><td style="padding:11px 14px;background:#F1F1F2;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Phone</td><td style="padding:11px 14px;background:#F1F1F2;font-size:14px;">${phone || '—'}</td></tr>
        <tr><td style="padding:11px 14px;background:#EBEBEC;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Brokerage</td><td style="padding:11px 14px;background:#EBEBEC;font-size:14px;">${brokerage || '—'}</td></tr>
        <tr><td style="padding:11px 14px;background:#F1F1F2;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Property</td><td style="padding:11px 14px;background:#F1F1F2;font-size:14px;">${displayAddress}</td></tr>
        <tr><td style="padding:11px 14px;background:#EBEBEC;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Listing URL</td><td style="padding:11px 14px;background:#EBEBEC;font-size:14px;word-break:break-all;"><a href="${listingUrl}" style="color:#8C6A32;">${listingUrl}</a></td></tr>
        <tr><td style="padding:11px 14px;background:#F1F1F2;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">Notes</td><td style="padding:11px 14px;background:#F1F1F2;font-size:14px;">${notes || '—'}</td></tr>
      </table>
      <div style="background:#1A1A1C;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#888;margin:0 0 4px;">Amount</p>
          <p style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#C9A96E;margin:0;">$${price}</p>
        </div>
        ${isLifetime ? '<div style="background:#8C6A32;padding:7px 14px;"><p style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#fff;margin:0;">★ Lifetime Rate</p></div>' : ''}
      </div>
      ${isPending ? '<p style="font-size:12px;color:#a03a3a;border:1px solid rgba(160,58,58,0.3);padding:10px 14px;margin-bottom:16px;">⚠ Payment not yet confirmed — order submitted before checkout.</p>' : '<p style="font-size:12px;color:#3a7a3a;border:1px solid rgba(58,122,58,0.3);padding:10px 14px;margin-bottom:16px;">✓ Payment confirmed via Stripe.</p>'}
      <p style="font-size:11px;color:#888;margin:0;">Reply to this email to contact the agent directly.<br>Submitted: ${new Date().toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})} ET</p>
    </div>`;

  // ── CONFIRMATION EMAIL TO AGENT ──
  const agentHtml = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1A1A1C;">
      <div style="border-bottom:2px solid #8C6A32;padding-bottom:16px;margin-bottom:28px;">
        <h1 style="font-size:26px;font-weight:300;color:#8C6A32;margin:0;letter-spacing:0.1em;">LUXARÉ</h1>
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin:4px 0 0;">Order Confirmation</p>
      </div>
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#1A1A1C;margin-bottom:8px;">Hi ${firstName},</p>
      <p style="font-size:13px;color:#303038;line-height:2;margin-bottom:24px;">Your order is confirmed and your cinematic walkthrough video is now in production. You'll receive it in your inbox within <strong>2 hours</strong>, MLS-ready and upload-ready.</p>
      <div style="border:1px solid rgba(140,106,50,0.2);background:#F5F5F6;padding:22px 24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(140,106,50,0.1);"><span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#888;">Property</span><span style="font-size:12px;color:#1A1A1C;text-align:right;max-width:280px;">${displayAddress}</span></div>
        <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(140,106,50,0.1);"><span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#888;">Amount Paid</span><span style="font-size:12px;color:#8C6A32;font-weight:500;">$${price}${isLifetime ? ' (Lifetime Rate)' : ''}</span></div>
        <div style="display:flex;justify-content:space-between;padding:9px 0;"><span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#888;">Delivery</span><span style="font-size:12px;color:#1A1A1C;">Within 2 hours · MLS ready</span></div>
      </div>
      <div style="border-left:2px solid #8C6A32;padding:12px 16px;background:rgba(140,106,50,0.04);margin-bottom:24px;">
        <p style="font-size:12px;color:#303038;line-height:1.9;margin:0;"><strong style="color:#5C440F;">What happens next:</strong> Our team is producing your video now. You'll receive a download link to your email within 2 hours. The video will be fully MLS compliant and ready to upload directly to Zillow, Realtor.com, or your MLS.</p>
      </div>
      <p style="font-size:12px;color:#5A5A64;line-height:1.8;">Questions? Reply to this email or call us at <a href="tel:+14077205625" style="color:#8C6A32;">(407) 720-5625</a>.</p>
      <div style="border-top:1px solid rgba(140,106,50,0.15);margin-top:28px;padding-top:16px;">
        <p style="font-size:10px;color:#888;margin:0;">LUXARÉ Media · support@luxaremedia.com · luxaremedia.com</p>
      </div>
    </div>`;

  try {
    // Send both emails in parallel
    await Promise.all([
      // Notification to you
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:     'LUXARÉ Orders <orders@luxaremedia.com>',
          to:       'support@luxaremedia.com',
          reply_to: email,
          subject:  `New Order — ${firstName} ${lastName} · $${price}${isPending ? ' (pending)' : ' ✓'}`,
          html:     ownerHtml,
        }),
      }),
      // Confirmation to agent
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'LUXARÉ Media <support@luxaremedia.com>',
          to:      email,
          subject: `Your LUXARÉ video is in production — ${displayAddress}`,
          html:    agentHtml,
        }),
      }),
    ]);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Failed to send emails' });
  }
}
