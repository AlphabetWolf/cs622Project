const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

function createAppWindow() {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const scriptPath = path.join(__dirname, "app.js");
  const script = fs.readFileSync(scriptPath, "utf8");
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "http://localhost/",
  });

  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    return {};
  };
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
  window.alert = () => {};
  window.prompt = () => null;
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  window.navigator.geolocation = {
    getCurrentPosition(success) {
      success({ coords: { latitude: 0, longitude: 0 } });
    },
  };

  const compiled = new vm.Script(script, { filename: scriptPath });
  compiled.runInContext(dom.getInternalVMContext());
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

describe("step 5 initial unit tests against the unmodified app", () => {
  let window;

  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`
      data = {
        balances: { cu: 0, revolut: 0, cash: 0 },
        accounts: [
          { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
          { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
          { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
        ],
        transactions: [],
        categories: ["Food & Dining", "Income", "Other"],
        tags: [],
        budgets: {},
        settings: {
          theme: "light",
          accentColor: "#4a90e2",
          pinnedTransactions: [],
          recurringTransactions: [],
          dashboard: {
            widgets: {
              totalBalance: true,
              accounts: true,
              recentTransactions: true,
              upcomingBills: false,
              spendingChart: false
            },
            defaultView: "transactions"
          },
          backup: { googleDrive: { connected: false, lastBackup: null } },
          recurring: { autoCreate: false, notifications: false }
        },
        bills: []
      };
      filters = { account: "all", type: "all" };
      sortOrder = "date-desc";
      currentTxIndex = -1;
    `);
    window.renderTransactions();
    window.renderBalances();
    window.renderTotalBalance();
  });

  it("formats euro amounts to two decimal places", () => {
    expect(window.formatAmt(42)).toBe("€42.00");
  });

  it("calculates whole-day differences", () => {
    expect(
      window.getDaysDifference(
        new Date("2026-04-01T00:00:00"),
        new Date("2026-04-04T00:00:00"),
      ),
    ).toBe(3);
  });

  it("calculates whole-month differences", () => {
    expect(
      window.getMonthsDifference(
        new Date("2026-01-15T00:00:00"),
        new Date("2026-04-15T00:00:00"),
      ),
    ).toBe(3);
  });

  it("lightens colors without exceeding ff", () => {
    expect(window.adjustColor("#f0f0f0", 30, true)).toBe("#ffffff");
  });

  it("returns Today for recurring transactions with no prior creation", () => {
    expect(window.getNextOccurrence({ lastCreated: null, frequency: "monthly" })).toBe("Today");
  });

  it("calculates the next occurrence for all supported recurring frequencies", () => {
    const base = "2026-04-10";
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "daily" })).toBe(
      new Date("2026-04-11").toLocaleDateString(),
    );
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "weekly" })).toBe(
      new Date("2026-04-17").toLocaleDateString(),
    );
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "biweekly" })).toBe(
      new Date("2026-04-24").toLocaleDateString(),
    );
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "monthly" })).toBe(
      new Date("2026-05-10").toLocaleDateString(),
    );
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "quarterly" })).toBe(
      new Date("2026-07-10").toLocaleDateString(),
    );
    expect(window.getNextOccurrence({ lastCreated: base, frequency: "yearly" })).toBe(
      new Date("2027-04-10").toLocaleDateString(),
    );
  });

  it("searches transaction text case-insensitively", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 24.5, account: "cash", type: "expense", description: "Lunch", date: "2026-04-01", category: "Food & Dining", notes: "Office cafe", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 1200, account: "cu", type: "income", description: "Salary", date: "2026-04-02", category: "Income", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.searchTransactions("  lUnCh ");
    expect(window.document.getElementById("tx-list").textContent).toContain("Lunch");
    expect(window.document.getElementById("tx-list").textContent).not.toContain("Salary");
  });

  it("searches by numeric amount text", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 24.5, account: "cash", type: "expense", description: "Lunch", date: "2026-04-01", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 1200, account: "cu", type: "income", description: "Salary", date: "2026-04-02", category: "Income", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.searchTransactions("1200");
    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("Salary");
    expect(text).not.toContain("Lunch");
  });

  it("restores the full list when the search query is empty", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 24.5, account: "cash", type: "expense", description: "Lunch", date: "2026-04-01", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 1200, account: "cu", type: "income", description: "Salary", date: "2026-04-02", category: "Income", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.searchTransactions("");
    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("Lunch");
    expect(text).toContain("Salary");
  });

  it("includes transactions on exact date-range boundaries", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "April 1", date: "2026-04-01", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 20, account: "cash", type: "expense", description: "April 15", date: "2026-04-15", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-3", amount: 30, account: "cash", type: "expense", description: "April 30", date: "2026-04-30", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.filterByDateRange("2026-04-01", "2026-04-30");
    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("April 1");
    expect(text).toContain("April 15");
    expect(text).toContain("April 30");
  });

  it("shows the no-results message when no transactions fall in the date range", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "April 1", date: "2026-04-01", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.filterByDateRange("2026-05-01", "2026-05-02");
    expect(window.document.getElementById("tx-list").textContent).toContain(
      "No transactions in the selected date range",
    );
  });

  it("pins a transaction without an id and records a generated id in settings", () => {
    window.eval(`
      data.transactions = [
        { amount: 10, account: "cash", type: "expense", description: "Pin Me", date: "2026-04-01", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      data.settings.pinnedTransactions = [];
    `);

    window.togglePinTransaction(0);
    const pinned = window.eval("data.settings.pinnedTransactions");
    const tx = window.eval("data.transactions[0]");
    expect(tx.isPinned).toBe(true);
    expect(tx.id).toBeTruthy();
    expect(pinned).toContain(tx.id);
  });

  it("unpins the same transaction on a second toggle", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "Pin Me", date: "2026-04-01", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      data.settings.pinnedTransactions = [];
    `);

    window.togglePinTransaction(0);
    window.togglePinTransaction(0);

    expect(window.eval("data.transactions[0].isPinned")).toBe(false);
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
  });

  it("rejects saving an account with an empty name", () => {
    window.document.getElementById("new-account-name").value = "   ";
    window.document.getElementById("new-account-id").value = "";
    window.document.getElementById("new-account-icon").value = "wallet";
    window.document.getElementById("new-account-color").value = "#4a90e2";

    window.saveAccount();

    expect(window.eval("data.accounts.length")).toBe(3);
    expect(
      window.document.querySelector(".update-notification")?.textContent || "",
    ).toContain("Please enter an account name");
  });

  it("generates a unique account id when a duplicate id is entered manually", () => {
    window.document.getElementById("new-account-name").value = "Cash Copy";
    window.document.getElementById("new-account-id").value = "cash";
    window.document.getElementById("new-account-icon").value = "wallet";
    window.document.getElementById("new-account-color").value = "#4a90e2";

    window.saveAccount();

    expect(window.eval("data.accounts.length")).toBe(4);
    expect(window.eval("data.accounts[3].id")).toBe("cash-1");
    expect(window.eval("data.balances['cash-1']")).toBe(0);
  });

  it("opens the new-account modal in add mode", () => {
    window.openNewAccountModal();

    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("new-account-name").value).toBe("");
    expect(window.document.getElementById("add-account-btn").textContent).toContain("Add Account");
    expect(window.document.getElementById("delete-account-container").classList.contains("hidden")).toBe(true);
  });

  it("opens the edit-account modal with the selected account data", () => {
    window.openEditAccountModal("cash");

    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("new-account-name").value).toBe("Cash");
    expect(window.document.getElementById("new-account-id").value).toBe("cash");
    expect(window.document.getElementById("add-account-btn").textContent).toContain("Update Account");
    expect(window.document.getElementById("delete-account-container").classList.contains("hidden")).toBe(false);
  });

  it("closes the account modal when account editing is canceled", () => {
    window.openEditAccountModal("cash");

    window.cancelAccountModal();

    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
    expect(window.eval("currentEditingAccountId")).toBe(null);
  });

  it("populates the edit-transaction form from an existing transaction", () => {
    window.eval(`
      data.transactions = [
        {
          id: "tx-1",
          amount: 18,
          account: "cash",
          type: "expense",
          description: "Lunch",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "with friends",
          isPinned: true,
          isRecurring: false,
          attachments: []
        }
      ];
    `);

    window.openEditTransactionModal(0);

    expect(window.document.getElementById("edit-tx-amount").value).toBe("18");
    expect(window.document.getElementById("edit-tx-account").value).toBe("cash");
    expect(window.document.getElementById("edit-tx-desc").value).toBe("Lunch");
    expect(window.document.getElementById("edit-tx-notes").value).toBe("with friends");
    expect(window.document.getElementById("edit-tx-pinned").checked).toBe(true);
    expect(window.document.getElementById("edit-tx-modal").classList.contains("hidden")).toBe(false);
  });

  it("deletes a transaction and reverses its balance effect", () => {
    window.eval(`
      data.transactions = [
        {
          id: "tx-1",
          amount: 15,
          account: "cash",
          type: "expense",
          description: "Delete Me",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "",
          isPinned: true,
          isRecurring: false,
          attachments: []
        }
      ];
      data.balances.cash = -15;
      data.settings.pinnedTransactions = ["tx-1"];
    `);

    window.deleteTransaction(0);

    expect(window.eval("data.transactions.length")).toBe(0);
    expect(window.eval("data.balances.cash")).toBe(0);
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
  });

  it("shows the reset confirmation modal before data reset", () => {
    window.resetAllData();
    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.body.classList.contains("modal-open")).toBe(true);
  });

  it("resets balances and transactions to defaults after confirmation", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 20, account: "cash", type: "expense", description: "Old", date: "2026-04-19", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      data.balances.cash = -20;
    `);

    window.confirmReset();

    expect(window.eval("data.transactions.length")).toBe(0);
    expect(window.eval("data.balances.cash")).toBe(0);
    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(true);
  });

  it("renders budgets using only current-month expense transactions", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentDate = `${year}-${month}-15`;
    const oldDate = "2025-01-10";

    window.eval(`
      data.categories = ["Food & Dining", "Income", "Other"];
      data.budgets = { "Food & Dining": 100 };
      data.transactions = [
        { id: "tx-1", amount: 25, account: "cash", type: "expense", description: "Lunch", date: "${currentDate}", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 40, account: "cash", type: "income", description: "Salary", date: "${currentDate}", category: "Income", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-3", amount: 60, account: "cash", type: "expense", description: "Old Lunch", date: "${oldDate}", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.renderBudgets();
    const text = window.document.getElementById("budget-items").textContent;
    expect(text).toContain("Food & Dining");
    expect(text).toContain("€25.00 of €100.00");
    expect(text).toContain("25%");
    expect(text).not.toContain("Income");
  });

  it("reassigns transactions to unknown when deleting a non-last account", () => {
    window.confirm = () => true;
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 12, account: "cash", type: "expense", description: "Groceries", date: "2026-04-19", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      data.balances.cash = -12;
      currentEditingAccountId = "cash";
    `);
    window.document.getElementById("accounts-modal").classList.remove("hidden");
    window.document.body.classList.add("modal-open");

    window.deleteAccount();

    expect(window.eval("data.accounts.some(a => a.id === 'cash')")).toBe(false);
    expect(window.eval("data.transactions[0].account")).toBe("unknown");
    expect(window.eval("'cash' in data.balances")).toBe(false);
    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(true);
  });

  it("does not delete an account when the user cancels confirmation", () => {
    window.confirm = () => false;
    window.eval(`currentEditingAccountId = "cash";`);

    window.deleteAccount();

    expect(window.eval("data.accounts.some(a => a.id === 'cash')")).toBe(true);
    expect(window.eval("currentEditingAccountId")).toBe("cash");
  });

  it("refuses to delete the last remaining account", () => {
    let alertMessage = "";
    window.alert = (message) => {
      alertMessage = message;
    };
    window.eval(`
      data.accounts = [{ id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }];
      data.balances = { cash: 0 };
      currentEditingAccountId = "cash";
    `);

    window.deleteAccount();

    expect(window.eval("data.accounts.length")).toBe(1);
    expect(alertMessage).toContain("at least one account");
  });

  it("shows a no-match message when transaction search finds nothing", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 24.5, account: "cash", type: "expense", description: "Lunch", date: "2026-04-01", category: "Food & Dining", notes: "Office cafe", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.searchTransactions("rent");

    expect(window.document.getElementById("tx-list").textContent).toContain(
      "No transactions match your search",
    );
  });

  it("switches to the budgets view and updates the active navigation item", () => {
    window.switchView("budgets");

    expect(window.document.getElementById("budgets-view").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("transactions-view").classList.contains("hidden")).toBe(true);
    expect(
      window.document.querySelector('.nav-item[data-view="budgets"]').classList.contains("active"),
    ).toBe(true);
    expect(window.eval("currentView")).toBe("budgets");
  });

  it("switches to the charts view and activates the charts navigation item", () => {
    window.switchView("charts");

    expect(window.document.getElementById("charts-view").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("budgets-view").classList.contains("hidden")).toBe(true);
    expect(
      window.document.querySelector('.nav-item[data-view="charts"]').classList.contains("active"),
    ).toBe(true);
    expect(window.eval("currentView")).toBe("charts");
  });

  it("shows account and notes in the transaction details modal", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 8, account: "cash", type: "expense", description: "Coffee", date: "2026-04-19", category: "Food & Dining", notes: "Morning", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.openTransactionDetails(window.eval("data.transactions[0]"));

    expect(window.document.getElementById("transaction-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("tx-info").textContent).toContain("Cash");
    expect(window.document.getElementById("tx-info").textContent).toContain("Morning");
  });

  it("toggles a recurring transaction active state", () => {
    window.eval(`
      data.settings.recurringTransactions = [
        { id: "rec-1", description: "Rent", active: true, frequency: "monthly", amount: 900 }
      ];
    `);

    window.toggleRecurringTransaction("rec-1");

    expect(window.eval("data.settings.recurringTransactions[0].active")).toBe(false);
    expect(
      window.document.querySelector(".update-notification")?.textContent || "",
    ).toContain("deactivated");
  });

  it("shows the placeholder notification for recurring transaction edits", () => {
    window.editRecurringTransaction("rec-1");

    expect(
      window.document.querySelector(".update-notification")?.textContent || "",
    ).toContain("Feature coming soon");
  });

  it("deletes a recurring transaction after confirmation", () => {
    window.confirm = () => true;
    window.eval(`
      data.settings.recurringTransactions = [
        { id: "rec-1", description: "Rent", active: true, frequency: "monthly", amount: 900 }
      ];
    `);

    window.deleteRecurringTransaction("rec-1");

    expect(window.eval("data.settings.recurringTransactions.length")).toBe(0);
    expect(
      window.document.querySelector(".update-notification")?.textContent || "",
    ).toContain("Recurring transaction deleted");
  });

  it("keeps a recurring transaction when delete confirmation is canceled", () => {
    window.confirm = () => false;
    window.eval(`
      data.settings.recurringTransactions = [
        { id: "rec-1", description: "Rent", active: true, frequency: "monthly", amount: 900 }
      ];
    `);

    window.deleteRecurringTransaction("rec-1");

    expect(window.eval("data.settings.recurringTransactions.length")).toBe(1);
  });
});
