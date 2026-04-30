#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const requiredEnv = [
  "MIXPANEL_SERVICE_ACCOUNT_USERNAME",
  "MIXPANEL_SERVICE_ACCOUNT_SECRET",
  "MIXPANEL_PROJECT_ID",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
};

const days = Number.parseInt(getArg("--days", "14"), 10);
const fromDate = getArg("--from", formatDate(daysAgo(days - 1)));
const toDate = getArg("--to", formatDate(new Date()));
const landingVariant = getArg("--landing-variant", null);
const distinctLimit = Number.parseInt(getArg("--limit", "100000"), 10);
const writeJson = args.includes("--json");
const exclusionTerms = (getArg("--exclude", "test,alextko,abhi") || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const interestingEvents = [
  "Landing Page Viewed",
  "Quiz Get Started Clicked",
  "Hero Input Submitted",
  "Message Sent",
  "Onboard Route Entered",
  "Auth Modal Opened",
  "Onboard Auth Step Viewed",
  "Signup Completed",
  "Login Completed",
  "Onboarding Modal Shown",
  "Onboarding Completed",
  "Welcome Screen Shown",
  "Response Received",
  "Activated",
  "Web Tour Started",
  "Web Tour Completed",
  "Web Tour Value Step Shown",
  "Web Tour Value Step Continued",
  "Web Tour Seed Query Written",
  "Tour Buffer Flushed",
  "Paywall Screen Viewed",
  "Paywall Trial Started",
  "Checkout Completed",
  "Upgrade Modal Shown",
  "Upgrade Plan Selected",
  "Web Funnel Auth Entry Viewed",
  "Web Funnel Auth Submitted",
  "Web Funnel Auth Succeeded",
  "Web Funnel Profile Form Viewed",
  "Web Funnel Profile Form Submitted",
  "Web Funnel Onboarding Completed",
  "Web Funnel Seed Flushed",
  "Web Funnel Activated",
];

async function main() {
  const rows = await exportEvents({
    fromDate,
    toDate,
    events: interestingEvents,
    limit: distinctLimit,
  });

  let filteredRows = rows;
  if (landingVariant) {
    const landingRows = await exportEvents({
      fromDate,
      toDate,
      events: ["Landing Page Viewed"],
      landingVariant,
      limit: distinctLimit,
    });
    const distinctIds = new Set(
      landingRows
        .map((row) => String(row.properties?.distinct_id || ""))
        .filter(Boolean),
    );
    filteredRows = rows.filter((row) => distinctIds.has(String(row.properties?.distinct_id || "")));
  }

  const excludedDistinctIds = await findExcludedDistinctIds(filteredRows, exclusionTerms);
  filteredRows = filteredRows.filter((row) => {
    const distinctId = String(row.properties?.distinct_id || "");
    return !excludedDistinctIds.has(distinctId);
  });

  const deduped = dedupeRows(filteredRows);
  const summary = buildSummary(deduped, { fromDate, toDate, landingVariant });
  summary.exclusions = {
    terms: exclusionTerms,
    excludedDistinctUsers: excludedDistinctIds.size,
  };

  if (writeJson) {
    const outputPath = path.resolve(process.cwd(), "mixpanel-analysis.json");
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${outputPath}`);
  }

  printSummary(summary);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(daysBack) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date;
}

async function exportEvents({ fromDate, toDate, events, landingVariant, limit }) {
  const where = landingVariant
    ? `properties["landing_variant"] == "${escapeWhereString(landingVariant)}"`
    : null;

  const query = new URLSearchParams({
    project_id: process.env.MIXPANEL_PROJECT_ID,
    from_date: fromDate,
    to_date: toDate,
    event: JSON.stringify(events),
    limit: String(limit),
    time_in_ms: "true",
  });

  if (where) query.set("where", where);

  const auth = Buffer.from(
    `${process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME}:${process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET}`,
  ).toString("base64");

  const response = await fetch(`https://data.mixpanel.com/api/2.0/export?${query.toString()}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mixpanel export failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const body = await response.text();
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function findExcludedDistinctIds(rows, terms) {
  const excluded = new Set();
  const distinctIds = [...new Set(rows.map((row) => String(row.properties?.distinct_id || "")).filter(Boolean))];

  for (const row of rows) {
    const properties = row.properties || {};
    const text = [
      row.event,
      properties.distinct_id,
      properties.$user_id,
      properties.$current_url,
      properties.$initial_referrer,
      properties.$referrer,
      properties.$referring_domain,
      properties.$initial_referring_domain,
      properties.landing_variant,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (shouldExcludeText(text, terms) || text.includes("localhost") || text.includes("127.0.0.1")) {
      if (properties.distinct_id) excluded.add(String(properties.distinct_id));
    }
  }

  const profileMap = await fetchProfilesByDistinctId(distinctIds);
  for (const [distinctId, profile] of profileMap.entries()) {
    const text = [distinctId, profile.email, profile.name].filter(Boolean).join(" ").toLowerCase();
    if (shouldExcludeText(text, terms)) {
      excluded.add(distinctId);
    }
  }

  return excluded;
}

async function fetchProfilesByDistinctId(distinctIds) {
  const auth = Buffer.from(
    `${process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME}:${process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET}`,
  ).toString("base64");
  const profiles = new Map();
  const chunkSize = 100;

  for (let index = 0; index < distinctIds.length; index += chunkSize) {
    const chunk = distinctIds.slice(index, index + chunkSize);
    const body = new URLSearchParams({
      distinct_ids: JSON.stringify(chunk),
      output_properties: JSON.stringify(["$email", "$name"]),
    });

    const response = await fetch(
      `https://mixpanel.com/api/query/engage?project_id=${encodeURIComponent(process.env.MIXPANEL_PROJECT_ID)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      },
    );

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Mixpanel profile query failed: ${response.status} ${response.statusText}\n${bodyText}`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    for (const result of results) {
      const distinctId = String(result?.$distinct_id || result?.distinct_id || "");
      if (!distinctId) continue;
      const properties = result?.$properties || result?.properties || {};
      profiles.set(distinctId, {
        email: String(properties?.$email || ""),
        name: String(properties?.$name || ""),
      });
    }
  }

  return profiles;
}

function shouldExcludeText(text, terms) {
  return terms.some((term) => term && text.includes(term));
}

function escapeWhereString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const properties = row.properties || {};
    const key = [
      row.event,
      properties.distinct_id || "",
      String(properties.time || ""),
      properties.$insert_id || "",
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSummary(rows, meta) {
  const perEvent = new Map();
  const users = new Map();
  const landingTouches = [];

  for (const row of rows) {
    const event = row.event;
    const properties = row.properties || {};
    const distinctId = String(properties.distinct_id || "");
    const time = Number(properties.time || 0);

    perEvent.set(event, (perEvent.get(event) || 0) + 1);

    if (event === "Landing Page Viewed") {
      landingTouches.push({
        distinctId,
        time,
        utmSource: String(properties.utm_source || ""),
        utmMedium: String(properties.utm_medium || ""),
        referringDomain: String(properties.$referring_domain || properties.$initial_referring_domain || ""),
        currentUrl: String(properties.$current_url || ""),
      });
    }

    if (!distinctId) continue;
    const user = users.get(distinctId) || createUser();
    user.events.add(event);
    if (properties.landing_variant) user.landingVariants.add(String(properties.landing_variant));
    if (time && (!user.firstSeen || time < user.firstSeen)) user.firstSeen = time;
    if (time && (!user.lastSeen || time > user.lastSeen)) user.lastSeen = time;
    users.set(distinctId, user);
  }

  const userList = [...users.values()];
  const legacyFunnel = [
    ["Landing Page Viewed", countUsers(userList, "Landing Page Viewed")],
    ["Auth Modal Opened", countUsers(userList, "Auth Modal Opened")],
    ["Signup Completed", countUsers(userList, "Signup Completed")],
    ["Onboarding Modal Shown", countUsers(userList, "Onboarding Modal Shown")],
    ["Onboarding Completed", countUsers(userList, "Onboarding Completed")],
    ["Paywall Screen Viewed", countUsers(userList, "Paywall Screen Viewed")],
    ["Paywall Trial Started", countUsers(userList, "Paywall Trial Started")],
  ].map(([step, usersAtStep], index, steps) => ({
    step,
    users: usersAtStep,
    conversionFromPrevious:
      index === 0 ? 1 : ratio(usersAtStep, Number(steps[index - 1][1] || 0)),
    conversionFromLanding: ratio(usersAtStep, Number(steps[0][1] || 0)),
  }));

  const homepageChatFunnel = [
    ["Landing Page Viewed", countUsers(userList, "Landing Page Viewed")],
    ["Hero Input Submitted", countUsers(userList, "Hero Input Submitted")],
    ["Message Sent", countUsers(userList, "Message Sent")],
    ["Onboard Route Entered", countUsers(userList, "Onboard Route Entered")],
    ["Auth Modal Opened", countUsers(userList, "Auth Modal Opened")],
    ["Onboard Auth Step Viewed", countUsers(userList, "Onboard Auth Step Viewed")],
    ["Signup Completed", countUsers(userList, "Signup Completed")],
    ["Onboarding Completed", countUsers(userList, "Onboarding Completed")],
    ["Welcome Screen Shown", countUsers(userList, "Welcome Screen Shown")],
    ["Response Received", countUsers(userList, "Response Received")],
    ["Activated", countUsers(userList, "Activated")],
  ].map(([step, usersAtStep], index, steps) => ({
    step,
    users: usersAtStep,
    conversionFromPrevious:
      index === 0 ? 1 : ratio(usersAtStep, Number(steps[index - 1][1] || 0)),
    conversionFromLanding: ratio(usersAtStep, Number(steps[0][1] || 0)),
  }));

  const cleanWebFunnel = [
    ["Landing Page Viewed", countUsers(userList, "Landing Page Viewed")],
    ["Hero Input Submitted", countUsers(userList, "Hero Input Submitted")],
    ["Onboard Route Entered", countUsers(userList, "Onboard Route Entered")],
    ["Web Funnel Profile Form Viewed", countUsers(userList, "Web Funnel Profile Form Viewed")],
    ["Web Funnel Profile Form Submitted", countUsers(userList, "Web Funnel Profile Form Submitted")],
    ["Web Funnel Auth Entry Viewed", countUsers(userList, "Web Funnel Auth Entry Viewed")],
    ["Web Funnel Auth Submitted", countUsers(userList, "Web Funnel Auth Submitted")],
    ["Web Funnel Auth Succeeded", countUsers(userList, "Web Funnel Auth Succeeded")],
    ["Web Funnel Onboarding Completed", countUsers(userList, "Web Funnel Onboarding Completed")],
    ["Web Funnel Seed Flushed", countUsers(userList, "Web Funnel Seed Flushed")],
    ["Web Funnel Activated", countUsers(userList, "Web Funnel Activated")],
  ].map(([step, usersAtStep], index, steps) => ({
    step,
    users: usersAtStep,
    conversionFromPrevious:
      index === 0 ? 1 : ratio(usersAtStep, Number(steps[index - 1][1] || 0)),
    conversionFromLanding: ratio(usersAtStep, Number(steps[0][1] || 0)),
  }));

  return {
    meta: {
      ...meta,
      rawRows: rows.length,
      distinctUsers: userList.length,
    },
    events: Object.fromEntries([...perEvent.entries()].sort((a, b) => b[1] - a[1])),
    legacyFunnel,
    homepageChatFunnel,
    cleanWebFunnel,
    landingVariants: summarizeLandingVariants(userList),
    sources: summarizeSources(landingTouches),
  };
}

function createUser() {
  return {
    events: new Set(),
    landingVariants: new Set(),
    firstSeen: 0,
    lastSeen: 0,
  };
}

function countUsers(users, event) {
  return users.filter((user) => user.events.has(event)).length;
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function summarizeLandingVariants(users) {
  const counts = new Map();
  for (const user of users) {
    for (const variant of user.landingVariants) {
      counts.set(variant, (counts.get(variant) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([landingVariant, users]) => ({ landingVariant, users }));
}

function summarizeSources(landingTouches) {
  const visitsBySource = new Map();
  const firstTouchByDistinctId = new Map();

  for (const touch of landingTouches) {
    const source = normalizeSource(touch);
    visitsBySource.set(source, (visitsBySource.get(source) || 0) + 1);

    if (!touch.distinctId) continue;
    const current = firstTouchByDistinctId.get(touch.distinctId);
    if (!current || (touch.time && touch.time < current.time)) {
      firstTouchByDistinctId.set(touch.distinctId, { ...touch, source });
    }
  }

  const visitorsBySource = new Map();
  for (const touch of firstTouchByDistinctId.values()) {
    visitorsBySource.set(touch.source, (visitorsBySource.get(touch.source) || 0) + 1);
  }

  return {
    visits: [...visitsBySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    visitors: [...visitorsBySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
  };
}

function normalizeSource(touch) {
  const utmSource = touch.utmSource.trim().toLowerCase();
  if (utmSource) return utmSource;

  const domain = touch.referringDomain.trim().toLowerCase();
  const currentUrl = touch.currentUrl.trim().toLowerCase();

  if (currentUrl.includes("fbclid=") || domain.includes("facebook") || domain.includes("instagram")) return "meta";
  if (domain.includes("google")) return "google";
  if (domain.includes("tiktok")) return "tiktok";
  if (domain.includes("linkedin")) return "linkedin";
  if (domain.includes("reddit")) return "reddit";
  if (domain.includes("localhost") || currentUrl.includes("localhost")) return "localhost";
  if (!domain) return "direct_or_unknown";
  return domain;
}

function printSummary(summary) {
  console.log(`Mixpanel website analysis ${summary.meta.fromDate} -> ${summary.meta.toDate}`);
  if (summary.meta.landingVariant) {
    console.log(`Landing variant filter: ${summary.meta.landingVariant}`);
  }
  console.log(`Raw rows: ${summary.meta.rawRows}`);
  console.log(`Distinct users: ${summary.meta.distinctUsers}`);
  console.log(`Excluded users: ${summary.exclusions.excludedDistinctUsers}`);
  console.log("");
  console.log("Legacy funnel");
  for (const step of summary.legacyFunnel) {
    console.log(
      `- ${step.step}: ${step.users} users | prev=${formatPct(step.conversionFromPrevious)} | landing=${formatPct(step.conversionFromLanding)}`,
    );
  }
  console.log("");
  console.log("Homepage chat funnel");
  for (const step of summary.homepageChatFunnel) {
    console.log(
      `- ${step.step}: ${step.users} users | prev=${formatPct(step.conversionFromPrevious)} | landing=${formatPct(step.conversionFromLanding)}`,
    );
  }
  console.log("");
  console.log("Clean web funnel v2");
  for (const step of summary.cleanWebFunnel) {
    console.log(
      `- ${step.step}: ${step.users} users | prev=${formatPct(step.conversionFromPrevious)} | landing=${formatPct(step.conversionFromLanding)}`,
    );
  }
  console.log("");
  console.log("Top events");
  for (const [event, count] of Object.entries(summary.events).slice(0, 12)) {
    console.log(`- ${event}: ${count}`);
  }
  if (summary.landingVariants.length) {
    console.log("");
    console.log("Landing variants");
    for (const item of summary.landingVariants.slice(0, 10)) {
      console.log(`- ${item.landingVariant}: ${item.users} users`);
    }
  }
  if (summary.sources?.visitors?.length) {
    console.log("");
    console.log("Traffic sources by first landing touch");
    for (const item of summary.sources.visitors.slice(0, 10)) {
      console.log(`- ${item.source}: ${item.count} visitors`);
    }
  }
  if (summary.sources?.visits?.length) {
    console.log("");
    console.log("Traffic sources by landing visits");
    for (const item of summary.sources.visits.slice(0, 10)) {
      console.log(`- ${item.source}: ${item.count} visits`);
    }
  }
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
