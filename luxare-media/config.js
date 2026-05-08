/* ============================================================
   LUXARÉ SITE CONFIG
   Edit this file to update any variable content on the site.
   Commit to GitHub → Vercel redeploys automatically (~30 sec).
   ============================================================ */

const SITE_CONFIG = {

  /* ── STRIPE ──────────────────────────────────────────────── */
  // Publishable key is safe to be here — it's public-facing
  // Get it from: stripe.com → Developers → API Keys → Publishable key
  stripePublishableKey: 'pk_live_51I64hKDmDPdlOwv2VfySyx5Mx8aORcWrqY8LJ7ogBzl0VmZNlMZi5h6f3vntdPw2hFUBVhRqNVh63gIDb0PPEFf300sZ0z9FZd',

  /* ── BUSINESS INFO ───────────────────────────────────────── */
  business: {
    name:       'LUXARÉ',
    phone:      '(407) 720-5625',
    phoneHref:  'tel:+14077205625',
    email:      'support@luxaremedia.com',
    tagline:    'Luxury real estate walkthrough videos — delivered in 2 hours, MLS-ready.',
  },

  /* ── PRICING & PROMO CODES ───────────────────────────────── */
  pricing: {
    basePrice: 199,   // ← change price here — updates everywhere on site

    // Add, remove, or edit promo codes here.
    // discount: dollars off basePrice
    // label:    text shown under price when applied
    // lifetime: true shows the "Locked In Forever" badge
    promoCodes: {
      'LIFETIME':  { discount: 100, label: 'Lifetime Rate — Locked In Forever', lifetime: true },
      'LAUNCH100': { discount: 100, label: '$99 introductory rate' },
      // 'SUMMER25': { discount: 25, label: '$25 off — Summer promo' },
      // 'BROKER50': { discount: 50, label: '$50 off for brokerage partners' },
    },
  },

  /* ── MEDIA ───────────────────────────────────────────────── */
  // Add filenames matching files uploaded to your Vercel repo folder.
  // Photos: 2–4 per property recommended. They cycle in a carousel.
  // Video: null = shows "coming soon" placeholder.
  media: {
    home: {
      photos: ['property1.jpg'],
      video:  'property1.mp4',
    },
    property1: {
      name:     'Windermere Estate',
      location: 'Windermere, FL · $3,500,000',
      type:     'Luxury Estate · Mediterranean',
      desc:     'Multiple listing photos transformed into a single cinematic walkthrough. Buyers spent 4× longer on the listing and arrived at showings already sold on the property.',
      photos:   ['property1.jpg'],
      // photos: ['property1a.jpg', 'property1b.jpg', 'property1c.jpg'],
      video:    'property1.mp4',
    },
    property2: {
      name:     'Coming Soon',
      location: 'Add your next example',
      type:     'Coming Soon',
      desc:     'Update this config to add photos and video for this showcase.',
      photos:   [],   // e.g. ['property2a.jpg', 'property2b.jpg']
      video:    null, // e.g. 'property2.mp4'
    },
    property3: {
      name:     'Coming Soon',
      location: 'Add your next example',
      type:     'Coming Soon',
      desc:     'Update this config to add photos and video for this showcase.',
      photos:   [],
      video:    null,
    },
  },

  /* ── HERO SECTION ────────────────────────────────────────── */
  hero: {
    eyebrow:  'Luxury Real Estate Walkthrough Videos',
    titleLine1: 'Your Listings.',
    titleLine2: 'Cinema Quality.',   // wrapped in <em> italic gold
    titleLine3: 'Delivered In 2 Hours.',
    sub:      'Paste your listing link below — we take it from there.',
    badge:    '2-Hour Turnaround · MLS Compliant · Ready to Upload',
  },

  /* ── STATS ───────────────────────────────────────────────── */
  stats: {
    heading: 'What Luxury Agents Experience With Luxaré',
    items: [
      { num: '3.2×',   target: 3.2, suffix: '×',     label: 'More Qualified\nShowing Requests' },
      { num: '23 days',target: 23,  suffix: ' days',  label: 'Faster Sales &\nReduced Days on Market' },
      { num: '4–6%',   target: null,suffix: null,     label: 'Higher Perceived Value —\nClose at Stronger Prices' },
      { num: '4.1×',   target: 4.1, suffix: '×',      label: 'More Referrals & Brand\nGrowth Among Luxury Sellers' },
    ],
  },

  /* ── STRATEGY TILES (One Video. Everywhere.) ─────────────── */
  strategyTiles: [
    { title: 'MLS Upload',               desc: 'Post directly to your MLS listing. Stand out the moment buyers search your zip code.' },
    { title: 'Brokerage Website',        desc: 'Elevate your profile on your brokerage site. Premium listings attract premium sellers.' },
    { title: 'Social Media',             desc: 'Instagram, LinkedIn, Facebook. Cinematic content stops the scroll and builds your luxury brand.' },
    { title: 'Email Campaigns',          desc: 'Send to your buyer list, local partners, and past clients. Video emails get 3× more clicks.' },
    { title: 'Personal Landing Page',    desc: 'Showcase your portfolio. Every luxury seller you meet will look you up — make it count.' },
    { title: 'Local Partners & Referrals', desc: 'Share with mortgage brokers, designers, and developers. Premium media builds premium networks.' },
    { title: 'Listing Presentations',    desc: 'Walk into every seller meeting with a sample video. Close the listing before the competition gets a callback.' },
    { title: 'International & Remote Buyers', desc: 'Out-of-market and international buyers get a complete feel for the property before they book a flight.' },
  ],

  /* ── BENEFITS ────────────────────────────────────────────── */
  benefits: [
    {
      title: 'Win luxury listings —',
      titleEm: 'bring your media to the seller walkthrough.',
      body: 'Walk in with a Luxaré sample video and let your marketing speak before you do. Luxury sellers choose agents who present their home at its highest level. Premium media is your competitive edge in every listing presentation.',
    },
    {
      title: 'Reduce DOM —',
      titleEm: '28% average reduction in days on market.',
      body: 'Listings with a Luxaré walkthrough consistently outperform comparable properties in the same zip code. Serious buyers arrive pre-sold, showings convert faster, and your seller closes before the competition even gets a second showing.',
    },
    {
      title: 'Higher perceived value —',
      titleEm: 'protect your commission, close at full price.',
      body: 'Cinematic media elevates perceived value by 4–6%, keeping offers strong from day one. International and out-of-market buyers get a complete feel for the property before ever stepping inside — expanding your buyer pool and reducing the time to a qualified offer.',
    },
  ],

  /* ── PROCESS STEPS ───────────────────────────────────────── */
  process: [
    { title: 'Submit Your Listing URL',    note: 'Takes less than 60 seconds',    highlight: false },
    { title: 'Receive Your Invoice',       note: 'Invoice arrives within minutes', highlight: false },
    { title: 'Pay & We Get to Work',       note: 'Production starts immediately',  highlight: false },
    { title: 'Video in Your Inbox',        note: 'Delivered in 2 hours',           highlight: true  },
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
    title:  'Ready to Transform',
    titleEm: 'Your Next Listing?', // wrapped in <em>
    sub:    'Submit a listing URL. Invoice in minutes. Video in 2 hours. MLS-ready.',
    btnLabel: 'Order Your Video',
  },

  /* ── FOOTER ──────────────────────────────────────────────── */
  footer: {
    tagline: 'Luxury real estate walkthrough videos — delivered in 2 hours, MLS-ready.',
    copy:    '© 2025 LUXARÉ Media. All rights reserved.',
    badge:   'MLS Compliant · 2-Hour Delivery Guaranteed',
    nav: [
      { label: 'Our Work',   href: '#transform' },
      { label: 'Services',   href: '#offer'     },
      { label: 'Process',    href: '#process'   },
      { label: 'Order Now',  href: '#order'     },
    ],
    contact: [
      { label: '(407) 720-5625',          href: 'tel:+14077205625'              },
      { label: 'support@luxaremedia.com', href: 'mailto:support@luxaremedia.com'},
    ],
  },

};
