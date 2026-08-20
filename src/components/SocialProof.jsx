import React from 'react';
import EverywareIcon from '../assets/Everywware.webp';

export default function SocialProof() {
  const brands = ['LG', 'SAMSUNG', 'WHIRLPOOL', 'BOSCH', 'HAIER', 'IFB'];

  return (
    <section className="social-proof-section">
      <div className="container social-proof-content">
        <div className="social-proof-label">
          <img src={EverywareIcon} style={{ width: 24, height: 24, borderRadius: 6 }} alt="Logo" />
          <span>Built by Fixolutions — Powering after-sales service for leading brands</span>
        </div>

        <div className="brand-logos-row">
          {brands.map((b) => (
            <span key={b} className="brand-logo-text">{b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
