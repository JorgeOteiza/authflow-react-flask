const { test, expect } = require("@playwright/test");

test("a visitor can create an account, see the local timestamp and logout", async ({ page }) => {
  const email = `portfolio-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("link", { name: /crear cuenta gratis/i }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Secure1234");
  await page.getByLabel("Confirma la contraseña").fill("Secure1234");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Activa")).toBeVisible();
  await page.getByRole("button", { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("deleting an account shows a confirmation after the session is cleared", async ({ page }) => {
  const email = `delete-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("link", { name: /crear cuenta gratis/i }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Secure1234");
  await page.getByLabel("Confirma la contraseña").fill("Secure1234");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: /eliminar mi cuenta/i }).click();
  await page.getByLabel("Contraseña actual").fill("Secure1234");
  await page.getByRole("button", { name: /eliminar definitivamente/i }).click();

  await expect(page.getByRole("status")).toContainText("Cuenta eliminada con éxito");
  await expect(page.getByRole("status")).toContainText("Esperamos volver a verte pronto");
  await expect(page.getByRole("link", { name: /iniciar sesión/i })).toBeVisible();
});
