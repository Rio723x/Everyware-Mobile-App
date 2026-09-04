import React, { useState, useMemo } from 'react';
import { Search, PhoneCall, Mail, MapPin, CheckCircle, ShieldCheck, ExternalLink, X, Wrench } from 'lucide-react';
import { brandInfoData } from '../data/brandInfoData';

export default function InfoDirectoryPage({ onOpenQrModal }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrandModal, setActiveBrandModal] = useState(null);

  const filteredBrands = useMemo(() => {
    return brandInfoData.filter((b) => {
      return (
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tollFree.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [searchQuery]);

  return (
    <div className="info-directory-wrapper">
      <div className="container" style={{ maxWidth: '1180px' }}>
        {/* Screenshot 1 Header: Customer Support Directory */}
        <header className="info-header-simple">
          <h1 className="info-simple-title">Customer Support Directory</h1>
          <p className="info-simple-sub">
            Contact details for customer support of leading appliance brands in India.
          </p>

          {/* Minimal Search Bar */}
          <div className="info-search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by brand name (e.g. Panasonic, LG, Samsung, Voltas, Kent)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="info-search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>Clear</button>
            )}
          </div>
        </header>

        {/* Tabular List Directory Rows (Matching Screenshot 1 Exactly) */}
        <div className="directory-table-container">
          {filteredBrands.map((brand, index) => (
            <div
              key={brand.id}
              className="directory-row-item"
              onClick={() => setActiveBrandModal(brand)}
            >
              {/* Col 1: Number Badge */}
              <div className="row-col-num">
                <div className="number-badge">{index + 1}</div>
              </div>

              {/* Col 2: Brand & Tagline */}
              <div className="row-col-brand">
                <h3 className="row-brand-name">{brand.name}</h3>
                <p className="row-brand-tagline">{brand.tagline}</p>
              </div>

              {/* Col 3: Phone Contact */}
              <div className="row-col-phone">
                <div className="contact-head">
                  <PhoneCall size={14} className="head-icon phone" />
                  <span>Phone</span>
                </div>
                <a
                  href={`tel:${brand.tollFree.split('/')[0].trim()}`}
                  className="contact-val bold"
                  onClick={(e) => e.stopPropagation()}
                >
                  {brand.tollFree}
                </a>
              </div>

              {/* Col 4: Email Contact */}
              <div className="row-col-email">
                <div className="contact-head">
                  <Mail size={14} className="head-icon email" />
                  <span>Email</span>
                </div>
                <a
                  href={`mailto:${brand.email}`}
                  className="contact-val"
                  onClick={(e) => e.stopPropagation()}
                >
                  {brand.email}
                </a>
              </div>

              {/* Col 5: Service Area */}
              <div className="row-col-area">
                <div className="contact-head">
                  <MapPin size={14} className="head-icon map" />
                  <span>Service Area</span>
                </div>
                <span className="contact-val text">{brand.states}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Caption */}
        <div className="directory-bottom-caption">
          Showing {filteredBrands.length} of {brandInfoData.length} Brands
        </div>
      </div>

      {/* Brand Detail Modal */}
      {activeBrandModal && (
        <div className="modal-overlay" onClick={() => setActiveBrandModal(null)}>
          <div className="brand-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveBrandModal(null)}>
              <X size={20} />
            </button>

            <div className="modal-header">
              <div className="brand-logo-badge large">
                {activeBrandModal.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2>{activeBrandModal.name}</h2>
                <p>{activeBrandModal.tagline}</p>
              </div>
            </div>

            <div className="modal-body">
              {/* Quick Contact Box */}
              <div className="modal-contact-box">
                <div className="box-row">
                  <strong>Toll-Free Customer Care:</strong>
                  <a href={`tel:${activeBrandModal.tollFree.split('/')[0].trim()}`}>{activeBrandModal.tollFree}</a>
                </div>
                <div className="box-row">
                  <strong>Official Email Support:</strong>
                  <a href={`mailto:${activeBrandModal.email}`}>{activeBrandModal.email}</a>
                </div>
                <div className="box-row">
                  <strong>Official Website Portal:</strong>
                  <a href={activeBrandModal.website} target="_blank" rel="noopener noreferrer">
                    Visit Support Portal <ExternalLink size={13} />
                  </a>
                </div>
                <div className="box-row">
                  <strong>Coverage Area:</strong>
                  <span>{activeBrandModal.states}</span>
                </div>
              </div>

              {/* Services Offered */}
              <div className="modal-section">
                <h4>Services Offered by {activeBrandModal.name}</h4>
                <div className="services-pills">
                  {activeBrandModal.services.map((srv, idx) => (
                    <span key={idx} className="srv-pill">
                      <CheckCircle size={14} /> {srv}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Contact Guide */}
              <div className="modal-section">
                <h4>Step-by-Step Contact & Resolution Guide</h4>
                <ol className="steps-list">
                  {activeBrandModal.contactSteps.map((step, idx) => (
                    <li key={idx}>
                      <span className="step-num">{idx + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* EveryWare Direct Fast-Track Box */}
              <div className="modal-everyware-box">
                <ShieldCheck size={24} className="ew-icon" />
                <div>
                  <h4>Skip Customer Care Queues with EveryWare</h4>
                  <p>Book verified, background-checked technicians for {activeBrandModal.name} appliances instantly on EveryWare with digital invoice and warranty logs.</p>
                </div>
                <button className="btn btn-coral" onClick={() => { setActiveBrandModal(null); onOpenQrModal(); }}>
                  Book Service Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
