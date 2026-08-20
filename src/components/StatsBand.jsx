import React from 'react';
import { motion } from 'framer-motion';

export default function StatsBand() {
  const stats = [
    { number: '< 90 min', label: 'Average Response Time' },
    { number: '4.9 ★', label: 'Average CSAT Rating' },
    { number: '10,000+', label: 'Successful Repairs' },
    { number: '90 Days', label: 'Service Warranty' },
  ];

  return (
    <section className="stats-section">
      <div className="container stats-grid">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className="stat-number">{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
