import React from 'react';
import { motion } from 'framer-motion';
import CopilotPhoneImage from '../assets/CopilotPhoneOnly.png';

export default function AiCopilotFeature() {
  return (
    <section className="feature-card-section-wrapper">
      <div className="container">
        <div className="feature-grid reverse">
          {/* Right Column Content - Slides from right */}
          <motion.div
            className="feature-content"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="heading-lg" style={{ marginTop: 12, marginBottom: 16 }}>
              Not sure what's wrong?<br /><span style={{ color: 'var(--brand-cyan)' }}>Ask our AI Copilot.</span>
            </h2>
            <p className="text-lead" style={{ marginBottom: 24 }}>
              Describe the issue in your own simple words. Our AI Copilot instantly diagnoses appliance symptoms, suggests quick fixes, or books the exact right technician.
            </p>

            <a href="#download" className="btn btn-dark">
              Chat with Copilot
            </a>
          </motion.div>

          {/* Left Column Visual - Slides from left */}
          <motion.div
            className="feature-visual"
            initial={{ opacity: 0, x: -60, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-phone-showcase-wrapper" style={{ padding: '24px 0' }}>
              <div className="phone-glow-aura" />
              <img
                src={CopilotPhoneImage}
                alt="EveryWare AI Copilot App Mockup"
                className="hero-phone-mockup-img"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
