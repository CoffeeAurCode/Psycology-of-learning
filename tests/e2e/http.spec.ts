// HTTP-level checks of the deployed site (routing, redirects, caching, SEO files,
// and that no secret/source files are served). Runs in the "api" project.
import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// real secret values from the local, git-ignored credentials file (if present)
const SECRETS = existsSync("Supabase.txt")
  ? [...readFileSync("Supabase.txt", "utf8").matchAll(/^(?:Secret keys|Service role)\s*:\s*(\S+)/gim)].map((m) => m[1])
  : [];
const leaks = (body: string) => SECRETS.some((s) => body.includes(s)) || /sb_secret_[A-Za-z0-9_-]{16,}|VERCEL_OIDC_TOKEN|create table public\./.test(body);

const PROD = "https://psychology-of-learning-nptel.vercel.app";
// same target as the rest of the suite: local production build unless BASE_URL is set
const base = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const isProd = base.startsWith("https://");

test("every app route serves the app shell", async ({ request }) => {
  for (const path of ["/", "/study", "/study?week=3", "/test", "/test/run", "/test/result", "/ranks", "/me", "/some/unknown/page"]) {
    const r = await request.get(base + path);
    expect(r.status(), path).toBe(200);
    expect(await r.text(), path).toContain('<div id="root">');
  }
});

test("search & sharing files are served correctly", async ({ request }) => {
  const robots = await request.get(base + "/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap: https://psychology-of-learning-nptel.vercel.app/sitemap.xml");
  const sitemap = await request.get(base + "/sitemap.xml");
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  expect((await sitemap.text()).match(/<loc>/g)?.length).toBe(4);
  for (const f of ["/og-image.png", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/icons/apple-touch-icon.png", "/brand/mascot.webp", "/brand/badge-hex.webp", "/brand/badge-round.webp"]) {
    const r = await request.get(base + f);
    expect(r.status(), f).toBe(200);
    expect(r.headers()["content-type"], f).toMatch(/image\/(png|webp)/);
  }
  const manifest = await request.get(base + "/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(JSON.parse(await manifest.text()).icons.length).toBe(3);
});

test("index.html has title, description, canonical, Open Graph and structured data", async ({ request }) => {
  const html = await (await request.get(base + "/")).text();
  expect(html).toMatch(/<title>Psychology of Learning NPTEL/);
  expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]{80,}/);
  expect(html).toContain('<link rel="canonical" href="https://psychology-of-learning-nptel.vercel.app/"');
  expect(html).toContain('property="og:image" content="https://psychology-of-learning-nptel.vercel.app/og-image.png"');
  expect(html).toContain('"@type": "LearningResource"');
  expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"');
});

test("hashed assets are cached forever, HTML is not", async ({ request }) => {
  const html = await (await request.get(base + "/")).text();
  const js = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
  expect(js).toBeTruthy();
  const r = await request.get(base + js!);
  expect(r.status()).toBe(200);
  if (isProd) {
    expect(r.headers()["cache-control"]).toContain("immutable");
    expect((await request.get(base + "/")).headers()["cache-control"] ?? "").not.toContain("immutable");
  }
});

test("secrets and source files are never served", async ({ request }) => {
  for (const f of ["/Supabase.txt", "/.env.local", "/.env", "/src/lib/supabase.ts", "/supabase/setup.sql", "/package.json", "/.vercel/project.json"]) {
    const r = await request.get(base + f);
    expect(leaks(await r.text()), `${f} leaks a secret or source`).toBe(false);
  }
  // the bundled JS may contain the publishable key, never the secret / service-role key
  const html = await (await request.get(base + "/")).text();
  for (const src of html.match(/\/assets\/[\w-]+\.js/g) ?? []) {
    expect(leaks(await (await request.get(base + src)).text()), `${src} contains a secret key`).toBe(false);
  }
});

test("short link redirects permanently to the main address", async ({ request }) => {
  test.skip(!isProd, "production only");
  const r = await request.get("https://psychologyoflearning.vercel.app/study?week=2", { maxRedirects: 0 });
  expect([301, 308]).toContain(r.status());
  expect(r.headers()["location"]).toBe(`${PROD}/study?week=2`);
});

test("served over HTTPS with HSTS", async ({ request }) => {
  test.skip(!isProd, "production only");
  const r = await request.get(PROD + "/");
  expect(r.headers()["strict-transport-security"]).toBeTruthy();
});
