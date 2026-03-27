"use client";

import { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Phone,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  Navigation,
} from "lucide-react";
import type {
  DoctorResult,
  LocationResult,
  ReviewResult,
  SourcePayload,
  NegotiationResult,
  BookingStatusResponse,
  BookingResultPayload,
} from "@/lib/types";

// ────────────────────────────────────────────────────────────────
//  Shared helpers
// ────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i < Math.round(rating)
              ? "text-[var(--elena-gold)] fill-[var(--elena-gold)]"
              : "text-[var(--elena-border-light)] fill-[var(--elena-border-light)]"
          }
        />
      ))}
    </span>
  );
}

function InNetworkBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--elena-green-bg)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--elena-green-dark)]">
      <Check className="h-2.5 w-2.5" /> In-Network
    </span>
  );
}

function FacilityBadge({ type }: { type: string }) {
  const isHospital = type === "hospital";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold text-white"
      style={{
        backgroundColor: isHospital
          ? "var(--elena-hospital-orange)"
          : "var(--elena-freestanding-green)",
      }}
    >
      {isHospital ? "Hospital" : "Freestanding"}
    </span>
  );
}

function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  const miles = km * 0.621371;
  return miles < 0.1 ? `${Math.round(km * 1000)}m` : `${miles.toFixed(1)} mi`;
}

/** Round to 4 decimals to cluster same-building providers */
function coordKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

// ────────────────────────────────────────────────────────────────
//  Inline map (Mapbox GL) — bidirectional interaction
// ────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "")
    : "";

interface MapItem {
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  index: number;
}

/** Cluster items at the same coordinate */
interface Cluster {
  lat: number;
  lng: number;
  items: MapItem[];
  key: string;
}

function clusterMarkers(items: MapItem[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const item of items) {
    const k = coordKey(item.lat, item.lng);
    if (!map.has(k)) {
      map.set(k, { lat: item.lat, lng: item.lng, items: [], key: k });
    }
    map.get(k)!.items.push(item);
  }
  return Array.from(map.values());
}

