import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import EverywareIcon from '../assets/Everywware.webp';

export default function Navbar({ onOpenQrModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '#home' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Platform', href: '#platform' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ];

  // 1. Navbar shrink on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. High-performance IntersectionObserver Scroll Spy
  useEffect(() => {
    const sectionIds = ['home', 'how-it-works', 'features', 'platform', 'testimonials', 'faq'];

    const observerOptions = {
      root: null,
      // Triggers when the section crosses into the middle/upper portion of the viewport
      rootMargin: '-25% 0px -45% 0px',
      threshold: 0.1
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          const labelMap = {
            'home': 'Home',
            'how-it-works': 'How It Works',
            'features': 'Features',
            'platform': 'Platform',
            'testimonials': 'Reviews',
            'faq': 'FAQ'
          };
          if (labelMap[id]) {
            setActiveTab(labelMap[id]);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  return (
    <>
      <div className="navbar-wrapper">
        <motion.nav
          className={`navbar ${isScrolled ? 'scrolled' : ''}`}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <a href="#" className="nav-brand">
            <img src={EverywareIcon} alt="EveryWare Logo" />
            <span>EveryWare</span>
          </a>

          <div className="nav-menu-wrapper">
            <ul className="nav-menu">
              {navItems.map((item) => (
                <li key={item.label} style={{ position: 'relative' }}>
                  <a
                    href={item.href}
                    className={`nav-link ${activeTab === item.label ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(item.label);
                      // Smooth scroll target if clicked
                      const target = document.querySelector(item.href);
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {item.label}
                  </a>
                  {activeTab === item.label && (
                    <motion.div
                      layoutId="activePill"
                      className="nav-indicator-pill"
                      style={{ inset: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-actions">
            {/* <button className="btn-nav-login" onClick={onOpenQrModal}>Log in</button>
            <a href="#download" className="btn-nav-signup">Book Service</a> */}
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`mobile-nav-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`mobile-nav-drawer ${mobileOpen ? 'active' : ''}`}>
        <ul className="mobile-nav-list">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={() => {
                  setActiveTab(item.label);
                  setMobileOpen(false);
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#download" className="btn btn-coral" style={{ width: '100%' }}>
          Book a Service Now
        </a>
      </div>
    </>
  );
}
