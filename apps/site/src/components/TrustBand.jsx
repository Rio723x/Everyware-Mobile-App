import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Package, CreditCard, Sparkles } from 'lucide-react';

export default function TrustBand() {
  const pillars = [
    { icon: <ShieldCheck size={24} />, title: 'Verified Technicians', desc: 'Every technician undergoes background checks, police verification, and certified skills assessment before stepping into your home.' },
    { icon: <Package size={24} />, title: 'Genuine Spares', desc: 'We source 100% original manufacturer spare parts. Every replacement component comes with QR code verification and warranty.' },
    { icon: <CreditCard size={24} />, title: 'Transparent Pricing', desc: 'Upfront rate cards before booking. Zero hidden fees, unexpected surge charges, or surprise billing after work is done.' },
    { icon: <Sparkles size={24} />, title: '90-Day Guarantee', desc: 'If the same problem recurs within 90 days of repair, our technician returns and fixes it completely free of charge.' },
  ];

  return (
    <section className="trust-band-section" id="technicians">
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <h2 className="heading-lg" style={{ color: '#FFF', marginTop: 12 }}>
            Service you can <span style={{ color: 'var(--brand-cyan)' }}>trust</span>, always.
          </h2>
          <p className="text-lead" style={{ color: 'var(--text-light)' }}>
            We built EveryWare to kill technician anxiety. Here is why you never get burned.
          </p>
        </div>

        <div className="trust-band-grid">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              className="trust-pillar-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="trust-pillar-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
