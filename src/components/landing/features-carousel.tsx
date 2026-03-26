"use client";

import React from "react";

/* ================================================================
   FEATURE CARD DATA
   ================================================================ */
const featureCards = [
  {
    img: "img-hugging",
    title: "Your whole health, one place.",
  },
  {
    img: "img-meditate",
    title: "She remembers so you don\u2019t have to.",
  },
  {
    img: "img-family",
    title: "Your whole family, covered.",
  },
  {
    img: "img-couch",
    title: "She books it for you.",
  },
  {
    img: "img-phone",
    title: "Insurance, decoded.",
  },
  {
    img: "img-meds",
    title: "Find the best price.",
  },
];

/* ================================================================
   PROGRESSIVE BLUR EDGE
   ================================================================ */
function ProgBlur({ side }: { side: "left" | "right" }) {
  const layers = [
    { blur: 1, start: 0, end: 20 },
    { blur: 2, start: 0, end: 40 },
    { blur: 4, start: 0, end: 60 },
    { blur: 8, start: 0, end: 80 },
    { blur: 12, start: 0, end: 100 },
  ];

  const direction = side === "left" ? "to right" : "to left";

  return (
    <div
      className="absolute top-0 bottom-0 z-[2] pointer-events-none overflow-hidden"
      style={{
        width: 100,
        [side]: 0,
      }}
    >
      {layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            mask: `linear-gradient(${direction}, black ${layer.start}%, transparent ${layer.end}%)`,
            WebkitMask: `linear-gradient(${direction}, black ${layer.start}%, transparent ${layer.end}%)`,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   SINGLE FEATURE CARD
   ================================================================ */
function FeatureCard({ img, title }: { img: string; title: string }) {
  return (
    <div
      className={`feature-card-bg ${img} relative rounded-[28px] p-0 min-h-[380px] w-[340px] flex-shrink-0 flex flex-col justify-end overflow-hidden transition-transform duration-300 hover:-translate-y-1 max-md:w-[260px] max-md:min-h-[320px]`}
    >
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 rounded-[28px] z-0"
        style={{
          background:
            "linear-gradient(to top, rgba(15,27,61,0.75) 0%, rgba(15,27,61,0.15) 50%, rgba(15,27,61,0.05) 100%)",
        }}
      />
      <div className="relative z-[1] px-7 py-8">
        <h3 className="text-[1.25rem] font-medium mb-2 text-white tracking-[-0.01em]">
          {title}
        </h3>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export default function FeaturesCarousel({
  onAuthRequired,
}: {
  onAuthRequired: () => void;
}) {
  return (
    <section
      id="features"
      className="relative z-10 bg-white text-[#0F1B3D]"
      style={{ padding: "100px 0 80px" }}
    >
      {/* CTA section */}
      <div className="max-w-[1080px] mx-auto px-8">
        <div className="text-center mt-20 mb-12 ">
          <h2
            className="font-light tracking-[-0.025em]"
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              color: "#0F1B3D",
            }}
          >
            Apply for early access.
          </h2>
        </div>

        <div className="text-center mb-16 ">
          <button
            onClick={onAuthRequired}
            className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold cursor-pointer border-none transition-all duration-200 hover:scale-105"
            style={{
              background: "#0F1B3D",
              color: "#FFFFFF",
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
