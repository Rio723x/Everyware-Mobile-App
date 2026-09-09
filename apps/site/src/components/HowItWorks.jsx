import React from 'react';
import { m } from 'framer-motion';

export default function HowItWorks() {
  const steps = [
    { num: 1, title: 'One Tap', text: "Tell us what's wrong in just one tap from your phone." },
    { num: 2, title: 'We Assign', text: 'We connect you with the right background-verified technician.' },
    { num: 3, title: 'On The Way', text: 'Track your technician in real-time with live ETA updates.' },
    { num: 4, title: 'Issue Fixed', text: 'Problem solved cleanly. Backed by 90-day guarantee!' },
  ];

  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 50px' }}>
          <h2 className="heading-lg" style={{ marginTop: 12, marginBottom: 12 }}>
            How <span style={{ color: 'var(--brand-cyan)' }}>EveryWare</span> works
          </h2>
          <p className="text-lead">Simple, fast and completely hassle-free home service in 4 steps.</p>
        </div>

        <div className="steps-grid">
          {steps.map((step, i) => (
            <m.div
              key={step.num}
              className="step-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="step-number">{step.num}</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{step.text}</p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
