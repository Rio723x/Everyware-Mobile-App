import React from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import HowItWorks from './components/HowItWorks';

import ThreeHeroCanvas from './components/ThreeHeroCanvas';
import FeaturesStack from './components/FeaturesStack';
import BentoGrid from './components/BentoGrid';
import StatsBand from './components/StatsBand';
import TestimonialsGrid from './components/TestimonialsGrid';
import FaqSection from './components/FaqSection';
import DownloadCTA from './components/DownloadCTA';
import EditorialFooter from './components/EditorialFooter';
import { useState } from 'react';

export default function App() {
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    // LazyMotion: loads only domAnimation subset (~80KB vs ~120KB full bundle)
    <LazyMotion features={domAnimation}>
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        <Navbar onOpenQrModal={() => setShowQrModal(true)} />

        <main style={{ position: 'relative' }}>
          <ThreeHeroCanvas />

          {/* Hero and SocialProof are above fold — loaded eagerly */}
          <Hero onOpenQrModal={() => setShowQrModal(true)} />
          <SocialProof />
          <HowItWorks />

          {/* Below-fold sections render deterministically on initial layout */}
          <FeaturesStack />
          <BentoGrid />
          <StatsBand />
          <TestimonialsGrid />
          <FaqSection />
          <DownloadCTA
            showModal={showQrModal}
            onCloseModal={() => setShowQrModal(false)}
          />
        </main>

        <EditorialFooter onOpenQrModal={() => setShowQrModal(true)} />
      </div>
    </LazyMotion>
  );
}
