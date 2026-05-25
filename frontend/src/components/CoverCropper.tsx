import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Check, Move } from 'lucide-react';

interface CoverCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

const CONTAINER_W = 280;
const CONTAINER_H = Math.round((CONTAINER_W * 4) / 3); // ~373, 3:4 ratio

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function CoverCropper({ imageSrc, onCrop, onCancel }: CoverCropperProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const minScale =
    naturalSize.w > 0
      ? Math.max(CONTAINER_W / naturalSize.w, CONTAINER_H / naturalSize.h)
      : 1;

  // Initialize scale when image loads
  useEffect(() => {
    if (naturalSize.w > 0 && !isLoading) {
      const s = Math.max(CONTAINER_W / naturalSize.w, CONTAINER_H / naturalSize.h);
      setScale(s);
      setOffset({ x: 0, y: 0 });
    }
  }, [naturalSize.w, naturalSize.h, isLoading]);

  // Clamp offset when scale changes
  const clampOffset = useCallback(
    (newScale: number, ox: number, oy: number) => {
      const displayW = naturalSize.w * newScale;
      const displayH = naturalSize.h * newScale;
      const maxOffsetX = Math.max(0, (displayW - CONTAINER_W) / 2);
      const maxOffsetY = Math.max(0, (displayH - CONTAINER_H) / 2);
      return {
        x: clamp(ox, -maxOffsetX, maxOffsetX),
        y: clamp(oy, -maxOffsetY, maxOffsetY),
      };
    },
    [naturalSize.w, naturalSize.h]
  );

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    setOffset((prev) => clampOffset(newScale, prev.x, prev.y));
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const clamped = clampOffset(scale, dragStart.offsetX + dx, dragStart.offsetY + dy);
      setOffset(clamped);
    },
    [isDragging, dragStart, scale, clampOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    });
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      const clamped = clampOffset(scale, dragStart.offsetX + dx, dragStart.offsetY + dy);
      setOffset(clamped);
    },
    [isDragging, dragStart, scale, clampOffset]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach global mouse/touch listeners while dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newScale = clamp(scale + delta, minScale, minScale * 3);
    handleScaleChange(newScale);
  };

  // Crop with canvas
  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CONTAINER_W;
    canvas.height = CONTAINER_H;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current || naturalSize.w === 0) return;

    const img = imgRef.current;
    const displayW = naturalSize.w * scale;
    const displayH = naturalSize.h * scale;
    const drawX = (CONTAINER_W - displayW) / 2 + offset.x;
    const drawY = (CONTAINER_H - displayH) / 2 + offset.y;

    // Fill with black background in case of gaps
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, drawX, drawY, displayW, displayH);

    // Convert to data URL (JPEG for smaller size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Move size={18} className="text-accent" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              调整封面区域
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            aria-label="取消裁剪"
          >
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          拖动图片调整位置，使用滑块缩放
        </p>

        {/* Crop area */}
        <div
          ref={containerRef}
          className={`relative overflow-hidden rounded-lg mx-auto bg-black/10 ring-1 ring-black/10 dark:ring-white/10 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ width: CONTAINER_W, height: CONTAINER_H }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onWheel={handleWheel}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <img
            ref={imgRef}
            src={imageSrc}
            alt="待裁剪"
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              width: naturalSize.w > 0 ? naturalSize.w : 'auto',
              height: naturalSize.h > 0 ? naturalSize.h : 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              opacity: isLoading ? 0 : 1,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              setIsLoading(false);
            }}
          />

          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-white/60" />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`border-white/25 ${
                    i % 3 !== 2 ? 'border-r' : ''
                  } ${i < 6 ? 'border-b' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scale label */}
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-gray-400">
            {Math.round((scale / minScale) * 100)}%
          </span>
          <span className="text-[10px] text-gray-400">
            比例 3:4
          </span>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => handleScaleChange(clamp(scale - 0.1, minScale, minScale * 3))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            aria-label="缩小"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={0.01}
            value={scale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, var(--tw-colors-accent) 0%, var(--tw-colors-accent) ${
                ((scale - minScale) / (minScale * 2)) * 100
              }%, #e5e7eb ${
                ((scale - minScale) / (minScale * 2)) * 100
              }%, #e5e7eb 100%)`,
            }}
          />
          <button
            type="button"
            onClick={() => handleScaleChange(clamp(scale + 0.1, minScale, minScale * 3))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            aria-label="放大"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          >
            <Check size={16} aria-hidden="true" />
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
