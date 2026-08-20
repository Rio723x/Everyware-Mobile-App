import React from 'react';
import { motion } from 'framer-motion';

export default function TestimonialsGrid() {
  return (
    <section className="testimonials-section-new" id="testimonials">
      <div className="container">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, textAlign: 'center' }}>
          Loved by Customers
        </h2>

        <div className="testimonials-grid-new">
          {/* Tile 1 Photo */}
          <motion.div
            className="test-tile test-tile-photo"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80')` }}
            whileHover={{ y: -6, scale: 1.02 }}
          >
            <div className="test-tile-content">
              <p className="test-quote-text">"It's easy to book home repairs in just 60 seconds with EveryWare."</p>
              <p className="test-author-name">- Steven Sunny</p>
            </div>
          </motion.div>

          {/* Tile 2 Solid Teal */}
          <motion.div className="test-tile test-tile-solid-teal" whileHover={{ y: -6, scale: 1.02 }}>
            <div className="test-tile-content">
              <p className="test-quote-text">"EveryWare provided me with a wealth of transparent pricing &amp; 100% genuine parts."</p>
              <p className="test-author-name">- Priya Sharma</p>
            </div>
          </motion.div>

          {/* Tile 3 Photo */}
          <motion.div
            className="test-tile test-tile-photo"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80')` }}
            whileHover={{ y: -6, scale: 1.02 }}
          >
            <div className="test-tile-content">
              <p className="test-quote-text">"Let's make unbelievable hassle-free repairs with EveryWare."</p>
              <p className="test-author-name">- Rohit Mehta</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
