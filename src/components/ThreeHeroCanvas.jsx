import React from 'react';

export default function ThreeHeroCanvas() {
  return (
    <div
      className="hero-ambient-canvas-wrapper"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      {/* GPU-accelerated CSS ambient glowing glass particles */}
      <div className="ambient-glass-blob blob-cyan" />
      <div className="ambient-glass-blob blob-sky" />
    </div>
  );
}
