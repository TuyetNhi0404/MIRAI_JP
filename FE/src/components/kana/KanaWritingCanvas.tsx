// src/components/kana/KanaWritingCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface KanaWritingCanvasProps {
  guidanceChar: string;
}

const KanaWritingCanvas: React.FC<KanaWritingCanvasProps> = ({ guidanceChar }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Point[][]>([]);
  const currentPath = useRef<Point[]>([]);
  const animationRef = useRef<number | null>(null);

  // Draw grid lines and ghost character
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (cross)
    ctx.strokeStyle = 'rgba(185, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    
    // Vertical center
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    
    // Horizontal center
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ghost character (guidance)
    ctx.font = `bold ${w * 0.65}px "Noto Serif JP", serif`;
    ctx.fillStyle = 'rgba(185, 0, 0, 0.05)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guidanceChar, w / 2, h / 2 + w * 0.04);
  }, [guidanceChar]);

  // Redraw all strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;

    drawBackground(ctx, w, h);

    // Draw all saved strokes
    paths.forEach((path, idx) => {
      if (path.length < 2) return;
      const hue = (idx * 50) % 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 40%)`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      // Draw stroke number badge at start
      const start = path[0];
      ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), start.x, start.y);
    });

    // Draw current live path
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

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, canvas.width, canvas.height);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [guidanceChar, drawBackground]);

  // Redraw when paths change
  useEffect(() => {
    redraw();
  }, [paths, redraw]);

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
    
    // Fix: Capture path before clearing currentPath.current
    const finishedPath = [...currentPath.current];
    if (finishedPath.length > 1) {
      setPaths(prev => [...prev, finishedPath]);
    }
    currentPath.current = [];
  };

  const clearCanvas = () => {
    currentPath.current = [];
    setPaths([]);
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

        {/* Drawing hint */}
        {paths.length === 0 && !isDrawing && (
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
