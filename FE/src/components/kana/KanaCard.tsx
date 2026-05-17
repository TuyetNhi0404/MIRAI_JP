// src/components/kana/KanaCard.tsx
import React from 'react';
import type { KanaChar } from './kanaData';

interface KanaCardProps {
  char: KanaChar;
  onClick: (char: KanaChar) => void;
  isSelected?: boolean;
}

const KanaCard: React.FC<KanaCardProps> = ({ char, onClick, isSelected }) => {
  return (
    <div
      onClick={() => onClick(char)}
      title={char.romaji.toUpperCase()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '14px 10px',
        borderRadius: '16px',
        border: isSelected
          ? '2.5px solid #B90000'
          : '2px solid transparent',
        background: isSelected
          ? 'linear-gradient(145deg, #fff5f5, #ffe8e8)'
          : '#fff',
        boxShadow: isSelected
          ? '0 6px 20px rgba(185, 0, 0, 0.2)'
          : '0 2px 10px rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        minWidth: '65px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          const target = e.currentTarget as HTMLDivElement;
          target.style.transform = 'translateY(-5px) scale(1.05)';
          target.style.boxShadow = '0 10px 25px rgba(185, 0, 0, 0.15)';
          target.style.borderColor = '#ffaaaa';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          const target = e.currentTarget as HTMLDivElement;
          target.style.transform = 'translateY(0) scale(1)';
          target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
          target.style.borderColor = 'transparent';
        }
      }}
    >
      {/* Decorative background circle for selected state */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(185, 0, 0, 0.05)',
          zIndex: 0,
        }} />
      )}

      <span style={{
        fontSize: '2.2rem',
        fontWeight: 400,
        color: isSelected ? '#B90000' : '#1a1a2e',
        lineHeight: 1.1,
        transition: 'color 0.2s',
        fontFamily: '"Noto Serif JP", serif',
        zIndex: 1,
      }}>
        {char.kana}
      </span>

      <span style={{
        fontSize: '0.75rem',
        color: isSelected ? '#B90000' : '#888',
        fontWeight: 700,
        marginTop: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        transition: 'color 0.2s',
        zIndex: 1,
      }}>
        {char.romaji}
      </span>
    </div>
  );
};

export default KanaCard;
