import { test, expect, type Page } from "@playwright/test";

async function createTimeline(page: Page, name: string) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New timeline" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New timeline" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Create timeline" }).click();
  await expect(page).toHaveURL(/\/timeline\//);
  await expect(page.getByRole("button", { name: /^Year Zero, 0/ })).toBeVisible();
}

async function fillDate(page: Page, legend: string, era: "BCE" | "CE", year: string, month?: string, day?: string) {
  const group = page.getByRole("group", { name: legend, exact: true });
  await group.getByText(era, { exact: true }).click();
  await group.getByLabel("Year").fill(year);
  if (month) await group.getByLabel("Month").selectOption({ label: month });
  if (day) await group.getByLabel("Day").fill(day);
}

test("add, validate, edit, undo and delete an event", async ({ page }) => {
  await createTimeline(page, `Rome ${Date.now()}`);

  await page.getByRole("button", { name: /Add event/ }).click();
  const form = page.getByRole("dialog", { name: "Add milestone" });
  await form.getByLabel("Title").fill("Founding of Rome");
  await fillDate(page, "Date", "BCE", "753", "Feb", "31");
  await form.getByRole("button", { name: "Add milestone" }).click();
  await expect(form.getByText(/Feb has 29 days in that year/)).toBeVisible();
  await expect(form.getByLabel("Title")).toHaveValue("Founding of Rome");

  await form.getByLabel("Month").first().selectOption({ label: "Apr" });
  await form.getByLabel("Day").first().fill("21");
  await expect(form.getByText("Apr 21, 753 BCE")).toBeVisible();
  await form.getByRole("button", { name: "Add milestone" }).click();
  await expect(form).toBeHidden();
  const event = page.getByRole("button", { name: /^Founding of Rome, Apr 21, 753 BCE/ });
  await expect(event).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeAttached();

  await event.click();
  const edit = page.getByRole("dialog", { name: "Edit milestone" });
  await edit.getByLabel("Title").fill("Rome founded");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: /^Rome founded,/ })).toBeVisible();

  await page.getByRole("button", { name: /^Undo:/ }).click();
  await expect(page.getByRole("button", { name: /^Founding of Rome,/ })).toBeVisible();
  await page.getByRole("button", { name: /^Redo:/ }).click();
  await expect(page.getByRole("button", { name: /^Rome founded,/ })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /^Rome founded,/ }).click();
  await page.getByRole("dialog", { name: "Edit milestone" }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this milestone?" }).getByRole("button", { name: "Delete milestone" }).click();
  await expect(page.getByRole("button", { name: /^Rome founded,/ })).toHaveCount(0);
});

test("periods, layers, visibility and import persist", async ({ page }) => {
  await createTimeline(page, `Periods ${Date.now()}`);

  await page.getByRole("button", { name: /Add event/ }).click();
  const form = page.getByRole("dialog", { name: "Add milestone" });
  await form.getByText("Period", { exact: true }).click();
  await page.getByRole("dialog", { name: "Add period" }).getByLabel("Period name").fill("Late Republic");
  await fillDate(page, "Start", "BCE", "10");
  await fillDate(page, "End", "CE", "10");
  await expect(page.getByText("10 BCE – 10 CE (19 yrs)")).toBeVisible();
  await page.getByRole("dialog", { name: "Add period" }).getByRole("button", { name: "Add period" }).click();
  await expect(page.getByRole("button", { name: /^Late Republic, 10 BCE – 10 CE \(19 yrs\)/ })).toBeVisible();

  await page.getByRole("button", { name: /^Layers/ }).click();
  await page.getByRole("dialog", { name: "Layer visibility" }).getByRole("button", { name: "Manage layers" }).click();
  const layers = page.getByRole("dialog", { name: "Layers" });
  await layers.getByLabel("New layer name").fill("Greece");
  await layers.getByRole("button", { name: "Add", exact: true }).click();
  await expect(layers.getByText("Greece", { exact: true })).toBeVisible();
  await layers.getByRole("button", { name: "Hide all" }).click();
  await layers.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("No events in the visible layers")).toBeVisible();

  await page.reload();
  await expect(page.getByText("No events in the visible layers")).toBeVisible();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: /Import JSON/ }).click();
  const importDialog = page.getByRole("dialog", { name: "Import events from JSON" });
  await importDialog.locator('input[type="file"]').setInputFiles({
    name: "greece.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      layers: [{ name: "Classical Greece", color: "#38bdf8" }],
      events: [
        { title: "Marathon", year: 490, isBce: true, layer: "Classical Greece" },
        { title: "Marathon", year: 490, isBce: "true", layer: "classical greece" },
        { title: "Bad", year: 1, month: 13 },
      ],
    })),
  });
  await expect(importDialog.getByText("1 row will be skipped")).toBeVisible();
  await importDialog.getByRole("button", { name: /^Import 2 events/ }).click();
  await expect(page.getByText("Imported 1 event. Skipped 1 exact duplicates.")).toBeVisible();
  // The canvas refits on its own, so the imported event is on screen without pressing 0.
  await expect(page.getByRole("button", { name: /^Marathon, 490 BCE, layer Classical Greece/ })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: /Export TXT/ }).click();
  const file = await download;
  const text = await (await file.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString("utf8"));
  expect(text.split("\n")[0]).toBe("Date / Period\tLayer\tTitle\tNotes");
  expect(text).toContain("10 BCE – 10 CE\tGeneral\tLate Republic");
});

test("dashboard: rename, trash and restore", async ({ page }) => {
  const name = `Trash me ${Date.now()}`;
  await createTimeline(page, name);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: `Move ${name} to trash` }).click();
  await page.getByRole("dialog", { name: "Move to trash?" }).getByRole("button", { name: "Move to trash" }).click();
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: /Trash/ }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).first().click();
  await page.getByRole("tab", { name: /Active/ }).click();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  // Descriptions are edited straight on the card.
  await page.getByRole("button", { name: "Add a description" }).first().click();
  await page.getByLabel("Timeline description").fill("Bronze Age to the Mauryas");
  await page.getByRole("button", { name: "Save description" }).click();
  await expect(page.getByRole("button", { name: "Bronze Age to the Mauryas" }).first()).toBeVisible();
});
