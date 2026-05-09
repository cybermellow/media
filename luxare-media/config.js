/* ============================================================
   LUXARÉ SITE CONFIG
   Edit this file to update any variable content on the site.
   Commit to GitHub → Vercel redeploys automatically (~30 sec).
   ============================================================ */

const SITE_CONFIG = {

  /* ── STRIPE ──────────────────────────────────────────────── */
  stripePublishableKey: 'pk_live_51I64hKDmDPdlOwv2VfySyx5Mx8aORcWrqY8LJ7ogBzl0VmZNlMZi5h6f3vntdPw2hFUBVhRqNVh63gIDb0PPEFf300sZ0z9FZd',

  /* ── GOOGLE PLACES ───────────────────────────────────────── */
  googlePlacesKey: 'AIzaSyCI3RmvuHMnFnIwq8PQV0VG3AhQrCLpxcU',

  /* ── BUSINESS INFO ───────────────────────────────────────── */
  business: {
    name:      'LUXARÉ',
    phone:     '(407) 720-5625',
    phoneHref: 'tel:+14077205625',
    email:     'support@luxaremedia.com',
    tagline:   'Luxury real estate walkthrough videos — delivered in 2 hours, MLS-ready.',
  },

  /* ── PRICING & PROMO CODES ───────────────────────────────── */
  pricing: {
    basePrice: 199,
    promoCodes: {
      'LIFETIME':  { discount: 100, label: 'Lifetime Rate — Locked In Forever', lifetime: true },
      'LAUNCH100': { discount: 100, label: '$99 introductory rate' },
      // 'SUMMER25': { discount: 25, label: '$25 off — Summer promo' },
      // 'BROKER50': { discount: 50, label: '$50 off for brokerage partners' },
    },
  },

  /* ── MEDIA ───────────────────────────────────────────────── */
  // Photos: up to 8 per property. Each filename must exist in your repo root.
  // Video:  filename must exist in your repo root. null = shows placeholder.
  media: {
    home: {
      photos: ['property1.jpg'],
      video:  'property1.mp4',
    },
    property1: {
      name:     'Windermere Estate',
      location: 'Windermere, FL',
      price:    '$3,500,000',
      type:     'Luxury Estate · Mediterranean',
      desc:     'Multiple listing photos transformed into a single cinematic walkthrough. Buyers spent 4× longer on the listing and arrived at showings already sold on the property.',
      photos:   ['property1.jpg'],
      // photos: ['property1a.jpg','property1b.jpg','property1c.jpg','property1d.jpg','property1e.jpg','property1f.jpg','property1g.jpg','property1h.jpg'],
      video:    'property1.mp4',
    },
    property2: {
      name:     'Formosa Estate',
      location: 'Kissimmee, FL',
      price:    '$2,900,000',
      type:     'Luxury Estate',
      desc:     'Static listing photos turned into a cinematic property experience.',
      photos:   ['property2.jpg'],  // ← upload property2.jpg to your repo root
      // photos: ['property2a.jpg','property2b.jpg','property2c.jpg'],
      video:    'property2.mp4',
    },
    property3: {
      name:     'Coming Soon',
      location: '',
      price:    '',
      type:     'Coming Soon',
      desc:     'Update this config to add photos and video for this showcase.',
      photos:   [],
      video:    null,
    },
  },

  /* ── HERO SECTION ────────────────────────────────────────── */
  hero: {
    eyebrow:    'Luxury Real Estate Walkthrough Videos',
    titleLine1: 'Your Listings.',
    titleLine2: 'Cinema Quality.',
    titleLine3: 'Delivered In 2 Hours.',
    sub:        'Paste your listing link below — we take it from there.',
    badge:      '2-Hour Turnaround · MLS Compliant · Ready to Upload',
  },

  /* ── STATS ───────────────────────────────────────────────── */
  stats: {
    heading: 'Why Your Next Listing Needs Video',
    items: [
      { num: '403%', label: 'More Inquiries From\nListings With Video',           source: 'NAR 2025' },
      { num: '73%',  label: 'Of Homeowners Prefer Agents\nWho Use Video Marketing', source: 'NAR 2025' },
      { num: '51%',  label: 'Of Buyers Use YouTube\nas Their #1 Search Tool',      source: 'NAR 2025' },
    ],
  },

  /* ── STRATEGY TILES ─────────────────────────────────────── */
  strategyTiles: [
    { title: 'MLS Upload',                    desc: 'Post directly to your MLS listing. Stand out the moment buyers search your zip code.' },
    { title: 'Brokerage Website',             desc: 'Elevate your profile on your brokerage site. Premium listings attract premium sellers.' },
    { title: 'Social Media',                  desc: 'Instagram, LinkedIn, Facebook. Cinematic content stops the scroll and builds your luxury brand.' },
    { title: 'Email Campaigns',               desc: 'Send to your buyer list, local partners, and past clients. Video emails get 3× more clicks.' },
    { title: 'Personal Landing Page',         desc: 'Showcase your portfolio. Every luxury seller you meet will look you up — make it count.' },
    { title: 'Local Partners & Referrals',    desc: 'Share with mortgage brokers, designers, and developers. Premium media builds premium networks.' },
    { title: 'Listing Presentations',         desc: 'Walk into every seller meeting with a sample video. Close the listing before the competition gets a callback.' },
    { title: 'International & Remote Buyers', desc: 'Out-of-market and international buyers get a complete feel for the property before they book a flight.' },
  ],

  /* ── BENEFITS ────────────────────────────────────────────── */
  benefits: [
    {
      title: 'Win More Listing Appointments', titleEm: '',
      body: 'Luxury sellers expect premium marketing before they sign. Bring a cinematic walkthrough into the listing presentation and instantly separate yourself from agents using standard photography alone.',
    },
    {
      title: 'Reduce Days on Market', titleEm: '',
      body: 'Luxury walkthroughs create stronger buyer intent before the showing even happens. Buyers spend more time engaging with immersive listings, resulting in more qualified inquiries and faster decisions.',
    },
    {
      title: 'Protect Price & Commission Integrity', titleEm: '',
      body: 'Premium presentation supports premium pricing. When a property feels elevated online, buyers enter negotiations with stronger perceived value — fewer low offers, commissions protected.',
    },
    {
      title: 'Compound Brokerage Brand Exposure', titleEm: '',
      body: "Every luxury listing becomes a branding asset. A single standout listing doesn't just market the property — it markets the agent behind it, compounding referrals and repeat business.",
    },
  ],

  /* ── PROCESS STEPS ───────────────────────────────────────── */
  process: [
    { title: 'Submit Your Listing URL', note: 'Takes less than 60 seconds',                       highlight: false },
    { title: 'Confirm Your Details',    note: 'Review listing info & order details',              highlight: false },
    { title: 'Place Your Order',        note: 'Secure checkout — Apple Pay, Google Pay, or card', highlight: false },
    { title: 'Video in Your Inbox',     note: "Under 2 hours — or it's free",                    highlight: true  },
  ],

  /* ── LOADER TIMING (milliseconds) ───────────────────────── */
  // stepDelays: when each step starts spinning
  // stepDones:  when each step checks off
  // confirmedAt: when "Address Confirmed" appears
  // advanceAt:   when it moves to the order form
  loader: {
    stepDelays:  [0, 1200, 2400, 3600, 4800],
    stepDones:   [900, 2100, 3300, 4500, 5700],
    confirmedAt: 6200,
    advanceAt:   7800,
  },

  /* ── ADD-ONS ─────────────────────────────────────────────── */
  // Add or remove add-ons here. Each shows as a checkbox on the order form.
  addons: [
    {
      id:    'listing_report',
      label: 'Listing Optimization Report',
      desc:  'AI-powered analysis of your listing copy — headline, description, and key details reviewed for engagement and buyer appeal.',
      price: 4.95,
    },
    {
      id:    'logo_overlay',
      label: 'Add Logo to Video',
      desc:  'Your brokerage or personal brand logo watermarked onto the walkthrough video.',
      price: 4.95,
    },
    // { id: 'rush_delivery', label: 'Rush Delivery (1 Hour)', desc: 'Guaranteed delivery within 1 hour.', price: 29 },
  ],

  /* ── SPEED BANNER ────────────────────────────────────────── */
  speed: {
    num:   '2 hrs',
    label: 'Average Delivery Time',
    sub:   'From confirmed order to your inbox — most videos arrive in under 2 hours, ready to upload and convert.',
    cta:   'Get Your Video Today',
  },

  /* ── CTA STRIP ───────────────────────────────────────────── */
  cta: {
    title:    'Ready to Transform',
    titleEm:  'Your Next Listing?',
    sub:      "Submit your listing URL, confirm your details, place your order. Video delivered in under 2 hours — or it's free.",
    btnLabel: 'Order Your Video',
  },

  /* ── FOOTER ──────────────────────────────────────────────── */
  footer: {
    tagline: 'Luxury real estate walkthrough videos — delivered in 2 hours, MLS-ready.',
    copy:    '© 2025 LUXARÉ Media. All rights reserved.',
    badge:   'MLS Compliant · 2-Hour Delivery Guaranteed',
    nav: [
      { label: 'Our Work',  href: '#transform' },
      { label: 'Services',  href: '#offer'     },
      { label: 'Process',   href: '#process'   },
      { label: 'Order Now', href: '#order'     },
    ],
    contact: [
      { label: '(407) 720-5625',          href: 'tel:+14077205625'               },
      { label: 'support@luxaremedia.com', href: 'mailto:support@luxaremedia.com' },
    ],
  },

};
