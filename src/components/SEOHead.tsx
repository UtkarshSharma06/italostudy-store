import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  productData?: {
    name: string;
    description: string;
    image: string;
    price: number;
    currency: string;
    availability: string;
    sku?: string;
    category?: string;
  };
  faqs?: { question: string; answer: string }[];
}

const SEOHead = ({
  title,
  description,
  keywords = [],
  image = 'https://italostudy.it/favicon.png',
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  productData,
  faqs
}: SEOProps) => {
  const siteName = 'Italostudy Store';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const metaDescription = description || 'Premium study kits, exam resources, and digital guides for medical and university exams at Italostudy Store.';
  
  const defaultKeywords = [
    'cent-s exam preparation book pdf',
    'cents mock test',
    'imat syllabus 2026 pdf',
    'cents exam questions pdf',
    'italostudy',
    'imat resources',
    'medical entrance exam',
    'study kits',
    'italy university',
    'test medicina',
    'alpha test imat',
    'italian universities for international students'
  ];
  const combinedKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

  const productSchema = productData ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productData.name,
    "image": [productData.image],
    "description": productData.description,
    "sku": productData.sku || productData.name.toLowerCase().replace(/\s+/g, '-'),
    "brand": {
      "@type": "Brand",
      "name": "Italostudy"
    },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": productData.currency,
      "price": productData.price,
      "availability": productData.availability === 'in_stock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  } : null;

  const faqSchema = faqs && faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={combinedKeywords} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Schemas */}
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
