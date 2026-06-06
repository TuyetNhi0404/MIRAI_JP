export const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translate3d(0, 8px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translate3d(0, -8px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translate3d(20px, 0, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translate3d(-20px, 0, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes pulse {
    0%   { opacity: 1; }
    50%  { opacity: 0.5; }
    100% { opacity: 1; }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }

  @keyframes ringPulse {
    0%   { box-shadow: 0 0 0 0 rgba(185, 0, 0, 0.35); }
    70%  { box-shadow: 0 0 0 8px rgba(185, 0, 0, 0); }
    100% { box-shadow: 0 0 0 0 rgba(185, 0, 0, 0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .mira-fade-in {
    animation: fadeIn 320ms ease-out both;
  }

  .mira-fade-in-up {
    animation: fadeInUp 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-fade-in-down {
    animation: fadeInDown 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-slide-in-right {
    animation: slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-slide-in-left {
    animation: slideInLeft 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-scale-in {
    animation: scaleIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-float {
    animation: float 3s ease-in-out infinite;
  }

  .mira-ring-pulse {
    animation: ringPulse 1.8s ease-out infinite;
  }

  .mira-shimmer {
    background: linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%);
    background-size: 200% 100%;
    animation: shimmer 1.4s linear infinite;
  }

  .mira-stagger > * {
    animation: fadeInUp 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-stagger > *:nth-child(1)  { animation-delay: 0ms; }
  .mira-stagger > *:nth-child(2)  { animation-delay: 50ms; }
  .mira-stagger > *:nth-child(3)  { animation-delay: 100ms; }
  .mira-stagger > *:nth-child(4)  { animation-delay: 150ms; }
  .mira-stagger > *:nth-child(5)  { animation-delay: 200ms; }
  .mira-stagger > *:nth-child(6)  { animation-delay: 250ms; }
  .mira-stagger > *:nth-child(7)  { animation-delay: 300ms; }
  .mira-stagger > *:nth-child(8)  { animation-delay: 350ms; }
  .mira-stagger > *:nth-child(9)  { animation-delay: 400ms; }
  .mira-stagger > *:nth-child(10) { animation-delay: 450ms; }
  .mira-stagger > *:nth-child(11) { animation-delay: 500ms; }
  .mira-stagger > *:nth-child(12) { animation-delay: 550ms; }
  .mira-stagger > *:nth-child(n+13) { animation-delay: 600ms; }

  .mira-card-hover {
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 220ms ease,
                border-color 220ms ease;
  }

  .mira-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  }

  .mira-button-hover {
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 180ms ease,
                background-color 180ms ease;
  }

  .mira-button-hover:hover {
    transform: translateY(-1px);
  }

  .mira-button-hover:active {
    transform: translateY(0) scale(0.98);
  }

  .mira-link {
    position: relative;
    transition: color 200ms ease;
  }

  .mira-link::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -2px;
    width: 100%;
    height: 1.5px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: right center;
    transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mira-link:hover::after {
    transform: scaleX(1);
    transform-origin: left center;
  }

  .mira-tilt {
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mira-tilt:hover {
    transform: perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-2px);
  }

  .mira-press {
    transition: transform 120ms ease;
  }

  .mira-press:active {
    transform: scale(0.97);
  }

  .mira-row-hover {
    transition: background-color 200ms ease;
  }

  .mira-row-hover:hover {
    background-color: rgba(185, 0, 0, 0.04) !important;
  }

  .mira-row-hover > td {
    transition: background-color 200ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 4px;
    transition: background 200ms ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #bfbfbf;
  }

  ::selection {
    background: rgba(185, 0, 0, 0.15);
    color: #B90000;
  }
`;
