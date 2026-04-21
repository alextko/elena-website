"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  X,
  Plus,
  Pencil,
  Trash2,
  Pill,
  UserRound,
  Lock,
  ClipboardList,
  CircleCheck,
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
  InsurancePlanComparison,
  InsurancePlan,
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
    // Token first — when it's empty, <InlineMapView> returns null and
    // the ref never attaches. Checking containerRef first would have
    // misleadingly reported "containerRef not attached" for what is
    // really a missing-env-var problem.
    if (!MAPBOX_TOKEN) {
      console.log("[map-debug] useInlineMap skipped: NEXT_PUBLIC_MAPBOX_TOKEN missing at build time (value is empty string)");
      return;
    }
    if (items.length === 0) {
      console.log("[map-debug] useInlineMap skipped: no map items");
      return;
    }
    if (!containerRef.current) {
      console.log("[map-debug] useInlineMap skipped: containerRef not attached");
      return;
    }
    console.log("[map-debug] useInlineMap init", { token_prefix: MAPBOX_TOKEN.slice(0, 6), items: items.length });
    let cancelled = false;

    (async () => {
      let mapboxgl;
      try {
        mapboxgl = (await import("mapbox-gl")).default;
      } catch (err) {
        console.error("[map-debug] mapbox-gl dynamic import failed", err);
        return;
      }

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

      let map;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/standard",
          bounds,
          fitBoundsOptions: { padding: 50, maxZoom: items.length === 1 ? 12 : 14 },
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchZoomRotate: true,
        });
      } catch (err) {
        console.error("[map-debug] mapboxgl.Map() constructor threw", err);
        return;
      }
      map.on("error", (e) => console.error("[map-debug] mapbox map error event", e));
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
  onSelect,
}: {
  locations: LocationResult[];
  onCall?: (loc: LocationResult) => void;
  onSelect?: (loc: LocationResult) => void;
}) {
  const formatLocationAddress = (loc: LocationResult): string | null => {
    const street = loc.address?.trim();
    const cityState = [loc.city?.trim(), loc.state?.trim()].filter(Boolean).join(", ");
    const cityLine = [cityState, loc.postal_code?.trim()].filter(Boolean).join(" ");
    const parts = [street, cityLine].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };
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
              {/* Top row: info left, action icons right */}
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
                  {formatLocationAddress(loc) && (
                    <p className="text-xs text-[var(--elena-text-secondary)] mt-px truncate">
                      {formatLocationAddress(loc)}
                    </p>
                  )}
                  {loc.phone_number && (
                    <p className="text-xs text-[var(--elena-text-secondary)] mt-px">
                      {loc.phone_number}
                    </p>
                  )}
                </div>

                {/* Action icons */}
                <div className="flex items-center gap-2 shrink-0">
                  {loc.phone_number && onCall && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCall(loc); }}
                      aria-label={`Call ${loc.name}`}
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
                      aria-label={`Directions to ${loc.name}`}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-[var(--elena-border)] text-[var(--elena-navy)] hover:bg-[var(--elena-warm-bg)] transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Bottom row: badges + rating + distance on left, "This one" pill on right */}
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 flex-1 min-w-0">
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
                  {dist && (
                    <span className="text-[11px] text-[var(--elena-text-muted)]">
                      {dist}
                    </span>
                  )}
                </div>
                {onSelect && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(loc); }}
                    className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold bg-[var(--elena-navy)] text-white hover:opacity-90 transition-opacity"
                  >
                    This one
                  </button>
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
    ? "border-[#8E8E93]"
    : isReschedule
      ? "border-[#8E8E93]"
      : "border-[#0F1B3D]";

  const titleColor = isCancellation
    ? "text-[#8E8E93]"
    : isReschedule
      ? "text-[#0F1B3D]/70"
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
//  Call Update Card
// ────────────────────────────────────────────────────────────────

