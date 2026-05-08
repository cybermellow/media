import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    firstName,
    lastName,
    email,
    address,
    listingUrl,
    promoCode,
    finalPrice,
  } = req.body;

  if (!email || !finalPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isLifetime = promoCode && promoCode.toUpperCase() === 'LIFETIME';
  const priceInCents = Math.round(parseFloat(finalPrice) * 100);

  // The URL Stripe redirects to after success/cancel
  const baseUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const successUrl = `${baseUrl}/?success=true`;
  const cancelUrl  = `${baseUrl}/`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',

      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: priceInCents,
            product_data: {
              name: 'LUXARÉ — Cinematic Walkthrough Video',
              description: [
                `Property: ${address || listingUrl}`,
                isLifetime ? 'Lifetime rate applied' : promoCode ? `Promo: ${promoCode}` : null,
                '4K walkthrough · Licensed music · MLS compliant · 2-hour delivery',
              ].filter(Boolean).join(' · '),
            },
          },
          quantity: 1,
        },
      ],

      // Pass order data through to success page via metadata
      metadata: {
        firstName: firstName || '',
        lastName:  lastName  || '',
        email:     email,
        address:   address   || '',
        listingUrl: listingUrl || '',
        promoCode:  promoCode  || '',
        finalPrice: String(finalPrice),
      },

      success_url: successUrl,
      cancel_url:  cancelUrl,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session', detail: err.message });
  }
}
