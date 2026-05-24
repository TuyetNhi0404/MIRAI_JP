import React, { useRef, useEffect, useState, useCallback } from 'react';
import kanaStrokesData from '../../data/kanaStrokes.json';
import { matchStroke } from '../../utils/strokeMatching';
import type { StrokeTransform } from '../../utils/strokeMatching';

interface Point {
  x: number;
  y: number;
}

interface PathData {
  points: Point[];
  color: string;
}

export interface StrokeInfo {
  pathStr: string;
  transform: StrokeTransform;
}

const kanaStrokes: Record<string, string[]> = kanaStrokesData as any;

const getStandardStrokes = (charStr: string): StrokeInfo[] => {
  if (charStr.length === 1) {
    const strokes = kanaStrokes[charStr[0]] || [];
    return strokes.map(s => ({ pathStr: s, transform: { scale: 1, offsetX: 0, offsetY: 0 } }));
  } else if (charStr.length === 2) {
    const strokes1 = kanaStrokes[charStr[0]] || [];
    const strokes2 = kanaStrokes[charStr[1]] || [];
 
    const t1 = { scale: 0.55, offsetX: 6, offsetY: 24 };
    const t2 = { scale: 0.55, offsetX: 52, offsetY: 36 };
    return [
      ...strokes1.map(s => ({ pathStr: s, transform: t1 })),
      ...strokes2.map(s => ({ pathStr: s, transform: t2 }))
    ];
  }
  return [];
};

interface KanaWritingCanvasProps {
  guidanceChar: string;
}

