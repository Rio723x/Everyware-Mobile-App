import React from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Star, Users, Download } from 'lucide-react';
import PhoneOnlyImage from '../assets/PhoneOnly.webp';

export default function Hero({ onOpenQrModal }) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <section className="hero-section-full" id="home">
      <div className="container hero-grid-full" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left Column Text & Action Buttons */}
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <m.h1 className="heading-xl" style={{ marginBottom: 20 }} variants={itemVariants}>
            Turn Home Repair into Solutions in Seconds, Not Hours
          </m.h1>

          <m.p className="text-lead" style={{ marginBottom: 32, maxWidth: 520 }} variants={itemVariants}>
            EveryWare is your smart home service app. Just describe your appliance issue, we'll assign a verified technician with real-time live GPS tracking, clean transparent pricing, and guaranteed work.
          </m.p>

          <m.div className="hero-ctas-row" variants={itemVariants}>
            <a href="#download" className="btn btn-coral">
              Book a Service
              <ArrowRight size={16} />
            </a>
            <button className="btn btn-glass" onClick={onOpenQrModal}>
              Download App
            </button>
          </m.div>

          <m.div className="hero-store-buttons" variants={itemVariants}>
            <button className="btn-store-black" onClick={onOpenQrModal}>
              <svg viewBox="0 0 170 170"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.35-6.15-3.56-2.85-7.37-7.59-11.41-14.2C10.24 116.58 0 88.03 0 59.9c0-18.96 6.32-34.95 18.96-47.96C31.59 1.45 46.12-.51 56.4 1.33c10.27 1.83 19.34 7.23 27.22 7.23 6.94 0 15.34-5.02 25.2-7.1C117.82.26 130.93 2.12 140.7 8.3c8.95 5.6 15.54 13.41 19.78 23.44-18.73 11.28-27.91 26.68-27.56 46.2.37 15.3 6.13 27.87 17.27 37.74 6.78 6.02 14.15 10.88 22.13 14.57H150.37zM119.22 0c0 10.9-4.14 21.01-12.43 30.34-9.33 10.51-20.31 16.71-32.96 15.34.25-10.66 4.39-20.91 12.44-30.73C95.42 4.34 107.03 0 119.22 0z"/></svg>
              Apple Store
            </button>
            <span className="store-or-text">Or</span>
            <button className="btn-store-black" onClick={onOpenQrModal}>
              <svg viewBox="0 0 512 512"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58-33.3-60.7 60.7 60.7 60.7 58-33.3c22-12.6 22-32.2 0-44.8zM325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z"/></svg>
              Play Store
            </button>
          </m.div>

          <m.div className="hero-stats-row" variants={itemVariants}>
            <div className="stat-item-box">
              <div className="stat-icon-mini"><Download size={18} /></div>
              <div>
                <div className="stat-num-bold">45k+</div>
                <div className="stat-num-label">Downloads</div>
              </div>
            </div>

            <div className="stat-item-box">
              <div className="stat-icon-mini"><Users size={18} /></div>
              <div>
                <div className="stat-num-bold">20k+</div>
                <div className="stat-num-label">Active Users</div>
              </div>
            </div>

            <div className="stat-item-box">
              <div className="stat-icon-mini"><Star size={18} /></div>
              <div>
                <div className="stat-num-bold">4.9★</div>
                <div className="stat-num-label">CSAT Rating</div>
              </div>
            </div>
          </m.div>
        </m.div>

        {/* Right Column Seamless Transparent iPhone Mockup */}
        <m.div
          className="hero-phone-showcase-wrapper"
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -8, scale: 1.02 }}
        >
          <div className="phone-glow-aura" />
          <img
            src={PhoneOnlyImage}
            alt="EveryWare App — Book home appliance repair on your phone"
            className="hero-phone-mockup-img"
            width="520"
            height="900"
            fetchpriority="high"
            decoding="async"
          />
        </m.div>
      </div>
    </section>
  );
}
