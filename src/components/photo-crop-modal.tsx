"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onCrop: (blob: Blob) => void | Promise<void>;
}

export function PhotoCropModal({ open, imageSrc, onCancel, onCrop }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset pan/zoom when a new image is loaded.
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  const handleCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  }, []);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      await onCrop(blob);
    } catch (err) {
      console.error("[photo-crop] save failed", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onCancel(); }}>
      <DialogContent
        showCloseButton={false}
        // Stack above the profile popover's !z-[350]: overlay at 400, popup
        // at 410 so the popup sits on top of its own backdrop.
        className="!z-[410] w-[92vw] max-w-md rounded-2xl bg-white p-0 shadow-xl overflow-hidden font-[family-name:var(--font-inter)]"
        overlayClassName="!z-[400]"
      >
        <div className="p-6 flex flex-col">
          <h2 className="text-[20px] font-extrabold text-[#0F1B3D] text-center mb-1">
            Crop your photo
          </h2>
          <p className="text-[13px] text-[#8E8E93] text-center font-light mb-4">
            Drag to reposition. Pinch or use the slider to zoom.
          </p>

          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#0F1B3D] mb-4">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                objectFit="horizontal-cover"
              />
            )}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#0F1B3D]"
              aria-label="Zoom"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-3 rounded-full border border-[#E5E5EA] bg-white text-[#0F1B3D] font-semibold text-[14px] font-sans hover:bg-[#F5F7FB] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !croppedAreaPixels}
              className="flex-1 py-3 rounded-full text-white font-semibold font-sans text-[14px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Draws the crop region onto an offscreen canvas and exports a JPEG blob.
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Object URLs are same-origin; crossOrigin is unneeded here but harmless.
    img.src = src;
  });
}
