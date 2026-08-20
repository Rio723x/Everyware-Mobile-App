import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Package, CreditCard, Sparkles } from 'lucide-react';

export default function TrustBadges() {
  const badges = [
    { icon: <ShieldCheck size={20} />, title: 'Verified Technicians', subtitle: 'Background verified' },
    { icon: <Package size={20} />, title: 'Genuine Spares', subtitle: '100% genuine parts' },
    { icon: <CreditCard size={20} />, title: 'Transparent Pricing', subtitle: 'No hidden charges' },
    { icon: <Sparkles size={20} />, title: 'Service Guarantee', subtitle: 'Up to 90 days' },
  ];

  return (
    <div className="container hero-trust-bar">
      {badges.map((b, i) => (
        <motion.div
          key={b.title}
          className="trust-badge-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className="trust-badge-icon">{b.icon}</div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{b.title}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.subtitle}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
