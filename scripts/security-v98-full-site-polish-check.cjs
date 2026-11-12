const fs = require("fs");

let failed = false;

const fail = (m) => {
  failed = true;
  console.error("V98 CHECK FAIL - " + m);
};

const pass = (m) =>
  console.log("V98 CHECK PASS - " + m);

const read = (p) =>
  fs.readFileSync(p, "utf8");

const required = [
  "app/services/page.tsx",
  "app/services/bathroom-ventilation/page.tsx",
  "app/services/kitchen-ventilation/page.tsx",
  "app/services/hood-exhaust/page.tsx",
  "app/services/fan-replacement/page.tsx",
  "app/services/ductwork/page.tsx",
  "app/services/ventilation-troubleshooting/page.tsx",
];

for (const p of required) {
  if (!fs.existsSync(p)) {
    fail("missing " + p);
  }
}

if (!failed) {
  pass("service routes present");
}

const chrome = read(
  "app/shared/SiteChrome.tsx",
);

const links = [
  "/services",
  "/services/bathroom-ventilation",
  "/services/kitchen-ventilation",
  "/services/hood-exhaust",
  "/services/fan-replacement",
  "/services/ductwork",
  "/services/ventilation-troubleshooting",
];

for (const href of links) {
  if (!chrome.includes(href)) {
    fail("SiteChrome missing " + href);
  }
}

if (chrome.includes("vp-metallic.png")) {
  fail("missing vp-metallic asset still referenced");
} else {
  pass("brand assets clean");
}

const home = read("app/page.tsx");

if (
  !home.includes("V98_SERVICES_HUB_LINK")
) {
  fail("homepage services-hub link missing");
} else {
  pass("homepage service discovery present");
}

const sitemap = read("app/sitemap.ts");

if (
  !sitemap.includes(
    '["/services", "monthly", 0.95]',
  )
) {
  fail("sitemap missing /services");
} else {
  pass("sitemap includes services hub");
}

const seo = read(
  "app/shared/SeoJsonLd.tsx",
);

for (const href of links.slice(1)) {
  if (!seo.includes(href)) {
    fail("OfferCatalog missing " + href);
  }
}

if (!failed) {
  pass("OfferCatalog complete");
}

const tracking = read(
  "app/shared/TrackingManager.tsx",
);

if (
  !tracking.includes("right:auto") ||
  !tracking.includes("left:14px")
) {
  fail("mobile privacy/AI collision fix missing");
} else {
  pass("mobile overlay spacing fixed");
}

const fallbackFiles = [
  "app/layout.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/shared/SeoJsonLd.tsx",
  "app/services/ServiceLanding.tsx",
  "app/admin/referrals/page.tsx",
];

for (const p of fallbackFiles) {
  if (
    read(p).includes(
      "https://ventic-pro-v11-7.vercel.app",
    )
  ) {
    fail(
      p + " still contains old Vercel fallback",
    );
  }
}

if (!failed) {
  pass("canonical fallbacks clean");
}

if (
  fs.existsSync(
    "app/services/[slug]/page.tsx",
  )
) {
  fail(
    "obsolete app/services/[slug]/page.tsx still exists",
  );
} else {
  pass("duplicate service route removed");
}

if (failed) process.exit(1);

console.log("");
console.log(
  "PASS - V98 full-site polish closure is clean.",
);
