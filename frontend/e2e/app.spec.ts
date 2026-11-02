import path from "node:path";
import { expect, test } from "@playwright/test";
import { EXEC, FOUNDER, login, noHorizontalScroll } from "./helpers";

test("wrong password shows an error and stays on login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EXEC.email);
  await page.getByLabel("Password").fill("nope-nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Incorrect email or password");
  await expect(page).toHaveURL(/\/login/);
});

test("landing page presents the product and leads to sign in", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("every rupee");
  await expect(page.getByRole("heading", { name: /leaks that live between/ })).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: `e2e/shots/${info.project.name}-landing.png`, fullPage: true });
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("anonymous visitors are sent to login", async ({ page }) => {
  await page.goto("/claims");
  await expect(page).toHaveURL(/\/login/);
});

test("dashboard shows money at risk, partners and tax summary", async ({ page }, info) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Money at risk" })).toBeVisible();
  await expect(page.getByText(/^₹[\d.,]+ (L|Cr)?$|^₹[\d,]+$/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "By partner and age" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "TCS and TDS deducted" })).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: `e2e/shots/${info.project.name}-dashboard.png`, fullPage: true });
});

test("orders: filter by status and open the breakdown drawer", async ({ page }, info) => {
  await login(page);
  await page.goto("/orders?status=short_paid");
  await expect(page.getByText(/orders · net difference/)).toBeVisible();
  const first = page.locator(info.project.name === "desktop" ? "tbody tr" : "ul button").first();
  await first.click();
  await expect(page.getByRole("dialog")).toContainText("Expected from the rate card");
  await expect(page.getByRole("dialog")).toContainText("TCS and TDS are statutory deductions");
  await page.screenshot({ path: `e2e/shots/${info.project.name}-order-drawer.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search order ID").fill("zzzz-not-an-order");
  await expect(page.getByText("No orders match")).toBeVisible();
  await noHorizontalScroll(page);
});

test("claims: list, update a claim with a note, export evidence", async ({ page }, info) => {
  await login(page);
  await page.goto("/claims");
  await expect(page.getByText(/across .* claims/)).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: `e2e/shots/${info.project.name}-claims.png`, fullPage: true });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export evidence CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^claims-.*\.csv$/);
  await page.locator(info.project.name === "desktop" ? "tbody tr" : "ul button").first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Status").selectOption("rejected");
  await expect(dlg.getByRole("button", { name: "Save" })).toBeDisabled(); // rejection needs a note
  await dlg.getByLabel(/Note/).fill("e2e: raised in error");
  await dlg.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Claim updated")).toBeVisible();
});

test("import: saved mapping is reused and re-uploading is idempotent", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "file picking covered on desktop");
  await login(page);
  await page.goto("/imports");
  await page.getByRole("radio", { name: /Settlement/ }).click();
  await page.getByLabel("Channel").selectOption({ label: "Marketplace 1" });
  await page.locator("#file").setInputFiles(path.resolve(__dirname, "../../backend/seed_data/settlement_mp1.csv"));
  await expect(page.getByText(/Using your saved mapping/)).toBeVisible();
  await expect(page.getByText(/readable/)).toBeVisible();
  await page.screenshot({ path: `e2e/shots/${info.project.name}-import.png`, fullPage: true });
  await page.getByRole("button", { name: "Import file" }).click();
  await expect(page.getByText(/Import complete/)).toBeVisible();
  await expect(page.getByText("Already imported").locator("..")).toContainText(/\d/);
});

test("import: unknown file type is rejected with a clear message", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await login(page);
  await page.goto("/imports");
  await page.locator("#file").setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(page.locator("main [role=alert]")).toContainText("Only .csv and .xlsx");
});

test("role access: executive cannot reach audit log or edit rate cards; co-founder can", async ({ page }, info) => {
  await login(page, EXEC);
  if (info.project.name === "desktop") await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  await page.goto("/audit");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/rate-cards");
  await expect(page.getByRole("heading", { name: "Rate cards" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add rate card" })).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());

  await login(page, FOUNDER);
  await page.goto("/rate-cards");
  await expect(page.getByRole("button", { name: "Add rate card" })).toBeVisible();
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("review queue and every screen fit the viewport", async ({ page }) => {
  await login(page);
  for (const p of ["/dashboard", "/orders", "/claims", "/review", "/imports", "/rate-cards"]) {
    await page.goto(p);
    await expect(page.locator("main h1")).toBeVisible();
    await noHorizontalScroll(page);
  }
});

test("mobile shows bottom tab bar, desktop shows sidebar", async ({ page }, info) => {
  await login(page);
  if (info.project.name === "mobile-375") {
    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Claims" }).click();
    await expect(page).toHaveURL(/\/claims/);
    await nav.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("link", { name: "Review matches" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Main" }).first()).toBeVisible();
  }
});