function useInlineMap({
  items,
  height,
  selectedIndex,
  onSelect,
}: {
  items: MapItem[];
  height: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const clustersRef = useRef<Cluster[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || items.length === 0) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!document.getElementById("mapbox-gl-css")) {
        const link = document.createElement("link");
        link.id = "mapbox-gl-css";
        link.rel = "stylesheet";
        link.href =
          "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const bounds = new mapboxgl.LngLatBounds();
      items.forEach((m) => bounds.extend([m.lng, m.lat]));

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/standard",
        bounds,
        fitBoundsOptions: { padding: 50, maxZoom: 14 },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true,
      });
      // Disable rotation via touch
      map.touchZoomRotate.disableRotation();

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        const clusters = clusterMarkers(items);
        clustersRef.current = clusters;
        markerEls.current.clear();

        clusters.forEach((cluster) => {
          const isCluster = cluster.items.length > 1;
          const el = document.createElement("div");

          // Red pin by default — navy when selected
          // Use an inner element for scale so we don't clobber Mapbox's positional transform
          el.style.cssText = `
            cursor: pointer;
            user-select: none;
          `;
          const inner = document.createElement("div");
          inner.style.cssText = `
            width: ${isCluster ? "32px" : "28px"};
            height: ${isCluster ? "32px" : "28px"};
            border-radius: 50%;
            background: #FF3B30;
            border: 2.5px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: ${isCluster ? "12px" : "11px"}; font-weight: 700;
            transition: transform 0.15s ease;
          `;
          inner.textContent = isCluster
            ? String(cluster.items.length)
            : String(cluster.items[0].index + 1);
          el.appendChild(inner);

          // Store inner ref for color/scale updates
          (el as HTMLDivElement & { _inner: HTMLDivElement })._inner = inner;

          el.addEventListener("mouseenter", () => {
            inner.style.transform = "scale(1.15)";
          });
          el.addEventListener("mouseleave", () => {
            inner.style.transform = "scale(1)";
          });

          el.addEventListener("click", (e) => {
            e.stopPropagation();
            const firstItem = cluster.items[0];
            onSelect(firstItem.index);
          });

          markerEls.current.set(cluster.key, el);

          new mapboxgl.Marker({ element: el })
            .setLngLat([cluster.lng, cluster.lat])
            .addTo(map);
        });
      });
    })();

    return () => {
      cancelled = true;
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // React to selection changes: fly to pin, update colors, show popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedIndex === null) return;

    const item = items[selectedIndex];
    if (!item) return;

    // Fly to selected location
    map.flyTo({
      center: [item.lng, item.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 300,
    });

    // Update all marker colors via inner element
    const selectedKey = coordKey(item.lat, item.lng);
    markerEls.current.forEach((el, key) => {
      const inner = (el as HTMLDivElement & { _inner?: HTMLDivElement })._inner;
      if (inner) {
        inner.style.background = key === selectedKey ? "#4A6CF7" : "#FF3B30";
      }
    });

    // Show popup after fly completes
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      setTimeout(() => {
        if (!mapRef.current) return;
        if (popupRef.current) popupRef.current.remove();

        const cluster = clustersRef.current.find(
          (c) => c.key === selectedKey
        );
        const isCluster = cluster && cluster.items.length > 1;

        const popupHtml = isCluster
          ? `<div style="font-size:13px;font-weight:600;color:#0F1B3D;">${cluster.items.length} providers</div>
             <div style="font-size:11px;color:#8E8E93;margin-top:2px;">${cluster.items.map((it) => it.label).join(", ")}</div>`
          : `<div style="font-size:13px;font-weight:600;color:#0F1B3D;">${item.label}</div>
             ${item.sublabel ? `<div style="font-size:11px;color:#8E8E93;margin-top:2px;">${item.sublabel}</div>` : ""}`;

        popupRef.current = new mapboxgl.Popup({
          offset: 20,
          closeButton: false,
          closeOnClick: true,
          maxWidth: "220px",
        })
          .setLngLat([item.lng, item.lat])
          .setHTML(popupHtml)
          .addTo(mapRef.current);
      }, 350);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  // Reset colors when deselected
  useEffect(() => {
    if (selectedIndex !== null) return;
    markerEls.current.forEach((el) => {
      const inner = (el as HTMLDivElement & { _inner?: HTMLDivElement })._inner;
      if (inner) inner.style.background = "#FF3B30";
    });
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, [selectedIndex]);

  return { containerRef, height };
}

function InlineMapView({
  containerRef,
  height,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  height: number;
}) {
  if (!MAPBOX_TOKEN) return null;

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", minHeight: height }}
      className="rounded-t-xl overflow-hidden bg-[var(--elena-border-light)]"
    />
  );
}

// ────────────────────────────────────────────────────────────────
//  Doctor Map Card
// ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export function DoctorResultsCard({
  doctors,
  onBookDoctor,
}: {
  doctors: DoctorResult[];
  onBookDoctor?: (doctor: DoctorResult) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const visible = doctors.slice(0, visibleCount);
  const hasMore = visibleCount < doctors.length;

  const mapItems: MapItem[] = doctors
    .map((d, i) => ({
      lat: d.latitude ?? 0,
      lng: d.longitude ?? 0,
      label: d.name,
      sublabel: d.specialty,
      index: i,
    }))
    .filter((m) => m.lat !== 0 && m.lng !== 0);

  const hasMap = mapItems.length > 0;

  const handleSelect = (idx: number) => {
    setSelectedIdx((prev) => (prev === idx ? null : idx));
    // Auto-expand list if the selected doctor isn't visible yet
    if (idx >= visibleCount) {
      setVisibleCount(Math.min(idx + PAGE_SIZE, doctors.length));
    }
  };

  // Scroll selected card into view
  useEffect(() => {
    if (selectedIdx !== null) {
      const el = cardRefs.current.get(selectedIdx);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIdx]);

  const { containerRef, height } = useInlineMap({
    items: mapItems,
    height: 260,
    selectedIndex: selectedIdx,
    onSelect: handleSelect,
  });

  return (
    <div className="mt-3 rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--elena-border-light)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
          {doctors.length} Provider{doctors.length !== 1 ? "s" : ""} Found
        </p>
      </div>

      {/* Provider cards */}
      <div className="flex flex-col gap-2.5 p-3">
        {visible.map((doc, i) => {
          const isSelected = selectedIdx === i;
          const dist = formatDistance(doc.distance_km);
          const hasOop = doc.estimated_oop != null;
          const rawPrice = doc.negotiated_rate ?? doc.estimated_total ?? null;
          const showStrikethrough = hasOop && rawPrice != null && rawPrice > doc.estimated_oop!;
          return (
            <div
              key={doc.npi_number || i}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
              }}
              className="rounded-xl border-[1.5px] px-3 py-2.5 cursor-pointer transition-all duration-150"
              style={{
                borderColor: isSelected
                  ? "var(--elena-selected-border)"
                  : "var(--elena-border-light)",
                backgroundColor: isSelected
                  ? "var(--elena-selected-bg)"
                  : "var(--elena-card-bg)",
              }}
              onClick={() => handleSelect(i)}
            >
              {/* Top row: info left, book button right */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[15px] font-bold text-[var(--elena-text-primary)] truncate">
                    {doc.name}
                  </p>
                  {doc.practice_name && (
                    <p className="text-xs text-[var(--elena-text-muted)] mt-px truncate">
                      {doc.practice_name}
                    </p>
                  )}
                  {/* Specialty + rating inline */}
                  <div className="flex items-center gap-2 mt-px">
                    <p className="text-[13px] text-[var(--elena-text-secondary)] truncate">
                      {doc.specialty}
                    </p>
                    {doc.healthgrades_rating != null && (
                      <span className="flex items-center gap-[3px] shrink-0">
                        <Star className="h-3 w-3 text-[var(--elena-gold)] fill-[var(--elena-gold)]" />
                        <span className="text-xs font-bold text-[var(--elena-gold)]">
                          {doc.healthgrades_rating.toFixed(1)}
                        </span>
                        {doc.google_review_count != null && (
                          <span className="text-[11px] text-[var(--elena-text-muted)]">
                            ({doc.google_review_count})
                          </span>
                        )}
                      </span>
                    )}
                    {doc.google_rating != null && !doc.healthgrades_rating && (
                      <span className="flex items-center gap-[3px] shrink-0">
                        <Star className="h-3 w-3 text-[var(--elena-gold)] fill-[var(--elena-gold)]" />
                        <span className="text-xs font-bold text-[var(--elena-gold)]">
                          {doc.google_rating.toFixed(1)}
                        </span>
                        {doc.google_review_count != null && (
                          <span className="text-[11px] text-[var(--elena-text-muted)]">
                            ({doc.google_review_count})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {onBookDoctor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookDoctor(doc);
                    }}
                    className="shrink-0 rounded-lg bg-[#4A6CF7] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Book
                  </button>
                )}
              </div>

              {/* Bottom row: badges left, price right */}
              <div className="flex items-end justify-between gap-2 mt-1">
                {/* Badge row */}
                <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                  {doc.in_network != null && (
                    doc.in_network ? (
                      <span className="flex items-center gap-[3px] text-[11px] font-semibold text-[var(--elena-green)]">
                        <Check className="h-3.5 w-3.5" /> In-network
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[var(--elena-text-muted)]">
                        Out-of-network
                      </span>
                    )
                  )}
                  {doc.facility_type && (
                    <FacilityBadge type={doc.facility_type} />
                  )}
                  {dist && (
                    <span className="text-[11px] text-[var(--elena-text-muted)]">
                      {dist}
                    </span>
                  )}
                </div>

                {/* Price */}
                {(hasOop || rawPrice != null) && (
                  <div className="shrink-0 text-right">
                    {showStrikethrough && (
                      <p className="text-xs text-[var(--elena-text-muted)] line-through">
                        ~${Math.round(rawPrice!).toLocaleString()}
                      </p>
                    )}
                    {hasOop ? (
                      <>
                        <p className="text-[16px] font-bold text-[var(--elena-text-primary)]">
                          ~${Math.round(doc.estimated_oop!).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[var(--elena-text-muted)]">
                          est. out-of-pocket
                        </p>
                      </>
                    ) : rawPrice != null ? (
                      <p className="text-[15px] font-bold text-[var(--elena-text-primary)]">
                        ~${Math.round(rawPrice).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() =>
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, doctors.length))
          }
          className="flex w-full items-center justify-center gap-1 border-t border-[var(--elena-border-light)] py-2.5 text-xs font-semibold text-[var(--elena-navy)] hover:bg-[var(--elena-selected-bg)] transition-colors"
        >
          Show {Math.min(PAGE_SIZE, doctors.length - visibleCount)} more{" "}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
      {visibleCount > PAGE_SIZE && (
        <button
          onClick={() => setVisibleCount(PAGE_SIZE)}
          className="flex w-full items-center justify-center gap-1 border-t border-[var(--elena-border-light)] py-2.5 text-xs font-semibold text-[var(--elena-navy)] hover:bg-[var(--elena-selected-bg)] transition-colors"
        >
          Show less <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Location Map Card
// ────────────────────────────────────────────────────────────────

export function LocationResultsCard({
  locations,
  onCall,
}: {
  locations: LocationResult[];
  onCall?: (loc: LocationResult) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const mapItems: MapItem[] = locations
    .map((loc, i) => ({
      lat: loc.latitude ?? 0,
      lng: loc.longitude ?? 0,
      label: loc.name,
      sublabel: loc.category ?? undefined,
      index: i,
    }))
    .filter((m) => m.lat !== 0 && m.lng !== 0);

  const hasMap = mapItems.length > 0;

  const handleSelect = (idx: number) => {
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  };

  useEffect(() => {
    if (selectedIdx !== null) {
      const el = cardRefs.current.get(selectedIdx);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIdx]);

  const { containerRef, height } = useInlineMap({
    items: mapItems,
    height: 200,
    selectedIndex: selectedIdx,
    onSelect: handleSelect,
  });

  return (
    <div className="mt-3 rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--elena-border-light)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
          {locations.length} Location{locations.length !== 1 ? "s" : ""} Found
        </p>
      </div>

      {/* Location cards */}
      <div className="flex flex-col gap-2.5 p-3">
        {locations.map((loc, i) => {
          const isSelected = selectedIdx === i;
          const dist = formatDistance(loc.distance_km);
          return (
            <div
              key={i}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
              }}
              className="rounded-xl border-[1.5px] px-3 py-2.5 cursor-pointer transition-all duration-150"
              style={{
                borderColor: isSelected
                  ? "var(--elena-selected-border)"
                  : "var(--elena-border-light)",
                backgroundColor: isSelected
                  ? "var(--elena-selected-bg)"
                  : "var(--elena-card-bg)",
              }}
              onClick={() => handleSelect(i)}
            >
              {/* Top row: info left, action buttons right */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--elena-text-primary)] truncate">
                    {loc.name}
                  </p>
                  {loc.category && (
                    <p className="text-[13px] text-[var(--elena-text-secondary)] mt-px truncate">
                      {loc.category}
                    </p>
                  )}
                  {loc.phone_number && (
                    <p className="text-xs text-[var(--elena-text-secondary)] mt-px">
                      {loc.phone_number}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {loc.phone_number && onCall && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCall(loc); }}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-[var(--elena-border)] text-[var(--elena-navy)] hover:bg-[var(--elena-warm-bg)] transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {loc.latitude != null && loc.longitude != null && (
                    <a
                      href={`https://maps.apple.com/?daddr=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-[var(--elena-border)] text-[var(--elena-navy)] hover:bg-[var(--elena-warm-bg)] transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Bottom row: badges + rating left, distance right */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                  {loc.in_network != null && loc.in_network && (
                    <span className="flex items-center gap-[3px] text-[11px] font-semibold text-[var(--elena-green)]">
                      <Check className="h-3.5 w-3.5" /> In-network
                    </span>
                  )}
                  {loc.rating != null && (
                    <span className="flex items-center gap-[3px]">
                      <Star className="h-3 w-3 text-[var(--elena-gold)] fill-[var(--elena-gold)]" />
                      <span className="text-xs font-bold text-[var(--elena-gold)]">
                        {loc.rating.toFixed(1)}
                      </span>
                      {loc.review_count != null && (
                        <span className="text-[11px] text-[var(--elena-text-muted)]">
                          ({loc.review_count})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {dist && (
                  <span className="text-[11px] text-[var(--elena-text-muted)] shrink-0">
                    {dist}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Reviews Card
// ────────────────────────────────────────────────────────────────

export function ReviewsCard({ data }: { data: ReviewResult }) {
  if (!data.reviews || data.reviews.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--elena-border-light)]">
        <p className="text-[17px] font-bold text-[var(--elena-text-primary)]">
          {data.doctor_name}
        </p>
        {data.healthgrades_rating != null && (
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={data.healthgrades_rating} size={16} />
            <span className="text-sm font-semibold text-[var(--elena-gold)]">
              {data.healthgrades_rating.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--elena-text-muted)]">
              ({data.reviews.length} review
              {data.reviews.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div>
        {data.reviews.slice(0, 3).map((review, i) => (
          <div
            key={i}
            className="px-4 py-3"
            style={{
              borderTop:
                i > 0 ? "1px solid var(--elena-border-light)" : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              {review.rating != null && (
                <StarRating rating={review.rating} size={13} />
              )}
              {review.date && (
                <span className="text-xs text-[var(--elena-text-muted)]">
                  {review.date}
                </span>
              )}
            </div>
            <p className="text-[15px] leading-[22px] text-[var(--elena-text-primary)]">
              {review.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Negotiation Result Card
// ────────────────────────────────────────────────────────────────

export function NegotiationCard({ data }: { data: NegotiationResult }) {
  const saved = data.original_amount - data.negotiated_amount;
  const pct =
    data.original_amount > 0
      ? Math.round((saved / data.original_amount) * 100)
      : 0;

  return (
    <div className="mt-3 rounded-2xl border border-[var(--elena-green)]/20 bg-[var(--elena-green-bg)] elena-card-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--elena-green)]/10 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--elena-green)]/20">
          <Check className="h-3.5 w-3.5 text-[var(--elena-green-dark)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--elena-text-primary)]">
            {data.provider_name}
          </p>
          <p className="text-xs text-[var(--elena-text-muted)]">
            {data.provider_phone}
          </p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-[var(--elena-text-muted)] line-through">
            ${data.original_amount.toFixed(0)}
          </span>
          <span className="text-lg font-bold text-[var(--elena-green-dark)]">
            ${data.negotiated_amount.toFixed(0)}
          </span>
          {pct > 0 && (
            <span className="rounded-full bg-[var(--elena-green)]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--elena-green-dark)]">
              {pct}% saved
            </span>
          )}
        </div>
        {data.next_steps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--elena-text-secondary)] mb-1">
              Next Steps
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              {data.next_steps.map((step, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--elena-text-primary)]"
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Source Citations
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
//  Booking Status Bubble (active call indicator)
// ────────────────────────────────────────────────────────────────

const ACTIVE_PHASES = new Set([
  "calling",
  "ringing",
  "connected",
  "on_hold",
  "needs_info",
]);

function getBookingEmoji(phase: string) {
  if (phase === "completed" || phase === "wrapping_up") return "✅";
  if (phase === "failed" || phase === "cancelled" || phase === "user_cancelled")
    return "❌";
  return "📞";
}

export function BookingStatusBubble({
  status,
  onCancel,
}: {
  status: BookingStatusResponse;
  onCancel?: () => void;
}) {
  const isActive = ACTIVE_PHASES.has(status.phase);
  const emoji = getBookingEmoji(status.phase);

  return (
    <div className="flex items-start gap-3 animate-in fade-in duration-300">
      <span
        className={`text-2xl select-none ${isActive ? "animate-booking-shake" : ""}`}
      >
        {emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#0F1B3D]/70">{status.message}</p>
        {isActive && onCancel && (
          <button
            onClick={onCancel}
            className="mt-1.5 text-xs text-[#0F1B3D]/30 hover:text-[#0F1B3D]/50 transition-colors"
          >
            Cancel call
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Appointment Confirmation Card
// ────────────────────────────────────────────────────────────────

function formatBookingDate(date: string, time?: string | null) {
  try {
    const d = new Date(date + "T00:00:00");
    const formatted = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return time ? `${formatted} at ${time}` : formatted;
  } catch {
    return time ? `${date} at ${time}` : date;
  }
}

export function AppointmentConfirmationCard({
  result,
}: {
  result: BookingResultPayload;
}) {
  const isCancellation = result.is_cancellation;
  const isReschedule = result.is_reschedule;

  const title = isCancellation
    ? "APPOINTMENT CANCELLED"
    : isReschedule
      ? "APPOINTMENT RESCHEDULED"
      : "NEW APPOINTMENT CREATED";

  const dotColor = isCancellation
    ? "border-red-400"
    : isReschedule
      ? "border-amber-500"
      : "border-[#0F1B3D]";

  const titleColor = isCancellation
    ? "text-red-500"
    : isReschedule
      ? "text-amber-600"
      : "text-[#0F1B3D]";

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-4 shadow-[0_2px_8px_rgba(15,27,61,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`h-2.5 w-2.5 rounded-full border-2 ${dotColor}`}
        />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${titleColor}`}>
          {title}
        </span>
      </div>

      {/* Details */}
      {result.provider_specialty && (
        <p className="text-[15px] font-semibold text-[#0F1B3D]">
          {result.provider_specialty}
        </p>
      )}
      <p className="text-sm text-[#0F1B3D]/50">{result.provider_name}</p>

      {/* Date/time */}
      {(isReschedule || isCancellation) && result.original_date && (
        <p className="mt-2 text-[13px] text-[#0F1B3D]/30 line-through">
          {formatBookingDate(result.original_date, result.original_time)}
        </p>
      )}
      {result.confirmed_date && !isCancellation && (
        <p className="mt-1 text-[13px] font-semibold text-[#0F1B3D]">
          {formatBookingDate(result.confirmed_date, result.confirmed_time)}
        </p>
      )}

      {result.reason_for_visit && (
        <p className="mt-1 text-[13px] text-[#0F1B3D]/40">
          {result.reason_for_visit}
        </p>
      )}

      {result.notes && (
        <p className="mt-2 text-xs text-[#0F1B3D]/50 italic">
          {result.notes}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Add to Calendar Card
// ────────────────────────────────────────────────────────────────

export function AddToCalendarCard({
  result,
}: {
  result: BookingResultPayload;
}) {
  if (!result.confirmed_date) return null;
  if (result.is_cancellation) return null;

  const hasGoogle = !!result.google_calendar_url;
  const hasApple = !!result.apple_calendar_url;

  if (!hasGoogle && !hasApple) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-4 shadow-[0_2px_8px_rgba(15,27,61,0.06)]">
      <p className="text-sm font-semibold text-[#0F1B3D] mb-3">
        Add to your calendar?
      </p>
      <div className="flex gap-2">
        {hasApple && (
          <a
            href={result.apple_calendar_url!}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.03] px-4 py-2.5 text-sm font-medium text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.06] transition-colors"
          >
            <span>🍎</span>
            Calendar
          </a>
        )}
        {hasGoogle && (
          <a
            href={result.google_calendar_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.03] px-4 py-2.5 text-sm font-medium text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.06] transition-colors"
          >
            <span>📅</span>
            Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Booking Needs-Info Question
// ────────────────────────────────────────────────────────────────

export function BookingQuestionCard({
  question,
  onAnswer,
}: {
  question: string;
  onAnswer: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim() || sent) return;
    setSent(true);
    onAnswer(answer.trim());
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-4 shadow-[0_2px_8px_rgba(15,27,61,0.06)] animate-in fade-in duration-300">
      <p className="text-sm text-[#0F1B3D]/70 mb-3">{question}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={sent}
          placeholder="Type your answer..."
          className="flex-1 rounded-xl border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.02] px-3 py-2 text-sm text-[#0F1B3D] outline-none placeholder:text-[#0F1B3D]/30 focus:border-[#0F1B3D]/20 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || sent}
          className="rounded-xl bg-[#0F1B3D] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
        >
          {sent ? "Sent" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Source Citations
// ────────────────────────────────────────────────────────────────

export function SourcesFooter({ sources }: { sources: SourcePayload[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sources.slice(0, 4).map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-full border border-[var(--elena-border-light)] bg-white px-2.5 py-1 text-[0.65rem] text-[var(--elena-text-muted)] hover:text-[var(--elena-text-secondary)] elena-card-shadow-sm transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          <span className="truncate max-w-[120px]">{source.title}</span>
        </a>
      ))}
    </div>
  );
}
