import React from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Box, Home as HomeIcon, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';

export default function BentoGrid() {
  return (
    <section className="bento-features-section" id="platform">
      <div className="container">
        <div className="bento-header-grid">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', marginBottom: 12 }}>
              Our Platform
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Our platform provides you with the tools and resources you need to keep your home appliances running flawlessly.
            </p>
          </m.div>

          <m.div
            className="bento-card bento-card-gradient"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="bento-card-icon"><Box size={22} /></div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>Exclusive</h3>
              <p>1-Tap instant appliance service assigned to your home on demand.</p>
            </div>
          </m.div>

          <m.div
            className="bento-card"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="bento-card-icon"><HomeIcon size={22} /></div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>In your backyard</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Radius based verified technicians within 5 miles from you, prioritizing those closer to you.
              </p>
            </div>
          </m.div>
        </div>

        <div className="bento-bottom-grid">
          <m.div
            className="bento-card"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="bento-card-icon"><ShieldCheck size={22} /></div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>High Verification</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                100% background checked, police verified, and certified technical specialists.
              </p>
            </div>
          </m.div>

          <m.div
            className="bento-card"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="bento-card-icon"><TrendingUp size={22} /></div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>AI Copilot Diagnosis</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                AI engine predicting maintenance needs before unexpected breakdowns occur.
              </p>
            </div>
          </m.div>

          <m.div
            className="bento-card bento-card-green"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="bento-card-icon"><Wallet size={22} /></div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>Transparent Pricing</h3>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem' }}>
                Upfront pricing rate card before booking. Zero hidden fees.
              </p>
              <button className="btn-bento-action">
                View pricing <ArrowRight size={16} />
              </button>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}

