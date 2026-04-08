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
  AlertTriangle,
  Copy,
  Send,
  Clock,
} from "lucide-react";
import type {
  DoctorResult,
  LocationResult,
  ReviewResult,
  SourcePayload,
  NegotiationResult,
  BookingStatusResponse,
  BookingResultPayload,
  FormRequest,
  BillAnalysis,
  AppealScript,
  AppealStatus,
  AssistanceResult,
} from "@/lib/types";
import { apiFetch } from "@/lib/apiFetch";

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
        inner.style.background = key === selectedKey ? "#0F1B3D" : "#FF3B30";
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
    height: 180,
    selectedIndex: selectedIdx,
    onSelect: handleSelect,
  });

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--elena-border-light)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
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
                    className="shrink-0 rounded-xl bg-[#0F1B3D] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
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
    height: 150,
    selectedIndex: selectedIdx,
    onSelect: handleSelect,
  });

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--elena-border-light)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
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
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white elena-card-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center gap-2">
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
          <span className="text-lg font-bold text-[#0F1B3D]">
            ${data.negotiated_amount.toFixed(0)}
          </span>
          {pct > 0 && (
            <span className="rounded-full bg-[#F2F2F7] px-2 py-0.5 text-[0.65rem] font-semibold text-[#0F1B3D]">
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

function getBookingLabel(phase: string) {
  if (phase === "completed" || phase === "wrapping_up") return "Done";
  if (phase === "failed" || phase === "cancelled" || phase === "user_cancelled")
    return "Ended";
  return "Calling";
}

export function BookingStatusBubble({
  status,
  onCancel,
}: {
  status: BookingStatusResponse;
  onCancel?: () => void;
}) {
  const isActive = ACTIVE_PHASES.has(status.phase);
  const label = getBookingLabel(status.phase);

  return (
    <div className="flex items-start gap-3 animate-in fade-in duration-300">
      <span className="text-xs font-semibold text-[#0F1B3D]/50 uppercase tracking-wider mt-0.5 shrink-0">
        {label}
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
    <div className="mt-3 max-w-md rounded-2xl border border-[#0F1B3D]/[0.08] bg-white p-4 shadow-[0_4px_16px_rgba(15,27,61,0.10)]">
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

function buildCalendarUrls(result: BookingResultPayload) {
  if (!result.confirmed_date) return { google: null, ics: null };

  const dateStr = result.confirmed_date;
  const timeStr = result.confirmed_time || "";

  // Parse date
  let start: Date | null = null;
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    start = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  } else {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) start = d;
  }
  if (!start) return { google: null, ics: null };

  // Parse time
  if (timeStr) {
    const tm = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (tm) {
      let h = parseInt(tm[1]);
      const m = parseInt(tm[2] || "0");
      const ap = tm[3]?.toLowerCase();
      if (ap === "pm" && h !== 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      start.setHours(h, m, 0, 0);
    }
  } else {
    start.setHours(9, 0, 0, 0);
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");

  const title = result.provider_specialty
    ? `${result.provider_specialty} - ${result.provider_name}`
    : `Appointment - ${result.provider_name}`;
  const notes = [
    result.reason_for_visit ? `Reason: ${result.reason_for_visit}` : null,
    result.provider_phone ? `Phone: ${result.provider_phone}` : null,
  ].filter(Boolean).join("\n");

  // Google Calendar URL
  const gStart = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(start.getHours())}${pad(start.getMinutes())}00`;
  const gEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(notes)}`;

  // ICS file for Apple Calendar / Outlook
  const fmtIcs = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const icsContent = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
    `DTSTART:${fmtIcs(start)}`, `DTEND:${fmtIcs(end)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${notes.replace(/\n/g, "\\n")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { google, ics };
}

export function AddToCalendarCard({
  result,
}: {
  result: BookingResultPayload;
}) {
  if (!result.confirmed_date) return null;
  if (result.is_cancellation) return null;

  const { google, ics } = buildCalendarUrls(result);
  if (!google && !ics) return null;

  return (
    <div className="mt-3">
      <p className="text-[15px] font-semibold text-[#0F1B3D] mb-2.5">
        Add to your calendar?
      </p>
      <div className="flex gap-2.5">
        {ics && (
          <a
            href={ics}
            download="appointment.ics"
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Apple Calendar
          </a>
        )}
        {google && (
          <a
            href={google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
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

// ────────────────────────────────────────────────────────────────
//  Inline Form Card (from request_user_info tool)
// ────────────────────────────────────────────────────────────────

export function FormRequestCard({
  form,
  onSubmitted,
}: {
  form: FormRequest;
  onSubmitted?: (data: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageField, setActiveImageField] = useState<string | null>(null);

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    // Check required fields
    const missing = form.fields.filter(
      (f) => f.required && !values[f.key]?.trim(),
    );
    if (missing.length > 0) return;

    setSubmitting(true);
    try {
      await apiFetch("/chat/form-submit", {
        method: "POST",
        body: JSON.stringify({
          form_id: form.form_id,
          save_to: form.save_to,
          data: values,
        }),
      });
      setSubmitted(true);
      onSubmitted?.(values);
    } catch {}
    setSubmitting(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // For insurance images, use OCR endpoint
    if (form.save_to === "insurance") {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("card_type", values.card_type || "medical");
      formData.append("side", fieldKey.includes("back") ? "back" : "front");
      try {
        const res = await apiFetch("/insurance/ocr", { method: "POST", body: formData });
        if (res.ok) {
          setValue(fieldKey, "Uploaded");
        }
      } catch {}
    } else {
      // Generic file upload via presigned URL
      try {
        const urlRes = await apiFetch("/documents/upload-url", {
          method: "POST",
          body: JSON.stringify({ session_id: "form", filename: file.name }),
        });
        if (urlRes.ok) {
          const { upload_url, key, content_type, required_headers } = await urlRes.json();
          await fetch(upload_url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": content_type, ...required_headers },
          });
          setValue(fieldKey, key);
        }
      } catch {}
    }
  }

  if (submitted) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-500" />
          <p className="text-[14px] font-semibold text-emerald-700">Information submitted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-5 shadow-[0_2px_8px_rgba(15,27,61,0.06)] animate-in fade-in duration-300">
      <h4 className="text-[16px] font-bold text-[#0F1B3D] mb-1">{form.title}</h4>
      {form.description && (
        <p className="text-[13px] text-[#8E8E93] mb-4">{form.description}</p>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => activeImageField && handleImageUpload(e, activeImageField)} />

      <div className="space-y-3">
        {form.fields.map((field) => (
          <div key={field.key}>
            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>

            {field.type === "textarea" ? (
              <textarea
                value={values[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 resize-none"
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30"
              >
                <option value="">{field.placeholder || "Select..."}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === "image" ? (
              <button
                onClick={() => { setActiveImageField(field.key); fileInputRef.current?.click(); }}
                className="mt-1 w-full rounded-xl border-2 border-dashed border-[#E5E5EA] bg-[#FAFAFA] px-3.5 py-4 text-[14px] text-[#AEAEB2] hover:border-[#0F1B3D]/20 hover:text-[#0F1B3D]/50 transition-colors text-center"
              >
                {values[field.key] ? "Uploaded" : field.placeholder || "Tap to upload"}
              </button>
            ) : (
              <input
                type={field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
                value={values[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        <button
          onClick={() => { setSubmitted(true); onSubmitted?.({}); }}
          className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Price Comparison Card
// ────────────────────────────────────────────────────────────────

export function PriceComparisonCard({
  doctors,
  label,
  onBookDoctor,
}: {
  doctors: DoctorResult[];
  label: string;
  onBookDoctor?: (doctor: DoctorResult) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const sorted = [...doctors].sort(
    (a, b) => (a.estimated_oop ?? a.negotiated_rate ?? Infinity) - (b.estimated_oop ?? b.negotiated_rate ?? Infinity)
  );

  const cheapest = sorted[0]?.estimated_oop ?? sorted[0]?.negotiated_rate ?? 0;
  const mostExpensive = sorted[sorted.length - 1]?.estimated_oop ?? sorted[sorted.length - 1]?.negotiated_rate ?? 0;
  const totalSavings = mostExpensive - cheapest;

  const mapItems: MapItem[] = sorted
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
  };

  useEffect(() => {
    if (selectedIdx !== null) {
      const el = cardRefs.current.get(selectedIdx);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIdx]);

  const { containerRef, height } = useInlineMap({
    items: mapItems,
    height: 180,
    selectedIndex: selectedIdx,
    onSelect: handleSelect,
  });

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      <div className="px-3 py-2 border-b border-[var(--elena-border-light)] flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
            Price Comparison · {label}
          </p>
          <p className="text-[11px] text-[var(--elena-text-muted)]">
            {sorted.length} location{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {sorted.map((doc, i) => {
          const isBest = i === 0;
          const isSelected = selectedIdx === i;
          const dist = formatDistance(doc.distance_km);
          const price = doc.estimated_oop ?? doc.negotiated_rate ?? null;

          return (
            <div
              key={doc.npi_number || i}
              ref={(el) => { if (el) cardRefs.current.set(i, el); }}
              className="rounded-xl px-3 py-3 cursor-pointer transition-all duration-150"
              style={{
                borderWidth: "1.5px",
                borderStyle: "solid",
                borderColor: isSelected
                  ? "var(--elena-selected-border)"
                  : "var(--elena-border-light)",
                backgroundColor: isSelected
                  ? "var(--elena-selected-bg)"
                  : "var(--elena-card-bg)",
              }}
              onClick={() => handleSelect(i)}
            >
              {isBest && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0F1B3D] px-2 py-0.5 text-[0.6rem] font-bold text-white mb-2">
                  BEST PRICE
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--elena-text-primary)] truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.facility_type && <FacilityBadge type={doc.facility_type} />}
                    {dist && (
                      <span className="text-[11px] text-[var(--elena-text-muted)]">{dist}</span>
                    )}
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
                    {doc.in_network && <InNetworkBadge />}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {price != null && (
                    <>
                      <p className={`${isBest ? "text-[22px] font-bold text-[#0F1B3D]" : "text-[18px] font-bold text-[var(--elena-text-primary)]"}`}>
                        ${Math.round(price).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--elena-text-muted)]">est. out-of-pocket</p>
                    </>
                  )}
                </div>
              </div>

              {isBest && totalSavings > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full bg-[#F2F2F7] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#0F1B3D]">
                    SAVES YOU ${totalSavings.toLocaleString()}
                  </span>
                  {onBookDoctor && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onBookDoctor(doc); }}
                      className="rounded-xl bg-[#0F1B3D] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      Book
                    </button>
                  )}
                </div>
              )}

              {!isBest && onBookDoctor && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); onBookDoctor(doc); }}
                    className="rounded-xl bg-[#0F1B3D] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Book
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalSavings > 0 && (
        <div className="border-t border-[#E5E5EA] px-4 py-3 bg-white">
          <p className="text-[13px] font-semibold text-[var(--elena-text-primary)]">
            Same procedure. Same quality. Save ${totalSavings.toLocaleString()} by choosing the right spot.
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Bill Analysis Card
// ────────────────────────────────────────────────────────────────

export function BillAnalysisCard({ data }: { data: BillAnalysis }) {
  const issueCount = data.items.length;
  const totalCharged = data.total_charged;
  const totalFair = data.total_fair;
  const savingsPct = totalCharged > 0 ? Math.round(((totalCharged - totalFair) / totalCharged) * 100) : 0;

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[#E5E5EA]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#0F1B3D]" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F1B3D]">
          Bill Analysis · {issueCount} Issue{issueCount !== 1 ? "s" : ""} Found
        </p>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-2 p-3">
        {data.items.map((item, i) => {
          const badge = item.issue_type === "unnecessary"
            ? "SHOULDN'T BE BILLED"
            : item.issue_type === "above_average"
              ? "ABOVE AVERAGE"
              : item.issue_type === "duplicate"
                ? "DUPLICATE"
                : "OVERCHARGE";

          const badgeColor = "bg-[#F2F2F7] text-[#0F1B3D]/70";

          return (
            <div key={i} className="rounded-xl border-[1.5px] border-[var(--elena-border-light)] px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--elena-text-primary)]">
                    {item.description}
                  </p>
                  {item.code && (
                    <p className="text-[11px] text-[var(--elena-text-muted)]">CPT {item.code}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${badgeColor}`}>
                  {badge}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-[14px] text-[#0F1B3D]/50 line-through">
                  ${item.charged.toLocaleString()}
                </span>
                <span className="text-[14px] font-bold text-[var(--elena-text-primary)]">
                  → ${item.fair_price.toLocaleString()}
                </span>
              </div>
              {item.explanation && (
                <p className="text-[11px] text-[var(--elena-text-muted)] italic mt-1">
                  {item.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Savings footer */}
      <div className="px-4 py-3 border-t border-[#E5E5EA] bg-white">
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-[#0F1B3D]/50 line-through">
            ${totalCharged.toLocaleString()}
          </span>
          <span className="text-xl font-bold text-[#0F1B3D]">
            ${totalFair.toLocaleString()}
          </span>
          {savingsPct > 0 && (
            <span className="rounded-full bg-[#F2F2F7] px-2 py-0.5 text-[0.65rem] font-semibold text-[#0F1B3D]">
              {savingsPct}% potential savings
            </span>
          )}
        </div>
        {data.next_steps && data.next_steps.length > 0 && (
          <div className="mt-2.5">
            <p className="text-xs font-semibold text-[var(--elena-text-secondary)] mb-1">Next Steps</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {data.next_steps.map((step, i) => (
                <li key={i} className="text-xs text-[var(--elena-text-primary)]">{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Appeal Script Card
// ────────────────────────────────────────────────────────────────

export function AppealScriptCard({ data }: { data: AppealScript }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = data.appeal_text.split("\n");
  const previewLines = expanded ? lines : lines.slice(0, 10);
  const hasMore = lines.length > 10;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.appeal_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {/* Denial section */}
      <div className="px-4 py-3 border-b border-[#E5E5EA]">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F1B3D]">Denial Reason</p>
        </div>
        <p className="text-[13px] italic text-[var(--elena-text-primary)]">
          &ldquo;{data.denial_reason}&rdquo;
        </p>
        <p className="text-[11px] text-[var(--elena-text-muted)] mt-1">
          {data.insurer}{data.denial_code ? ` · Denial code ${data.denial_code}` : ""}
        </p>
      </div>

      {/* Appeal letter section */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--elena-navy)] mb-2">
          Your Appeal Letter
        </p>
        <div className="text-[13px] text-[var(--elena-text-primary)] leading-relaxed whitespace-pre-wrap">
          {previewLines.join("\n")}
          {!expanded && hasMore && "..."}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 text-[12px] font-semibold text-[var(--elena-navy)] hover:underline"
          >
            {expanded ? "Show less ▴" : "Show full letter ▾"}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--elena-border)] px-3 py-2 text-[13px] font-semibold text-[var(--elena-text-primary)] hover:bg-[var(--elena-warm-bg)] transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="flex items-center gap-1.5 rounded-xl bg-[#0F1B3D] px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
            <Send className="h-3.5 w-3.5" />
            Send via Elena
          </button>
        </div>
      </div>

      {/* Success rate banner */}
      {data.success_rate_note && (
        <div className="px-4 py-2.5 bg-white border-t border-[#E5E5EA] flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-[#0F1B3D]" />
          <p className="text-[12px] font-semibold text-[#0F1B3D]">
            {data.success_rate_note}
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Appeal Tracker Card
// ────────────────────────────────────────────────────────────────

export function AppealTrackerCard({ data }: { data: AppealStatus }) {
  const progress = data.days_elapsed != null && data.days_total != null
    ? Math.min(100, Math.round((data.days_elapsed / data.days_total) * 100))
    : null;

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      <div className="px-4 py-3 border-b border-[var(--elena-border-light)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--elena-navy)]">
          Appeal Status
        </p>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          {data.steps.map((step, i) => {
            const isLast = i === data.steps.length - 1;
            return (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  {step.status === "completed" ? (
                    <div className="h-3 w-3 rounded-full bg-[var(--elena-navy)] shrink-0" />
                  ) : step.status === "current" ? (
                    <div className="h-3 w-3 rounded-full bg-[var(--elena-green)] shrink-0 animate-thinking-pulse" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2 border-[var(--elena-border)] shrink-0" />
                  )}
                  {!isLast && (
                    <div className="w-[2px] flex-1 bg-[var(--elena-border-light)] mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[13px] ${step.status === "pending" ? "text-[var(--elena-text-muted)]" : "font-semibold text-[var(--elena-text-primary)]"}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <span className="text-[11px] text-[var(--elena-text-muted)] shrink-0">
                        {step.date}
                      </span>
                    )}
                  </div>
                  {step.detail && (
                    <p className="text-[11px] text-[var(--elena-text-muted)] italic mt-0.5">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      {progress != null && data.deadline_date && (
        <div className="px-4 py-2.5 border-t border-[var(--elena-border-light)] bg-[var(--elena-warm-bg)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[var(--elena-text-secondary)]">
              <Clock className="h-3 w-3 inline mr-1" />
              Day {data.days_elapsed} of {data.days_total}
            </span>
            <span className="text-[11px] text-[var(--elena-text-muted)]">
              Response due {data.deadline_date}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--elena-border-light)]">
            <div
              className="h-2 rounded-full bg-[var(--elena-navy)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Assistance Programs Card (charity care + financial resources)
// ────────────────────────────────────────────────────────────────

export function AssistanceProgramsCard({
  data,
  onCall,
}: {
  data: AssistanceResult;
  onCall?: (program: { name: string; phone: string }) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const likelyPrograms = data.programs.filter((p) => p.eligibility === "likely");
  const possiblePrograms = data.programs.filter((p) => p.eligibility === "possible");

  const mapItems: MapItem[] = data.programs
    .map((p, i) => ({
      lat: p.latitude ?? 0,
      lng: p.longitude ?? 0,
      label: p.name,
      sublabel: p.program_name,
      index: i,
    }))
    .filter((m) => m.lat !== 0 && m.lng !== 0);

  const hasMap = mapItems.length > 0;

  const { containerRef, height } = useInlineMap({
    items: mapItems,
    height: 160,
    selectedIndex: selectedIdx,
    onSelect: (idx) => setSelectedIdx((prev) => (prev === idx ? null : idx)),
  });

  const typeLabel: Record<string, string> = {
    charity_care: "CHARITY CARE",
    grant: "GRANT",
    government: "GOVERNMENT",
    sliding_scale: "SLIDING SCALE",
    payment_plan: "PAYMENT PLAN",
  };

  const typeBadgeColor: Record<string, string> = {
    charity_care: "bg-[#F2F2F7] text-[#0F1B3D]/70",
    grant: "bg-[#F2F2F7] text-[#0F1B3D]/70",
    government: "bg-[#F2F2F7] text-[#0F1B3D]/70",
    sliding_scale: "bg-[#F2F2F7] text-[#0F1B3D]/70",
    payment_plan: "bg-[#F2F2F7] text-[#0F1B3D]/70",
  };

  function ProgramCard({ program, idx }: { program: typeof data.programs[0]; idx: number }) {
    const isSelected = selectedIdx === idx;
    const dist = formatDistance(program.distance_km);
    const isLikely = program.eligibility === "likely";

    return (
      <div
        className="rounded-xl border-[1.5px] px-3 py-2.5 cursor-pointer transition-all duration-150"
        style={{
          borderColor: isSelected ? "var(--elena-selected-border)" : "var(--elena-border-light)",
          backgroundColor: isSelected ? "var(--elena-selected-bg)" : "var(--elena-card-bg)",
        }}
        onClick={() => setSelectedIdx((prev) => (prev === idx ? null : idx))}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[var(--elena-text-primary)] truncate">
              {program.name}
            </p>
            <p className="text-[12px] text-[var(--elena-text-muted)] truncate">
              {program.program_name}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold ${typeBadgeColor[program.type] || "bg-gray-100 text-gray-600"}`}>
            {typeLabel[program.type] || program.type.toUpperCase()}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
          {program.is_501r && (
            <span className="flex items-center gap-[3px] text-[11px] font-semibold text-[#0F1B3D]/60">
              <Check className="h-3 w-3" /> 501(r) Nonprofit
            </span>
          )}
          {dist && (
            <span className="text-[11px] text-[var(--elena-text-muted)]">{dist}</span>
          )}
        </div>

        {/* Eligibility detail */}
        <p className="text-[11px] text-[var(--elena-text-muted)] mt-1">
          {program.eligibility_detail}
        </p>

        {/* Benefit + eligibility badge */}
        <div className="flex items-center justify-between gap-2 mt-2">
          {program.max_benefit && (
            <p className="text-[15px] font-bold text-[var(--elena-text-primary)]">
              {program.max_benefit}
            </p>
          )}
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${isLikely ? "bg-[#0F1B3D] text-white" : "bg-[#F2F2F7] text-[#0F1B3D]/70"}`}>
            {isLikely ? "LIKELY ELIGIBLE" : "MAY QUALIFY"}
          </span>
        </div>

        {/* Action buttons */}
        {(program.phone || program.apply_url) && (
          <div className="flex gap-2 mt-2">
            {program.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCall?.({ name: program.name, phone: program.phone! });
                }}
                className="flex items-center gap-1 rounded-xl border border-[var(--elena-border)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--elena-text-primary)] hover:bg-[var(--elena-warm-bg)] transition-colors"
              >
                <Phone className="h-3 w-3" /> Call
              </button>
            )}
            {program.apply_url && (
              <a
                href={program.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded-xl bg-[#0F1B3D] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="h-3 w-3" /> Apply
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      {hasMap && <InlineMapView containerRef={containerRef} height={height} />}

      <div className="px-3 py-2 border-b border-[var(--elena-border-light)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
          Assistance Programs · {data.programs.length} Found
        </p>
      </div>

      {data.user_context && (
        <div className="px-3 py-2 bg-[var(--elena-warm-bg)] border-b border-[var(--elena-border-light)]">
          <p className="text-[11px] text-[var(--elena-text-secondary)]">{data.user_context}</p>
        </div>
      )}

      <div className="p-3 space-y-3">
        {likelyPrograms.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0F1B3D] mb-2">
              You Likely Qualify
            </p>
            <div className="flex flex-col gap-2">
              {likelyPrograms.map((p) => {
                const idx = data.programs.indexOf(p);
                return <ProgramCard key={idx} program={p} idx={idx} />;
              })}
            </div>
          </div>
        )}

        {possiblePrograms.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-2">
              Worth Checking
            </p>
            <div className="flex flex-col gap-2">
              {possiblePrograms.map((p) => {
                const idx = data.programs.indexOf(p);
                return <ProgramCard key={idx} program={p} idx={idx} />;
              })}
            </div>
          </div>
        )}
      </div>

      {data.total_potential_benefit && (
        <div className="px-4 py-3 border-t border-[#E5E5EA] bg-white">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">
            Total potential benefit: {data.total_potential_benefit}
          </p>
        </div>
      )}
    </div>
  );
}
