const { test, expect } = require("@playwright/test");
const path = require("path");

const appUrl = `file://${path.join(__dirname, "..", "index.html")}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.Chart = function Chart() {
      return {
        destroy() {},
      };
    };

    window.L = {
      map() {
        return {
          setView() {
            return this;
          },
          remove() {},
          invalidateSize() {},
        };
      },
      tileLayer() {
        return {
          addTo() {
            return this;
          },
        };
      },
      marker() {
        return {
          addTo() {
            return this;
          },
        };
      },
    };
  });

  await page.goto(appUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function addTransaction(page, tx) {
  await page.click("#add-btn");
  await page.fill("#tx-amount", String(tx.amount));
  await page.selectOption("#tx-account", tx.account);
  await page.selectOption("#tx-type", tx.type);
  await page.selectOption("#tx-category", tx.category);
  await page.fill("#tx-desc", tx.description);
  await page.fill("#tx-date", tx.date);
  await page.locator("#tx-form").evaluate((form) => form.requestSubmit());
}

async function openTransactionDetails(page, description) {
  await page.locator("#tx-list li", { hasText: description }).click();
  await expect(page.locator("#transaction-modal")).toBeVisible();
}

test("EP: valid expense transaction is added and shown in the list", async ({ page }) => {
  await addTransaction(page, {
    amount: 12.5,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Coffee",
    type: "expense",
  });

  await expect(page.locator("#tx-list")).toContainText("Coffee");
  await expect(page.locator("#total-balance")).toHaveText("€-12.50");
});

test("EG: search is case-insensitive and ignores extra spaces", async ({ page }) => {
  await addTransaction(page, {
    amount: 18,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Lunch",
    type: "expense",
  });

  await page.fill("#search-input", "  lUnCh  ");
  await expect(page.locator("#tx-list")).toContainText("Lunch");
});

test("BA: custom date range includes a transaction exactly on the boundary date", async ({ page }) => {
  await addTransaction(page, {
    amount: 40,
    account: "cu",
    category: "Bills & Utilities",
    date: "2026-04-01",
    description: "Boundary Bill",
    type: "expense",
  });

  await page.selectOption("#date-range-filter", "custom");
  await page.fill("#custom-start-date", "2026-04-01");
  await page.fill("#custom-end-date", "2026-04-01");

  await expect(page.locator("#tx-list")).toContainText("Boundary Bill");
});

test("EP/EG: empty account name is rejected with a visible notification", async ({ page }) => {
  await page.click("#add-new-account-btn");
  await page.fill("#new-account-name", "");
  await page.click("#add-account-btn");

  await expect(page.locator(".update-notification")).toContainText(
    "Please enter an account name",
  );
});

test("EP: valid income transaction increases the total balance", async ({ page }) => {
  await addTransaction(page, {
    amount: 1000,
    account: "cu",
    category: "Income",
    date: "2026-04-19",
    description: "Paycheck",
    type: "income",
  });

  await expect(page.locator("#tx-list")).toContainText("Paycheck");
  await expect(page.locator("#total-balance")).toHaveText("€1000.00");
});

test("EP: account and type filters together narrow the visible transactions", async ({ page }) => {
  await addTransaction(page, {
    amount: 20,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Cash Lunch",
    type: "expense",
  });

  await addTransaction(page, {
    amount: 500,
    account: "cu",
    category: "Income",
    date: "2026-04-19",
    description: "Salary Credit",
    type: "income",
  });

  await page.selectOption("#account-filter", "cu");
  await page.selectOption("#type-filter", "income");

  await expect(page.locator("#tx-list")).toContainText("Salary Credit");
  await expect(page.locator("#tx-list")).not.toContainText("Cash Lunch");
});

test("EG: editing a transaction updates the visible description and amount", async ({ page }) => {
  await addTransaction(page, {
    amount: 12,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Old Coffee",
    type: "expense",
  });

  await openTransactionDetails(page, "Old Coffee");
  await page.click("#edit-tx-btn");
  await page.fill("#edit-tx-amount", "15");
  await page.fill("#edit-tx-desc", "Updated Coffee");
  await page.locator("#edit-tx-form").evaluate((form) => form.requestSubmit());

  await expect(page.locator("#tx-list")).toContainText("Updated Coffee");
  await expect(page.locator("#tx-list")).toContainText("€15.00");
  await expect(page.locator("#tx-list")).not.toContainText("Old Coffee");
});

test("EG: deleting a transaction removes it from the visible list", async ({ page }) => {
  await addTransaction(page, {
    amount: 9,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Delete Me",
    type: "expense",
  });

  await openTransactionDetails(page, "Delete Me");
  await page.click("#delete-tx-btn");

  await expect(page.locator("#tx-list")).not.toContainText("Delete Me");
});

test("EG: pinning a transaction moves it ahead of regular transactions", async ({ page }) => {
  await addTransaction(page, {
    amount: 12,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "First Item",
    type: "expense",
  });

  await addTransaction(page, {
    amount: 8,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-18",
    description: "Second Item",
    type: "expense",
  });

  await openTransactionDetails(page, "Second Item");
  await page.click("#pin-tx-btn");

  await expect(page.locator("#tx-list li").first()).toContainText("Second Item");
});

test("EP: reset all data clears transactions and restores zero total balance", async ({ page }) => {
  await addTransaction(page, {
    amount: 25,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Reset Target",
    type: "expense",
  });

  await page.click("#reset-btn");
  await expect(page.locator("#tx-list")).toContainText("No transactions match your filters");
  await expect(page.locator("#total-balance")).toHaveText("€0.00");
  await expect(page.locator(".update-notification")).toContainText(
    "All data has been reset successfully",
  );
});

test("EP: editing an account updates the visible account name", async ({ page }) => {
  await page.click('.edit-account-btn[data-id="cash"]');
  await expect(page.locator("#accounts-modal")).toBeVisible();
  await page.fill("#new-account-name", "Wallet Cash");
  await page.click("#add-account-btn");

  const cashCard = page.locator('.card[data-account="cash"]');
  await expect(cashCard).toContainText("Wallet Cash");
});

test("EG: deleting an account keeps its transactions but labels them as Unknown Account", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await addTransaction(page, {
    amount: 30,
    account: "cash",
    category: "Food & Dining",
    date: "2026-04-19",
    description: "Cash Transaction",
    type: "expense",
  });

  await page.click('.edit-account-btn[data-id="cash"]');
  await expect(page.locator("#accounts-modal")).toBeVisible();
  await page.click("#delete-account-btn");

  await expect(page.locator(".balances")).not.toContainText("Cash");

  await openTransactionDetails(page, "Cash Transaction");
  await expect(page.locator("#tx-info")).toContainText("Unknown Account");
});
