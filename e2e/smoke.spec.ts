import { expect, test } from "@playwright/test";

/**
 * Smoke tests that run without a real Supabase project: they cover
 * routing, the auth wall, the login UI and the PWA plumbing.
 */

test("unauthenticated visitors are walked to the login page", async ({
  page,
}) => {
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login$/);
});

test("the root path also lands on login when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("login page shows the cozy sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("Email")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /come on in/i })).toBeVisible();
});

test("first-time mode asks for a display name", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /first time here/i }).click();
  await expect(page.getByPlaceholder(/what should we call you/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /join the board/i })
  ).toBeVisible();
});

test("memories page is behind the auth wall too", async ({ page }) => {
  await page.goto("/memories");
  await expect(page).toHaveURL(/\/login$/);
});

test("lists page is behind the auth wall", async ({ page }) => {
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/login$/);
});

test("the notifications service worker is served", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.ok()).toBeTruthy();
  expect(await res.text()).toContain("showNotification");
});

test("PWA manifest is served with icons", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  for (const icon of manifest.icons) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.ok(), `icon ${icon.src} should exist`).toBeTruthy();
  }
});
