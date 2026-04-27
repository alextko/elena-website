export type RouterChoice = "condition" | "medications" | "money" | "staying_healthy";

export type HeroVariant =
  | "pain"
  | "family"
  | "bill"
  | "pricing"
  | "call-refill"
  | "call-hold"
  | "call-schedule"
  | "booking";

export type ProposedAction = {
  raw: string;
  display: string;
  variant: HeroVariant;
  title: string;
  book_message: string;
};

function extractPricedThing(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (/\bmri\b/.test(lower)) return "MRI";
  if (/\bct\b|\bcat scan\b/.test(lower)) return "CT scan";
  if (/\bpet\b/.test(lower)) return "PET scan";
  if (/\bultrasound\b/.test(lower)) return "ultrasound";
  if (/\bx-?ray\b/.test(lower)) return "X-ray";
  if (/\bmammogram\b/.test(lower)) return "mammogram";
  if (/\bcolonoscopy\b/.test(lower)) return "colonoscopy";
  if (/\bendoscopy\b/.test(lower)) return "endoscopy";
  if (/\bbiopsy\b/.test(lower)) return "biopsy";
  if (/\bdexa\b|\bbone density\b/.test(lower)) return "DEXA scan";
  if (/\bspirometry\b/.test(lower)) return "spirometry";
  if (/\bbloodwork\b/.test(lower)) return "bloodwork";
  if (/\blab(?:s)?\b/.test(lower)) return "labs";
  if (/\bimaging\b/.test(lower)) return "imaging";
  if (/\bscan\b/.test(lower)) return "scan";
  if (/\btest\b/.test(lower)) return "test";
  if (/\bprocedure\b/.test(lower)) return "procedure";
  return null;
}

export function buildPricingActionFromNeed(rawText: string): string | null {
  const target = extractPricedThing(rawText);
  if (!target) return null;
  return `I can price-shop your ${target} before you book it.`;
}

export function buildPricingTodoFromNeed(rawText: string): { title: string; book_message: string } | null {
  const target = extractPricedThing(rawText);
  if (!target) return null;
  return {
    title: `Price-shop my ${target}`,
    book_message: `Help me price-shop my ${target} before I book it`,
  };
}

export function variantForLine(line: string): HeroVariant {
  const l = line.toLowerCase();
  if (l.includes("you said")) return "pain";
  if (l.includes("you're caring for") || l.includes("across the family") || l.includes("care straight")) return "family";
  if (l.includes("pay ") || l.includes("bill") || l.includes("dispute")) return "bill";
  if (l.includes("price-shop") || l.includes("best price") || l.includes("compare plans")) return "pricing";
  if (l.includes("refill") || l.includes("renew") || l.includes("runs out") || l.includes("pharmacy")) return "call-refill";
  if (l.includes("book ") || l.includes(" book") || l.includes("physical") || l.includes("annual") || l.includes("appointment") || l.includes("schedule") || l.includes("coordinate")) return "booking";
  if (l.includes("call")) {
    if (l.includes("insurance") || l.includes("coverage")) return "call-hold";
    return "call-schedule";
  }
  if (l.includes("research") || l.includes("find")) return "pricing";
  return "call-schedule";
}

