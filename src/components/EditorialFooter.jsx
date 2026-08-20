import React from 'react';
import { motion } from 'framer-motion';
import EverywareIcon from '../assets/Everywware.webp';

export default function EditorialFooter({ onOpenQrModal }) {
  return (
    <footer className="footer-editorial" style={{ paddingTop: 40 }}>
      <div className="container">
        
        {/* Cyan Banner Card replacing the giant EVERYWARE footer top row */}
        <motion.div
          className="download-banner-card"
          style={{ marginBottom: 60 }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#FFF', marginBottom: 16 }}>
              One tap is all it takes.
            </h2>
            <p style={{ fontSize: '1.05rem', opacity: 0.95, maxWidth: 480, color: '#FFF', marginBottom: 24 }}>
              Download EveryWare and experience hassle-free, intelligent home appliance service today.
            </p>

            <div className="download-actions" style={{ display: 'flex', gap: 16 }}>
              <button className="store-btn-dark" onClick={onOpenQrModal}>
                <svg width="20" height="20" viewBox="0 0 170 170" fill="currentColor" style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }}><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.35-6.15-3.56-2.85-7.37-7.59-11.41-14.2C10.24 116.58 0 88.03 0 59.9c0-18.96 6.32-34.95 18.96-47.96C31.59 1.45 46.12-.51 56.4 1.33c10.27 1.83 19.34 7.23 27.22 7.23 6.94 0 15.34-5.02 25.2-7.1C117.82.26 130.93 2.12 140.7 8.3c8.95 5.6 15.54 13.41 19.78 23.44-18.73 11.28-27.91 26.68-27.56 46.2.37 15.3 6.13 27.87 17.27 37.74 6.78 6.02 14.15 10.88 22.13 14.57H150.37zM119.22 0c0 10.9-4.14 21.01-12.43 30.34-9.33 10.51-20.31 16.71-32.96 15.34.25-10.66 4.39-20.91 12.44-30.73C95.42 4.34 107.03 0 119.22 0z"/></svg>
                App Store
              </button>
              <button className="store-btn-dark" onClick={onOpenQrModal}>
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }}><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58-33.3-60.7 60.7 60.7 60.7 58-33.3c22-12.6 22-32.2 0-44.8zM325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z"/></svg>
                Google Play
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Merged logo directly inside the card without extra white box or text */}
            <motion.img
              src={EverywareIcon}
              style={{
                width: 150,
                height: 150,
                borderRadius: '32px',
                boxShadow: '0 20px 45px rgba(8, 27, 30, 0.16)'
              }}
              whileHover={{ scale: 1.05, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              alt="EveryWare App Logo"
            />
          </div>
        </motion.div>

        <div className="footer-columns-row">
          <div>
            <div className="footer-col-title">SOCIALS</div>
            <ul className="footer-nav-links">
              <li><a href="#">FACEBOOK ↗</a></li>
              <li><a href="#">INSTAGRAM ↗</a></li>
              <li><a href="#">PINTEREST ↗</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">LOCATION</div>
            <p style={{ fontWeight: 600 }}>Fixolutions HQ<br />Bangalore, KA 560001</p>
          </div>

          <div>
            <div className="footer-col-title">CONTACT</div>
            <ul className="footer-nav-links">
              <li><a href="mailto:hello@geteveryware.com">hello@geteveryware.com</a></li>
              <li><a href="tel:+918000000000">+91 800 000 0000</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">NAVIGATION</div>
            <ul className="footer-nav-links">
              <li><a href="#platform">Platform</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#testimonials">Reviews</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-copyright">
          <span>© 2026 EveryWare by Fixolutions. All rights reserved.</span>
          <span>Built for Indian Homes</span>
        </div>
      </div>
    </footer>
  );
}
