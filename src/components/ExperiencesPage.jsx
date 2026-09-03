import React, { useState, useMemo } from 'react';
import { MapPin, Clock, ArrowRight, Filter, Wind, Droplets, Snowflake, RefreshCw, Flame, Sparkles } from 'lucide-react';
import { userPersonas } from '../data/personasData';
import ExperienceDetailView from './ExperienceDetailView';

export default function ExperiencesPage({ activePersonaId, onSelectPersona, onOpenQrModal }) {
  const [selectedAppliance, setSelectedAppliance] = useState('All');

  const filterCategories = ['All', 'Air Conditioner', 'Geyser', 'Refrigerator', 'Washing Machine', 'Water Purifier (RO)'];

  const filteredPersonas = useMemo(() => {
    return userPersonas.filter((p) => {
      return (
        selectedAppliance === 'All' ||
        p.appliance.toLowerCase().includes(selectedAppliance.toLowerCase())
      );
    });
  }, [selectedAppliance]);

  // Helper for appliance icon
  const getApplianceIcon = (applianceName) => {
    const name = applianceName.toLowerCase();
    if (name.includes('air') || name.includes('ac')) return <Wind size={13} />;
    if (name.includes('geyser') || name.includes('heater')) return <Flame size={13} />;
    if (name.includes('fridge') || name.includes('refriger')) return <Snowflake size={13} />;
    if (name.includes('wash')) return <RefreshCw size={13} />;
    if (name.includes('water') || name.includes('ro')) return <Droplets size={13} />;
    return <Sparkles size={13} />;
  };

  if (activePersonaId) {
    return (
      <ExperienceDetailView
        personaId={activePersonaId}
        onBack={() => onSelectPersona(null)}
        onOpenPersona={(id) => onSelectPersona(id)}
        onOpenQrModal={onOpenQrModal}
      />
    );
  }

  return (
    <div className="experiences-clean-wrapper">
      <div className="container" style={{ maxWidth: '1180px' }}>
        {/* Top Filter Bar (Matching Screenshot) */}
        <div className="top-filter-bar">
          <div className="filter-label-group">
            <Filter size={14} className="filter-icon" />
            <span>Filter by:</span>
          </div>
          <div className="filter-pills-list">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                className={`clean-pill-btn ${selectedAppliance === cat ? 'active' : ''}`}
                onClick={() => setSelectedAppliance(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Heading & Subtitle */}
        <header className="experiences-clean-header">
          <h1 className="experiences-main-title">Real Experiences. Real Impact.</h1>
          <p className="experiences-main-sub">
            Stories from real people who faced appliances issues and found a way through.
          </p>
          <div className="experiences-counter-caption">
            Showing <strong>{filteredPersonas.length}</strong> of {userPersonas.length} Experience Stories
          </div>
        </header>

        {/* Clean Editorial Horizontal Rows (Matching Screenshot Exactly) */}
        <div className="experiences-rows-list">
          {filteredPersonas.map((persona) => (
            <article
              key={persona.id}
              className="experience-row-item"
              onClick={() => onSelectPersona(persona.id)}
            >
              {/* Column 1: Takeaway Headline & Persona Meta */}
              <div className="row-col-headline">
                <h3 className="takeaway-headline">
                  "{persona.takeaway}"
                </h3>
                <div className="author-meta-line">
                  <span className="author-name">{persona.name}</span>
                  <span className="meta-sep">•</span>
                  <span className="author-role">{persona.role}</span>
                  <span className="meta-sep">•</span>
                  <span className="author-city">
                    <MapPin size={13} className="city-pin" />
                    <span>{persona.city}</span>
                  </span>
                </div>
              </div>

              {/* Column 2: Badges & Short Story Snippet */}
              <div className="row-col-excerpt">
                <div className="row-badges-row">
                  <span className="row-pill pill-cyan">
                    {getApplianceIcon(persona.appliance)}
                    <span>{persona.appliance}</span>
                  </span>
                  <span className="row-pill pill-amber">
                    {persona.category}
                  </span>
                </div>
                <p className="story-excerpt-text">
                  {persona.story[0]}
                </p>
              </div>

              {/* Column 3: Read Time & Action Link */}
              <div className="row-col-action">
                <span className="row-read-time">
                  <Clock size={13} />
                  <span>{persona.readTime}</span>
                </span>
                <div className="row-action-link">
                  <span>Read Full Story</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
