/* ══════════════════════════════════════════════════════════════════
   EVERYWARE WEBSITE — MASTER FLUID JAVASCRIPT
   Handles: Fluid liquid-glass navbar with gliding indicator,
            Scroll reveals, AI Copilot, Live ETA, FAQ 2-col tabs, Modal
   ══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. FLUID LIQUID GLASS NAVBAR & GLIDING INDICATOR ───
  const navbar = document.getElementById('mainNavbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const navIndicator = document.getElementById('navIndicatorPill');

  function updateIndicator(targetLink) {
    if (!targetLink || !navIndicator) return;
    const parentRect = targetLink.parentElement.parentElement.getBoundingClientRect();
    const linkRect = targetLink.getBoundingClientRect();

    navIndicator.style.left = `${linkRect.left - parentRect.left}px`;
    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.opacity = '1';
  }

  // Set initial indicator position
  const activeNav = document.querySelector('.nav-link.active') || navLinks[0];
  if (activeNav) {
    setTimeout(() => updateIndicator(activeNav), 200);
  }

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => updateIndicator(link));
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      updateIndicator(link);
    });
  });

  const navMenu = document.querySelector('.nav-menu-wrapper');
  if (navMenu) {
    navMenu.addEventListener('mouseleave', () => {
      const currentActive = document.querySelector('.nav-link.active');
      if (currentActive) updateIndicator(currentActive);
    });
  }

  // Scroll Morphing Navbar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // ─── 2. SCROLL REVEAL INTERSECTION OBSERVER ───
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => revealObserver.observe(el));

  // ─── 3. MOBILE DRAWER ───
  const mobileToggleBtn = document.getElementById('mobileToggleBtn');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');

  function toggleMobileMenu() {
    mobileNavOverlay.classList.toggle('active');
    mobileNavDrawer.classList.toggle('active');
  }

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', toggleMobileMenu);
    mobileNavOverlay.addEventListener('click', toggleMobileMenu);
  }

  // ─── 4. AI COPILOT INTERACTIVE SIMULATOR ───
  const chatMessages = document.getElementById('chatMessages');
  const chipBtns = document.querySelectorAll('.chip-btn');

  const aiKnowledge = {
    "AC not cooling": "I understand the issue! For AC cooling loss, the top 3 causes are: 1. Dust clogged filter, 2. Refrigerant gas leak, 3. Compressor capacitor. Would you like me to book a verified AC technician for an inspection?",
    "Washing machine noise": "A loud thumping noise during spin cycle usually indicates an unbalanced load, worn drum bearings, or broken shock absorbers. Our technician can replace genuine spare parts within 60 mins.",
    "Fridge leaking water": "Water leaking under your refrigerator is commonly caused by a blocked defrost drain or cracked water inlet valve. We have verified experts ready in your area!",
    "Microwave not heating": "If the microwave runs but doesn't heat food, the high-voltage magnetron or diode may need replacement. Safety first — let our certified specialist handle it!"
  };

  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      const userText = chip.textContent.replace(/['"✨]/g, '').trim();
      appendMessage(userText, 'user');

      setTimeout(() => {
        const botText = aiKnowledge[userText] || "I've logged this issue in your EveryWare Appliance Health history. Let me connect you to a verified technician right away!";
        appendMessage(botText, 'bot');
      }, 400);
    });
  });

  function appendMessage(text, sender) {
    if (!chatMessages) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ─── 5. LIVE ETA COUNTER ───
  const etaMinutesElem = document.getElementById('etaMinutes');
  let currentETA = 14;

  if (etaMinutesElem) {
    setInterval(() => {
      if (currentETA > 4) {
        currentETA -= 1;
        etaMinutesElem.textContent = `${currentETA} mins`;
      } else {
        currentETA = 18;
        etaMinutesElem.textContent = `${currentETA} mins`;
      }
    }, 7000);
  }

  // ─── 6. FAQ 2-COLUMN TAB SWITCHER (SCREENSHOT 2 MATCH) ───
  const faqTabs = document.querySelectorAll('.faq-tab-item');
  const faqTitleElem = document.getElementById('faqDetailTitle');
  const faqBodyElem = document.getElementById('faqDetailBody');
  const faqArtworkElem = document.getElementById('faqArtworkBox');

  const faqData = {
    "what-is-platform": {
      title: "What is EveryWare about?",
      body: "EveryWare is your smart home service platform powered by Fixolutions. We connect you directly with background-verified appliance technicians, provide live GPS tracking, AI Copilot troubleshooting, and complete appliance health scoring.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#EBF3F5"/><circle cx="100" cy="60" r="40" stroke="#00C4CC" stroke-width="4" stroke-dasharray="6 6"/><circle cx="100" cy="60" r="16" fill="#081B1E"/><path d="M92 60L108 60M100 52L100 68" stroke="#FFFFFF" stroke-width="3"/></svg>`
    },
    "how-to-start": {
      title: "How do I get started?",
      body: "Simply browse through our various sections. If you have a specific question, use our AI Assistant or download the mobile app on iOS & Android.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#F0F9FF"/><rect x="60" y="20" width="80" height="80" rx="16" fill="#081B1E"/><circle cx="100" cy="50" r="12" fill="#38BDF8"/><path d="M80 80h40" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    "is-mobile-responsive": {
      title: "Is it mobile responsive & easy to use?",
      body: "Yes! EveryWare is built mobile-first. Whether you land on our website during an urgent appliance breakdown or use our mobile app, the interface is optimized for single-tap actions.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#ECFDF5"/><rect x="75" y="15" width="50" height="90" rx="12" fill="#10B981"/><rect x="80" y="25" width="40" height="70" rx="6" fill="#FFFFFF"/></svg>`
    },
    "verified-technicians": {
      title: "Are technicians background verified?",
      body: "100% verified! Every technician on EveryWare passes rigorous background checks, police verification, identity confirmation, and certified hands-on technical skill audits.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#EFF6FF"/><path d="M100 25L130 40v30c0 20-30 35-30 35s-30-15-30-35V40l30-15z" fill="#2563EB"/><path d="M90 55l8 8 16-16" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    "transparent-pricing": {
      title: "How does transparent pricing work?",
      body: "You receive a complete rate breakdown upfront before any repair work begins. No hidden call-out fees, surge pricing, or surprise invoices after completion.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#FEF3C7"/><circle cx="100" cy="60" r="30" fill="#F59E0B"/><text x="100" y="68" font-size="24" font-weight="bold" fill="#FFF" text-anchor="middle">$</text></svg>`
    },
    "service-guarantee": {
      title: "What is the 90-day guarantee?",
      body: "Every repair completed through EveryWare comes with an assured 90-day service warranty covering both technician labor and installed genuine manufacturer spare parts.",
      artwork: `<svg viewBox="0 0 200 120" width="100%" height="100%" fill="none"><rect width="200" height="120" fill="#F3E8FF"/><circle cx="100" cy="60" r="32" fill="#9333EA"/><path d="M92 60l6 6 12-12" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`
    }
  };

  faqTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      faqTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const key = tab.getAttribute('data-faq-key');
      const data = faqData[key];

      if (data && faqTitleElem && faqBodyElem && faqArtworkElem) {
        faqTitleElem.textContent = data.title;
        faqBodyElem.textContent = data.body;
        faqArtworkElem.innerHTML = data.artwork;
      }
    });
  });

  // ─── 7. QR CODE MODAL ───
  const qrModal = document.getElementById('qrModal');
  const openQrBtns = document.querySelectorAll('.open-qr-modal');
  const closeQrBtn = document.getElementById('closeQrBtn');

  openQrBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (qrModal) qrModal.classList.add('active');
    });
  });

  if (closeQrBtn) {
    closeQrBtn.addEventListener('click', () => {
      if (qrModal) qrModal.classList.remove('active');
    });
  }

  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.remove('active');
      }
    });
  }
});
