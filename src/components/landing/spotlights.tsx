"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ================================================================
   VISIT DATA  (used by the timeline modal)
   ================================================================ */
interface Lab {
  name: string;
  value: string;
  low: boolean;
}

interface VisitNotes {
  keyPoints: string[];
  actionItems: string[];
}

interface Visit {
  type: string;
  date: string;
  doctor: string;
  location: string;
  future: boolean;
  stars: number;
  summary: string;
  labs: Lab[] | null;
  notes: VisitNotes | null;
}

const visitData: Record<string, Visit> = {
  dermatology: {
    type: "Dermatology",
    date: "Apr 10, 2026",
    doctor: "Dr. James Park",
    location: "Westside Dermatology Clinic",
    future: true,
    stars: 0,
    summary: "",
    labs: null,
    notes: null,
  },
  "primary-care": {
    type: "Primary Care",
    date: "Mar 15, 2026",
    doctor: "Dr. Sarah Chen",
    location: "Bay Area Family Medicine",
    future: false,
    stars: 5,
    summary:
      "Vitamin D recheck, level improved to 32 ng/mL. Continue supplementation.",
    labs: null,
    notes: null,
  },
  "annual-physical": {
    type: "Annual Physical",
    date: "Jan 10, 2026",
    doctor: "Dr. Sarah Chen",
    location: "Bay Area Family Medicine",
    future: false,
    stars: 4,
    summary:
      "Vitamin D deficiency diagnosed. Started supplementation. Thyroid stable.",
    labs: [
      { name: "Vitamin D", value: "18 ng/mL", low: true },
      { name: "TSH", value: "2.1 mIU/L", low: false },
      { name: "Cholesterol", value: "185 mg/dL", low: false },
      { name: "A1C", value: "5.2%", low: false },
    ],
    notes: {
      keyPoints: [
        "Vitamin D deficiency diagnosed, level at 18 ng/mL",
        "Started Vitamin D3 2000 IU daily",
        "Thyroid stable, TSH 2.1",
        "Cholesterol and A1C normal",
      ],
      actionItems: [
        "Take Vitamin D3 2000 IU daily with food",
        "Schedule follow-up blood work in 3 months",
        "Continue Levothyroxine 50 mcg every morning",
      ],
    },
  },
};

/* ================================================================
   FAMILY PROFILES DATA
   ================================================================ */
const familyProfiles = [
  {
    name: "David Castillo",
    badge: "Me",
    avatar: "https://i.pravatar.cc/72?img=32",
  },
  {
    name: "Maria Castillo",
    badge: "Linked",
    avatar: "https://i.pravatar.cc/72?img=47",
  },
  {
    name: "Sofia Castillo",
    badge: "Managed",
    avatar: "https://i.pravatar.cc/72?img=38",
  },
  {
    name: "Lucas Castillo",
    badge: "Managed",
    avatar: "https://i.pravatar.cc/72?img=59",
  },
  {
    name: "Rosa Castillo",
    badge: "Linked",
    avatar: "https://i.pravatar.cc/72?img=25",
  },
];

/* ================================================================
   SHARED: Spotlight section wrapper
   ================================================================ */
