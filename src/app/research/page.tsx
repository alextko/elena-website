export default function ResearchPage() {
  return (
    <div className="min-h-dvh bg-white font-[family-name:var(--font-inter)]">
      {/* Hero */}
      <section
        className="relative py-28 px-8 text-center overflow-hidden max-md:py-18 max-md:px-5"
        style={{
          background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 40%, #2E6BB5 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 130%, rgba(244,176,132,0.2) 0%, transparent 60%)" }} />
        <div className="relative mx-auto max-w-[700px]">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">
            Research
          </p>
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight text-white leading-[1.15] mb-4">
            The State of the U.S. Healthcare{" "}
            <em className="font-normal italic font-[family-name:var(--font-dm-serif)] text-[#F4B084]">Experience</em>
          </h1>
          <p className="text-[1.05rem] font-light text-white/60 max-w-[560px] mx-auto leading-[1.7]">
            We surveyed Americans about their experience with healthcare costs, insurance, and navigating the system.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-[720px] px-6 py-20">

        {/* ═══ INTRO ═══ */}
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-16">
          We asked real people about their experience with the U.S. healthcare system. Here&apos;s what they told us.
        </p>

        {/* ═══ KEY FINDINGS ═══ */}
        <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-8">Key Findings</h2>
        <div className="grid grid-cols-2 gap-5 mb-20 max-md:grid-cols-1">
          <StatCard value="86%" label="have avoided or delayed care due to cost uncertainty" color="#E8956D" />
          <StatCard value="76%" label="have received a surprise medical bill" color="#2E6BB5" />
          <StatCard value="95%" label="would use a price transparency tool" color="#0F1B3D" />
          <StatCard value="90%" label="want help navigating the healthcare system" color="#E8956D" />
        </div>

        {/* ═══ PEOPLE ARE SKIPPING CARE ═══ */}
        <SectionTitle>People are skipping care they need</SectionTitle>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-8">
          <strong className="font-semibold text-[#0F1B3D]">86%</strong> have avoided or delayed healthcare because of cost uncertainty. People aren&apos;t making medical decisions based on health. They&apos;re making them based on fear of the bill.
        </p>
        <PieChart segments={[
          { label: "Avoided or delayed care", value: 86, color: "#E8956D" },
          { label: "Did not avoid care", value: 14, color: "#E5E5EA" },
        ]} />

        {/* ═══ SURPRISE BILLS ═══ */}
        <SectionTitle>Surprise bills are the norm</SectionTitle>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-8">
          <strong className="font-semibold text-[#0F1B3D]">76%</strong> have received a surprise medical bill. Nearly a quarter said it happens <em className="italic font-[family-name:var(--font-dm-serif)] text-[#E8956D]">frequently</em>.
        </p>
        <PieChart segments={[
          { label: "Frequently (3+ times)", value: 24, color: "#E8956D" },
          { label: "Occasionally (1-2 times)", value: 52, color: "#2E6BB5" },
          { label: "Never", value: 24, color: "#E5E5EA" },
        ]} />

        {/* ═══ COST PAIN POINTS ═══ */}
        <SectionTitle>Nobody can tell you what anything costs</SectionTitle>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
          We asked: <em className="italic text-[#0F1B3D]">&ldquo;When estimating the cost of a healthcare service, which of the following were major pain points?&rdquo;</em> Respondents could select all that applied.
        </p>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-8">
          The results show frustration at every level.
        </p>
        <VoteBar items={[
          { label: "Getting clear pricing from providers", pct: 76, color: "#0F1B3D" },
          { label: "Understanding what insurance would cover", pct: 71, color: "#2E6BB5" },
          { label: "Knowing where to go (urgent care, ER, PCP, etc.)", pct: 52, color: "#E8956D" },
          { label: "Distinguishing in-network vs. out-of-network", pct: 14, color: "#93B5E1" },
        ]} />

        {/* ═══ THE BILLING EXPERIENCE ═══ */}
        <SectionTitle>Billing is broken at every step</SectionTitle>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-6">
          We tested four basic assumptions. Respondents disagreed with all of them.
        </p>
        <div className="space-y-4 mb-12">
          <QuoteBlock quote="I know the full cost before receiving a major medical service." disagree={55} />
          <QuoteBlock quote="I find it easy to compare prices across providers." disagree={55} />
          <QuoteBlock quote="The process of paying medical bills is straightforward." disagree={55} />
          <QuoteBlock quote="I trust that the billed amount is accurate." disagree={35} />
        </div>

        {/* ═══ HOW PEOPLE FIND CARE ═══ */}
        <SectionTitle>How people find care today</SectionTitle>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-8">
          Nearly half just <em className="italic font-[family-name:var(--font-dm-serif)] text-[#E8956D]">Google it</em>. No one has a dedicated tool for navigating healthcare.
        </p>
        <PieChart segments={[
          { label: "Google", value: 48, color: "#0F1B3D" },
          { label: "Insurance portal", value: 24, color: "#2E6BB5" },
          { label: "Zocdoc", value: 10, color: "#E8956D" },
          { label: "Friends & family", value: 5, color: "#93B5E1" },
          { label: "Other", value: 13, color: "#AEAEB2" },
        ]} />

        {/* ═══ REAL STORIES ═══ */}
        <SectionTitle>In their own words</SectionTitle>
        <div className="space-y-4 mb-12">
          <StoryCard
            quote="I delayed a lab test because I wasn't sure if my insurance would cover it fully."
            context="On avoiding care"
          />
          <StoryCard
            quote="Received a bill months after a procedure that didn't match my expectations. Took weeks to resolve."
            context="On surprise billing"
          />
          <StoryCard
            quote="My insurance often denies covered procedures. Getting them to pay is a battle every time."
            context="On insurance denials"
          />
        </div>

        {/* ═══ DEMAND ═══ */}
        <SectionTitle>The demand is clear</SectionTitle>
        <div className="grid grid-cols-2 gap-5 mb-6 max-md:grid-cols-1">
          <StatCard value="95%" label="would use a price transparency tool" color="#2E6BB5" />
          <StatCard value="90%" label="want a healthcare navigation service" color="#0F1B3D" />
        </div>
        <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-8">
          That&apos;s not a niche. That&apos;s <em className="italic font-semibold font-[family-name:var(--font-dm-serif)] text-[#0F1B3D]">everyone</em>.
        </p>

        {/* ═══ WHAT WE'RE BUILDING ═══ */}
        <div className="mt-20 mb-16 py-12 px-8 rounded-3xl text-center max-md:px-5" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 40%, #2E6BB5 100%)" }}>
          <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at 85% 130%, rgba(244,176,132,0.15) 0%, transparent 60%)" }} />
          <h3 className="text-[clamp(1.4rem,3vw,1.8rem)] font-extrabold text-white mb-3 relative">
            That&apos;s why we&apos;re building{" "}
            <em className="font-normal italic font-[family-name:var(--font-dm-serif)] text-[#F4B084]">Elena</em>
          </h3>
          <p className="text-[15px] font-light text-white/60 max-w-[480px] mx-auto mb-6 relative">
            A personal healthcare assistant that fights for you. She finds the best prices, calls your doctor, manages your insurance, and makes sure you never get surprised by a bill again.
          </p>
          <a
            href="/"
            className="relative inline-block rounded-full bg-white/95 px-8 py-3.5 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
          >
            Try Elena
          </a>
        </div>

        {/* Methodology */}
        <div className="pt-8 border-t border-[#E5E5EA]">
          <h3 className="text-sm font-bold text-[#0F1B3D] mb-2">Methodology</h3>
          <p className="text-[13px] leading-[20px] text-[#8E8E93]">
            This survey was conducted in March 2026 with dozens of respondents across the United States, ages 18-57.
            Respondents were sourced through direct outreach. The sample skews younger and is not
            nationally representative. These results are directional and reflect real pain points experienced by
            real healthcare consumers.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#8E8E93] mb-4">Have a healthcare story to share?</p>
          <a
            href="https://forms.gle/z4fSReqNxGgeT38p7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-[#0F1B3D] px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Take the Survey
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-20 mb-5">{children}</h2>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: color + "0D" }}>
      <p className="text-[clamp(2rem,5vw,2.8rem)] font-extrabold leading-none mb-2" style={{ color }}>
        {value}
      </p>
      <p className="text-[14px] font-light text-[#5a6a82] leading-snug">{label}</p>
    </div>
  );
}

function PieChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;

  // Build conic gradient stops
  const stops = segments.flatMap((seg) => {
    const start = (cumulative / total) * 360;
    cumulative += seg.value;
    const end = (cumulative / total) * 360;
    return [`${seg.color} ${start}deg ${end}deg`];
  });

  return (
    <div className="flex items-center gap-8 mb-12 max-md:flex-col">
      {/* Pie */}
      <div
        className="w-[180px] h-[180px] rounded-full shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      />
      {/* Legend */}
      <div className="flex flex-col gap-2.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[14px] text-[#5a6a82]">
              <strong className="font-semibold text-[#0F1B3D]">{seg.value}%</strong>{" "}
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryCard({ quote, context }: { quote: string; context: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E5EA] px-6 py-5 relative">
      <span className="text-[2.5rem] leading-none text-[#E8956D]/30 font-[family-name:var(--font-dm-serif)] absolute top-3 left-5">&ldquo;</span>
      <p className="text-[15px] font-light text-[#0F1B3D] leading-[24px] italic pl-6 pr-2">
        {quote}
      </p>
      <p className="text-[12px] font-semibold text-[#AEAEB2] uppercase tracking-[1px] mt-3 pl-6">
        {context} / Anonymous respondent
      </p>
    </div>
  );
}

function VoteBar({ items }: { items: { label: string; pct: number; color: string }[] }) {
  return (
    <div className="space-y-4 mb-12">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[14px] text-[#0F1B3D] font-medium leading-snug flex-1 mr-3">{item.label}</span>
            <span className="text-[15px] font-extrabold shrink-0" style={{ color: item.color }}>{item.pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#F2F2F7] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            />
          </div>
          <p className="text-[11px] text-[#AEAEB2] mt-1">of respondents selected this</p>
        </div>
      ))}
    </div>
  );
}

function QuoteBlock({ quote, disagree }: { quote: string; disagree: number }) {
  return (
    <div className="rounded-2xl bg-[#F7F6F2] px-6 py-5">
      <p className="text-[15px] font-medium text-[#0F1B3D] leading-snug mb-3 italic">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#E5E5EA] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${disagree}%`, backgroundColor: "#E8956D" }}
          />
        </div>
        <span className="text-[13px] font-bold text-[#E8956D] shrink-0">{disagree}% disagree</span>
      </div>
    </div>
  );
}
