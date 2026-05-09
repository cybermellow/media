/* ============================================================
   LUXARÉ — Listing Search API
   
   Currently uses: Google Custom Search
   To switch to Zillow API: change DATA_SOURCE to 'zillow'
   and fill in ZILLOW_API_KEY in Vercel env vars.
   ============================================================ */

const DATA_SOURCE = 'zillow'; // 'google' | 'zillow' | 'simulated'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address, url } = req.body;
  if (!address && !url) return res.status(400).json({ error: 'Address or URL required' });

  // ── ZILLOW API (swap in when ready) ──────────────────────
  if (DATA_SOURCE === 'zillow') {
    try {
      const query = url || address;
      const zRes = await fetch(`https://api.bridgeinteractive.com/v2/listings?address=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${process.env.ZILLOW_API_KEY}` }
      });
      const zData = await zRes.json();
      const listing = zData?.listings?.[0];
      if (listing) {
        return res.status(200).json({
          source:    'Zillow',
          address:   listing.fullAddress,
          price:     listing.listPrice,
          beds:      listing.beds,
          baths:     listing.baths,
          sqft:      listing.livingArea,
          year:      listing.yearBuilt,
          status:    listing.standardStatus,
          agent:     listing.listAgentName,
          brokerage: listing.listOfficeName,
          photo:     listing.photos?.[0],
        });
      }
    } catch(e) {
      console.error('Zillow API error:', e.message);
    }
  }

  // ── GOOGLE CUSTOM SEARCH ──────────────────────────────────
  if (DATA_SOURCE === 'google') {
    try {
      const query = url
        ? `site:zillow.com OR site:realtor.com "${url}"`
        : `${address} zillow OR realtor listing price beds baths`;

      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_PLACES_KEY}&cx=2182023b1b1fa4e26&q=${encodeURIComponent(query)}&num=3`;
      const gRes  = await fetch(searchUrl);
      const gData = await gRes.json();

      if (gData.error) {
        console.error('Google Search error:', gData.error.message);
        return res.status(200).json(simulatedData(address || url));
      }

      const items = gData.items || [];
      if (!items.length) return res.status(200).json(simulatedData(address || url));

      // Parse the best result
      const best    = items[0];
      const snippet = best.snippet || '';
      const title   = best.title   || '';
      const link    = best.link    || '';

      // Extract price — looks for $1,200,000 or $1.2M patterns
      const priceMatch = snippet.match(/\$[\d,]+(?:\.\d+)?[MK]?/i) ||
                         title.match(/\$[\d,]+(?:\.\d+)?[MK]?/i);
      const price = priceMatch ? priceMatch[0] : null;

      // Extract beds
      const bedsMatch = snippet.match(/(\d+)\s*(?:bed|bd)/i) ||
                        title.match(/(\d+)\s*(?:bed|bd)/i);
      const beds = bedsMatch ? bedsMatch[1] : null;

      // Extract baths
      const bathsMatch = snippet.match(/([\d.]+)\s*(?:bath|ba)/i) ||
                         title.match(/([\d.]+)\s*(?:bath|ba)/i);
      const baths = bathsMatch ? bathsMatch[1] : null;

      // Extract sqft
      const sqftMatch = snippet.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft)/i);
      const sqft = sqftMatch ? sqftMatch[1] : null;

      // Detect source
      const source = link.includes('zillow')   ? 'Zillow'
                   : link.includes('realtor')  ? 'Realtor.com'
                   : link.includes('redfin')   ? 'Redfin'
                   : 'Listing';

      // Clean up address from title
      const cleanAddress = address ||
        title.replace(/[-–|].*$/, '').replace(/zillow|realtor|redfin/gi, '').trim();

      return res.status(200).json({
        source,
        address:   cleanAddress,
        price:     price     || 'Price on request',
        beds:      beds      || '—',
        baths:     baths     || '—',
        sqft:      sqft      || '—',
        year:      '—',
        status:    snippet.toLowerCase().includes('sold') ? 'Recently Sold'
                 : snippet.toLowerCase().includes('pending') ? 'Pending'
                 : 'Active',
        agent:     null,
        brokerage: null,
        photo:     best.pagemap?.cse_image?.[0]?.src || null,
        listingUrl: link,
        confidence: (price && beds) ? 'high' : 'low',
      });

    } catch(e) {
      console.error('Search error:', e.message);
      return res.status(200).json(simulatedData(address || url));
    }
  }

  // ── SIMULATED FALLBACK ────────────────────────────────────
  return res.status(200).json(simulatedData(address || url));
}

function simulatedData(query) {
  const isZillow   = query?.includes('zillow');
  const isRealtor  = query?.includes('realtor');
  const isRedfin   = query?.includes('redfin');
  return {
    source:    isZillow ? 'Zillow' : isRealtor ? 'Realtor.com' : isRedfin ? 'Redfin' : 'Listing',
    address:   typeof query === 'string' && !query.startsWith('http') ? query : '1 Luxury Estate Dr, Orlando FL 32827',
    price:     '$2,400,000',
    beds:      '5',
    baths:     '4.5',
    sqft:      '5,200',
    year:      '2019',
    status:    'Active',
    agent:     null,
    brokerage: null,
    photo:     null,
    confidence: 'simulated',
  };
}