const KanaWritingCanvas: React.FC<KanaWritingCanvasProps> = ({ guidanceChar }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [feedback, setFeedback] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const currentPath = useRef<Point[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const styleId = 'kana-canvas-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0); }
          90% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);


  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

 
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);


    ctx.strokeStyle = 'rgba(185, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    
    
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    
    
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

  
    const standardStrokes = getStandardStrokes(guidanceChar);

    if (standardStrokes && standardStrokes.length > 0) {
      const scaleX = w / 109;
      const scaleY = h / 109;
      
      standardStrokes.forEach(strokeInfo => {
        ctx.save();
        ctx.scale(scaleX, scaleY);
      
        ctx.translate(strokeInfo.transform.offsetX, strokeInfo.transform.offsetY);
        ctx.scale(strokeInfo.transform.scale, strokeInfo.transform.scale);
        
        ctx.strokeStyle = 'rgba(185, 0, 0, 0.06)';
       
        ctx.lineWidth = 16 / strokeInfo.transform.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const p = new Path2D(strokeInfo.pathStr);
        ctx.stroke(p);
        ctx.restore();
      });
    } else {
      const fontSize = guidanceChar.length > 1 ? w * 0.45 : w * 0.65;
      ctx.font = `bold ${fontSize}px "Noto Serif JP", serif`;
      ctx.fillStyle = 'rgba(185, 0, 0, 0.05)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(guidanceChar, w / 2, h / 2 + w * 0.04);
    }
  }, [guidanceChar]);


  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;

    drawBackground(ctx, w, h);

  
    paths.forEach((pathData, idx) => {
      const { points: path, color } = pathData;
      if (path.length < 2) return;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      
      const start = path[0];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), start.x, start.y);
    });

  
    const cp = currentPath.current;
    if (isDrawing && cp.length > 1) {
      ctx.strokeStyle = '#B90000';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cp[0].x, cp[0].y);
      for (let i = 1; i < cp.length; i++) {
        ctx.lineTo(cp[i].x, cp[i].y);
      }
      ctx.stroke();
    }
  }, [paths, drawBackground, isDrawing]);

 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, canvas.width, canvas.height);
    

    setPaths([]);
    setFeedback(null);
    currentPath.current = [];

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [guidanceChar, drawBackground]);

 
  useEffect(() => {
    redraw();
  }, [paths, redraw]);

 
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || (e as any).changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    currentPath.current = [pos];
    redraw();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    currentPath.current.push(pos);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => redraw());
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const finishedPath = [...currentPath.current];
    currentPath.current = [];
    
    if (finishedPath.length > 1) {
    
      const standardStrokes = getStandardStrokes(guidanceChar);
      
      if (!standardStrokes || standardStrokes.length === 0) {
    
        setPaths(prev => [...prev, { points: finishedPath, color: '#4CAF50' }]);
        return;
      }

      const expectedStrokeIdx = paths.filter(p => p.color === '#4CAF50').length;
      
      if (expectedStrokeIdx >= standardStrokes.length) {
        setFeedback({ msg: 'Bạn đã vẽ xong chữ này rồi!', type: 'success' });
        return;
      }

      const strokeInfo = standardStrokes[expectedStrokeIdx];
      const canvas = canvasRef.current!;
      
      const matchResult = matchStroke(
        finishedPath, 
        strokeInfo.pathStr, 
        canvas.width, 
        canvas.height,
        strokeInfo.transform
      );

      if (matchResult.isCorrect) {
        setPaths(prev => [...prev, { points: finishedPath, color: '#4CAF50' }]); 
        if (expectedStrokeIdx + 1 === standardStrokes.length) {
          setFeedback({ msg: 'Tuyệt vời! Bạn đã vẽ đúng chữ.', type: 'success' });
        }
      } else {
        if (matchResult.isReversed) {
          setFeedback({ msg: 'Sai chiều! Hãy vẽ lại đúng chiều mũi tên.', type: 'error' });
        } else {
          setFeedback({ msg: 'Nét chưa chuẩn hoặc sai thứ tự!', type: 'error' });
        }
        
       
        const tempPath = { points: finishedPath, color: '#f44336' };
        setPaths(prev => [...prev, tempPath]);
        setTimeout(() => {
          setPaths(prev => prev.filter(p => p !== tempPath));
        }, 600);
      }
    }
  };

  const clearCanvas = () => {
    currentPath.current = [];
    setPaths([]);
    setFeedback(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      {/* Canvas Container */}
      <div style={{ 
        position: 'relative', 
        display: 'inline-block',
        padding: '8px',
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
        border: '1.5px solid #f0f0f0'
      }}>
        <canvas
          ref={canvasRef}
          width={350}
          height={350}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            cursor: 'crosshair',
            borderRadius: '16px',
            background: '#fff',
            touchAction: 'none',
            display: 'block',
            maxWidth: '100%',
          }}
        />

        {/* Drawing hint or Feedback */}
        {feedback ? (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: feedback.type === 'error' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(16, 185, 129, 0.9)',
            color: '#fff',
            borderRadius: '30px',
            padding: '6px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeInOut 0.3s ease-out'
          }}>
            {feedback.msg}
          </div>
        ) : paths.length === 0 && !isDrawing && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(26, 26, 46, 0.8)',
            color: '#fff',
            borderRadius: '30px',
            padding: '6px 20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
          }}>
            ✍️ Bắt đầu vẽ tại đây
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={clearCanvas}
          style={{
            padding: '12px 28px',
            borderRadius: '14px',
            border: 'none',
            background: '#f5f5f5',
            color: '#555',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#eeeeee')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#f5f5f5')}
        >
          🗑️ Xóa hết
        </button>

        <button
          onClick={() => {
            if (paths.length > 0) {
              setPaths(prev => prev.slice(0, -1));
            }
          }}
          disabled={paths.length === 0}
          style={{
            padding: '12px 28px',
            borderRadius: '14px',
            background: paths.length === 0 ? '#f9f9f9' : '#fff5f5',
            color: paths.length === 0 ? '#ccc' : '#B90000',
            cursor: paths.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
            border: paths.length === 0 ? '1px solid transparent' : '1px solid #fecaca',
          }}
        >
          ↩ Hoàn tác
        </button>
      </div>
      
      <div style={{
        fontSize: '0.85rem',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>Số nét đã vẽ:</span>
        <strong style={{ color: '#B90000', fontSize: '1rem' }}>{paths.length}</strong>
      </div>
    </div>
  );
};

export default KanaWritingCanvas;
