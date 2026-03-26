"use client";

import { useState } from "react";
import { MapPin, Phone, Star, ExternalLink, ChevronDown, ChevronUp, DollarSign, Check } from "lucide-react";
import type {
  DoctorResult,
  LocationResult,
  ReviewResult,
  SourcePayload,
  BillAnalysis,
  NegotiationResult,
} from "@/lib/types";

// --- Doctor Results Card ---

export function DoctorResultsCard({ doctors }: { doctors: DoctorResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? doctors : doctors.slice(0, 3);

  return (
    <div className="mt-3 rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#0F1B3D]/[0.06]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1B3D]/40">
          {doctors.length} Provider{doctors.length !== 1 ? "s" : ""} Found
        </p>
      </div>
      <div className="divide-y divide-[#0F1B3D]/[0.04]">
        {visible.map((doc, i) => (
          <div key={doc.npi_number || i} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#0F1B3D] truncate">{doc.name}</p>
                {doc.in_network && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[0.6rem] font-semibold text-green-700">
                    In-Network
                  </span>
                )}
              </div>
              <p className="text-xs text-[#0F1B3D]/50 mt-0.5">
                {doc.specialty}
                {doc.practice_name ? ` · ${doc.practice_name}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {doc.google_rating && (
                  <span className="flex items-center gap-0.5 text-xs text-[#0F1B3D]/50">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {doc.google_rating}
                    {doc.google_review_count ? ` (${doc.google_review_count})` : ""}
                  </span>
                )}
                {doc.distance_km != null && (
                  <span className="flex items-center gap-0.5 text-xs text-[#0F1B3D]/40">
                    <MapPin className="h-3 w-3" />
                    {doc.distance_km < 1
                      ? `${Math.round(doc.distance_km * 1000)}m`
                      : `${doc.distance_km.toFixed(1)} km`}
                  </span>
                )}
                {doc.estimated_oop != null && (
                  <span className="flex items-center gap-0.5 text-xs text-[#0F1B3D]/50">
                    <DollarSign className="h-3 w-3" />
                    ~${doc.estimated_oop.toFixed(0)} est. OOP
                  </span>
                )}
              </div>
              {doc.address && (
                <p className="text-xs text-[#0F1B3D]/30 mt-1 truncate">
                  {[doc.address, doc.city, doc.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            {doc.phone_number && (
              <a
                href={`tel:${doc.phone_number}`}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#0F1B3D]/[0.06] text-[#0F1B3D]/40 hover:bg-[#0F1B3D]/[0.1] transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
      {doctors.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-[#0F1B3D]/[0.06] py-2 text-xs font-medium text-[#0F1B3D]/40 hover:text-[#0F1B3D]/60 transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show {doctors.length - 3} more <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}

// --- Location Results Card ---

export function LocationResultsCard({ locations }: { locations: LocationResult[] }) {
  return (
    <div className="mt-3 rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#0F1B3D]/[0.06]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1B3D]/40">
          {locations.length} Location{locations.length !== 1 ? "s" : ""} Found
        </p>
      </div>
      <div className="divide-y divide-[#0F1B3D]/[0.04]">
        {locations.map((loc, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#0F1B3D]">{loc.name}</p>
              {loc.rating && (
                <span className="flex items-center gap-0.5 text-xs text-[#0F1B3D]/50">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  {loc.rating}
                </span>
              )}
            </div>
            {loc.category && (
              <p className="text-xs text-[#0F1B3D]/40 mt-0.5">{loc.category}</p>
            )}
            {loc.address && (
              <p className="text-xs text-[#0F1B3D]/30 mt-1">{loc.address}</p>
            )}
            {loc.phone_number && (
              <a href={`tel:${loc.phone_number}`} className="text-xs text-blue-500 mt-1 inline-block">
                {loc.phone_number}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Reviews Card ---

export function ReviewsCard({ data }: { data: ReviewResult }) {
  if (!data.reviews || data.reviews.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#0F1B3D]/[0.06] flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1B3D]/40">
          Reviews for {data.doctor_name}
        </p>
        {data.healthgrades_rating && (
          <span className="flex items-center gap-0.5 text-xs text-[#0F1B3D]/50">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            {data.healthgrades_rating}
          </span>
        )}
      </div>
      <div className="divide-y divide-[#0F1B3D]/[0.04]">
        {data.reviews.slice(0, 3).map((review, i) => (
          <div key={i} className="px-4 py-3">
            {review.rating && (
              <div className="flex gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-3 w-3 ${j < review.rating! ? "text-amber-400 fill-amber-400" : "text-[#0F1B3D]/10"}`}
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-[#0F1B3D]/60 leading-relaxed">{review.text}</p>
            {review.date && (
              <p className="text-[0.65rem] text-[#0F1B3D]/25 mt-1">{review.date}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Bill Analysis / Savings Card ---

export function SavingsCard({ data }: { data: BillAnalysis }) {
  return (
    <div className="mt-3 rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#0F1B3D]/[0.06]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1B3D]/40">
          Bill Analysis
        </p>
      </div>
      <div className="px-4 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#0F1B3D]/40">
              <th className="text-left pb-2 font-medium">Item</th>
              <th className="text-right pb-2 font-medium">Billed</th>
              <th className="text-right pb-2 font-medium">Fair Price</th>
            </tr>
          </thead>
          <tbody className="text-[#0F1B3D]/70">
            {data.items.map((item, i) => {
              const overpriced = item.potential_savings > 0;
              return (
                <tr key={i} className="border-t border-[#0F1B3D]/[0.04]">
                  <td className="py-2 pr-2">{item.description}</td>
                  <td className={`py-2 text-right ${overpriced ? "line-through text-[#0F1B3D]/30" : ""}`}>
                    ${item.charged.toFixed(0)}
                  </td>
                  <td className="py-2 text-right">
                    ${item.fair_price.toFixed(0)}
                    {overpriced && (
                      <span className="ml-1 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-green-700">
                        -${item.potential_savings.toFixed(0)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between border-t border-[#0F1B3D]/[0.06] pt-2">
          <span className="text-xs font-medium text-[#0F1B3D]/50">Potential Savings</span>
          <span className="text-sm font-bold text-green-600">
            ${data.total_potential_savings.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Negotiation Result Card ---

export function NegotiationCard({ data }: { data: NegotiationResult }) {
  const saved = data.original_amount - data.negotiated_amount;
  const pct = data.original_amount > 0 ? Math.round((saved / data.original_amount) * 100) : 0;

  return (
    <div className="mt-3 rounded-xl border border-green-200 bg-green-50/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-green-200/60 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
          <Check className="h-3.5 w-3.5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F1B3D]">{data.provider_name}</p>
          <p className="text-xs text-[#0F1B3D]/40">{data.provider_phone}</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-[#0F1B3D]/40 line-through">${data.original_amount.toFixed(0)}</span>
          <span className="text-lg font-bold text-green-600">${data.negotiated_amount.toFixed(0)}</span>
          {pct > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700">
              {pct}% saved
            </span>
          )}
        </div>
        {data.next_steps.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#0F1B3D]/50 mb-1">Next Steps</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {data.next_steps.map((step, i) => (
                <li key={i} className="text-xs text-[#0F1B3D]/60">{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Source Citations ---

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
          className="flex items-center gap-1 rounded-full border border-[#0F1B3D]/[0.06] bg-[#f5f7fb] px-2.5 py-1 text-[0.65rem] text-[#0F1B3D]/40 hover:text-[#0F1B3D]/60 transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          <span className="truncate max-w-[120px]">{source.title}</span>
        </a>
      ))}
    </div>
  );
}
