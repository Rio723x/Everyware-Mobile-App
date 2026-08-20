import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function DownloadCTA({ showModal, onCloseModal }) {
  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="modal-overlay active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCloseModal}
          style={{ position: 'fixed', inset: 0, zIndex: 2000 }}
        >
          <motion.div
            className="qr-modal-card"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal-btn" onClick={onCloseModal}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Scan to Download</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Point your phone camera to download EveryWare instantly.
            </p>

            <svg width="160" height="160" viewBox="0 0 100 100" fill="#081B1E" style={{ margin: '0 auto 16px' }}>
              <rect width="100" height="100" fill="#FFFFFF" />
              <rect x="10" y="10" width="25" height="25" />
              <rect x="15" y="15" width="15" height="15" fill="#FFFFFF" />
              <rect x="18" y="18" width="9" height="9" />
              <rect x="65" y="10" width="25" height="25" />
              <rect x="70" y="15" width="15" height="15" fill="#FFFFFF" />
              <rect x="73" y="18" width="9" height="9" />
              <rect x="10" y="65" width="25" height="25" />
              <rect x="15" y="70" width="15" height="15" fill="#FFFFFF" />
              <rect x="18" y="73" width="9" height="9" />
              <rect x="42" y="12" width="6" height="6" /><rect x="52" y="18" width="6" height="6" />
              <rect x="42" y="42" width="16" height="16" fill="#00C4CC" />
              <rect x="70" y="48" width="8" height="8" /><rect x="80" y="70" width="10" height="10" />
              <rect x="48" y="72" width="8" height="8" /><rect x="62" y="80" width="12" height="6" />
            </svg>

            <p style={{ fontSize: '0.78rem', color: 'var(--brand-cyan)', fontWeight: 600 }}>Available on iOS &amp; Android</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
