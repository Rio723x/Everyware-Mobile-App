import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import TrackingAnimVideo from '../assets/LiveTrackingAnim.mp4';

export default function LiveTrackingFeature() {
  return (
    <section className="feature-card-section-wrapper" id="features">
      <div className="container">
        <div className="feature-grid">
          {/* Left Column Content - Slides from left */}
          <motion.div
            className="feature-content"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="heading-lg" style={{ marginTop: 12, marginBottom: 16 }}>
              Know exactly when help arrives.
            </h2>
            <p className="text-lead" style={{ marginBottom: 24 }}>
              No more guessing 4-hour service windows. Follow your verified technician live on the map from dispatch to your doorstep with precision GPS routing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, fontWeight: 500, fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="var(--brand-cyan)" /> Real-time live map tracking &amp; route updates
              </div>
              <div style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="var(--brand-cyan)" /> Technician profile, photo ID &amp; vehicle details
              </div>
              <div style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="var(--brand-cyan)" /> Direct 1-tap call &amp; messaging inside app
              </div>
            </div>
          </motion.div>

          {/* Right Column Visual - Slides from right */}
          <motion.div
            className="feature-visual"
            initial={{ opacity: 0, x: 60, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-phone-showcase-wrapper" style={{ padding: '24px 0' }}>
              <div className="phone-glow-aura" />
              <div className="tracking-video-phone-frame">
                <video
                  src={TrackingAnimVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  className="tracking-video-element"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