export function cleanActionToUserVoice(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^You said [^.]+\.\s*/i, "");
  s = s.replace(/^You're caring for [^.]+\.\s*/i, "");
  s = s.replace(/^I can /i, "");
  s = s.replace(/\byour\b/gi, "my");
  s = s.replace(/\bhelp you\b/gi, "help me");
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function toHelpMeMessage(s: string): string {
  const cleaned = s.trim();
  if (!cleaned) return "";
  const lowered = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return lowered.startsWith("help me ") ? cleaned : `Help me ${lowered}`;
}

export function buildTodoFromAction(
  raw: string,
  args: {
    routerChoice: RouterChoice | null;
    conditionName?: string;
  },
): { title: string; book_message: string } | null {
  const { routerChoice, conditionName } = args;
  const variant = variantForLine(raw);
  const cleanedTitle = cleanActionToUserVoice(raw);
  const normalizedCondition = conditionName?.trim().toLowerCase();
  const conditionPhrase = normalizedCondition ? `${normalizedCondition} care` : "healthcare";
  const refillMatch = cleanedTitle.match(/my (.+?) (?:refills|runs out)/i);
  const refillTarget = refillMatch?.[1]?.trim();

  switch (variant) {
    case "pain":
      if (routerChoice === "money") {
        return {
          title: normalizedCondition
            ? `Lower my ${conditionPhrase} costs`
            : "Lower my healthcare costs",
          book_message: normalizedCondition
            ? `Help me lower my ${conditionPhrase} costs`
            : "Help me lower my healthcare costs",
        };
      }
      return {
        title: "Save time on my healthcare tasks",
        book_message: "Help me save time on my healthcare tasks",
      };
    case "bill":
      return {
        title: "Review my healthcare bills and charges",
        book_message: "Help me review my healthcare bills, spot mistakes, and lower what I owe",
      };
    case "pricing":
      {
        const pricedThing = extractPricedThing(raw);
        if (pricedThing) {
          return {
            title: `Price-shop my ${pricedThing}`,
            book_message: `Help me price-shop my ${pricedThing} before I book it`,
          };
        }
      }
      if (/labs|imaging/i.test(raw)) {
        return {
          title: "Price-shop my labs and imaging",
          book_message: "Help me price-shop my labs and imaging in-network",
        };
      }
      if (/plan/i.test(raw)) {
        return {
          title: "Compare my insurance plan options",
          book_message: "Help me compare my insurance plan options and find the best value",
        };
      }
      if (/equipment/i.test(raw)) {
        return {
          title: "Find the best price for home medical equipment",
          book_message: "Help me find the best price for home medical equipment",
        };
      }
      if (/pharmacies|coupon|refill/i.test(raw)) {
        return {
          title: "Price-shop my prescriptions",
          book_message: "Help me price-shop my prescriptions",
        };
      }
      return {
        title: normalizedCondition
          ? `Price-shop my ${conditionPhrase}`
          : "Price-shop my healthcare costs",
        book_message: normalizedCondition
          ? `Help me price-shop my ${conditionPhrase}`
          : "Help me price-shop my healthcare costs",
      };
    case "call-hold":
      return {
        title: "Check my insurance coverage before I go",
        book_message: "Help me check my insurance coverage before I go",
      };
    case "call-refill":
      if (refillTarget) {
        return {
          title: `Stay ahead of my ${refillTarget} refills`,
          book_message: `Help me stay ahead of my ${refillTarget} refills and renew them on time`,
        };
      }
      return {
        title: "Stay ahead of my prescription refills",
        book_message: "Help me stay ahead of my prescription refills and renew them on time",
      };
    case "booking":
      if (/annual physical/i.test(raw)) {
        return {
          title: "Book my annual physical",
          book_message: "Help me book my annual physical",
        };
      }
      if (/screenings/i.test(raw)) {
        return {
          title: "Schedule my recommended screenings",
          book_message: "Help me schedule my recommended screenings",
        };
      }
      return {
        title: cleanedTitle,
        book_message: toHelpMeMessage(cleanedTitle),
      };
    case "family":
      return {
        title: "Review care tasks for everyone I manage",
        book_message: "Help me review care tasks, appointments, and medications for everyone I manage",
      };
    case "call-schedule":
      return {
        title: cleanedTitle || "Call my provider to coordinate next steps",
        book_message: cleanedTitle
          ? toHelpMeMessage(cleanedTitle)
          : "Help me call my provider to coordinate next steps",
      };
    default:
      if (!cleanedTitle) return null;
      return {
        title: cleanedTitle,
        book_message: toHelpMeMessage(cleanedTitle),
      };
  }
}

export function buildProposedAction(
  raw: string,
  args: {
    routerChoice: RouterChoice | null;
    conditionName?: string;
  },
): ProposedAction | null {
  const todo = buildTodoFromAction(raw, args);
  if (!todo) return null;
  return {
    raw,
    display: raw,
    variant: variantForLine(raw),
    title: todo.title,
    book_message: todo.book_message,
  };
}

export function buildSeedMessageFromActions(
  actions: string[],
  args: {
    routerChoice: RouterChoice | null;
    conditionName?: string;
  },
): string {
  const mapped = actions
    .map((raw) => buildTodoFromAction(raw, args)?.book_message || toHelpMeMessage(cleanActionToUserVoice(raw)))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (mapped.length === 0) return "";
  if (mapped.length === 1) return mapped[0];
  return `Please help me with these:\n${mapped.map((s) => `• ${s}`).join("\n")}`;
}

export function synthesizeFallbackSeed(args: {
  routerChoice: RouterChoice | null;
  conditionName: string;
  managedFirstName: string;
  isDependentSetup: boolean;
}): string {
  const { routerChoice, conditionName, managedFirstName, isDependentSetup } = args;
  const who = isDependentSetup && managedFirstName ? managedFirstName : "me";
  const possessive = isDependentSetup && managedFirstName ? `${managedFirstName}'s` : "my";

  if (routerChoice === "condition") {
    if (conditionName) {
      return `Help ${who} build a plan to manage ${possessive} ${conditionName.toLowerCase()}. Start with what ${isDependentSetup ? "we" : "I"} should tackle first.`;
    }
    return `Help ${who} build a plan to manage ${possessive} condition. Ask whatever you need.`;
  }
  if (routerChoice === "medications") {
    return `Get ${possessive} prescription refills on autopilot — tell me what you need to make that happen.`;
  }
  if (routerChoice === "money") {
    return `Find the biggest savings in ${possessive} healthcare spend this year. Start with where to look first.`;
  }
  if (routerChoice === "staying_healthy") {
    return `Help ${who} stay on top of ${possessive} preventive care — what's due, what's overdue, and what to book first.`;
  }
  return `Help ${who} figure out the single most valuable thing to tackle first. Ask whatever you need.`;
}

export function buildProfileSetupTopUpTodos(args: {
  managedFirstName: string;
  isDependentSetup: boolean;
}): Array<{ title: string; book_message: string }> {
  const { managedFirstName, isDependentSetup } = args;
  const depName = managedFirstName.trim();

  return [
    {
      title: isDependentSetup && depName
        ? `Add ${depName}'s providers and visit history`
        : "Add my providers and visit history",
      book_message: isDependentSetup && depName
        ? `Help me add ${depName}'s doctors, providers, and past visits`
        : "Help me add my doctors, providers, and past visits",
    },
    {
      title: isDependentSetup && depName
        ? `Add ${depName}'s insurance`
        : "Add my insurance",
      book_message: isDependentSetup && depName
        ? `Help me add ${depName}'s insurance information`
        : "Help me add my insurance information",
    },
  ];
}

export function buildDisplayActionFromTodoText(todoText: string): string {
  const raw = todoText.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (lower.startsWith("book your ")) {
    return `I can book your ${raw.slice("Book your ".length)}.`;
  }
  if (lower.startsWith("schedule your ")) {
    return `I can schedule your ${raw.slice("Schedule your ".length)}.`;
  }
  if (lower.startsWith("schedule a ")) {
    return `I can schedule your ${raw.slice("Schedule a ".length)}.`;
  }
  if (lower.startsWith("book a ")) {
    return `I can book your ${raw.slice("Book a ".length)}.`;
  }
  if (lower.startsWith("ask about ")) {
    return `I can help you ask about ${raw.slice("Ask about ".length)}.`;
  }
  if (lower.startsWith("check ")) {
    return `I can help you ${lower}.`;
  }
  if (lower.startsWith("follow up on ")) {
    return `I can help you ${lower}.`;
  }
  if (lower.startsWith("review ")) {
    return `I can help you ${lower}.`;
  }
  if (lower.startsWith("loop ")) {
    return `I can help you ${lower}.`;
  }
  if (lower.startsWith("confirm ")) {
    return `I can help you ${lower}.`;
  }
  return `I can help you ${lower}.`;
}
