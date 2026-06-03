
import React from 'react';
import type { KanaChar } from '../../types/kanaData';
import { groupLabels } from '../../types/kanaData';
import KanaCard from './KanaCard';

interface KanaGridProps {
  chars: KanaChar[];
  selectedChar: KanaChar | null;
  onSelect: (char: KanaChar) => void;
}

const KanaGrid: React.FC<KanaGridProps> = ({ chars, selectedChar, onSelect }) => {
  
  const grouped: Record<string, KanaChar[]> = {};
  chars.forEach((c) => {
    if (!grouped[c.group]) grouped[c.group] = [];
    grouped[c.group].push(c);
  });

  const groupOrder = ['vowel', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'special', 'g', 'z', 'd', 'b', 'p', 'yoon'];

  return (
    <div style={{ width: '100%' }}>
      {groupOrder.map((groupKey) => {
        const groupChars = grouped[groupKey];
        if (!groupChars || groupChars.length === 0) return null;

        return (
          <div key={groupKey} style={{ marginBottom: '32px' }}>
            {/* Group label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '12px',
            }}>
              <div style={{
                width: '6px',
                height: '24px',
                background: 'linear-gradient(180deg, #B90000, #E53935)',
                borderRadius: '3px',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#1a1a2e',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
              }}>
                {groupLabels[groupKey] || groupKey}
              </span>
              <div style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, #eeeeee, transparent)',
              }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '12px',
            }}>
              {groupChars.map((char) => (
                <KanaCard
                  key={char.kana}
                  char={char}
                  onClick={onSelect}
                  isSelected={selectedChar?.kana === char.kana}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanaGrid;
