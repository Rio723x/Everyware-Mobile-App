import React from 'react';
import { motion } from 'framer-motion';
import HealthPhoneImage from '../assets/HealthPhoneOnly.png';

export default function ApplianceHealthFeature() {
  return (
    <section className="feature-card-section-wrapper">
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
              Keep your home appliances healthy.
            </h2>
            <p className="text-lead">
              Track usage history, receive smart filter change alerts, and extend appliance lifespan. Prevent sudden breakdowns before they happen.
            </p>
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
              <img
                src={HealthPhoneImage}
                alt="EveryWare Appliance Health App Mockup"
                className="hero-phone-mockup-img"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
