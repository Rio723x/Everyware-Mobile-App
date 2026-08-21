import React, { Suspense, lazy } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import HowItWorks from './components/HowItWorks';

// Three.js deferred — biggest TBT culprit, loaded after hero is interactive
const ThreeHeroCanvas = lazy(() => import('./components/ThreeHeroCanvas'));

// Below-fold sections — lazy parsed, don't block initial render
const FeaturesStack  = lazy(() => import('./components/FeaturesStack'));
const BentoGrid      = lazy(() => import('./components/BentoGrid'));
const StatsBand      = lazy(() => import('./components/StatsBand'));
const TestimonialsGrid = lazy(() => import('./components/TestimonialsGrid'));
const FaqSection     = lazy(() => import('./components/FaqSection'));
const DownloadCTA    = lazy(() => import('./components/DownloadCTA'));
const EditorialFooter = lazy(() => import('./components/EditorialFooter'));

import { useState } from 'react';

export default function App() {
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    // LazyMotion: loads only domAnimation subset (~80KB vs ~120KB full bundle)
    <LazyMotion features={domAnimation}>
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        <Navbar onOpenQrModal={() => setShowQrModal(true)} />

        <main style={{ position: 'relative' }}>
          {/* Three.js canvas loads silently after hero — null fallback keeps layout stable */}
          <Suspense fallback={null}>
            <ThreeHeroCanvas />
          </Suspense>

          {/* Hero and SocialProof are above fold — loaded eagerly */}
          <Hero onOpenQrModal={() => setShowQrModal(true)} />
          <SocialProof />
          <HowItWorks />

          {/* Below-fold sections load progressively as user scrolls */}
          <Suspense fallback={null}>
            <FeaturesStack />
          </Suspense>

          <Suspense fallback={null}>
            <BentoGrid />
          </Suspense>

          <Suspense fallback={null}>
            <StatsBand />
          </Suspense>

          <Suspense fallback={null}>
            <TestimonialsGrid />
          </Suspense>

          <Suspense fallback={null}>
            <FaqSection />
          </Suspense>

          <Suspense fallback={null}>
            <DownloadCTA
              showModal={showQrModal}
              onCloseModal={() => setShowQrModal(false)}
            />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <EditorialFooter onOpenQrModal={() => setShowQrModal(true)} />
        </Suspense>
      </div>
    </LazyMotion>
  );
}
