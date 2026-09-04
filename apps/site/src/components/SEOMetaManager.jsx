import React, { useEffect } from 'react';
import { userPersonas } from '../data/personasData';
import { brandInfoData } from '../data/brandInfoData';

export default function SEOMetaManager({ currentRoute, activePersonaId }) {
  useEffect(() => {
    // Generate high-density keywords for all 50 brands
    const all50BrandKeywords = brandInfoData
      .map((b) => `${b.name} customer care number, ${b.name} helpline`)
      .join(', ');

    let title = "EveryWare — Verified Home Appliance Repair & Customer Support Directory | LG, Samsung, Panasonic, Voltas & 50+ Brands";
    let description = "Find direct customer care toll-free numbers for LG (1800-315-9999), Samsung (1800-5-7267864), Panasonic (1800-103-1333), Voltas (1860-233-4554), KENT (9278912345), Whirlpool, Bosch & 50+ white goods brands in India. Book 1-tap verified appliance repair on EveryWare.";
    let keywords = `${all50BrandKeywords}, home appliance repair India, AC service Gurgaon, Geyser repair Bangalore, EveryWare app, everyware.in`;
    let canonical = "https://everyware.in/";

    let dynamicSchema = null;

    if (currentRoute === 'info') {
      title = "Customer Support Directory — LG, Samsung, Panasonic, Voltas & 50 Top Brands | EveryWare";
      description = "Official customer care toll-free numbers, support emails & resolution steps for LG (1800-315-9999), Samsung (1800-5-7267864), Panasonic (1800-103-1333), Voltas (1860-233-4554), KENT (9278912345), Whirlpool, Godrej, Haier, IFB, Bosch & 50+ white goods brands in India.";
      keywords = `Customer Support Directory, ${all50BrandKeywords}, EveryWare directory India`;
      canonical = "https://everyware.in/#info";

      // JSON-LD ItemList Schema for ALL 50 Brands Directory
      dynamicSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Customer Support Directory of 50 Leading Appliance Brands in India",
        "description": "Directory of 50 top White Goods & Home Appliance companies in India with toll-free numbers, email IDs, and service areas.",
        "itemListElement": brandInfoData.map((b, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Organization",
            "name": b.name,
            "description": b.tagline,
            "url": b.website,
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": b.tollFree,
              "email": b.email,
              "contactType": "customer service",
              "areaServed": "IN",
              "availableLanguage": ["English", "Hindi"]
            }
          }
        }))
      };
    } else if (currentRoute === 'experiences') {
      if (activePersonaId) {
        const persona = userPersonas.find((p) => p.id === Number(activePersonaId));
        if (persona) {
          title = `${persona.name}'s Experience with ${persona.appliance} Repair | EveryWare Real Stories`;
          description = `Read ${persona.name}'s real story on ${persona.appliance} repair in ${persona.city}: "${persona.takeaway}". Discover how EveryWare provides verified live tracking and fixed pricing.`;
          keywords = `${persona.name}, ${persona.appliance} repair ${persona.city}, ${persona.category}, appliance repair story, EveryWare user experience`;
          canonical = `https://everyware.in/#experiences/${persona.id}`;

          // JSON-LD Article Schema for Persona Post
          dynamicSchema = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": `${persona.name}'s Experience with ${persona.appliance} Repair`,
            "description": persona.takeaway,
            "articleBody": persona.story.join(" "),
            "author": {
              "@type": "Person",
              "name": persona.name,
              "jobTitle": persona.role,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": persona.city,
                "addressCountry": "IN"
              }
            },
            "publisher": {
              "@type": "Organization",
              "name": "EveryWare",
              "url": "https://everyware.in"
            }
          };
        }
      } else {
        const personaKeywords = userPersonas
          .map((p) => `${p.appliance} repair ${p.city}`)
          .join(', ');

        title = "Real-Life Home Service Experiences in Urban India | 20 EveryWare User Personas";
        description = "20 original user stories drawn from everyday Indian households. Discover real appliance repair pain points across Gurgaon, Bangalore, Mumbai, Delhi, Pune, Chennai and how EveryWare solves them.";
        keywords = `User Experiences, ${personaKeywords}, EveryWare user stories`;
        canonical = "https://everyware.in/#experiences";
      }
    }

    // Update document title
    document.title = title;

    // Update meta tags
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);

    const metaKeys = document.querySelector('meta[name="keywords"]');
    if (metaKeys) metaKeys.setAttribute('content', keywords);

    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle) metaOgTitle.setAttribute('content', title);

    const metaOgDesc = document.querySelector('meta[property="og:description"]');
    if (metaOgDesc) metaOgDesc.setAttribute('content', description);

    const metaOgUrl = document.querySelector('meta[property="og:url"]');
    if (metaOgUrl) metaOgUrl.setAttribute('content', canonical);

    const metaTwTitle = document.querySelector('meta[name="twitter:title"]');
    if (metaTwTitle) metaTwTitle.setAttribute('content', title);

    const metaTwDesc = document.querySelector('meta[name="twitter:description"]');
    if (metaTwDesc) metaTwDesc.setAttribute('content', description);

    const linkCanonical = document.querySelector('link[rel="canonical"]');
    if (linkCanonical) linkCanonical.setAttribute('href', canonical);

    // Dynamic JSON-LD injection
    const existingDynamicScript = document.getElementById('dynamic-jsonld-schema');
    if (existingDynamicScript) existingDynamicScript.remove();

    if (dynamicSchema) {
      const script = document.createElement('script');
      script.id = 'dynamic-jsonld-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(dynamicSchema);
      document.head.appendChild(script);
    }
  }, [currentRoute, activePersonaId]);

  return null;
}
