import React, { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import TrackingAnimVideo from '../assets/LiveTrackingAnim.mp4';
import CopilotPhoneImage from '../assets/CopilotPhoneOnly.png';
import HealthPhoneImage from '../assets/HealthPhoneOnly.png';

function LazyVideo({ src, className }) {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      autoPlay={shouldLoad}
      loop
      muted
      playsInline
      disablePictureInPicture
      preload="none"
      className={className}
    />
  );
}

export default function FeaturesStack() {
  const cards = [
    {
      id: 'tracking',
      title: 'Know exactly when help arrives.',
      desc: 'No more guessing 4-hour service windows. Follow your verified technician live on the map from dispatch to your doorstep with precision GPS routing.',
      bg: '#F4F8FA', // Light sky blue
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, fontWeight: 500, fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--brand-cyan)" /> Real-time live map tracking &amp; route updates
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--brand-cyan)" /> Technician profile, photo ID &amp; vehicle details
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--brand-cyan)" /> Direct 1-tap call &amp; messaging inside app
          </div>
        </div>
      ),
      visual: (
        <div className="hero-phone-showcase-wrapper" style={{ padding: 0 }}>
          <div className="phone-glow-aura" />
          <div className="tracking-video-phone-frame" style={{ maxWidth: 360 }}>
            <LazyVideo
              src={TrackingAnimVideo}
              className="tracking-video-element"
            />
          </div>
        </div>
      ),
      reverse: false
    },
    {
      id: 'copilot',
      title: 'Not sure what\'s wrong? Ask our AI Copilot.',
      desc: 'Describe the issue in your own simple words. Our AI Copilot instantly diagnoses appliance symptoms, suggests quick fixes, or books the exact right technician.',
      bg: '#FFFFFF', // Clean white
      content: (
        <a href="#download" className="btn btn-dark" style={{ marginTop: 12 }}>
          Chat with Copilot
        </a>
      ),
      visual: (
        <div className="hero-phone-showcase-wrapper" style={{ padding: 0 }}>
          <div className="phone-glow-aura" />
          <img
            src={CopilotPhoneImage}
            alt="EveryWare AI Copilot — automated appliance symptom diagnosis on iPhone"
            className="hero-phone-mockup-img"
            style={{ maxWidth: 360 }}
            width="360"
            height="720"
            loading="lazy"
            decoding="async"
          />
        </div>
      ),
      reverse: true
    },
    {
      id: 'health',
      title: 'Keep your home appliances healthy.',
      desc: 'Track usage history, receive smart filter change alerts, and extend appliance lifespan. Prevent sudden breakdowns before they happen.',
      bg: '#F0FDFD', // Very soft light teal
      content: null,
      visual: (
        <div className="hero-phone-showcase-wrapper" style={{ padding: 0 }}>
          <div className="phone-glow-aura" />
          <img
            src={HealthPhoneImage}
            alt="EveryWare Appliance Health Dashboard — track usage and get maintenance alerts on iPhone"
            className="hero-phone-mockup-img"
            style={{ maxWidth: 360 }}
            width="360"
            height="720"
            loading="lazy"
            decoding="async"
          />
        </div>
      ),
      reverse: false
    }
  ];

  return (
    <div className="features-stack-container" id="features">
      <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 60px' }}>
        <h2 className="heading-lg" style={{ marginTop: 12, marginBottom: 12 }}>
          Intelligent Features
        </h2>
        <p className="text-lead">Explore how EveryWare transforms home services one tap at a time.</p>
      </div>

      <div className="features-stack-list">
        {cards.map((card, index) => {
          return <Card key={card.id} card={card} index={index} total={cards.length} />;
        })}
      </div>
    </div>
  );
}

function Card({ card, index, total }) {
  const containerRef = useRef(null);
  
  // Track scroll progress of this specific card relative to the viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Smooth layout scaling transform
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.75]);

  // Adjust top offset to position cards perfectly within 92vh
  const cardTop = `calc(3vh + ${index * 40}px)`;

  return (
    <div
      ref={containerRef}
      className="sticky-card-section"
      style={{
        position: 'sticky',
        top: cardTop,
        height: '92vh', // Increased card wrapper height to 92vh
        marginBottom: index === total - 1 ? '0' : '8vh'
      }}
    >
      <m.div
        className="stacked-feature-card"
        style={{
          scale,
          opacity,
          background: card.bg
        }}
      >
        <div className={`feature-grid ${card.reverse ? 'reverse' : ''}`} style={{ width: '100%' }}>
          <div className="feature-content">
            <h2 className="heading-lg" style={{ marginBottom: 16 }}>
              {card.title}
            </h2>
            <p className="text-lead" style={{ marginBottom: 24 }}>
              {card.desc}
            </p>
            {card.content}
          </div>

          <div className="feature-visual" style={{ display: 'flex', justifyContent: 'center' }}>
            {card.visual}
          </div>
        </div>
      </m.div>
    </div>
  );
}
