"use client";

import { useEffect, useState } from "react";

// Renders a circular avatar with a skeleton (pulsing gray) while the image
// is loading. Uses loading="eager" + fetchpriority="high" so the browser
// prioritizes the request. Swaps to the image once it loads; reveals the
// skeleton again if src changes.
export function AvatarPhoto({
  src,
  alt,
  className = "",
  isLoading = false,
}: {
  src: string;
  alt: string;
  // Sizing classes like "h-8 w-8". The wrapper handles rounding; the image
  // fills the wrapper via absolute inset.
  className?: string;
  // Force the skeleton state regardless of image load. Use this during an
  // in-flight photo upload so the avatar stays in skeleton from save-click
  // through the new URL arriving and its bytes loading.
  isLoading?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const showSkeleton = isLoading || !loaded;

  return (
    <div className={`relative rounded-full overflow-hidden bg-[#0F1B3D]/[0.06] ${className}`}>
      {showSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-[#0F1B3D]/[0.06]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${showSkeleton ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}
