exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  try {
    const { city, location, style, kind } = JSON.parse(event.body || '{}');
    const searchLocation = location || city || '';
    if (!city) return { statusCode: 400, body: JSON.stringify({ error: 'City is required' }) };
    const key = process.env.GOOGLE_MAPS_API_KEY;
    const label = kind === 'vendor' ? 'vendor' : 'venue';
    if (!key) {
      return { statusCode: 200, body: JSON.stringify({ places: [], note: `Set GOOGLE_MAPS_API_KEY in Netlify to enable live Google Places ${label} tiles.` }) };
    }
    const textQuery = `${style || ('wedding ' + label + 's')} in ${city}`;
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.types'
      },
      body: JSON.stringify({ textQuery, maxResultCount: 9, languageCode: 'en' })
    });
    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, body: JSON.stringify({ error: data.error || data }) };
    const places = (data.places || []).map(p => ({
      id: p.id,
      name: p.displayName && p.displayName.text ? p.displayName.text : `Wedding ${label}`,
      address: p.formattedAddress || '',
      rating: p.rating || '',
      userRatingCount: p.userRatingCount || '',
      googleMapsUri: p.googleMapsUri || '',
      websiteUri: p.websiteUri || '',
      phone: p.nationalPhoneNumber || '',
      types: p.types || []
    }));
    return { statusCode: 200, headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ places }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to search local results right now.' }) };
  }
};
