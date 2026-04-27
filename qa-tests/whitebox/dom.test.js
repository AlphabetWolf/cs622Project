const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

function createAppWindow() {
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
  const scriptPath = path.join(__dirname, "..", "..", "app.js");
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

function appDateString(date = new Date()) {
  const appDate = new Date(date);
  appDate.setHours(0, 0, 0, 0);
  return appDate.toISOString().split("T")[0];
}

describe("white-box DOM and state integration-style tests", () => {
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

  it("auto-generates a sanitized unique account id from the account name", () => {
    window.document.getElementById("new-account-name").value = "Travel Fund!";
    window.document.getElementById("new-account-id").value = "";
    window.document.getElementById("new-account-icon").value = "wallet";
    window.document.getElementById("new-account-color").value = "#4a90e2";

    window.saveAccount();

    expect(window.eval("data.accounts[3].id")).toBe("travel-fund");
    expect(window.eval("data.balances['travel-fund']")).toBe(0);
  });

  it("updates an existing account without changing its id", () => {
    window.eval(`currentEditingAccountId = "cash";`);
    window.document.getElementById("new-account-name").value = "Wallet Cash";
    window.document.getElementById("new-account-id").value = "cash";
    window.document.getElementById("new-account-icon").value = "wallet";
    window.document.getElementById("new-account-color").value = "#123456";

    window.saveAccount();

    expect(window.eval("data.accounts.find(a => a.id === 'cash').name")).toBe("Wallet Cash");
    expect(window.eval("data.accounts.find(a => a.id === 'cash').color")).toBe("#123456");
    expect(window.eval("Object.keys(data.balances)")).toContain("cash");
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

  it("opens the edit modal from the edit button and closes it from the cancel button", () => {
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
          isPinned: false,
          isRecurring: false,
          attachments: []
        }
      ];
      currentTxIndex = 0;
    `);

    window.document.getElementById("edit-tx-btn").click();
    expect(window.document.getElementById("edit-tx-modal").classList.contains("hidden")).toBe(false);

    window.document.getElementById("edit-cancel-btn").click();
    expect(window.document.getElementById("edit-tx-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });

  it("submits the edit transaction form through its submit event handler", () => {
    window.eval(`
      data.transactions = [
        {
          id: "tx-1",
          amount: 12,
          account: "cash",
          type: "expense",
          description: "Coffee",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "",
          isPinned: false,
          isRecurring: false,
          attachments: []
        }
      ];
      data.balances.cash = -12;
      currentTxIndex = 0;
      tags = [];
    `);

    window.document.getElementById("edit-tx-amount").value = "13";
    window.document.getElementById("edit-tx-account").value = "cash";
    window.document.getElementById("edit-tx-type").value = "expense";
    window.document.getElementById("edit-tx-desc").value = "Updated by Submit";
    window.document.getElementById("edit-tx-date").value = "2026-04-19";
    window.document.getElementById("edit-tx-category").value = "Food & Dining";
    window.document.getElementById("edit-tx-pinned").checked = false;
    window.document.getElementById("edit-tx-recurring").checked = false;
    window.document.getElementById("edit-tx-notes").value = "";

    window.document
      .getElementById("edit-tx-form")
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    expect(window.eval("data.transactions[0].description")).toBe("Updated by Submit");
    expect(window.eval("data.transactions[0].amount")).toBe(13);
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

  it("hides the reset confirmation modal when the cancel button is clicked", () => {
    window.resetAllData();

    window.document.getElementById("reset-cancel-btn").click();

    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });

  it("hides the reset confirmation modal when the close button is clicked", () => {
    window.resetAllData();

    window.document.getElementById("reset-cancel-close-btn").click();

    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });

  it("hides the reset confirmation modal when clicking the modal backdrop", () => {
    window.resetAllData();

    window.document
      .getElementById("reset-confirm-modal")
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
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

  it("returns early when deleteAccount is called without a current editing account", () => {
    const beforeAccounts = window.eval("JSON.stringify(data.accounts)");
    const beforeTransactions = window.eval("JSON.stringify(data.transactions)");

    window.deleteAccount();

    expect(window.eval("JSON.stringify(data.accounts)")).toBe(beforeAccounts);
    expect(window.eval("JSON.stringify(data.transactions)")).toBe(beforeTransactions);
  });

  it("restores default accounts when opening edit mode with a corrupted accounts array", () => {
    window.eval(`data.accounts = null;`);

    window.openEditAccountModal("cash");

    expect(window.eval("Array.isArray(data.accounts)")).toBe(true);
    expect(window.document.getElementById("new-account-name").value).toBe("Cash");
    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(false);
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

  it("clears date filtering when no start and end dates are provided", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "April 1", date: "2026-04-01", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] },
        { id: "tx-2", amount: 20, account: "cash", type: "expense", description: "April 15", date: "2026-04-15", category: "Other", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
    `);

    window.filterByDateRange(null, null);

    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("April 1");
    expect(text).toContain("April 15");
  });

  it("returns early from saveEditedTransaction when the current index is invalid", () => {
    window.eval(`
      data.transactions = [
        { id: "tx-1", amount: 12, account: "cash", type: "expense", description: "Coffee", date: "2026-04-19", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      currentTxIndex = 5;
    `);
    const before = window.eval("JSON.stringify(data.transactions)");

    window.saveEditedTransaction();

    expect(window.eval("JSON.stringify(data.transactions)")).toBe(before);
  });

  it("updates an edited transaction, moves its account balance, and adds it to pinned settings", () => {
    window.eval(`
      data.transactions = [
        {
          id: "tx-1",
          amount: 12,
          account: "cash",
          type: "expense",
          description: "Coffee",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "",
          isPinned: false,
          isRecurring: false,
          attachments: []
        }
      ];
      data.balances.cash = -12;
      data.balances.cu = 0;
      data.settings.pinnedTransactions = [];
      currentTxIndex = 0;
    `);

    window.document.getElementById("edit-tx-amount").value = "15";
    window.document.getElementById("edit-tx-account").value = "cu";
    window.document.getElementById("edit-tx-type").value = "income";
    window.document.getElementById("edit-tx-desc").value = "Updated Coffee";
    window.document.getElementById("edit-tx-date").value = "2026-04-20";
    window.document.getElementById("edit-tx-category").value = "Income";
    window.document.getElementById("edit-tx-recurring").checked = true;
    window.document.getElementById("edit-tx-pinned").checked = true;
    window.document.getElementById("edit-tx-notes").value = "updated";
    window.eval(`tags = [];`);

    window.saveEditedTransaction();

    expect(window.eval("data.transactions[0].description")).toBe("Updated Coffee");
    expect(window.eval("data.transactions[0].account")).toBe("cu");
    expect(window.eval("data.transactions[0].type")).toBe("income");
    expect(window.eval("data.transactions[0].isPinned")).toBe(true);
    expect(window.eval("data.transactions[0].isRecurring")).toBe(true);
    expect(window.eval("data.balances.cash")).toBe(0);
    expect(window.eval("data.balances.cu")).toBe(15);
    expect(window.eval("data.settings.pinnedTransactions")).toContain("tx-1");
  });

  it("removes an edited transaction from pinned settings when it is unpinned", () => {
    window.eval(`
      data.transactions = [
        {
          id: "tx-1",
          amount: 25,
          account: "cash",
          type: "expense",
          description: "Pinned Coffee",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "",
          isPinned: true,
          isRecurring: false,
          attachments: []
        }
      ];
      data.balances.cash = -25;
      data.settings.pinnedTransactions = ["tx-1"];
      currentTxIndex = 0;
    `);

    window.document.getElementById("edit-tx-amount").value = "25";
    window.document.getElementById("edit-tx-account").value = "cash";
    window.document.getElementById("edit-tx-type").value = "expense";
    window.document.getElementById("edit-tx-desc").value = "Pinned Coffee";
    window.document.getElementById("edit-tx-date").value = "2026-04-19";
    window.document.getElementById("edit-tx-category").value = "Food & Dining";
    window.document.getElementById("edit-tx-pinned").checked = false;
    window.document.getElementById("edit-tx-recurring").checked = false;
    window.document.getElementById("edit-tx-notes").value = "";
    window.eval(`tags = [];`);

    window.saveEditedTransaction();

    expect(window.eval("data.transactions[0].isPinned")).toBe(false);
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
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

  it("returns early when toggling a recurring transaction that does not exist", () => {
    window.eval(`data.settings.recurringTransactions = [];`);

    window.toggleRecurringTransaction("missing-id");

    expect(window.eval("data.settings.recurringTransactions")).toEqual([]);
  });

  it("loads older saved data, migrates missing fields, and upgrades the saved version", () => {
    const notifications = [];
    window.showUpdateNotification = (message) => notifications.push(message);
    window.localStorage.setItem(
      "money-manager-data",
      JSON.stringify({
        balances: { cu: 100, revolut: 50, cash: 25 },
        transactions: [
          { amount: 10, account: "cash", type: "expense", description: "Legacy", date: "2026-04-19" },
        ],
        categories: ["Other"],
        budgets: {},
        settings: { version: "0.3.5" },
      }),
    );

    window.loadData();

    expect(window.eval("data.accounts.length")).toBe(3);
    expect(window.eval("data.settings.version")).toBe("0.5.0");
    expect(window.eval("data.transactions[0].category")).toBe("Other");
    expect(window.eval("data.transactions[0].notes")).toBe("");
    expect(window.eval("data.transactions[0].attachments")).toEqual([]);
    expect(notifications[0]).toContain("Upgraded from v0.3.5 to v0.5.0");
  });

  it("loads saved accounts, preserves the current version, and backfills missing settings", () => {
    const notifications = [];
    window.showUpdateNotification = (message) => notifications.push(message);
    window.localStorage.setItem(
      "money-manager-data",
      JSON.stringify({
        balances: { cu: 40 },
        transactions: [{ amount: 5, account: "cu", type: "income", description: "Legacy income", date: "2026-04-19" }],
        accounts: [
          { id: "cu", name: "Credit Union", icon: "university" },
          { id: "revolut", name: "Revolut", icon: "credit-card" },
          { id: "cash", name: "Cash", icon: "money-bill-wave" },
          { id: "travel", name: "Travel Wallet", icon: "wallet" },
        ],
        settings: { version: "0.5.0" },
      }),
    );

    window.loadData();

    expect(window.eval("data.accounts[0].color")).toBe("#4a90e2");
    expect(window.eval("data.accounts[1].color")).toBe("#50c878");
    expect(window.eval("data.accounts[2].color")).toBe("#ff9800");
    expect(window.eval("!!data.accounts[3].color")).toBe(true);
    expect(window.eval("data.settings.theme")).toBe("light");
    expect(window.eval("Array.isArray(data.settings.pinnedTransactions)")).toBe(true);
    expect(window.eval("data.settings.dashboard.defaultView")).toBe("transactions");
    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(false);
    expect(window.eval("data.settings.recurring.autoCreate")).toBe(false);
    expect(notifications).toEqual([]);
  });

  it("resets to defaults when saved data cannot be parsed", () => {
    window.localStorage.setItem("money-manager-data", "{broken-json");
    window.applyAppSettings = () => {};

    window.loadData();

    expect(window.eval("data.accounts.length")).toBe(3);
    expect(window.eval("data.transactions.length")).toBe(0);
    expect(window.eval("data.settings.theme")).toBe("light");
  });

  it("calculates storage usage when the target element exists", () => {
    window.eval(`data.transactions = [{ id: "tx-1", amount: 5, account: "cash", type: "expense", description: "A", date: "2026-04-19" }];`);

    window.calculateStorageUsage();

    expect(window.document.getElementById("storage-usage").textContent).toMatch(/bytes|KB|MB/);
  });

  it("shows a fallback message when storage usage calculation throws", () => {
    const OriginalBlob = window.Blob;
    window.Blob = function BrokenBlob() {
      throw new Error("boom");
    };

    window.calculateStorageUsage();

    expect(window.document.getElementById("storage-usage").textContent).toBe("Unable to calculate");
    window.Blob = OriginalBlob;
  });

  it("renders the empty tags placeholder when there are no tags", () => {
    window.eval(`data.tags = [];`);

    window.renderTagsList();

    expect(window.document.getElementById("tags-list").textContent).toContain("No tags created yet.");
  });

  it("renders saved tags into the tags list", () => {
    window.eval(`data.tags = ["food", "travel"];`);

    window.renderTagsList();

    const text = window.document.getElementById("tags-list").textContent;
    expect(text).toContain("food");
    expect(text).toContain("travel");
  });

  it("initializes recurring settings checkboxes from saved settings", () => {
    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurring.notifications = true;
    `);

    window.initRecurringSettings();

    expect(window.document.getElementById("auto-create-recurring").checked).toBe(true);
    expect(window.document.getElementById("notify-recurring").checked).toBe(true);
  });

  it("does not create recurring transactions when auto-create is disabled", () => {
    window.eval(`
      data.settings.recurring.autoCreate = false;
      data.settings.recurringTransactions = [
        { id: "rec-1", active: true, frequency: "daily", amount: 9, account: "cash", type: "expense", description: "Rent", category: "Other" }
      ];
    `);

    window.processRecurringTransactions();

    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("auto-creates a daily recurring transaction and updates balances", () => {
    const notifications = [];
    window.showUpdateNotification = (message) => notifications.push(message);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurring.notifications = true;
      data.settings.recurringTransactions = [
        { id: "rec-1", active: true, frequency: "daily", amount: 9, account: "cash", type: "expense", description: "Rent", category: "Other", lastCreated: "${appDateString(yesterday)}" }
      ];
      data.transactions = [];
      data.balances.cash = 0;
    `);

    window.processRecurringTransactions();

    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.transactions[0].isRecurring")).toBe(true);
    expect(window.eval("data.balances.cash")).toBe(-9);
    expect(notifications[0]).toContain("Created recurring expense: Rent");
  });

  it("auto-creates a monthly recurring transaction when a month has passed", () => {
    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurring.notifications = false;
      data.settings.recurringTransactions = [
        { id: "rec-1", active: true, frequency: "monthly", amount: 100, account: "cu", type: "income", description: "Salary", category: "Income", lastCreated: "2026-03-01" }
      ];
      data.transactions = [];
      data.balances.cu = 0;
    `);

    window.processRecurringTransactions();

    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.balances.cu")).toBe(100);
    expect(window.eval("data.settings.recurringTransactions[0].lastCreated")).toBe(
      appDateString(),
    );
  });

  it("auto-creates weekly, biweekly, quarterly, and yearly recurring transactions when due", () => {
    const today = new Date();
    const eightDaysAgo = new Date(today);
    eightDaysAgo.setDate(today.getDate() - 8);
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(today.getDate() - 15);
    const fourMonthsAgo = new Date(today);
    fourMonthsAgo.setMonth(today.getMonth() - 4);
    const thirteenMonthsAgo = new Date(today);
    thirteenMonthsAgo.setMonth(today.getMonth() - 13);

    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurring.notifications = false;
      data.settings.recurringTransactions = [
        { id: "rec-weekly", active: true, frequency: "weekly", amount: 11, account: "cash", type: "expense", description: "Weekly Fee", category: "Other", lastCreated: "${eightDaysAgo.toISOString().split("T")[0]}" },
        { id: "rec-biweekly", active: true, frequency: "biweekly", amount: 12, account: "cash", type: "expense", description: "Biweekly Fee", category: "Other", lastCreated: "${fifteenDaysAgo.toISOString().split("T")[0]}" },
        { id: "rec-quarterly", active: true, frequency: "quarterly", amount: 13, account: "cu", type: "income", description: "Quarterly Bonus", category: "Income", lastCreated: "${fourMonthsAgo.toISOString().split("T")[0]}" },
        { id: "rec-yearly", active: true, frequency: "yearly", amount: 14, account: "revolut", type: "income", description: "Yearly Return", category: "Income", lastCreated: "${thirteenMonthsAgo.toISOString().split("T")[0]}" }
      ];
      data.transactions = [];
      data.balances.cash = 0;
      data.balances.cu = 0;
      data.balances.revolut = 0;
    `);

    window.processRecurringTransactions();

    expect(window.eval("data.transactions.length")).toBe(4);
    expect(window.eval("data.balances.cash")).toBe(-23);
    expect(window.eval("data.balances.cu")).toBe(13);
    expect(window.eval("data.balances.revolut")).toBe(14);
  });

  it("skips inactive recurring transactions during processing", () => {
    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurringTransactions = [
        { id: "rec-1", active: false, frequency: "daily", amount: 9, account: "cash", type: "expense", description: "Rent", category: "Other", lastCreated: null }
      ];
      data.transactions = [];
    `);

    window.processRecurringTransactions();

    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("updates the account filter and active card state through the account-filter change event", () => {
    window.document.getElementById("account-filter").value = "cash";
    window.document
      .getElementById("account-filter")
      .dispatchEvent(new window.Event("change", { bubbles: true }));

    expect(window.eval("filters.account")).toBe("cash");
    expect(window.document.querySelector('.card[data-account="cash"]').classList.contains("active")).toBe(true);
  });

  it.fails("toggles the account filter through account-card clicks after listeners are rebound", () => {
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

    let cashCard = window.document.querySelector('.card[data-account="cash"]');
    cashCard.click();
    expect(window.eval("filters.account")).toBe("cash");
    expect(window.document.getElementById("account-filter").value).toBe("cash");

    cashCard = window.document.querySelector('.card[data-account="cash"]');
    cashCard.click();
    expect(window.eval("filters.account")).toBe("all");
    expect(window.document.getElementById("account-filter").value).toBe("all");
  });

  it("updates the type filter through the type-filter change event", () => {
    window.document.getElementById("type-filter").value = "income";
    window.document
      .getElementById("type-filter")
      .dispatchEvent(new window.Event("change", { bubbles: true }));

    expect(window.eval("filters.type")).toBe("income");
  });

  it("updates sortOrder through the sort-by change event", () => {
    window.document.getElementById("sort-by").value = "amount-asc";
    window.document
      .getElementById("sort-by")
      .dispatchEvent(new window.Event("change", { bubbles: true }));

    expect(window.eval("sortOrder")).toBe("amount-asc");
  });

  it("shows the recurring transactions modal with the empty-state message", () => {
    window.eval(`data.settings.recurringTransactions = [];`);

    window.showRecurringTransactionsModal();

    expect(window.document.getElementById("recurring-tx-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("recurring-tx-list").textContent).toContain(
      "No recurring transactions set up yet.",
    );
  });

  it("renders recurring transactions and wires the action buttons", () => {
    window.eval(`
      data.settings.recurringTransactions = [
        { id: "rec-1", description: "Rent", active: true, frequency: "monthly", amount: 900, account: "cash", lastCreated: "2026-04-01" }
      ];
    `);

    window.showRecurringTransactionsModal();

    const text = window.document.getElementById("recurring-tx-list").textContent;
    expect(text).toContain("Rent");
    expect(text).toContain("monthly");
    expect(window.document.querySelectorAll(".toggle-recurring-btn").length).toBe(1);
    expect(window.document.querySelectorAll(".edit-recurring-btn").length).toBe(1);
    expect(window.document.querySelectorAll(".delete-recurring-btn").length).toBe(1);
  });

  it("connects Google Drive after the simulated delay", () => {
    vi.useFakeTimers();

    window.connectGoogleDrive();
    vi.advanceTimersByTime(1500);

    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(true);
    expect(window.document.getElementById("google-drive-auth").classList.contains("hidden")).toBe(true);
    expect(window.document.getElementById("google-drive-connected").classList.contains("hidden")).toBe(false);

    vi.useRealTimers();
  });

  it("backs up to Google Drive and updates the last-backup text", () => {
    vi.useFakeTimers();
    window.eval(`data.settings.backup.googleDrive.connected = true;`);

    window.backupToGoogleDrive();
    vi.advanceTimersByTime(2000);

    expect(window.eval("!!data.settings.backup.googleDrive.lastBackup")).toBe(true);
    expect(window.document.getElementById("last-backup-info").textContent).toContain("Last backup:");

    vi.useRealTimers();
  });

  it("returns early from restoreFromGoogleDrive when confirmation is canceled", () => {
    window.confirm = () => false;

    window.restoreFromGoogleDrive();

    expect(window.document.querySelector(".update-notification")?.textContent || "").not.toContain(
      "Restoring data to Google Drive",
    );
  });

  it("shows a success notification when restoring from Google Drive is confirmed", () => {
    vi.useFakeTimers();
    const notifications = [];
    window.confirm = () => true;
    window.showUpdateNotification = (message) => notifications.push(message);

    window.restoreFromGoogleDrive();
    vi.advanceTimersByTime(2000);

    expect(notifications).toContain("Restoring data from Google Drive...");
    expect(notifications).toContain("Data restored successfully");

    vi.useRealTimers();
  });

  it("disconnects Google Drive when confirmation is accepted", () => {
    window.confirm = () => true;
    window.eval(`data.settings.backup.googleDrive.connected = true;`);

    window.disconnectGoogleDrive();

    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(false);
    expect(window.document.getElementById("google-drive-auth").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("google-drive-connected").classList.contains("hidden")).toBe(true);
  });

  it("keeps Google Drive connected when disconnect is canceled", () => {
    window.confirm = () => false;
    window.eval(`data.settings.backup.googleDrive.connected = true;`);

    window.disconnectGoogleDrive();

    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(true);
  });

  it("exports data by creating and clicking a download link", () => {
    const clicked = { value: false };
    const originalCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = () => "blob:mock";

    window.exportData();

    const links = Array.from(window.document.querySelectorAll("a"));
    expect(links.length).toBe(0);
    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "Data exported successfully",
    );

    window.URL.createObjectURL = originalCreateObjectURL;
  });

  it("returns early from importData when the file chooser change event has no file", () => {
    const created = {};
    const originalCreateElement = window.document.createElement.bind(window.document);

    window.document.createElement = function createElement(tagName) {
      const element = originalCreateElement(tagName);
      if (tagName === "input") {
        created.input = element;
      }
      return element;
    };

    window.importData();
    Object.defineProperty(created.input, "files", {
      configurable: true,
      value: [],
    });
    created.input.dispatchEvent(new window.Event("change"));

    expect(window.document.querySelector(".update-notification")).toBeNull();

    window.document.createElement = originalCreateElement;
  });

  it("imports valid JSON data after confirmation", () => {
    const created = {};
    const originalCreateElement = window.document.createElement.bind(window.document);
    const originalFileReader = window.FileReader;
    const originalSetTimeout = window.setTimeout;

    window.document.createElement = function createElement(tagName) {
      const element = originalCreateElement(tagName);
      if (tagName === "input") {
        created.input = element;
      }
      return element;
    };

    window.FileReader = class MockFileReader {
      readAsText() {
        this.onload({
          target: {
            result: JSON.stringify({
              balances: { cu: 1, revolut: 2, cash: 3 },
              transactions: [],
              accounts: [{ id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }],
              categories: ["Other"],
              bills: [],
              budgets: {},
              settings: {
                theme: "light",
                accentColor: "#4a90e2",
                pinnedTransactions: [],
                recurringTransactions: [],
                dashboard: { widgets: {}, defaultView: "transactions" },
                backup: { googleDrive: { connected: false, lastBackup: null } },
                recurring: { autoCreate: false, notifications: false },
              },
            }),
          },
        });
      }
    };

    window.setTimeout = () => 0;
    window.confirm = () => true;

    window.importData();
    Object.defineProperty(created.input, "files", {
      configurable: true,
      value: [{ name: "backup.json" }],
    });
    created.input.dispatchEvent(new window.Event("change"));

    expect(window.eval("data.balances.cash")).toBe(3);
    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "Data imported successfully. Reloading...",
    );

    window.document.createElement = originalCreateElement;
    window.FileReader = originalFileReader;
    window.setTimeout = originalSetTimeout;
  });

  it("does not replace current data when import confirmation is canceled", () => {
    const created = {};
    const originalCreateElement = window.document.createElement.bind(window.document);
    const originalFileReader = window.FileReader;

    window.eval(`data.balances.cash = 99;`);

    window.document.createElement = function createElement(tagName) {
      const element = originalCreateElement(tagName);
      if (tagName === "input") {
        created.input = element;
      }
      return element;
    };

    window.FileReader = class MockFileReader {
      readAsText() {
        this.onload({
          target: {
            result: JSON.stringify({
              balances: { cu: 1, revolut: 2, cash: 3 },
              transactions: [],
            }),
          },
        });
      }
    };

    window.confirm = () => false;

    window.importData();
    Object.defineProperty(created.input, "files", {
      configurable: true,
      value: [{ name: "backup.json" }],
    });
    created.input.dispatchEvent(new window.Event("change"));

    expect(window.eval("data.balances.cash")).toBe(99);
    expect(window.document.querySelector(".update-notification")).toBeNull();

    window.document.createElement = originalCreateElement;
    window.FileReader = originalFileReader;
  });

  it("shows an error notification when imported JSON is invalid", () => {
    const created = {};
    const originalCreateElement = window.document.createElement.bind(window.document);
    const originalFileReader = window.FileReader;

    window.document.createElement = function createElement(tagName) {
      const element = originalCreateElement(tagName);
      if (tagName === "input") {
        created.input = element;
      }
      return element;
    };

    window.FileReader = class MockFileReader {
      readAsText() {
        this.onload({
          target: {
            result: JSON.stringify({ bad: true }),
          },
        });
      }
    };

    window.importData();
    Object.defineProperty(created.input, "files", {
      configurable: true,
      value: [{ name: "bad.json" }],
    });
    created.input.dispatchEvent(new window.Event("change"));

    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "Error importing data: Invalid data format",
    );

    window.document.createElement = originalCreateElement;
    window.FileReader = originalFileReader;
  });

  it("applies the system theme and reacts to preference changes while system mode is active", () => {
    let changeHandler;
    window.matchMedia = () => ({
      matches: true,
      addEventListener(event, handler) {
        if (event === "change") {
          changeHandler = handler;
        }
      },
      removeEventListener() {},
    });

    window.eval(`data.settings.theme = "system";`);
    window.applyTheme("system");
    expect(window.document.documentElement.getAttribute("data-theme")).toBe("dark");

    changeHandler({ matches: false });
    expect(window.document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies a non-system theme directly", () => {
    window.applyTheme("dark");

    expect(window.document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.eval("data.settings.theme")).toBe("dark");
  });

  it("keeps the current theme when the system listener fires after leaving system mode", () => {
    let changeHandler;
    window.matchMedia = () => ({
      matches: false,
      addEventListener(event, handler) {
        if (event === "change") {
          changeHandler = handler;
        }
      },
      removeEventListener() {},
    });

    window.applyTheme("system");
    window.eval(`data.settings.theme = "light";`);
    changeHandler({ matches: true });

    expect(window.document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("shows the update notification and stores the version when the app version changed", () => {
    const originalSetTimeout = window.setTimeout;
    let scheduledReload;

    window.localStorage.setItem("app-version", "0.0.1");
    window.setTimeout = (fn) => {
      scheduledReload = fn;
      return 0;
    };

    window.checkForUpdates();

    expect(window.document.body.textContent).toContain("New version available");
    expect(window.localStorage.getItem("app-version")).toBe("0.5.0");
    expect(typeof scheduledReload).toBe("function");

    window.setTimeout = originalSetTimeout;
  });

  it("shows the up-to-date notification and removes it after the fade-out timers", () => {
    const originalSetTimeout = window.setTimeout;

    window.localStorage.setItem("app-version", "0.5.0");
    window.setTimeout = (fn) => {
      fn();
      return 0;
    };

    window.checkForUpdates();

    expect(window.document.querySelector(".update-notification")).toBeNull();

    window.setTimeout = originalSetTimeout;
  });

  it("returns an empty attachments array when no files are provided", async () => {
    const attachments = await window.processAttachments([]);

    expect(attachments).toEqual([]);
  });

  it("skips non-image attachments and resolves when all files are processed", async () => {
    const attachments = await window.processAttachments([
      { name: "notes.txt", type: "text/plain", size: 8 },
    ]);

    expect(attachments).toEqual([]);
  });

  it("collects image attachments from successful file reads", async () => {
    const originalFileReader = window.FileReader;

    window.FileReader = class MockFileReader {
      readAsDataURL(file) {
        this.onload({ target: { result: `data:${file.type};base64,abc` } });
      }
    };

    const attachments = await window.processAttachments([
      { name: "photo.png", type: "image/png", size: 12 },
    ]);

    expect(attachments).toEqual([
      {
        name: "photo.png",
        type: "image/png",
        size: 12,
        data: "data:image/png;base64,abc",
      },
    ]);

    window.FileReader = originalFileReader;
  });

  it("resolves remaining image attachments when a file reader errors", async () => {
    const originalFileReader = window.FileReader;

    window.FileReader = class MockFileReader {
      readAsDataURL(file) {
        if (file.name === "bad.png") {
          this.onerror(new Error("failed"));
        } else {
          this.onload({ target: { result: `data:${file.type};base64,ok` } });
        }
      }
    };

    const attachments = await window.processAttachments([
      { name: "bad.png", type: "image/png", size: 1 },
      { name: "good.jpg", type: "image/jpeg", size: 2 },
    ]);

    expect(attachments).toEqual([
      {
        name: "good.jpg",
        type: "image/jpeg",
        size: 2,
        data: "data:image/jpeg;base64,ok",
      },
    ]);

    window.FileReader = originalFileReader;
  });

  it("rejects an empty tag input", () => {
    vi.useFakeTimers();
    window.document.getElementById("new-tag-input").value = "   ";

    window.addNewTag();

    const input = window.document.getElementById("new-tag-input");
    expect(input.classList.contains("input-error")).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(input.classList.contains("input-error")).toBe(false);
    vi.useRealTimers();
  });

  it("initializes missing tags state and adds a new tag", () => {
    window.eval(`data.tags = null;`);
    window.document.getElementById("new-tag-input").value = "travel";

    window.addNewTag();

    expect(window.eval("data.tags")).toContain("travel");
    expect(window.document.getElementById("new-tag-input").value).toBe("");
  });

  it("rejects duplicate tags", () => {
    const notifications = [];
    window.showUpdateNotification = (message) => notifications.push(message);
    window.eval(`data.tags = ["travel"];`);
    window.document.getElementById("new-tag-input").value = "travel";

    window.addNewTag();

    expect(window.eval("data.tags")).toEqual(["travel"]);
    expect(notifications).toContain("This tag already exists");
  });

  it("removes a tag from the tag list and tagged transactions", () => {
    const notifications = [];
    window.showUpdateNotification = (message) => notifications.push(message);
    window.eval(`
      data.tags = ["travel", "food"];
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "Trip", date: "2026-04-19", category: "Other", tags: ["travel", "food"], isPinned: false, isRecurring: false, notes: "", attachments: [] },
        { id: "tx-2", amount: 5, account: "cash", type: "expense", description: "Snack", date: "2026-04-19", category: "Other", tags: [], isPinned: false, isRecurring: false, notes: "", attachments: [] }
      ];
    `);

    window.removeTag("travel");

    expect(window.eval("data.tags")).toEqual(["food"]);
    expect(window.eval("data.transactions[0].tags")).toEqual(["food"]);
    expect(notifications).toContain("Tag removed successfully");
  });

  it("shows the disconnected Google Drive state when backup is not connected", () => {
    window.eval(`data.settings.backup.googleDrive.connected = false;`);

    window.initGoogleDriveBackup();

    expect(window.document.getElementById("google-drive-auth").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("google-drive-connected").classList.contains("hidden")).toBe(true);
  });

  it("shows the connected Google Drive state with a never-backed-up message", () => {
    window.eval(`
      data.settings.backup.googleDrive.connected = true;
      data.settings.backup.googleDrive.lastBackup = null;
    `);

    window.initGoogleDriveBackup();

    expect(window.document.getElementById("google-drive-auth").classList.contains("hidden")).toBe(true);
    expect(window.document.getElementById("google-drive-connected").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("last-backup-info").textContent).toContain("Last backup: Never");
  });

  it("shows the categories modal and renders category items", () => {
    window.showCategoriesModal();

    expect(window.document.getElementById("categories-modal")).toBeTruthy();
    expect(window.document.getElementById("categories-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("categories-list").textContent).toContain("Food & Dining");
  });

  it("adds a new category through the category management form", () => {
    window.showCategoriesModal();
    window.document.getElementById("new-category-input").value = "Insurance";

    window.addNewCategory();

    expect(window.eval("data.categories")).toContain("Insurance");
    expect(window.document.getElementById("categories-list").textContent).toContain("Insurance");
  });

  it("rejects duplicate categories", () => {
    window.showCategoriesModal();
    window.document.getElementById("new-category-input").value = "Other";

    window.addNewCategory();

    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "This category already exists",
    );
  });

  it("reassigns transactions and bills when deleting a category", () => {
    window.confirm = () => true;
    window.eval(`
      data.categories = ["Food & Dining", "Other"];
      data.transactions = [
        { id: "tx-1", amount: 10, account: "cash", type: "expense", description: "Lunch", date: "2026-04-19", category: "Food & Dining", notes: "", isPinned: false, isRecurring: false, attachments: [] }
      ];
      data.bills = [
        { id: "bill-1", description: "Meal", amount: 15, date: "2026-04-20", account: "cash", category: "Food & Dining", recurring: "none", notes: "", paid: false }
      ];
    `);
    window.showCategoriesModal();

    window.deleteCategory("Food & Dining");

    expect(window.eval("data.transactions[0].category")).toBe("Other");
    expect(window.eval("data.bills[0].category")).toBe("Other");
    expect(window.eval("data.categories")).not.toContain("Food & Dining");
  });

  it("refuses to delete the last remaining category", () => {
    window.eval(`data.categories = ["Other"];`);

    window.deleteCategory("Other");

    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "You must have at least one category",
    );
  });

  it("creates and shows the add bill modal with account and category options", () => {
    window.showAddBillModal();

    expect(window.document.getElementById("bill-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("bill-account").textContent).toContain("Cash");
    expect(window.document.getElementById("bill-category").textContent).toContain("Other");
  });

  it("saves a bill and closes the bill modal", () => {
    window.showAddBillModal();
    window.document.getElementById("bill-desc").value = "Rent";
    window.document.getElementById("bill-amount").value = "1200";
    window.document.getElementById("bill-date").value = "2026-04-25";
    window.document.getElementById("bill-account").value = "cash";
    window.document.getElementById("bill-category").value = "Other";
    window.document.getElementById("bill-recurring").value = "monthly";
    window.document.getElementById("bill-notes").value = "April rent";

    window.saveBill();

    expect(window.eval("data.bills.length")).toBe(1);
    expect(window.eval("data.bills[0].description")).toBe("Rent");
    expect(window.document.getElementById("bill-modal").classList.contains("hidden")).toBe(true);
  });

  it("shows bill details for an existing bill", () => {
    window.eval(`
      data.bills = [
        { id: "bill-1", description: "Rent", amount: 1200, date: "2026-04-25", account: "cash", category: "Other", recurring: "monthly", notes: "April rent", paid: false }
      ];
    `);

    window.showBillDetails("bill-1");

    expect(window.document.getElementById("bill-details-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.getElementById("bill-details-title").textContent).toContain("Rent");
    expect(window.document.getElementById("bill-details-content").textContent).toContain("Cash");
  });

  it("marks a bill as paid and creates a transaction", () => {
    window.eval(`
      data.bills = [
        { id: "bill-1", description: "Rent", amount: 1200, date: "2026-04-25", account: "cash", category: "Other", recurring: "monthly", notes: "April rent", paid: false }
      ];
      data.transactions = [];
      data.balances.cash = 0;
    `);

    window.payBill("bill-1");

    expect(window.eval("data.bills[0].paid")).toBe(true);
    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.balances.cash")).toBe(-1200);
  });

  it("opens the bill edit form for an existing bill", () => {
    window.eval(`
      data.bills = [
        { id: "bill-1", description: "Rent", amount: 1200, date: "2026-04-25", account: "cash", category: "Other", recurring: "monthly", notes: "April rent", paid: false }
      ];
    `);
    window.showBillDetails("bill-1");

    window.editBill("bill-1");

    expect(window.document.getElementById("bill-modal-title").textContent).toContain("Edit Bill");
    expect(window.document.getElementById("bill-desc").value).toBe("Rent");
  });

  it("deletes a bill when confirmed", () => {
    window.confirm = () => true;
    window.eval(`
      data.bills = [
        { id: "bill-1", description: "Rent", amount: 1200, date: "2026-04-25", account: "cash", category: "Other", recurring: "monthly", notes: "April rent", paid: false }
      ];
    `);
    window.showBillDetails("bill-1");

    window.deleteBill("bill-1");

    expect(window.eval("data.bills.length")).toBe(0);
    expect(window.document.getElementById("bill-details-modal").classList.contains("hidden")).toBe(true);
  });
});
