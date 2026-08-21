import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function FaqSection() {
  const [activeKey, setActiveKey] = useState('how-to-start');

  const faqData = {
    "what-is-platform": {
      title: "What is EveryWare about?",
      body: "EveryWare is your smart home service platform powered by Fixolutions. We connect you directly with background-verified appliance technicians, provide live GPS tracking, AI Copilot troubleshooting, and complete appliance health scoring.",
      iconBg: "linear-gradient(135deg, #00C4CC 0%, #009DA3 100%)",
      iconInner: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      )
    },
    "how-to-start": {
      title: "How do I get started?",
      body: "Simply browse through our various sections. If you have a specific question, use our AI Assistant or download the mobile app on iOS & Android.",
      iconBg: "linear-gradient(135deg, #081B1E 0%, #11292E 100%)",
      iconInner: (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      )
    },
    "is-mobile-responsive": {
      title: "Is it mobile responsive?",
      body: "Yes! EveryWare is built mobile-first. Whether you land on our website during an urgent appliance breakdown or use our mobile app, the interface is optimized for single-tap actions.",
      iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      iconInner: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      )
    },
    "verified-technicians": {
      title: "Are technicians verified?",
      body: "100% verified! Every technician on EveryWare passes rigorous background checks, police verification, identity confirmation, and certified hands-on technical skill audits.",
      iconBg: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
      iconInner: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    "how-does-pricing-work": {
      title: "How does pricing work?",
      body: "You receive a complete rate breakdown upfront before any repair work begins. No hidden call-out fees, surge pricing, or surprise invoices after completion.",
      iconBg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      iconInner: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    "what-is-the-90-day-guarantee": {
      title: "What is the 90-day guarantee?",
      body: "Every repair completed through EveryWare comes with an assured 90-day service warranty covering both technician labor and installed genuine manufacturer spare parts.",
      iconBg: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
      iconInner: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    }
  };

  const tabs = [
    { key: 'what-is-platform', label: 'What is EveryWare about?' },
    { key: 'how-to-start', label: 'How do I get started?' },
    { key: 'is-mobile-responsive', label: 'Is it mobile responsive?' },
    { key: 'verified-technicians', label: 'Are technicians verified?' },
    { key: 'how-does-pricing-work', label: 'How does pricing work?' },
    { key: 'what-is-the-90-day-guarantee', label: 'What is the 90-day guarantee?' },
  ];

  const current = faqData[activeKey];

  return (
    <section className="faq-section-new" id="faq">
      <div className="container">
        <h2 className="faq-title-center">Frequently Asked Questions</h2>

        <div className="faq-2col-layout">
          {/* Left Column Tabs - Dynamic Switcher */}
          <div className="faq-questions-list">
            {tabs.map((tab) => {
              const isActive = activeKey === tab.key;
              return (
                <div
                  key={tab.key}
                  className={`faq-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    console.log('FAQ tab clicked:', tab.key);
                    setActiveKey(tab.key);
                  }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ transition: 'font-weight 0.2s', fontWeight: isActive ? 700 : 500 }}>
                    {tab.label}
                  </span>
                  <ArrowRight
                    size={18}
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateX(0)' : 'translateX(-8px)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      color: 'var(--brand-cyan)'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Right Column Dynamic Detail Panel */}
          <div className="faq-detail-panel" style={{ background: '#F4F8FA', borderRadius: '32px', border: '1px solid rgba(8, 27, 30, 0.04)', padding: '40px' }}>
            <AnimatePresence mode="wait">
              <m.div
                key={activeKey}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-dark)' }}>
                  {current.title}
                </h3>
                <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: 28 }}>
                  {current.body}
                </p>

                {/* Artwork box mimicking the phone layout in reference mockup */}
                <div className="faq-artwork-box" style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(8, 27, 30, 0.05)',
                  boxShadow: '0 10px 30px rgba(8, 27, 30, 0.02)'
                }}>
                  {/* Styled capsule displaying standard phone mockup layout */}
                  <div style={{
                    width: 180,
                    height: 100,
                    borderRadius: '16px',
                    background: '#081B1E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                    position: 'relative'
                  }}>
                    {/* Dynamic Bezel screen */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)'
                    }} />
                    <div style={{ width: 44, height: 4, borderRadius: 2, background: '#FFFFFF', opacity: 0.8 }} />
                  </div>
                </div>
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

