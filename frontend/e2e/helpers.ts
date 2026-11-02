import { expect, type Page } from "@playwright/test";

export const EXEC = { email: "exec@recon.example", password: process.env.E2E_EXEC_PASSWORD ?? "demo-exec-local" };
export const FOUNDER = { email: "founder@recon.example", password: process.env.E2E_FOUNDER_PASSWORD ?? "demo-founder-local" };

export async function login(page: Page, who = EXEC) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
}
