import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ThreeHeroCanvas from './components/ThreeHeroCanvas';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import HowItWorks from './components/HowItWorks';
import BentoGrid from './components/BentoGrid';
import LiveTrackingFeature from './components/LiveTrackingFeature';
import AiCopilotFeature from './components/AiCopilotFeature';
import ApplianceHealthFeature from './components/ApplianceHealthFeature';
import TrustBand from './components/TrustBand';
import StatsBand from './components/StatsBand';
import TestimonialsGrid from './components/TestimonialsGrid';
import FaqSection from './components/FaqSection';
import DownloadCTA from './components/DownloadCTA';
import EditorialFooter from './components/EditorialFooter';

export default function App() {
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <Navbar onOpenQrModal={() => setShowQrModal(true)} />

      <main style={{ position: 'relative' }}>
        <ThreeHeroCanvas />
        <Hero onOpenQrModal={() => setShowQrModal(true)} />
        <SocialProof />
        <HowItWorks />
        <LiveTrackingFeature />
        <AiCopilotFeature />
        <ApplianceHealthFeature />
        <BentoGrid />
        {/* <TrustBand /> */}
        <StatsBand />
        <TestimonialsGrid />
        <FaqSection />

        {/* Global QR Download Popup Modal */}
        <DownloadCTA
          showModal={showQrModal}
          onCloseModal={() => setShowQrModal(false)}
        />
      </main>

      <EditorialFooter onOpenQrModal={() => setShowQrModal(true)} />
    </div>
  );
}
