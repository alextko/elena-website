"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { StreamingText } from "@/components/streaming-text";

export function OnboardingModal() {
  const { needsOnboarding, completeOnboarding, profileData } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync from profileData when it arrives. Names come from Google OAuth.
  // DOB + zip can be pre-filled from quiz/DME funnel data surfaced via /auth/me
  // — so users who already gave us those fields on the website don't retype them.
  useEffect(() => {
    if (profileData?.firstName && !firstName) setFirstName(profileData.firstName);
    if (profileData?.lastName && !lastName) setLastName(profileData.lastName);
    if (profileData?.dob && !dob) setDob(profileData.dob);
    if (profileData?.zipCode && !zipCode) setZipCode(profileData.zipCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.firstName, profileData?.lastName, profileData?.dob, profileData?.zipCode]);

  const hasName = !!(profileData?.firstName);

  useEffect(() => {
    if (needsOnboarding) analytics.track("Onboarding Modal Shown");
  }, [needsOnboarding]);

  // Sequential reveal: headline streams → subtitle fades → fields stagger.
  const [headlineDone, setHeadlineDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  // Once the headline finishes streaming, the subtitle fades in — then ~450ms
  // later we flip subtitleDone so the form fields begin their stagger reveal.
  useEffect(() => {
    if (!headlineDone) return;
    const t = setTimeout(() => setSubtitleDone(true), 450);
    return () => clearTimeout(t);
  }, [headlineDone]);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    zipCode.trim().length === 5;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    analytics.track("Onboarding Completed", {
      fields_filled: [
        firstName.trim() && "first_name",
        lastName.trim() && "last_name",
        dob && "dob",
        zipCode.trim() && "zip_code",
      ].filter(Boolean),
    });
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    await completeOnboarding({
      first_name: cap(firstName.trim()),
      last_name: cap(lastName.trim()),
      date_of_birth: dob,
      home_address: zipCode.trim(),
    });
    setSaving(false);
  }

  if (!needsOnboarding) return null;

  const motionEase = [0.4, 0, 0.2, 1] as const;

  const fieldsContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };
  const fieldItem = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: motionEase } },
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="w-[90vw] max-w-md rounded-2xl bg-white p-0 shadow-xl"
      >
        <div className="p-6">
          {/* Header */}
          <style>{`
            @keyframes elena-wave {
              0%   { transform: rotate(0deg); }
              20%  { transform: rotate(20deg); }
              40%  { transform: rotate(-18deg); }
              60%  { transform: rotate(18deg); }
              80%  { transform: rotate(-10deg); }
              100% { transform: rotate(0deg); }
            }
          `}</style>
          <div className="text-center mb-6">
            {/* Wave: pops in with a scale+fade, then shakes. Pop starts at ~120ms
                so it lands just before the headline begins streaming. */}
            <motion.div
              className="text-3xl mb-3 inline-block origin-[70%_70%]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: motionEase, delay: 0.12 }}
              style={{ animation: "elena-wave 900ms ease-in-out 500ms 1" }}
              aria-hidden
            >
              👋
            </motion.div>
            <h2 className="text-[22px] font-extrabold text-[#0F1B3D]">
              {/* startDelay waits for the dialog zoom+fade enter animation to
                  finish before the word-by-word stream begins, so the user
                  sees the full reveal in a fully-visible modal. */}
              <StreamingText
                text="Hey, I'm Elena"
                startDelay={0.2}
                onDone={() => setHeadlineDone(true)}
              />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: headlineDone ? 1 : 0, y: headlineDone ? 0 : 4 }}
              transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
              className="text-[14px] text-[#8E8E93] mt-1.5 leading-relaxed"
            >
              I&apos;m your healthcare assistant.<br />Let&apos;s get you set up!
            </motion.p>
          </div>

          {/* Fields + CTA — staggered reveal after subtitle fades in */}
          <AnimatePresence>
            {subtitleDone && (
              <motion.div
                key="fields"
                variants={fieldsContainer}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {!hasName && (
                  <motion.div variants={fieldItem} className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                        First name<span className="text-[#FF3B30] ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Alex"
                        autoCapitalize="words"
                        className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                        Last name<span className="text-[#FF3B30] ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                        autoCapitalize="words"
                        className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                      />
                    </div>
                  </motion.div>
                )}

                <motion.div variants={fieldItem}>
                  <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30 transition-colors"
                  />
                </motion.div>

                <motion.div variants={fieldItem}>
                  <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Zip code<span className="text-[#FF3B30] ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={5}
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="10001"
                    className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                  />
                </motion.div>

                <motion.button
                  variants={fieldItem}
                  onClick={handleSubmit}
                  disabled={saving || !canSubmit}
                  className="mt-5 w-full rounded-full bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                >
                  {saving ? "Setting up..." : "Get started"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
