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

  .mira-fade-in {
    animation: fadeIn 320ms ease-out both;
  }

  .mira-fade-in-up {
    animation: fadeInUp 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-scale-in {
    animation: scaleIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-stagger > * {
    animation: fadeInUp 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mira-stagger > *:nth-child(1) { animation-delay: 0ms; }
  .mira-stagger > *:nth-child(2) { animation-delay: 50ms; }
  .mira-stagger > *:nth-child(3) { animation-delay: 100ms; }
  .mira-stagger > *:nth-child(4) { animation-delay: 150ms; }
  .mira-stagger > *:nth-child(5) { animation-delay: 200ms; }
  .mira-stagger > *:nth-child(6) { animation-delay: 250ms; }
  .mira-stagger > *:nth-child(7) { animation-delay: 300ms; }
  .mira-stagger > *:nth-child(8) { animation-delay: 350ms; }
  .mira-stagger > *:nth-child(9) { animation-delay: 400ms; }
  .mira-stagger > *:nth-child(10) { animation-delay: 450ms; }
  .mira-stagger > *:nth-child(n+11) { animation-delay: 500ms; }

  .mira-card-hover {
    transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  }

  .mira-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  }

  .mira-button-hover {
    transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }

  .mira-button-hover:hover {
    transform: translateY(-1px);
  }

  .mira-button-hover:active {
    transform: translateY(0) scale(0.98);
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
`;
