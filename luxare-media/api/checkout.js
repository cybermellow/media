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

  const amountInCents = Math.round(parseFloat(finalPrice) * 100);
  const isLifetime    = promoCode && promoCode.toUpperCase() === 'LIFETIME';

  try {
    // Create a PaymentIntent — client confirms with card details on frontend
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountInCents,
      currency: 'usd',
      receipt_email: email,
      description: `LUXARÉ — Cinematic Walkthrough Video · ${address || listingUrl}`,
      metadata: {
        firstName:  firstName || '',
        lastName:   lastName  || '',
        email,
        address:    address    || '',
        listingUrl: listingUrl || '',
        promoCode:  promoCode  || '',
        finalPrice: String(finalPrice),
        lifetimeRate: String(isLifetime),
      },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Failed to create payment', detail: err.message });
  }
}
