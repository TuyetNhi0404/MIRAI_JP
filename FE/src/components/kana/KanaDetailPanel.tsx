
import React from 'react';
import type { KanaChar } from '../../types/kanaData';
import { strokeInstructions } from '../../types/kanaData';
import KanaWritingCanvas from './KanaWritingCanvas';

interface KanaDetailPanelProps {
  selectedChar: KanaChar | null;
  kanaType: 'hiragana' | 'katakana';
}

const KanaDetailPanel: React.FC<KanaDetailPanelProps> = ({ selectedChar, kanaType }) => {
  if (!selectedChar) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '20px',
        color: '#aaa',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
    
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #f5f5f5, #ececec)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '3.5rem', opacity: 0.3, fontFamily: '"Noto Serif JP", serif' }}>
            {kanaType === 'hiragana' ? 'あ' : 'ア'}
          </span>
        </div>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#bbb', marginBottom: '6px' }}>
            Chọn một chữ cái
          </p>
          <p style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: '220px', lineHeight: 1.6 }}>
            Click vào bất kỳ ký tự nào bên trái để xem cách viết và luyện tập
          </p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.04); }
          }
        `}</style>
      </div>
    );
  }

  const instructions = strokeInstructions[selectedChar.kana] || [];

  const playPronunciation = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to prevent the speech queue from getting stuck in Chrome/Edge
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(selectedChar.kana);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      
      // Explicitly find and assign a Japanese voice if available
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang.toLowerCase() === 'ja-jp' || v.lang.toLowerCase().startsWith('ja-'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis is not supported in this browser.');
    }
  };

  return (
    <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Character header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)',
        borderRadius: '16px',
        padding: '16px 20px',
        border: '1.5px solid #f5d0d0',
        boxShadow: '0 4px 16px rgba(185,0,0,0.07)',
      }}>
      
        <div 
          onClick={playPronunciation}
          style={{
            width: selectedChar.kana.length > 1 ? 'auto' : '80px',
            minWidth: '80px',
            height: '80px',
            padding: selectedChar.kana.length > 1 ? '0 12px' : '0',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #B90000, #E53935)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(185,0,0,0.3)',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'transform 0.2s',
            position: 'relative',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{
            fontSize: selectedChar.kana.length > 1 ? '2.2rem' : '2.8rem',
            color: '#fff',
            fontFamily: '"Noto Serif JP", serif',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
            {selectedChar.kana}
          </span>
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            fontSize: '0.8rem',
          }}>🔊</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#1a1a2e',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              {selectedChar.romaji}
            </span>
            <button
              onClick={playPronunciation}
              style={{
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#B90000',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ffe8e8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff5f5')}
              title="Nghe phát âm"
            >
              🔊
            </button>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
          }}>
            <span style={{
              fontSize: '0.75rem',
              background: '#fef2f2',
              color: '#B90000',
              borderRadius: '20px',
              padding: '2px 10px',
              fontWeight: 600,
              border: '1px solid #fecaca',
            }}>
              {kanaType === 'hiragana' ? 'Hiragana' : 'Katakana'}
            </span>
            <div style={{ height: '4px', width: '4px', borderRadius: '50%', background: '#ccc' }} />
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 500 }}>
              {selectedChar.strokes} nét viết
            </span>
          </div>
        </div>
      </div>

    
      {instructions.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '16px',
          border: '1.5px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '4px',
              height: '18px',
              background: 'linear-gradient(180deg, #B90000, #E53935)',
              borderRadius: '2px',
            }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#444', letterSpacing: '0.5px' }}>
              Hướng dẫn nét bút
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {instructions.map((inst, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: `hsl(${idx * 40}, 70%, 50%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.5 }}>
                  {inst}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

   
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '16px',
        border: '1.5px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}>
          <div style={{
            width: '4px',
            height: '18px',
            background: 'linear-gradient(180deg, #B90000, #E53935)',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#444', letterSpacing: '0.5px' }}>
            ✏️ Luyện viết
          </span>
          <span style={{ fontSize: '0.75rem', color: '#aaa', marginLeft: 'auto' }}>
            Rê chuột để vẽ
          </span>
        </div>
        <KanaWritingCanvas guidanceChar={selectedChar.kana} />
      </div>
    </div>
  );
};

export default KanaDetailPanel;