export function CallUpdateCard({
  result,
  onAction,
}: {
  result: BookingResultPayload;
  onAction?: (text: string) => void;
}) {
  const isConfirmed = result.status === "confirmed";
  const isFailed = result.status === "failed";

  const statusIcon = isConfirmed ? "✓" : isFailed ? "✕" : "ℹ";
  const statusColor = isConfirmed
    ? "bg-emerald-500"
    : isFailed
      ? "bg-red-400"
      : "bg-blue-400";
  const headerText = isConfirmed ? "CALL COMPLETED" : "CALL UPDATE";
  const headerColor = isConfirmed ? "text-emerald-600" : isFailed ? "text-red-500" : "text-blue-500";

  return (
    <div className="mt-3 max-w-md rounded-2xl border border-[#0F1B3D]/[0.08] bg-white p-4 shadow-[0_4px_16px_rgba(15,27,61,0.10)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${statusColor} text-white text-xs font-bold`}>
          {statusIcon}
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${headerColor}`}>
          {headerText}
        </span>
      </div>

      {/* Provider */}
      {result.provider_name && (
        <p className="text-[15px] font-semibold text-[#0F1B3D]">
          {result.provider_name}
        </p>
      )}
      {result.provider_specialty && (
        <p className="text-[13px] text-[#0F1B3D]/50">{result.provider_specialty}</p>
      )}

      {/* Message */}
      {result.transcript_summary && (
        <p className="mt-2 text-[14px] leading-[1.6] text-[#1C1C1E]">
          {result.transcript_summary}
        </p>
      )}

      {/* Date/time for confirmed */}
      {isConfirmed && result.confirmed_date && (
        <p className="mt-2 text-[13px] font-semibold text-emerald-600">
          {formatBookingDate(result.confirmed_date, result.confirmed_time)}
        </p>
      )}

      {/* Action buttons for failed */}
      {isFailed && onAction && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAction("Find me another provider")}
            className="flex-1 rounded-xl border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.03] px-3 py-2 text-[13px] font-medium text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.06] transition-colors"
          >
            Find another provider
          </button>
          <button
            onClick={() => onAction("Try calling again")}
            className="flex-1 rounded-xl border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.03] px-3 py-2 text-[13px] font-medium text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.06] transition-colors"
          >
            Try again
          </button>
        </div>
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
  // Initialize values from default_value fields
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const f of form.fields) {
      if (f.default_value) defaults[f.key] = f.default_value;
    }
    return defaults;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageField, setActiveImageField] = useState<string | null>(null);

  // Multi-page support
  const pages = useMemo(() => {
    const map = new Map<number, typeof form.fields>();
    for (const f of form.fields) {
      const p = f.page ?? 0;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [form.fields]);
  const isMultiPage = pages.length > 1;
  const [currentPage, setCurrentPage] = useState(0);

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
    } else if (form.save_to === "medication") {
      // Pill-bottle OCR. Same pattern as the mobile flow — send to
      // /medications/ocr, merge the extracted fields into the form's values
      // so they ride the subsequent /chat/form-submit back to the agent as
      // its tool result. The agent then calls update_health_profile with
      // the fields.
      const formData = new FormData();
      formData.append("image", file);
      try {
        const res = await apiFetch("/medications/ocr", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          setValues((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(data)) {
              if (v != null && v !== "") next[k] = String(v);
            }
            next[fieldKey] = data.name ? `Scanned: ${data.name}` : "Scanned";
            return next;
          });
        } else {
          setValue(fieldKey, "Could not read the label. Try again?");
        }
      } catch {
        setValue(fieldKey, "Could not read the label. Try again?");
      }
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
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]">
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#0F1B3D]">Information saved</p>
            <p className="text-[12px] text-[#0F1B3D]/40 mt-0.5">Your details have been updated</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPageFields = isMultiPage ? (pages[currentPage]?.[1] ?? []) : form.fields;
  const currentPageTitle = isMultiPage ? currentPageFields[0]?.page_title : undefined;
  const isLastPage = !isMultiPage || currentPage >= pages.length - 1;

  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-5 shadow-[0_2px_8px_rgba(15,27,61,0.06)] animate-in fade-in duration-300">
      <h4 className="text-[16px] font-bold text-[#0F1B3D] mb-1">
        {currentPageTitle || form.title}
      </h4>
      {!currentPageTitle && form.description && (
        <p className="text-[13px] text-[#8E8E93] mb-4">{form.description}</p>
      )}
      {isMultiPage && (
        <div className="flex items-center gap-1.5 mb-4">
          {pages.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentPage ? "bg-[#0F1B3D]" : "bg-[#E5E5EA]"}`} />
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => activeImageField && handleImageUpload(e, activeImageField)} />

      <div className="space-y-3">
        {currentPageFields.map((field) => (
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
                className={`${fieldCls} resize-none`}
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={`${fieldCls} appearance-none pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat`}
              >
                <option value="">{field.placeholder || "Select..."}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === "image" ? (
              (() => {
                // OCR paths set the value to "Scanned: {name}" on success
                // (medication flow) or an error string on failure. Non-OCR
                // uploads get a storage key. Each deserves its own state so
                // the user can tell what actually happened.
                const raw = values[field.key] || "";
                const isScanned = raw.startsWith("Scanned");
                const isError = raw.startsWith("Could not");
                const hasValue = raw.length > 0;
                const base = "mt-1 w-full rounded-xl border-2 px-3.5 py-4 text-[14px] transition-colors text-left";
                const variant = isScanned
                  ? "border-solid border-[#34C759] bg-[#F0FAF3]"
                  : isError
                  ? "border-solid border-[#FF6B6B] bg-[#FFF5F5]"
                  : hasValue
                  ? "border-solid border-[#34C759] bg-[#F0FAF3]"
                  : "border-dashed border-[#E5E5EA] bg-[#FAFAFA] hover:border-[#0F1B3D]/20";
                return (
                  <button
                    onClick={() => { setActiveImageField(field.key); fileInputRef.current?.click(); }}
                    className={`${base} ${variant}`}
                  >
                    {isScanned ? (
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#34C759]">
                          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                        </span>
                        <div>
                          <div className="text-[15px] font-semibold text-[#0F1B3D]">{raw}</div>
                          <div className="text-[12px] text-[#8E8E93] mt-0.5">Tap to re-scan if anything looks off</div>
                        </div>
                      </div>
                    ) : isError ? (
                      <span className="text-[#D94545] font-medium">{raw}</span>
                    ) : hasValue ? (
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#34C759]">
                          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                        </span>
                        <span className="text-[15px] font-semibold text-[#0F1B3D]">Photo uploaded</span>
                      </div>
                    ) : (
                      <span className="text-[#AEAEB2] block text-center">
                        {field.placeholder || "Tap to upload"}
                      </span>
                    )}
                  </button>
                );
              })()
            ) : (
              <input
                type={field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
                value={values[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={fieldCls}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        {isMultiPage && currentPage > 0 && (
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
          >
            Back
          </button>
        )}
        {isLastPage ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="flex-1 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors"
          >
            Next
          </button>
        )}
        {isLastPage && (
          <button
            onClick={() => { setSubmitted(true); onSubmitted?.({}); }}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Health Profile Intake Card
// ────────────────────────────────────────────────────────────────

const DOSAGE_FORMS = ["Tablet", "Capsule", "Liquid", "Powder", "Crushed", "Injection", "Patch", "Cream", "Drops", "Inhaler", "Nasal Spray", "Spray", "Other"];
const FREQUENCIES = ["Once per day", "Twice per day", "3 times per day", "Every other day", "Weekly", "As needed", "Other"];
const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Bedtime", "With meals", "Other"];
const CONDITION_STATUSES = ["Active", "Managed", "In remission"];
const ALLERGY_TYPES = ["Drug", "Food", "Environmental", "Insect", "Latex", "Other"];
const REACTIONS = ["Rash/Hives", "Swelling", "Difficulty breathing", "Anaphylaxis", "Nausea/Vomiting", "Other"];
const SEVERITIES = ["Mild", "Moderate", "Severe"];
const SPECIALTIES = [
  "Primary Care", "OB/GYN", "Dentist", "Eye Doctor", "Pharmacy",
  "Dermatology", "Cardiology", "Endocrinology", "Gastroenterology",
  "Neurology", "Orthopedics", "Pulmonology", "Rheumatology",
  "Psychiatry", "Therapist", "Allergy/Immunology", "ENT", "Urology",
  "Nephrology", "Oncology", "Pain Management", "Physical Therapy", "Other",
];
const VISIT_TYPES = [
  "Annual physical", "Sick visit", "Specialist consult", "Follow-up",
  "Preventive screening", "Lab work", "Imaging", "Procedure", "Emergency",
  "Urgent care", "Telehealth", "Dental", "Eye exam", "Other",
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function SelectField({ label, value, placeholder, options, onChange, multi }: {
  label: string; value: string; placeholder: string; options: string[];
  onChange: (v: string) => void; multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = multi ? value.split(", ").filter(Boolean) : [];
  const toggle = (item: string) => {
    if (!multi) { onChange(item); setOpen(false); return; }
    const next = selected.includes(item) ? selected.filter((s) => s !== item) : [...selected, item];
    onChange(next.join(", "));
  };
  return (
    <div className="mt-2.5">
      <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 w-full flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-left outline-none focus:border-[#0F1B3D]/30 transition-colors"
      >
        <span className={value ? "text-[#0F1B3D]" : "text-[#AEAEB2]"}>{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-[#AEAEB2]" />
      </button>
      {open && (
        <div className="mt-1 rounded-xl border border-[#E5E5EA] bg-white shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => {
            const active = multi ? selected.includes(opt) : value === opt;
            return (
              <button key={opt} type="button" onClick={() => toggle(opt)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[14px] text-left border-b border-[#E5E5EA]/50 last:border-b-0 transition-colors ${active ? "bg-[#0F1B3D]/[0.04] font-semibold text-[#0F1B3D]" : "text-[#0F1B3D] hover:bg-[#F2F2F7]"}`}
              >
                {opt}
                {active && <Check className="h-4 w-4 text-[#0F1B3D]" />}
              </button>
            );
          })}
          {multi && (
            <button type="button" onClick={() => setOpen(false)}
              className="w-full py-2.5 text-[14px] font-semibold text-[#0F1B3D] bg-[#F2F2F7] rounded-b-xl"
            >Done</button>
          )}
        </div>
      )}
    </div>
  );
}

function ConditionFormFields({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";
  return (
    <>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Condition name *</label>
        <input className={fieldCls} placeholder="e.g. Type 2 Diabetes" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></div>
      <SelectField label="Status" value={form.status} placeholder="Select status" options={CONDITION_STATUSES} onChange={(v) => onChange({ ...form, status: v })} />
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">When diagnosed</label>
        <input className={fieldCls} placeholder="e.g. 2020 or March 2023" value={form.diagnosed_date} onChange={(e) => onChange({ ...form, diagnosed_date: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Notes</label>
        <textarea className={fieldCls + " min-h-[60px] resize-none"} placeholder="Additional details" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></div>
    </>
  );
}

function MedicationFormFields({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";
  return (
    <>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Medication name *</label>
        <input className={fieldCls} placeholder="e.g. Metformin" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Strength</label>
        <input className={fieldCls} placeholder="e.g. 500mg" value={form.dosage_strength} onChange={(e) => onChange({ ...form, dosage_strength: e.target.value })} /></div>
      <SelectField label="Form" value={form.dosage_form} placeholder="Tablet, Capsule, etc." options={DOSAGE_FORMS} onChange={(v) => onChange({ ...form, dosage_form: v })} />
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Dose</label>
        <input className={fieldCls} placeholder="e.g. 1 tablet" value={form.dose} onChange={(e) => onChange({ ...form, dose: e.target.value })} /></div>
      <SelectField label="Frequency" value={form.frequency} placeholder="How often?" options={FREQUENCIES} onChange={(v) => onChange({ ...form, frequency: v })} />
      <SelectField label="Time of day" value={form.time_of_day} placeholder="When do you take it?" options={TIMES_OF_DAY} onChange={(v) => onChange({ ...form, time_of_day: v })} />
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Prescribed for</label>
        <input className={fieldCls} placeholder="e.g. High blood pressure" value={form.indication} onChange={(e) => onChange({ ...form, indication: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Prescribing doctor</label>
        <input className={fieldCls} placeholder="Doctor's name" value={form.prescribing_doctor} onChange={(e) => onChange({ ...form, prescribing_doctor: e.target.value })} /></div>
      <button type="button" onClick={() => onChange({ ...form, is_otc: !form.is_otc })} className="mt-3 flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-colors ${form.is_otc ? "bg-[#0F1B3D] border-[#0F1B3D]" : "border-[#E5E5EA] bg-white"}`}>
          {form.is_otc && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
        <span className="text-[14px] text-[#8E8E93]">Over-the-counter / supplement</span>
      </button>
    </>
  );
}

function AllergyFormFields({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";
  return (
    <>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Allergen *</label>
        <input className={fieldCls} placeholder="e.g. Penicillin, Peanuts" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></div>
      <SelectField label="Type" value={form.type} placeholder="Drug, Food, etc." options={ALLERGY_TYPES} onChange={(v) => onChange({ ...form, type: v })} />
      <SelectField label="Reaction" value={form.reaction} placeholder="Select reactions" options={REACTIONS} onChange={(v) => onChange({ ...form, reaction: v })} multi />
      <SelectField label="Severity" value={form.severity} placeholder="Mild, Moderate, Severe" options={SEVERITIES} onChange={(v) => onChange({ ...form, severity: v })} />
    </>
  );
}

function DoctorFormFields({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";
  return (
    <>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Name *</label>
        <input className={fieldCls} placeholder="e.g. Dr. Sarah Chen" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></div>
      <SelectField label="Specialty" value={form.specialty} placeholder="Select specialty" options={SPECIALTIES} onChange={(v) => onChange({ ...form, specialty: v })} />
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Practice / clinic</label>
        <input className={fieldCls} placeholder="e.g. Bay Area Primary Care" value={form.practice_name} onChange={(e) => onChange({ ...form, practice_name: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Phone</label>
        <input className={fieldCls} placeholder="e.g. (415) 555-0100" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Address</label>
        <input className={fieldCls} placeholder="Office address" value={form.address} onChange={(e) => onChange({ ...form, address: e.target.value })} /></div>
    </>
  );
}

function VisitFormFields({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const fieldCls = "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30";
  return (
    <>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Provider / doctor *</label>
        <input className={fieldCls} placeholder="e.g. Dr. Sarah Chen" value={form.provider_name} onChange={(e) => onChange({ ...form, provider_name: e.target.value })} /></div>
      <SelectField label="Visit type" value={form.visit_type} placeholder="Annual physical, follow-up, etc." options={VISIT_TYPES} onChange={(v) => onChange({ ...form, visit_type: v })} />
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Date</label>
        <input type="date" className={fieldCls} value={form.visit_date} onChange={(e) => onChange({ ...form, visit_date: e.target.value })} /></div>
      <div className="mt-2.5"><label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Notes</label>
        <textarea className={fieldCls + " min-h-[60px] resize-none"} placeholder="What it was for, outcome, anything to remember" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></div>
    </>
  );
}

function ItemPill({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 mb-1.5">
      <span className="text-[14px] text-[#0F1B3D] truncate flex-1 mr-2">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onEdit} className="text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onDelete} className="text-[#8E8E93] hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function HealthProfileIntakeCard({ form, onSubmitted }: {
  form: FormRequest;
  onSubmitted?: (data: Record<string, string>) => void;
}) {
  const sections = form.sections || ["conditions", "medications", "allergies"];
  const existing = form.existing || {};

  type AnyItem = { id: string; [k: string]: any };
  const [conditions, setConditions] = useState<AnyItem[]>((existing.conditions || []).map((c: any) => ({ id: generateId(), ...c })));
  const [medications, setMedications] = useState<AnyItem[]>((existing.medications || []).map((m: any) => ({ id: generateId(), ...m })));
  const [allergies, setAllergies] = useState<AnyItem[]>((existing.allergies || []).map((a: any) => ({ id: generateId(), ...a })));
  const [doctors, setDoctors] = useState<AnyItem[]>((existing.doctors || []).map((d: any) => ({ id: d.id || generateId(), ...d })));
  const [visits, setVisits] = useState<AnyItem[]>((existing.visits || []).map((v: any) => ({ id: v.id || generateId(), ...v })));

  const [currentPage, setCurrentPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [condForm, setCondForm] = useState({ name: "", status: "", diagnosed_date: "", notes: "" });
  const [medForm, setMedForm] = useState({ name: "", dosage_strength: "", dosage_form: "", dose: "", frequency: "", time_of_day: "", indication: "", prescribing_doctor: "", is_otc: false });
  const [allergyForm, setAllergyForm] = useState({ name: "", type: "", reaction: "", severity: "" });
  const [doctorForm, setDoctorForm] = useState({ name: "", specialty: "", practice_name: "", phone: "", address: "" });
  const [visitForm, setVisitForm] = useState({ provider_name: "", visit_type: "", visit_date: "", notes: "" });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentSection = sections[currentPage];
  const isLastPage = currentPage === sections.length - 1;
  const sectionLabels: Record<string, string> = {
    conditions: "Conditions",
    medications: "Medications",
    allergies: "Allergies",
    doctors: "Doctors",
    visits: "Past Visits",
  };

  function getItems(): AnyItem[] {
    if (currentSection === "conditions") return conditions;
    if (currentSection === "medications") return medications;
    if (currentSection === "allergies") return allergies;
    if (currentSection === "doctors") return doctors;
    if (currentSection === "visits") return visits;
    return [];
  }

  function itemLabel(item: AnyItem): string {
    if (currentSection === "conditions") return [item.name, item.status].filter(Boolean).join(" — ");
    if (currentSection === "medications") return [item.name, item.dosage_strength, item.frequency].filter(Boolean).join(" · ");
    if (currentSection === "allergies") return [item.name, item.severity].filter(Boolean).join(" — ");
    if (currentSection === "doctors") return [item.name || item.practice_name, item.specialty].filter(Boolean).join(" — ");
    if (currentSection === "visits") return [item.provider_name, item.visit_type, item.visit_date].filter(Boolean).join(" · ");
    return item.name || "";
  }

  function startAdd() {
    if (currentSection === "conditions") setCondForm({ name: "", status: "", diagnosed_date: "", notes: "" });
    if (currentSection === "medications") setMedForm({ name: "", dosage_strength: "", dosage_form: "", dose: "", frequency: "", time_of_day: "", indication: "", prescribing_doctor: "", is_otc: false });
    if (currentSection === "allergies") setAllergyForm({ name: "", type: "", reaction: "", severity: "" });
    if (currentSection === "doctors") setDoctorForm({ name: "", specialty: "", practice_name: "", phone: "", address: "" });
    if (currentSection === "visits") setVisitForm({ provider_name: "", visit_type: "", visit_date: "", notes: "" });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(id: string) {
    setEditingId(id);
    if (currentSection === "conditions") { const i = conditions.find((c) => c.id === id); if (i) setCondForm({ name: i.name, status: i.status, diagnosed_date: i.diagnosed_date, notes: i.notes }); }
    if (currentSection === "medications") { const i = medications.find((m) => m.id === id); if (i) setMedForm({ name: i.name, dosage_strength: i.dosage_strength, dosage_form: i.dosage_form, dose: i.dose, frequency: i.frequency, time_of_day: i.time_of_day, indication: i.indication, prescribing_doctor: i.prescribing_doctor, is_otc: i.is_otc }); }
    if (currentSection === "allergies") { const i = allergies.find((a) => a.id === id); if (i) setAllergyForm({ name: i.name, type: i.type, reaction: i.reaction, severity: i.severity }); }
    if (currentSection === "doctors") { const i = doctors.find((d) => d.id === id); if (i) setDoctorForm({ name: i.name || "", specialty: i.specialty || "", practice_name: i.practice_name || "", phone: i.phone || "", address: i.address || "" }); }
    if (currentSection === "visits") { const i = visits.find((v) => v.id === id); if (i) setVisitForm({ provider_name: i.provider_name || "", visit_type: i.visit_type || "", visit_date: i.visit_date || "", notes: i.notes || "" }); }
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (currentSection === "conditions") setConditions((p) => p.filter((c) => c.id !== id));
    if (currentSection === "medications") setMedications((p) => p.filter((m) => m.id !== id));
    if (currentSection === "allergies") setAllergies((p) => p.filter((a) => a.id !== id));
    if (currentSection === "doctors") setDoctors((p) => p.filter((d) => d.id !== id));
    if (currentSection === "visits") setVisits((p) => p.filter((v) => v.id !== id));
  }

  function saveItem() {
    if (currentSection === "conditions") {
      if (!condForm.name.trim()) return;
      const item = { id: editingId || generateId(), ...condForm };
      setConditions((p) => editingId ? p.map((c) => (c.id === editingId ? item : c)) : [...p, item]);
    } else if (currentSection === "medications") {
      if (!medForm.name.trim()) return;
      const item = { id: editingId || generateId(), ...medForm };
      setMedications((p) => editingId ? p.map((m) => (m.id === editingId ? item : m)) : [...p, item]);
    } else if (currentSection === "allergies") {
      if (!allergyForm.name.trim()) return;
      const item = { id: editingId || generateId(), ...allergyForm };
      setAllergies((p) => editingId ? p.map((a) => (a.id === editingId ? item : a)) : [...p, item]);
    } else if (currentSection === "doctors") {
      if (!doctorForm.name.trim() && !doctorForm.practice_name.trim()) return;
      const item = { id: editingId || generateId(), ...doctorForm };
      setDoctors((p) => editingId ? p.map((d) => (d.id === editingId ? item : d)) : [...p, item]);
    } else if (currentSection === "visits") {
      if (!visitForm.provider_name.trim()) return;
      const item = { id: editingId || generateId(), ...visitForm };
      setVisits((p) => editingId ? p.map((v) => (v.id === editingId ? item : v)) : [...p, item]);
    }
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const data: Record<string, string> = {};
      const stripId = (items: AnyItem[]) => items.map(({ id, ...rest }) => rest);
      if (sections.includes("conditions") && conditions.length > 0) data.conditions = JSON.stringify(stripId(conditions));
      if (sections.includes("medications") && medications.length > 0) data.medications = JSON.stringify(stripId(medications));
      if (sections.includes("allergies") && allergies.length > 0) data.allergies = JSON.stringify(stripId(allergies));
      // Keep doctor IDs so server merges by id; visits are insert-only so strip ids.
      if (sections.includes("doctors") && doctors.length > 0) data.doctors = JSON.stringify(doctors);
      if (sections.includes("visits") && visits.length > 0) data.visits = JSON.stringify(stripId(visits));
      await apiFetch("/chat/form-submit", { method: "POST", body: JSON.stringify({ form_id: form.form_id, save_to: "health_profile", data }) });
      setSubmitted(true);
      onSubmitted?.(data);
    } catch {}
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]">
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#0F1B3D]">Health profile updated</p>
            <p className="text-[12px] text-[#0F1B3D]/40 mt-0.5">Your health information has been saved</p>
          </div>
        </div>
      </div>
    );
  }

  const items = getItems();
  const addLabel =
    currentSection === "conditions" ? "a condition"
    : currentSection === "medications" ? "a medication"
    : currentSection === "allergies" ? "an allergy"
    : currentSection === "doctors" ? "a doctor"
    : currentSection === "visits" ? "a past visit"
    : "an item";

  return (
    <div className="mt-3 rounded-2xl border border-[#0F1B3D]/[0.06] bg-white p-5 shadow-[0_2px_8px_rgba(15,27,61,0.06)] animate-in fade-in duration-300">
      <h4 className="text-[16px] font-bold text-[#0F1B3D] mb-1">{form.title || "Your Health Profile"}</h4>
      {form.description && <p className="text-[13px] text-[#8E8E93] mb-4">{form.description}</p>}

      {sections.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4">
          {sections.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentPage ? "bg-[#0F1B3D]" : "bg-[#E5E5EA]"}`} />
          ))}
        </div>
      )}

      <h5 className="text-[15px] font-bold text-[#0F1B3D] mb-3">{sectionLabels[currentSection] || currentSection}</h5>

      {items.map((item) => (
        <ItemPill key={item.id} label={itemLabel(item)} onEdit={() => startEdit(item.id)} onDelete={() => handleDelete(item.id)} />
      ))}

      {!showForm && (
        <button type="button" onClick={startAdd} className="flex items-center gap-1.5 mt-2 text-[14px] font-semibold text-[#0F1B3D] hover:opacity-70 transition-opacity">
          <Plus className="h-4 w-4" />Add {addLabel}
        </button>
      )}

      {showForm && (
        <div className="mt-2 rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          {currentSection === "conditions" && <ConditionFormFields form={condForm} onChange={setCondForm} />}
          {currentSection === "medications" && <MedicationFormFields form={medForm} onChange={setMedForm} />}
          {currentSection === "allergies" && <AllergyFormFields form={allergyForm} onChange={setAllergyForm} />}
          {currentSection === "doctors" && <DoctorFormFields form={doctorForm} onChange={setDoctorForm} />}
          {currentSection === "visits" && <VisitFormFields form={visitForm} onChange={setVisitForm} />}
          <button type="button" onClick={saveItem} className="mt-4 w-full rounded-xl bg-[#0F1B3D] py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors">
            {editingId ? "Update" : "Save"}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="mt-1 w-full py-2 text-[14px] text-[#8E8E93] hover:text-[#0F1B3D] transition-colors">
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        {currentPage > 0 && (
          <button type="button" onClick={() => { setCurrentPage((p) => p - 1); setShowForm(false); }} className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors">
            Back
          </button>
        )}
        {isLastPage ? (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
          >{submitting ? "Submitting..." : "Submit"}</button>
        ) : (
          <button type="button" onClick={() => { setCurrentPage((p) => p + 1); setShowForm(false); }}
            className="flex-1 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors"
          >Next</button>
        )}
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
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[0.6rem] font-bold text-white mb-2">
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
                      <p className={`${isBest ? "text-[22px] font-bold text-emerald-600" : "text-[18px] font-bold text-[var(--elena-text-primary)]"}`}>
                        ${Math.round(price).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--elena-text-muted)]">est. out-of-pocket</p>
                    </>
                  )}
                </div>
              </div>

              {isBest && totalSavings > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-600">
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
      <div className="px-4 py-3 border-b border-[#E5E5EA]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--elena-text-muted)]">
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

          const badgeColor = item.issue_type === "overcharge" || item.issue_type === "unnecessary"
            ? "bg-red-50 text-red-600"
            : item.issue_type === "above_average"
              ? "bg-amber-50 text-amber-600"
              : "bg-[#F2F2F7] text-[#0F1B3D]/70";

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
                <span className="text-[14px] text-red-400 line-through">
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
          <span className="text-sm text-red-400 line-through">
            ${totalCharged.toLocaleString()}
          </span>
          <span className="text-xl font-bold text-[#0F1B3D]">
            ${totalFair.toLocaleString()}
          </span>
          {savingsPct > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-600">
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

export function AppealScriptCard({ data, onSend }: { data: AppealScript; onSend?: () => void }) {
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
      <div className="px-4 py-3 border-b border-[#E5E5EA] bg-red-50/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.6rem] font-bold text-red-600">DENIED</span>
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
          <button
            onClick={onSend}
            className="flex items-center gap-1.5 rounded-xl bg-[#0F1B3D] px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
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

    return (
      <div
        className="rounded-xl border-[1.5px] px-3 py-2.5 cursor-pointer transition-all duration-150"
        style={{
          borderColor: isSelected ? "var(--elena-selected-border)" : "var(--elena-border-light)",
          backgroundColor: isSelected ? "var(--elena-selected-bg)" : "var(--elena-card-bg)",
        }}
        onClick={() => setSelectedIdx((prev) => (prev === idx ? null : idx))}
      >
        {/* Top row: info left, action right */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[15px] font-bold text-[var(--elena-text-primary)] truncate">
              {program.name}
            </p>
            <p className="text-xs text-[var(--elena-text-muted)] mt-px truncate">
              {program.program_name}
            </p>
            <p className="text-[13px] text-[var(--elena-text-secondary)] mt-px truncate">
              {typeLabel[program.type] || program.type}
            </p>
          </div>

          {program.apply_url ? (
            <a
              href={program.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-xl bg-[#0F1B3D] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Apply
            </a>
          ) : program.phone ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCall?.({ name: program.name, phone: program.phone! });
              }}
              className="shrink-0 rounded-xl bg-[#0F1B3D] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Call
            </button>
          ) : null}
        </div>

        {/* Bottom row: badges left, benefit right */}
        <div className="flex items-end justify-between gap-2 mt-1">
          <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
            {program.is_501r && (
              <span className="flex items-center gap-[3px] text-[11px] font-semibold text-[var(--elena-text-secondary)]">
                <Check className="h-3 w-3" /> 501(r) Nonprofit
              </span>
            )}
            {dist && (
              <span className="text-[11px] text-[var(--elena-text-muted)]">{dist}</span>
            )}
            <span className="text-[11px] text-[var(--elena-text-muted)]">
              {program.eligibility === "likely" ? "Likely eligible" : "May qualify"}
            </span>
          </div>

          {program.max_benefit && (
            <div className="shrink-0 text-right">
              <p className="text-[17px] font-bold text-[var(--elena-text-primary)]">
                {program.max_benefit}
              </p>
            </div>
          )}
        </div>
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

      {/* Program cards */}
      <div className="flex flex-col gap-2.5 p-3">
        {data.programs.map((p, idx) => (
          <ProgramCard key={idx} program={p} idx={idx} />
        ))}
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

// ─────────────────────────────────────────────────────────────────
//  InsurancePlanComparisonCard
// ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-800",
  Silver: "bg-gray-100 text-gray-700",
  Gold: "bg-yellow-100 text-yellow-800",
  Platinum: "bg-indigo-100 text-indigo-800",
};

export function InsurancePlanComparisonCard({ data }: { data: InsurancePlanComparison }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <div className="mt-3 max-w-md rounded-2xl bg-white elena-card-shadow overflow-hidden border border-[var(--elena-border-light)]">
      <div className="px-3 py-2 border-b border-[var(--elena-border-light)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--elena-text-muted)]">
          Plan Comparison &middot; {data.plans.length} Plans
        </p>
        <p className="text-[11px] text-[var(--elena-text-muted)] mt-0.5">{data.user_context}</p>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {data.plans.map((plan, i) => {
          const isRecommended = plan.recommended;
          const isSelected = selectedIdx === i;

          return (
            <div
              key={plan.name}
              className="rounded-xl px-3 py-3 cursor-pointer transition-all duration-150"
              style={{
                borderWidth: "1.5px",
                borderStyle: "solid",
                borderColor: isSelected
                  ? "var(--elena-selected-border)"
                  : isRecommended
                  ? "var(--elena-green)"
                  : "var(--elena-border-light)",
                backgroundColor: isSelected
                  ? "var(--elena-selected-bg)"
                  : isRecommended
                  ? "var(--elena-green-bg)"
                  : "var(--elena-card-bg)",
              }}
              onClick={() => setSelectedIdx((prev) => (prev === i ? null : i))}
            >
              {isRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[0.6rem] font-bold text-white mb-2">
                  BEST FIT
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--elena-text-primary)] truncate">{plan.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${TIER_COLORS[plan.tier] || "bg-gray-100 text-gray-700"}`}>
                      {plan.tier}
                    </span>
                    <span className="text-[11px] text-[var(--elena-text-muted)]">
                      ${plan.deductible.toLocaleString()} deductible
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={isRecommended ? "text-[22px] font-bold text-emerald-600" : "text-[18px] font-bold text-[var(--elena-text-primary)]"}>
                    ${plan.monthly_premium}/mo
                  </p>
                  <p className="text-[10px] text-[var(--elena-text-muted)]">
                    ~${plan.estimated_yearly_cost.toLocaleString()}/yr total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                  {plan.doctor_in_network ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className={plan.doctor_in_network ? "text-emerald-700" : "text-red-500"}>
                    {plan.doctor_name || "Doctor"} {plan.doctor_in_network ? "in-network" : "out-of-network"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                  {plan.medication_covered ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className={plan.medication_covered ? "text-emerald-700" : "text-red-500"}>
                    {plan.medication_name || "Medication"} {plan.medication_covered ? "covered" : "not covered"}
                  </span>
                </span>
              </div>

              {isRecommended && plan.recommendation_reason && (
                <p className="mt-2 text-[12px] text-emerald-700 font-medium">{plan.recommendation_reason}</p>
              )}
            </div>
          );
        })}
      </div>

      {data.recommendation_summary && (
        <div className="border-t border-[var(--elena-border-light)] px-4 py-3 bg-[var(--elena-warm-bg)]">
          <p className="text-[13px] font-semibold text-[var(--elena-text-primary)]">{data.recommendation_summary}</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// RefillPlanCreatedCard — receipt for medication save → refill planner.
//
// Mirrors the salmon Game Plan tile in the profile popover so users see
// a consistent visual when calls land in chat versus on the Health tab.
// Backend payload: ChatResponse.refill_plan_created (api_chat.py).
// ──────────────────────────────────────────────────────────────────────

export interface RefillPlanCreatedPayload {
  medication: {
    id?: string;
    name?: string;
    dosage_strength?: string | null;
    pharmacy_name?: string | null;
    refills_remaining?: string | null;
  };
  scheduled: number;
  events: Array<{
    scheduled_at?: string | null;
    call_type?: string | null;
    title?: string | null;
    subtitle?: string | null;
  }>;
  hipaa_signed?: boolean | null;
}

function formatRefillDate(iso: string | null | undefined): string {
  if (!iso) return "";
  // scheduled_at can come in as "2026-04-26" or "2026-04-26T00:00:00".
  const base = iso.slice(0, 10);
  try {
    const d = new Date(`${base}T12:00:00`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return base;
  }
}

export function RefillPlanCreatedCard({ data }: { data: RefillPlanCreatedPayload }) {
  const med = data.medication || {};
  const events = (data.events || []).filter((e) => e?.scheduled_at);
  const medLabel = [med.name, med.dosage_strength].filter(Boolean).join(" ");

  return (
    <div
      className="mt-3 rounded-[20px] overflow-hidden"
      style={{
        background: "#F4B084",
        boxShadow: "0 8px 30px rgba(0,0,0,0.10), 0 3px 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#7A3040" }}>
          <Pill className="h-3.5 w-3.5" />
          <span>Refills scheduled</span>
        </div>
        <h3 className="mt-1 text-[20px] font-extrabold leading-tight" style={{ color: "#5C1A2A" }}>
          {medLabel || "Medication added"}
        </h3>
        {med.pharmacy_name && (
          <p className="text-[13px] font-medium mt-0.5" style={{ color: "#7A3040" }}>
            Calls go to {med.pharmacy_name}
          </p>
        )}
      </div>

      {/* HIPAA-unsigned banner */}
      {data.hipaa_signed === false && (
        <div
          className="mx-3 mb-2 rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(92,26,42,0.18)" }}
        >
          <Lock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#5C1A2A" }} />
          <p className="text-[12px] leading-relaxed" style={{ color: "#5C1A2A" }}>
            Calls are queued — sign the HIPAA authorization to let Elena make them on your behalf.
          </p>
        </div>
      )}

      {/* Game Plan-style event list */}
      <div className="bg-white/95 mx-3 mb-3 rounded-xl overflow-hidden">
        {events.map((ev, i) => {
          const isRenewal = ev.call_type === "prescriber_renewal";
          return (
            <div key={i}>
              {i > 0 && <div className="h-px mx-[14px]" style={{ background: "rgba(92,26,42,0.15)" }} />}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon circle — Game Plan uses a check circle; we use Pill or Doctor */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "#F4B084" }}
                >
                  {isRenewal ? (
                    <UserRound className="h-4 w-4 text-white" strokeWidth={2.5} />
                  ) : (
                    <Pill className="h-4 w-4 text-white" strokeWidth={2.5} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold leading-tight" style={{ color: "#5C1A2A" }}>
                    {ev.title || (isRenewal ? "Renew prescription" : "Refill")}
                  </p>
                  {ev.subtitle && (
                    <p className="text-[12.5px] mt-[2px] leading-snug" style={{ color: "#7A3040" }}>
                      {ev.subtitle}
                    </p>
                  )}
                </div>

                {/* Date pill on the right */}
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
                  style={{ background: "rgba(92,26,42,0.10)", color: "#5C1A2A" }}
                >
                  {formatRefillDate(ev.scheduled_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-1">
        <p className="text-[11px] font-medium" style={{ color: "rgba(92,26,42,0.7)" }}>
          You'll see these on your Game Plan in the Health tab.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CarePlanCard — Game-Plan-styled card for a curated condition care plan.
//
// Emitted by the backend whenever `get_care_plan_for_condition` matches
// the user's stated condition against the template library. Visually
// echoes the Game Plan tile in the profile popover (same salmon, same
// white inner card, same row layout) so users see "oh, this is the plan
// that lives in my Health tab" without the agent having to explain.
// Backend payload: ChatResponse.care_plan_shown (api_chat.py).
// ──────────────────────────────────────────────────────────────────────

export interface CarePlanItemPayload {
  id: string;
  label: string;
  todo_text: string;
}

export interface CarePlanShownPayload {
  key: string;
  condition_name: string;
  plan_items: CarePlanItemPayload[];
  source?: string | null;
}

export function CarePlanCard({ data }: { data: CarePlanShownPayload }) {
  const items = data.plan_items || [];

  return (
    <div
      className="mt-3 rounded-[20px] overflow-hidden"
      style={{
        background: "#F4B084",
        boxShadow: "0 8px 30px rgba(0,0,0,0.10), 0 3px 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#7A3040" }}>
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Care plan</span>
        </div>
        <h3 className="mt-1 text-[20px] font-extrabold leading-tight" style={{ color: "#5C1A2A" }}>
          {data.condition_name}
        </h3>
        <p className="text-[13px] font-medium mt-0.5" style={{ color: "#7A3040" }}>
          {items.length} next step{items.length === 1 ? "" : "s"} I can help with
        </p>
      </div>

      {/* Game Plan-style item list */}
      {items.length > 0 && (
        <div className="bg-white/95 mx-3 mb-3 rounded-xl overflow-hidden">
          {items.map((item, i) => (
            <div key={item.id || i}>
              {i > 0 && <div className="h-px mx-[14px]" style={{ background: "rgba(92,26,42,0.15)" }} />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "#F4B084" }}
                >
                  <CircleCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold leading-tight" style={{ color: "#5C1A2A" }}>
                    {item.todo_text}
                  </p>
                  <p className="text-[12.5px] mt-[2px] leading-snug" style={{ color: "#7A3040" }}>
                    {item.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer — source citation for clinical provenance */}
      <div className="px-5 pb-4 pt-1">
        <p className="text-[11px] font-medium" style={{ color: "rgba(92,26,42,0.7)" }}>
          {data.source
            ? `Based on ${data.source}. I can add any of these to your Game Plan.`
            : "I can add any of these to your Game Plan."}
        </p>
      </div>
    </div>
  );
}
