export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isBot = /bot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot/i.test(userAgent);

  // If not a bot, or not a product page, let the request proceed normally
  if (!isBot || !url.pathname.startsWith('/product/')) {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }

  const slug = url.pathname.split('/').pop();
  if (!slug) {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }

  try {
    // Fetch product data from Supabase via REST API
    const supabaseUrl = 'https://jyjhpqtqbwtxxgijxetq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5amhwcXRxYnd0eHhnaWp4ZXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgyNjUsImV4cCI6MjA4MzE5NDI2NX0.5HaHhfgPQbIRKmHZE61ggrtj-lKi5JlBU9tsOfQ_d3c';

    const response = await fetch(
      `${supabaseUrl}/rest/v1/store_products?slug=eq.${slug}&select=title,description,images`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const products = await response.json();
    const product = products?.[0];

    if (!product) {
      return new Response(null, {
        headers: { 'x-middleware-next': '1' },
      });
    }

    const title = product.title || 'Italostudy Store';
    const description = (product.description || '').replace(/<[^>]*>?/gm, '').slice(0, 160);
    const image = product.images?.[0] || 'https://store.italostudy.com/logo.webp';

    // Return a minimal HTML shell with the Open Graph tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${url.href}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url.href}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${image}">

  <meta http-equiv="refresh" content="0;url=${url.href}">
</head>
<body>
  <p>Redirecting to product page...</p>
  <script>window.location.href = "${url.href}";</script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Middleware SEO Error:', error);
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }
}
