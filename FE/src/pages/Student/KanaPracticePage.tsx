// src/pages/Student/KanaPracticePage.tsx
import React, { useState } from 'react';
import type { KanaChar, KanaType } from '../../components/kana/kanaData';
import { getKanaData } from '../../components/kana/kanaData';
import KanaSelector from '../../components/kana/KanaSelector';
import KanaGrid from '../../components/kana/KanaGrid';
import KanaDetailPanel from '../../components/kana/KanaDetailPanel';

const KanaPracticePage: React.FC = () => {
  const [kanaType, setKanaType] = useState<KanaType>('hiragana');
  const [selectedChar, setSelectedChar] = useState<KanaChar | null>(null);

  const chars = getKanaData(kanaType);

  const handleTypeChange = (type: KanaType) => {
    setKanaType(type);
    setSelectedChar(null); // Reset selection when switching type
  };

  const handleCharSelect = (char: KanaChar) => {
    setSelectedChar((prev) => (prev?.kana === char.kana ? null : char));
  };

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(160deg, #fff8f8 0%, #ffffff 40%, #f8f8ff 100%)',
      fontFamily: '"Inter", "Noto Serif JP", sans-serif',
    }}>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Page Header */}
      <div style={{
        padding: '28px 32px 20px',
        borderBottom: '1.5px solid #f5e8e8',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 12px rgba(185,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #B90000, #E53935)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(185,0,0,0.3)',
            }}>
              <span style={{ fontSize: '1.3rem', color: '#fff' }}>✍️</span>
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1a1a2e',
                lineHeight: 1.2,
              }}>
                Luyện viết bảng chữ cái
              </h1>
              <p style={{
                margin: 0,
                fontSize: '0.82rem',
                color: '#888',
                marginTop: '2px',
              }}>
                Học cách viết Hiragana và Katakana — chọn chữ cái và luyện tập ngay
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Type selector */}
      <div style={{
        padding: '24px 32px 0',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <KanaSelector selectedType={kanaType} onSelect={handleTypeChange} />
      </div>

      {/* Main content: 2-panel layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 32px 32px',
        display: 'grid',
        gridTemplateColumns: selectedChar ? '1fr 380px' : '1fr',
        gap: '24px',
        transition: 'grid-template-columns 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)',
        alignItems: 'start',
      }}>
        {/* Left panel: character grid */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          border: '1.5px solid #f5f5f5',
          minHeight: '500px',
        }}>
          {/* Stats row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '4px',
                height: '22px',
                background: 'linear-gradient(180deg, #B90000, #E53935)',
                borderRadius: '2px',
              }} />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>
                {kanaType === 'hiragana' ? 'Hiragana' : 'Katakana'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                background: '#fff5f5',
                border: '1.5px solid #fecaca',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '0.78rem',
                color: '#B90000',
                fontWeight: 700,
              }}>
                {chars.length} ký tự
              </div>
              {selectedChar && (
                <button
                  onClick={() => setSelectedChar(null)}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #ddd',
                    borderRadius: '20px',
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    color: '#888',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#B90000';
                    (e.currentTarget as HTMLButtonElement).style.color = '#B90000';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#ddd';
                    (e.currentTarget as HTMLButtonElement).style.color = '#888';
                  }}
                >
                  ✕ Bỏ chọn
                </button>
              )}
            </div>
          </div>

          <KanaGrid
            chars={chars}
            selectedChar={selectedChar}
            onSelect={handleCharSelect}
          />
        </div>

        {/* Right panel: detail & writing canvas */}
        {selectedChar && (
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              border: '1.5px solid #f5f5f5',
              position: 'sticky',
              top: '120px',
              maxHeight: 'calc(100vh - 140px)',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#fecaca transparent',
              animation: 'slideIn 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
            }}
          >
            <KanaDetailPanel selectedChar={selectedChar} kanaType={kanaType} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #fecaca;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #f87171;
        }
      `}</style>
    </div>
  );
};

export default KanaPracticePage;
