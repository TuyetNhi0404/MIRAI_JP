
import React from 'react';
import type { KanaType } from '../../types/kanaData';

interface KanaSelectorProps {
  selectedType: KanaType;
  onSelect: (type: KanaType) => void;
}

const KanaSelector: React.FC<KanaSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
      <div style={{
        display: 'flex',
        gap: '16px',
        background: '#f5f5f5',
        borderRadius: '16px',
        padding: '6px',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)',
      }}>
        {(['hiragana', 'katakana'] as KanaType[]).map((type) => {
          const isActive = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              style={{
                padding: '12px 40px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                background: isActive
                  ? 'linear-gradient(135deg, #B90000 0%, #E53935 100%)'
                  : 'transparent',
                color: isActive ? '#fff' : '#888',
                boxShadow: isActive
                  ? '0 4px 16px rgba(185, 0, 0, 0.4)'
                  : 'none',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '2px' }}>
                {type === 'hiragana' ? 'あ' : 'ア'}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {type === 'hiragana' ? 'Hiragana' : 'Katakana'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KanaSelector;