function SpotlightRow({
  reverse,
  title,
  description,
  children,
}: {
  reverse?: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-[80px] max-w-[960px] mx-auto px-8 py-20 transition-all duration-[800ms] ease-out ${
        reverse ? "flex-row-reverse" : ""
      } max-md:flex-col max-md:text-center ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[30px]"
      }`}
    >
      <div className="flex-1">
        <h3
          className="font-light tracking-[-0.02em] mb-3"
          style={{
            fontSize: "clamp(1.4rem, 2.5vw, 1.8rem)",
            color: "#0F1B3D",
          }}
        >
          {title}
        </h3>
        <p
          className="text-base font-light leading-[1.7]"
          style={{ color: "#5a6a82" }}
        >
          {description}
        </p>
      </div>
      <div
        className="max-md:mx-auto"
        style={{
          flexShrink: 0,
          width: 340,
          maxWidth: 340,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   1. GAME PLAN
   ================================================================ */
function GamePlanCard() {
  const [done, setDone] = useState([false, false, false]);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoPlayed = useRef(false);

  const todos = [
    { title: "Take Vitamin D3", subtitle: "Daily \u00b7 Morning" },
    { title: "Schedule dermatology follow-up", subtitle: "Due this week" },
    { title: "Refill prescription", subtitle: "Due today" },
  ];

  const allDone = done.every(Boolean);

  const toggle = useCallback((idx: number) => {
    setDone((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }, []);

  /* Auto-animate on scroll */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !autoPlayed.current) {
            autoPlayed.current = true;
            todos.forEach((_, i) => {
              setTimeout(() => {
                setDone((prev) => {
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }, 1200 + i * 800);
            });
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={cardRef}
      className="rounded-[22px] pt-[18px] pb-2 overflow-hidden"
      style={{ background: "#F4B084", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}
    >
      {/* Title */}
      <div
        className="px-6 mb-4 text-[28px] font-extrabold"
        style={{ color: "#5C1A2A" }}
      >
        Game Plan
      </div>

      {/* Calendar strip */}
      <div className="flex justify-center gap-[10px] px-6 pb-4">
        {[
          { label: "Mon", num: 22 },
          { label: "Tue", num: 23 },
          { label: "Wed", num: 24, today: true },
          { label: "Thu", num: 25 },
          { label: "Fri", num: 26 },
        ].map((day) => (
          <div
            key={day.label}
            className="flex flex-col items-center gap-1 w-11"
          >
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: day.today ? "#5C1A2A" : "#7A3040" }}
            >
              {day.label}
            </span>
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold"
              style={{
                color: "#5C1A2A",
                background: day.today ? "#FFFFFF" : "transparent",
                fontSize: day.today && allDone ? "16px" : undefined,
              }}
            >
              {day.today && allDone ? "\u2713" : day.num}
            </span>
          </div>
        ))}
      </div>

      {/* To-do section */}
      <div className="px-6 pb-4">
        <div
          className="text-[15px] font-bold px-2 mb-[10px]"
          style={{ color: "#5C1A2A" }}
        >
          To Do
        </div>
        <div
          className="rounded-[14px] px-[14px] py-[10px]"
          style={{ background: "rgba(255,255,255,0.3)" }}
        >
          {todos.map((todo, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  className="h-px mx-[14px]"
                  style={{ background: "rgba(92,26,42,0.2)" }}
                />
              )}
              <div
                className="flex items-center gap-3 py-[10px] cursor-pointer transition-opacity duration-200"
                onClick={() => toggle(i)}
              >
                <div
                  className="w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-200"
                  style={{
                    borderColor: done[i] ? "#5C1A2A" : "#7A3040",
                    background: done[i] ? "#5C1A2A" : "transparent",
                  }}
                >
                  {done[i] && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[17px] font-semibold transition-all duration-200"
                    style={{
                      color: done[i] ? "#7A3040" : "#5C1A2A",
                      textDecoration: done[i] ? "line-through" : "none",
                    }}
                  >
                    {todo.title}
                  </div>
                  <div
                    className="text-[13px] mt-[1px]"
                    style={{ color: "#7A3040" }}
                  >
                    {todo.subtitle}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   2. VISIT TIMELINE + MODAL
   ================================================================ */
function VisitTimeline() {
  const [modalVisit, setModalVisit] = useState<string | null>(null);

  const openModal = useCallback((id: string) => {
    setModalVisit(id);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setModalVisit(null);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeModal]);

  /* Annual physical bounce animation */
  const annualCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const el = annualCardRef.current;
      if (!el) return;
      el.style.transition = "transform 0.15s ease";
      el.style.transform = "translateY(-6px)";
      setTimeout(() => {
        el.style.transform = "translateY(0)";
        setTimeout(() => {
          el.style.transform = "translateY(-3px)";
          setTimeout(() => {
            el.style.transform = "translateY(0)";
          }, 150);
        }, 150);
      }, 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const visit = modalVisit ? visitData[modalVisit] : null;

  return (
    <>
      <div
        className="rounded-[24px] p-6 overflow-hidden"
        style={{ background: "#DBEAFE", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <div
          className="text-2xl font-extrabold mb-4"
          style={{ color: "#1E3A5F" }}
        >
          Visits
        </div>
        <div className="relative pl-6">
          {/* Rail */}
          <div
            className="absolute left-[5px] top-[6px] bottom-[6px] w-[2px]"
            style={{ background: "#93B5E1" }}
          />

          {/* Future visit: Dermatology */}
          <div className="relative mb-4">
            <div
              className="absolute left-[-24px] top-[14px] w-3 h-3 rounded-full border-2"
              style={{
                borderColor: "#2563EB",
                background: "transparent",
                transform: "translateX(-0.5px)",
              }}
            />
            <div
              className="bg-white rounded-[14px] ml-[10px] mb-4 p-[14px] cursor-pointer transition-all duration-150 ease-out hover:-translate-y-[2px]"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onClick={() => openModal("dermatology")}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: "#6B9BD2" }}
                  >
                    Apr 10, 2026
                  </div>
                  <div
                    className="text-base font-bold mt-[2px]"
                    style={{ color: "#0F1B3D" }}
                  >
                    Dermatology
                  </div>
                  <div
                    className="text-[13px] mt-[1px]"
                    style={{ color: "#8E8E93" }}
                  >
                    Dr. James Park
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-[2px] rounded-[10px] flex-shrink-0"
                  style={{ background: "#C47A5A", color: "#FFFFFF" }}
                >
                  Booked
                </span>
              </div>
            </div>
          </div>

          {/* Past visit: Primary Care */}
          <div className="relative mb-4">
            <div
              className="absolute left-[-24px] top-[14px] w-3 h-3 rounded-full"
              style={{
                background: "#2563EB",
                transform: "translateX(-0.5px)",
              }}
            />
            <div
              className="bg-white rounded-[14px] ml-[10px] mb-4 p-[14px] cursor-pointer transition-all duration-150 ease-out hover:-translate-y-[2px]"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onClick={() => openModal("primary-care")}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "#6B9BD2" }}
              >
                Mar 15, 2026
              </div>
              <div
                className="text-base font-bold mt-[2px]"
                style={{ color: "#0F1B3D" }}
              >
                Primary Care
              </div>
              <div
                className="text-[13px] mt-[1px]"
                style={{ color: "#8E8E93" }}
              >
                Dr. Sarah Chen
              </div>
              <div
                className="text-[13px] leading-[18px] mt-[6px]"
                style={{ color: "#8E8E93" }}
              >
                Vitamin D recheck, level improved to 32 ng/mL. Continue
                supplementation.
              </div>
              <div className="flex gap-[2px] mt-[6px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="text-xs"
                    style={{ color: "#F5A623" }}
                  >
                    &#9733;
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Month marker */}
          <div className="relative mb-4 pl-[10px] ml-[10px]">
            <div
              className="absolute left-[-24px] top-1/2 w-2 h-2 rounded-full"
              style={{
                background: "#93B5E1",
                transform: "translate(-0.5px, -50%)",
              }}
            />
            <div
              className="text-lg font-extrabold flex items-center gap-2"
              style={{ color: "#4A7AB5" }}
            >
              <span
                className="inline-block w-[10px] h-[2px] rounded-[1px]"
                style={{ background: "#6B9BD2" }}
              />
              JAN 2026
            </div>
          </div>

          {/* Older past visit: Annual Physical */}
          <div className="relative">
            <div
              className="absolute left-[-24px] top-[14px] w-3 h-3 rounded-full"
              style={{
                background: "#2563EB",
                transform: "translateX(-0.5px)",
              }}
            />
            <div
              ref={annualCardRef}
              className="bg-white rounded-[14px] ml-[10px] p-[14px] cursor-pointer transition-all duration-150 ease-out hover:-translate-y-[2px]"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onClick={() => openModal("annual-physical")}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "#6B9BD2" }}
              >
                Jan 10, 2026
              </div>
              <div
                className="text-base font-bold mt-[2px]"
                style={{ color: "#0F1B3D" }}
              >
                Annual Physical
              </div>
              <div
                className="text-[13px] mt-[1px]"
                style={{ color: "#8E8E93" }}
              >
                Dr. Sarah Chen
              </div>
              <div
                className="text-[13px] leading-[18px] mt-[6px]"
                style={{ color: "#8E8E93" }}
              >
                Vitamin D deficiency diagnosed. Started supplementation. Thyroid
                stable.
              </div>
              <div className="flex gap-[2px] mt-[6px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="text-xs"
                    style={{ color: s <= 4 ? "#F5A623" : "#AEAEB2" }}
                  >
                    &#9733;
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Detail Modal */}
      {visit && (
        <>
          <div
            className="fixed inset-0 z-[1000] transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={closeModal}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[1001] w-full max-w-[480px] max-h-[85vh] bg-white overflow-y-auto"
            style={{
              transform: "translateX(-50%)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            }}
          >
            {/* Handle */}
            <div
              className="w-10 h-1 rounded-[2px] mx-auto mt-3 mb-4"
              style={{ background: "#AEAEB2" }}
            />

            {/* Header */}
            <div className="px-6 pb-4">
              <div
                className="text-[28px] font-extrabold"
                style={{ color: "#0F1B3D" }}
              >
                {visit.type}
              </div>
              <div className="text-[15px] mt-1" style={{ color: "#8E8E93" }}>
                {visit.date} &middot; {visit.doctor}
              </div>
              <div className="text-[13px] mt-1" style={{ color: "#AEAEB2" }}>
                {visit.location}
              </div>
              {!visit.future && (
                <button
                  className="inline-flex px-[14px] py-2 rounded-[20px] text-sm font-semibold mt-3 border-none cursor-pointer"
                  style={{ background: "#F7F6F2", color: "#0F1B3D" }}
                >
                  Schedule again
                </button>
              )}
            </div>

            {/* Tabs (for visits with labs/notes) */}
            {!visit.future &&
              (visit.labs || visit.notes) && (
                <div className="flex px-6 mt-4 mb-5 gap-0">
                  {["Summary", ...(visit.labs ? ["Labs"] : []), ...(visit.notes ? ["Notes"] : [])].map(
                    (tab, i) => (
                      <button
                        key={tab}
                        className="px-[18px] py-2 rounded-[20px] text-sm font-semibold border-none cursor-pointer"
                        style={{
                          background: i === 0 ? "#0F1B3D" : "transparent",
                          color: i === 0 ? "#fff" : "#AEAEB2",
                        }}
                      >
                        {tab}
                      </button>
                    )
                  )}
                </div>
              )}

            {/* Content */}
            <div>
              {visit.future ? (
                <div className="px-6 mb-7">
                  <div
                    className="text-[15px] leading-[22px]"
                    style={{ color: "#0F1B3D" }}
                  >
                    Upcoming appointment
                  </div>
                </div>
              ) : (
                <>
                  {visit.summary && (
                    <div className="px-6 mb-7">
                      <div
                        className="text-lg font-bold mb-[10px]"
                        style={{ color: "#0F1B3D" }}
                      >
                        Summary
                      </div>
                      <div
                        className="text-[15px] leading-[22px]"
                        style={{ color: "#0F1B3D" }}
                      >
                        {visit.summary}
                      </div>
                    </div>
                  )}

                  {visit.labs && (
                    <div className="px-6 mb-7">
                      <div
                        className="text-lg font-bold mb-[10px]"
                        style={{ color: "#0F1B3D" }}
                      >
                        Lab Results
                      </div>
                      <div className="bg-white rounded-xl p-[14px]">
                        {visit.labs.map((lab) => (
                          <div
                            key={lab.name}
                            className="flex justify-between py-[3px]"
                          >
                            <span
                              className="text-[13px]"
                              style={{ color: "#8E8E93" }}
                            >
                              {lab.name}
                            </span>
                            <span
                              className="text-[13px] font-semibold"
                              style={{
                                color: lab.low ? "#2563EB" : "#0F1B3D",
                              }}
                            >
                              {lab.value}
                              {lab.low ? " \u2193" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.notes && (
                    <div className="px-6 mb-7">
                      <div
                        className="text-lg font-bold mb-[10px]"
                        style={{ color: "#0F1B3D" }}
                      >
                        Visit Notes
                      </div>
                      <div
                        className="rounded-xl p-[14px]"
                        style={{ background: "#F8F9FA" }}
                      >
                        <div
                          className="text-sm font-bold mb-1"
                          style={{ color: "#0F1B3D" }}
                        >
                          Key Points
                        </div>
                        <div
                          className="text-sm leading-5"
                          style={{ color: "#8E8E93" }}
                        >
                          {visit.notes.keyPoints.map((p, i) => (
                            <React.Fragment key={i}>
                              &bull; {p}
                              <br />
                            </React.Fragment>
                          ))}
                        </div>
                        <div
                          className="text-sm font-bold mb-1 mt-2"
                          style={{ color: "#0F1B3D" }}
                        >
                          Action Items
                        </div>
                        <div
                          className="text-sm leading-5"
                          style={{ color: "#8E8E93" }}
                        >
                          {visit.notes.actionItems.map((a, i) => (
                            <React.Fragment key={i}>
                              &bull; {a}
                              <br />
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {visit.stars > 0 && (
                    <div className="px-6 mb-7">
                      <div
                        className="text-lg font-bold mb-[10px]"
                        style={{ color: "#0F1B3D" }}
                      >
                        Rate {visit.doctor}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className="text-[32px] cursor-pointer"
                            style={{
                              color:
                                s <= visit.stars ? "#F5A623" : "#AEAEB2",
                            }}
                          >
                            &#9733;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ================================================================
   3. PHONE CALLING AGENT
   ================================================================ */
function PhoneCallingCard() {
  return (
    <div className="rounded-[22px] p-5" style={{ background: "#F7F6F2", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2 py-3">
        <span
          className="text-lg leading-none inline-block"
          style={{
            animation: "phone-wiggle 3s ease-in-out infinite",
          }}
        >
          📞
        </span>
        <span
          className="text-[15px] leading-[22px] font-medium"
          style={{ color: "#0F1B3D" }}
        >
          Calling Park Dermatology Associates...
        </span>
      </div>
      <div
        className="max-w-[90%] bg-white rounded-[14px] overflow-hidden my-4"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
      >
        <div
          className="flex items-center gap-2 px-[14px] pt-3 pb-2"
          style={{ borderBottom: "1px solid #F2F2F7" }}
        >
          <div
            className="w-[10px] h-[10px] rounded-full"
            style={{
              border: "2px solid #34C759",
              background: "transparent",
            }}
          />
          <span
            className="text-[13px] font-bold uppercase tracking-[0.5px]"
            style={{ color: "#34C759" }}
          >
            Booked
          </span>
        </div>
        <div className="p-[14px]">
          <div
            className="text-base font-bold"
            style={{ color: "#0F1B3D" }}
          >
            Dermatology
          </div>
          <div className="text-sm mt-[2px]" style={{ color: "#8E8E93" }}>
            Dr. James Park
          </div>
          <div
            className="text-[13px] font-semibold mt-[6px]"
            style={{ color: "#0F1B3D" }}
          >
            Thursday, Apr 10, 2026 at 2:00 PM
          </div>
          <div
            className="text-[13px] mt-[2px]"
            style={{ color: "#AEAEB2" }}
          >
            Skin check follow-up
          </div>
        </div>
      </div>
      {/* phone-wiggle keyframe */}
      <style jsx>{`
        @keyframes phone-wiggle {
          0%,
          80%,
          100% {
            transform: rotate(0deg);
          }
          84% {
            transform: rotate(-12deg);
          }
          88% {
            transform: rotate(12deg);
          }
          92% {
            transform: rotate(-8deg);
          }
          96% {
            transform: rotate(8deg);
          }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   4. INSURANCE CARDS CAROUSEL
   ================================================================ */
function InsuranceCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const cards = [
    {
      type: "Health",
      dark: true,
      bg: "#0F1B3D",
      logo: "https://img.logo.dev/bcbs.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&format=png&size=128",
      plan: "Blue Cross Blue Shield PPO",
      provider: "Blue Cross",
      memberId: "BCB123456789",
      group: "G98765",
      copay: "$25 primary / $50 specialist",
    },
    {
      type: "Dental",
      dark: false,
      bg: "rgba(255,255,255,0.55)",
      logo: "https://img.logo.dev/deltadental.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&format=png&size=128",
      plan: "Delta Dental Premier",
      provider: "Delta Dental",
      memberId: "DT987654321",
      group: "D45678",
      copay: "100% preventive / 80% major",
    },
    {
      type: "Vision",
      dark: true,
      bg: "#0F1B3D",
      logo: "https://img.logo.dev/vsp.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&format=png&size=128",
      plan: "VSP Choice Plan",
      provider: "VSP Vision",
      memberId: "VSP111222333",
      group: "V12345",
      copay: "$10 exam / $0 lenses",
    },
  ];

  return (
    <div className="flex flex-col items-center w-[340px]">
      <div
        className="overflow-hidden rounded-[20px] relative w-full"
        style={{ boxShadow: "0 8px 16px rgba(0,0,0,0.18)" }}
      >
        <div
          className="flex"
          style={{
            width: "300%",
            transform: `translateX(-${(idx * 100) / 3}%)`,
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {cards.map((card) => {
            const textColors = card.dark
              ? {
                  type: "#FFFFFF",
                  plan: "#FFFFFF",
                  fieldValue: "#FFFFFF",
                  provider: "rgba(255,255,255,0.7)",
                  copay: "rgba(255,255,255,0.7)",
                  fieldLabel: "rgba(255,255,255,0.5)",
                }
              : {
                  type: "#0F1B3D",
                  plan: "#0F1B3D",
                  fieldValue: "#0F1B3D",
                  provider: "#8E8E93",
                  copay: "#8E8E93",
                  fieldLabel: "#AEAEB2",
                };

            return (
              <div
                key={card.type}
                className="relative flex flex-col justify-between p-5 overflow-hidden"
                style={{
                  background: card.bg,
                  aspectRatio: "1.6",
                  width: "33.333%",
                  flexShrink: 0,
                  boxSizing: "border-box",
                  border: card.dark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.06)",
                  borderTopColor: card.dark
                    ? "rgba(255,255,255,0.15)"
                    : undefined,
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                }}
              >
                {/* Gloss overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)",
                  }}
                />

                <div className="flex justify-between items-center relative z-10">
                  <span
                    className="text-lg font-extrabold tracking-[0.5px]"
                    style={{ color: textColors.type }}
                  >
                    {card.type}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="w-7 h-7 rounded-[6px] object-contain"
                    src={card.logo}
                    alt=""
                  />
                </div>

                <div className="relative z-10">
                  <div
                    className="text-[13px] font-bold mt-[3px]"
                    style={{ color: textColors.plan }}
                  >
                    {card.plan}
                  </div>
                  <div
                    className="text-[10px] font-semibold mt-[1px]"
                    style={{ color: textColors.provider }}
                  >
                    {card.provider}
                  </div>
                </div>

                <div className="flex gap-6 relative z-10">
                  <div>
                    <div
                      className="text-[8px] font-bold uppercase tracking-[1px] mb-[2px]"
                      style={{ color: textColors.fieldLabel }}
                    >
                      Member ID
                    </div>
                    <div
                      className="text-xs font-semibold tracking-[0.5px]"
                      style={{ color: textColors.fieldValue }}
                    >
                      {card.memberId}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[8px] font-bold uppercase tracking-[1px] mb-[2px]"
                      style={{ color: textColors.fieldLabel }}
                    >
                      Group
                    </div>
                    <div
                      className="text-xs font-semibold tracking-[0.5px]"
                      style={{ color: textColors.fieldValue }}
                    >
                      {card.group}
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <div
                    className="text-[8px] font-bold uppercase tracking-[1px] mb-[2px]"
                    style={{ color: textColors.fieldLabel }}
                  >
                    Copay
                  </div>
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: textColors.copay }}
                  >
                    {card.copay}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-[6px] mt-[14px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[6px] rounded-[3px] transition-all duration-300 cursor-pointer"
            style={{
              width: i === idx ? 18 : 6,
              background: i === idx ? "#AEAEB2" : "#E5E5EA",
            }}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   5. MRI PRICING CHAT
   ================================================================ */
function MriPricingChat() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const played = useRef(false);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played.current) {
            played.current = true;
            const delays = [0, 1, 2, 3, 4];
            delays.forEach((delay) => {
              setTimeout(() => {
                setVisibleItems((prev) => new Set([...prev, delay]));
              }, delay * 600);
            });
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animClass = (delay: number, alignRight?: boolean) =>
    `flex flex-col transition-all duration-[400ms] ease-out ${
      alignRight ? "items-end" : "items-start"
    } ${
      visibleItems.has(delay)
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-4"
    }`;

  return (
    <div
      ref={chatRef}
      className="flex flex-col gap-[18px] rounded-2xl p-6"
      style={{ background: "#F7F6F2", boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)" }}
    >
      {/* User message */}
      <div className={animClass(0, true)}>
        <div
          className="self-end max-w-[80%] bg-white px-[18px] py-3 rounded-[20px] text-[15px] leading-[22px] font-semibold"
          style={{
            borderBottomRightRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            color: "#0F1B3D",
          }}
        >
          How much would an MRI of my knee cost?
        </div>
      </div>

      {/* Elena response */}
      <div className={animClass(1)}>
        <div
          className="self-start max-w-[90%] bg-white rounded-[20px] px-[18px] py-[14px] text-[15px] leading-[22px] font-semibold"
          style={{
            borderTopLeftRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            color: "#0F1B3D",
          }}
        >
          I checked prices at 3 facilities near you. Here&apos;s what
          you&apos;d pay with your insurance:
        </div>
      </div>

      {/* Facility cards */}
      <div className={animClass(2)}>
        <div
          className="self-start max-w-[90%] bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <div className="p-3 flex flex-col gap-[10px]">
            {/* Facility 1 */}
            <div
              className="bg-white rounded-xl p-[10px_12px]"
              style={{ border: "1.5px solid #F2F2F7" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-2">
                  <div
                    className="text-[15px] font-bold"
                    style={{ color: "#1C1C1E" }}
                  >
                    Sunrise Imaging Center
                  </div>
                  <div
                    className="text-[13px] mt-[1px]"
                    style={{ color: "#8E8E93" }}
                  >
                    MRI - Knee without contrast
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end mt-[6px]">
                <div className="flex flex-wrap items-center gap-[6px] flex-1">
                  <span
                    className="flex items-center gap-[3px] text-[11px] font-semibold"
                    style={{ color: "#34C759" }}
                  >
                    &#10003; In-network
                  </span>
                  <span
                    className="text-[10px] font-semibold px-[6px] py-[1px] rounded"
                    style={{ background: "#E8F5E9", color: "#2E7D32" }}
                  >
                    Freestanding
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "#AEAEB2" }}
                  >
                    1.8 mi
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span
                    className="text-xs line-through"
                    style={{ color: "#AEAEB2" }}
                  >
                    $1,200
                  </span>
                  <div
                    className="text-base font-bold"
                    style={{ color: "#1C1C1E" }}
                  >
                    ~$180
                  </div>
                  <div className="text-[10px]" style={{ color: "#AEAEB2" }}>
                    est. out-of-pocket
                  </div>
                </div>
              </div>
            </div>

            {/* Facility 2 */}
            <div
              className="bg-white rounded-xl p-[10px_12px]"
              style={{ border: "1.5px solid #F2F2F7" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-2">
                  <div
                    className="text-[15px] font-bold"
                    style={{ color: "#1C1C1E" }}
                  >
                    Mount Sinai Radiology
                  </div>
                  <div
                    className="text-[13px] mt-[1px]"
                    style={{ color: "#8E8E93" }}
                  >
                    MRI - Knee without contrast
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end mt-[6px]">
                <div className="flex flex-wrap items-center gap-[6px] flex-1">
                  <span
                    className="flex items-center gap-[3px] text-[11px] font-semibold"
                    style={{ color: "#34C759" }}
                  >
                    &#10003; In-network
                  </span>
                  <span
                    className="text-[10px] font-semibold px-[6px] py-[1px] rounded"
                    style={{ background: "#FFF3E0", color: "#E65100" }}
                  >
                    Hospital
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "#AEAEB2" }}
                  >
                    3.2 mi
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span
                    className="text-xs line-through"
                    style={{ color: "#AEAEB2" }}
                  >
                    $2,400
                  </span>
                  <div
                    className="text-base font-bold"
                    style={{ color: "#1C1C1E" }}
                  >
                    ~$450
                  </div>
                  <div className="text-[10px]" style={{ color: "#AEAEB2" }}>
                    est. out-of-pocket
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User: Book */}
      <div className={animClass(3, true)}>
        <div
          className="self-end max-w-[80%] bg-white px-[18px] py-3 rounded-[20px] text-[15px] leading-[22px] font-semibold"
          style={{
            borderBottomRightRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            color: "#0F1B3D",
          }}
        >
          Book the imaging center
        </div>
      </div>

      {/* Elena confirmation */}
      <div className={animClass(4)}>
        <div
          className="self-start max-w-[90%] bg-white rounded-[20px] px-[18px] py-[14px] text-[15px] leading-[22px] font-semibold"
          style={{
            borderTopLeftRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            color: "#0F1B3D",
          }}
        >
          Done! Sunrise Imaging Center, Thursday at 10am.
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   6. FAMILY PROFILES
   ================================================================ */
function FamilyProfiles() {
  const [selected, setSelected] = useState(0);

  return (
    <div
      className="rounded-[20px] px-6 pt-5 pb-8"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}
    >
      {/* Handle */}
      <div
        className="w-10 h-1 rounded-[2px] mx-auto mb-4"
        style={{ background: "#AEAEB2" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-[18px]">
        <span
          className="text-lg font-extrabold"
          style={{ color: "#1C1C1E" }}
        >
          Switch Profile
        </span>
        <span
          className="text-2xl font-normal cursor-pointer"
          style={{ color: "#0F1B3D" }}
        >
          +
        </span>
      </div>

      {/* Profiles */}
      {familyProfiles.map((profile, i) => (
        <div
          key={profile.name}
          className="flex items-center p-[12px_14px] gap-3 rounded-xl mb-2 cursor-pointer transition-all duration-150"
          style={{
            border: `2px solid ${
              i === selected ? "#0F1B3D" : "transparent"
            }`,
            background: i === selected ? "#F7F6F2" : "transparent",
          }}
          onClick={() => setSelected(i)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            src={profile.avatar}
            alt=""
          />
          <div className="flex-1 flex flex-col">
            <span
              className="text-base font-semibold"
              style={{ color: "#1C1C1E" }}
            >
              {profile.name}
            </span>
            <span
              className="text-xs font-normal mt-[2px]"
              style={{ color: "#AEAEB2" }}
            >
              {profile.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export default function Spotlights() {
  return (
    <section
      id="how-it-works"
      className="relative z-10"
      style={{ background: "#FFFFFF", padding: "80px 0 120px" }}
    >
      {/* 1. Game Plan */}
      <SpotlightRow
        title="Your health game plan"
        description="Elena builds a personalized daily plan: medications, follow-ups, screenings. Check things off as you go."
      >
        <GamePlanCard />
      </SpotlightRow>

      {/* 2. Visit Timeline */}
      <SpotlightRow
        reverse
        title="Your care, every detail"
        description="Every visit, lab result, and document on a single timeline. Tap any visit to see the full picture."
      >
        <VisitTimeline />
      </SpotlightRow>

      {/* 3. Phone Calling Agent */}
      <SpotlightRow
        title="She actually calls for you"
        description="No hold music. No phone tag. Elena calls the doctor's office, checks availability, confirms your insurance, and books it. You just get the confirmation."
      >
        <PhoneCallingCard />
      </SpotlightRow>

      {/* 4. Insurance Cards */}
      <SpotlightRow
        reverse
        title="Navigate healthcare like a pro"
        description="Elena knows your deductible, your copays, what's in-network, and what's not. She finds the cheapest option for every procedure and makes sure you never leave money on the table."
      >
        <InsuranceCarousel />
      </SpotlightRow>

      {/* 5. MRI Pricing Chat */}
      <SpotlightRow
        title="Elena finds the best price"
        description="The same MRI can cost $180 or $2,400 depending on where you go. Elena checks your insurance and finds the best deal."
      >
        <MriPricingChat />
      </SpotlightRow>

      {/* 6. Family Profiles */}
      <SpotlightRow
        reverse
        title="Your whole family, one app"
        description="Manage healthcare for your parents, your partner, your kids. Switch between profiles in one tap and Elena knows everyone's history."
      >
        <FamilyProfiles />
      </SpotlightRow>
    </section>
  );
}
