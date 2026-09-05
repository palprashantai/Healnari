import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from './Modal.jsx';

const VIEWPORT_SIZE = 280;
const CROP_RADIUS = 120; // 240px diameter crop circle
const OUTPUT_SIZE = 512; // 512x512 high-res square output

export default function PhotoAdjustModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName = 'User',
  initials = 'U',
  onSave,
  onRemove,
}) {
  const [mode, setMode] = useState('view'); // 'view' | 'adjust'
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null);

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setMode('view');
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsSaving(false);
      setIsRemoving(false);
    }
  }, [isOpen]);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      imageRef.current = null;
      return;
    }
    setImageLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoading(false);
      // Center image and fit
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      drawCanvas();
    };
    img.onerror = () => {
      setImageLoading(false);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever zoom, pan, rotation change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const W = VIEWPORT_SIZE;
    const H = VIEWPORT_SIZE;

    // Set canvas dimensions
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    // Calculate base scale to fill crop circle
    const minCropDim = CROP_RADIUS * 2;
    const baseScale = Math.max(minCropDim / img.naturalWidth, minCropDim / img.naturalHeight);
    const currentScale = baseScale * zoom;

    // 1. Draw Image with pan, zoom and rotation
    ctx.save();
    ctx.translate(W / 2 + pan.x, H / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 2. Draw Dark Overlay outside crop circle
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; // slate-900 / 60%
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2, H / 2, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fill();

    // 3. Draw Crop Outline Ring
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, CROP_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Subtle Inner Guide Crosshair Grid (subtle dashes)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    // vertical center
    ctx.moveTo(W / 2, H / 2 - CROP_RADIUS);
    ctx.lineTo(W / 2, H / 2 + CROP_RADIUS);
    // horizontal center
    ctx.moveTo(W / 2 - CROP_RADIUS, H / 2);
    ctx.lineTo(W / 2 + CROP_RADIUS, H / 2);
    ctx.stroke();
    ctx.restore();
  }, [zoom, pan, rotation]);

  useEffect(() => {
    if (mode === 'adjust' && imageRef.current) {
      drawCanvas();
    }
  }, [mode, zoom, pan, rotation, drawCanvas]);

  // Handle new file upload from device
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setMode('adjust');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again if desired
    e.target.value = '';
  };

  // Handle adjusting existing photo ("ya baad me")
  const handleAdjustExisting = async () => {
    if (!currentAvatarUrl) return;
    try {
      setImageLoading(true);
      // Fetch as blob to prevent tainted canvas issues
      const res = await fetch(currentAvatarUrl, { mode: 'cors' });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageSrc(objectUrl);
      setMode('adjust');
    } catch {
      // Fallback to direct URL
      setImageSrc(currentAvatarUrl);
      setMode('adjust');
    } finally {
      setImageLoading(false);
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch drag handlers
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStartRef.current = { ...pan };
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = 0.08;
    setZoom((prev) => {
      const next = e.deltaY < 0 ? prev + zoomStep : prev - zoomStep;
      return Math.min(3, Math.max(1, Number(next.toFixed(2))));
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Save the cropped image to blob and invoke onSave
  const handleSaveCrop = async () => {
    const img = imageRef.current;
    if (!img || isSaving) return;

    setIsSaving(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = OUTPUT_SIZE;
      exportCanvas.height = OUTPUT_SIZE;
      const ctx = exportCanvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const minCropDim = CROP_RADIUS * 2;
      const baseScale = Math.max(minCropDim / img.naturalWidth, minCropDim / img.naturalHeight);
      const currentScale = baseScale * zoom;

      // Ratio between export output (512x512) and crop circle (240x240)
      const exportRatio = OUTPUT_SIZE / minCropDim;

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2 + pan.x * exportRatio, OUTPUT_SIZE / 2 + pan.y * exportRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(currentScale * exportRatio, currentScale * exportRatio);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      const blob = await new Promise((resolve) => {
        exportCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });

      if (blob) {
        const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await onSave?.(file);
      }
      onClose();
    } catch (err) {
      console.error('Failed to crop/save avatar', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      await onRemove?.();
      onClose();
    } catch (err) {
      console.error('Failed to remove photo', err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'adjust' ? 'Adjust & Crop Photo' : 'Change Profile Photo'}
      size={mode === 'adjust' ? 'md' : 'sm'}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* MODE 1: Initial Options View */}
      {mode === 'view' && (
        <div className="text-center space-y-4 pt-1">
          {/* Avatar Preview */}
          <div className="relative w-28 h-28 rounded-3xl bg-aubergine-100 text-aubergine-700 text-3xl font-black flex items-center justify-center mx-auto overflow-hidden shadow-inner border border-aubergine-200">
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Upload a clear, professional photo. You can reposition, zoom, and rotate before saving.
          </p>

          <div className="space-y-2.5 pt-2">
            {/* 1. Upload New Photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <i className="fas fa-upload text-xs"></i> Upload New Photo
            </button>

            {/* 2. Adjust / Re-crop Existing Photo ("ya baad me") */}
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleAdjustExisting}
                disabled={imageLoading}
                className="w-full bg-sand-100 hover:bg-sand-200/80 text-aubergine-900 border border-sand-300 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-crop-simple text-xs text-aubergine-600"></i>
                {imageLoading ? 'Loading photo...' : 'Adjust / Re-Crop Current Photo'}
              </button>
            )}

            {/* 3. Remove Photo */}
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isRemoving}
                className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <i className={`fas ${isRemoving ? 'fa-spinner fa-spin' : 'fa-trash-can'} text-xs`}></i>
                {isRemoving ? 'Removing...' : 'Remove Photo'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: Interactive Adjust & Crop View */}
      {mode === 'adjust' && (
        <div className="space-y-4">
          {/* Canvas Viewport */}
          <div className="relative mx-auto w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 shadow-md select-none touch-none cursor-grab active:cursor-grabbing border border-slate-700">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs font-semibold gap-2 z-10">
                <i className="fas fa-spinner fa-spin text-sm"></i> Loading photo...
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="w-full h-full block"
            />
          </div>

          <p className="text-center text-[11px] text-slate-500 font-medium">
            <i className="fas fa-arrows-up-down-left-right text-[10px] text-slate-400 mr-1"></i>
            Drag to reposition · Scroll or slide to zoom
          </p>

          {/* Adjust Controls: Zoom & Rotate & Reset */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
                title="Zoom Out"
              >
                <i className="fas fa-minus text-[10px]"></i>
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600"
                aria-label="Zoom Photo"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
                title="Zoom In"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
              <span className="text-xs font-extrabold text-slate-600 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Action Tools: Rotate + Reset + Choose Different */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                  title="Rotate 90 degrees clockwise"
                >
                  <i className="fas fa-rotate-right text-[11px] text-aubergine-600"></i> Rotate 90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                  title="Reset zoom and position"
                >
                  <i className="fas fa-arrow-rotate-left text-[11px] text-slate-500"></i> Reset
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-aubergine-700 hover:underline"
              >
                Choose other
              </button>
            </div>
          </div>

          {/* Bottom Save & Cancel Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setMode('view')}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={isSaving || imageLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-aubergine-600 hover:bg-aubergine-700 active:scale-[0.98] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'} text-xs`}></i>
              {isSaving ? 'Saving...' : 'Save Photo'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
