import React, { useState } from 'react';
import { ArrowLeft, MapPin, Clock, Share2, ThumbsUp, ThumbsDown, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { userPersonas } from '../data/personasData';

export default function ExperienceDetailView({ personaId, onBack, onOpenPersona, onOpenQrModal }) {
  const persona = userPersonas.find((p) => p.id === Number(personaId)) || userPersonas[0];
  const [feedback, setFeedback] = useState(null);

  // Find related stories
  const relatedPersonas = userPersonas
    .filter((p) => p.id !== persona.id && (p.appliance === persona.appliance || p.category === persona.category))
    .slice(0, 3);
  
  if (relatedPersonas.length < 3) {
    const extra = userPersonas.filter((p) => p.id !== persona.id && !relatedPersonas.includes(p)).slice(0, 3 - relatedPersonas.length);
    relatedPersonas.push(...extra);
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `EveryWare Experience: ${persona.name}`,
        text: `Read ${persona.name}'s story regarding ${persona.appliance} repair in ${persona.city}.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="experience-detail-page-clean">
      <div className="container" style={{ maxWidth: '1180px' }}>
        
        {/* Top Header & Breadcrumb Navigation Line */}
        <div className="detail-header-top-row">
          <div className="header-top-left">
            <button onClick={onBack} className="clean-back-link">
              <ArrowLeft size={15} />
              <span>Back to all experiences</span>
            </button>
            <div className="detail-breadcrumb">
              <span className="crumb">Experiences</span>
              <span className="sep">&gt;</span>
              <span className="crumb">{persona.appliance}</span>
              <span className="dot">•</span>
              <span className="crumb">{persona.category}</span>
            </div>
          </div>
          <div className="header-top-right">
            <div className="read-time-pill">
              <Clock size={14} />
              <span>{persona.readTime}</span>
            </div>
            <button onClick={handleShare} className="btn-share-top">
              <Share2 size={14} />
              <span>Share Story</span>
            </button>
          </div>
        </div>

        {/* Article Title */}
        <h1 className="detail-article-title">
          {persona.name}'s Experience with {persona.appliance} Repair
        </h1>

        {/* Author Sub-header */}
        <div className="detail-author-line">
          <User size={15} className="user-icon" />
          <span className="author-name">{persona.name}</span>
          <span className="meta-sep">•</span>
          <span className="author-role">{persona.role}</span>
          <span className="meta-sep">•</span>
          <span className="author-location">{persona.city}</span>
        </div>

        {/* Main 2-Column Content Layout (Matching Screenshot) */}
        <div className="detail-2col-layout">
          
          {/* Left Column: Narrative Content */}
          <div className="detail-main-content">
            
            {/* Pull Quote Box with vertical left border */}
            <blockquote className="editorial-pull-quote">
              <span className="quote-mark">“</span>
              <p>"{persona.takeaway}"</p>
            </blockquote>

            {/* Article Paragraphs */}
            <div className="editorial-article-body">
              {persona.story.map((paragraph, index) => (
                <p key={index} className="editorial-p">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* HOW EVERYWARE SOLVES THIS Green Box */}
            <div className="everyware-solves-box">
              <div className="solves-box-badge">HOW EVERYWARE SOLVES THIS</div>
              <h3 className="solves-box-title">
                No More Unpredictable Service Traps in {persona.city}
              </h3>

              <div className="solves-feature-list">
                <div className="solves-item">
                  <div className="solves-item-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="solves-item-text">
                    <strong>Upfront Fixed Pricing:</strong> EveryWare displays standardized rate cards before booking, preventing price gouging.
                  </div>
                </div>

                <div className="solves-item">
                  <div className="solves-item-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="solves-item-text">
                    <strong>Verified Technician ID & Photo:</strong> Receive full technician photo ID, background verification, and live ETA tracking on your phone.
                  </div>
                </div>

                <div className="solves-item">
                  <div className="solves-item-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="solves-item-text">
                    <strong>Permanent Digital Service Records:</strong> Complete maintenance history and GST digital receipts stored safely in your app.
                  </div>
                </div>
              </div>

              <div className="solves-box-action">
                <button className="btn-dark-solves" onClick={onOpenQrModal}>
                  <span>Experience Stress-Free Appliance Care</span>
                  <ArrowLeft size={15} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            </div>

            {/* Was this experience helpful? Feedback bar */}
            <div className="helpful-feedback-bar">
              <span>Was this experience helpful?</span>
              <div className="feedback-btns">
                <button
                  className={`btn-helpful ${feedback === 'yes' ? 'active' : ''}`}
                  onClick={() => setFeedback('yes')}
                  title="Yes"
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  className={`btn-helpful ${feedback === 'no' ? 'active' : ''}`}
                  onClick={() => setFeedback('no')}
                  title="No"
                >
                  <ThumbsDown size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar (About & Explore More) */}
          <aside className="detail-sidebar">
            
            {/* About this experience */}
            <div className="sidebar-about-box">
              <h4 className="sidebar-title">About this experience</h4>
              
              <div className="sidebar-field">
                <span className="field-label">Category</span>
                <div className="field-pills">
                  <span className="sb-pill pill-cyan">{persona.appliance}</span>
                  <span className="sb-pill pill-amber">{persona.category}</span>
                </div>
              </div>

              <div className="sidebar-field">
                <span className="field-label">Location</span>
                <span className="field-value">{persona.city}</span>
              </div>

              <div className="sidebar-field">
                <span className="field-label">Read time</span>
                <span className="field-value">{persona.readTime}</span>
              </div>

              <div className="sidebar-field">
                <span className="field-label">Published on</span>
                <span className="field-value">May 28, 2025</span>
              </div>
            </div>

            {/* Explore more experiences card */}
            <div className="sidebar-explore-card">
              <h4 className="explore-card-title">Explore more experiences</h4>
              
              <div className="explore-items-list">
                {relatedPersonas.map((rel) => (
                  <div
                    key={rel.id}
                    className="explore-item"
                    onClick={() => onOpenPersona(rel.id)}
                  >
                    <h5 className="explore-item-name">{rel.name}</h5>
                    <p className="explore-item-sub">{rel.appliance} Repair in {rel.city}</p>
                    <span className="explore-item-time">{rel.readTime}</span>
                  </div>
                ))}
              </div>

              <button className="btn-explore-all" onClick={onBack}>
                <span>View all experiences</span>
                <ChevronRight size={15} />
              </button>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}
