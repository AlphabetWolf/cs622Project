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
    return { destroy() {} };
  };
  window.L = {
    map() {
      return { setView() { return this; }, remove() {}, invalidateSize() {} };
    },
    tileLayer() {
      return { addTo() { return this; } };
    },
    marker() {
      return { addTo() { return this; } };
    },
  };
  window.alert = () => {};
  window.prompt = () => null;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
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

function setSavedData(window, obj) {
  window.localStorage.setItem("money-manager-data", JSON.stringify(obj));
}

describe("mutation-kill: loadData defaults applied for missing settings fields", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("applies the literal default theme 'light' when settings.theme is missing", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.theme")).toBe("light");
  });

  it("applies the literal default accentColor '#4a90e2' when missing", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.accentColor")).toBe("#4a90e2");
  });

  it("initializes pinnedTransactions and recurringTransactions as empty arrays", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
    expect(window.eval("data.settings.recurringTransactions")).toEqual([]);
    expect(window.eval("Array.isArray(data.settings.pinnedTransactions)")).toBe(true);
    expect(window.eval("Array.isArray(data.settings.recurringTransactions)")).toBe(true);
  });

  it("applies the exact default dashboard widget visibility map", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.dashboard.widgets.totalBalance")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.accounts")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.recentTransactions")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.upcomingBills")).toBe(false);
    expect(window.eval("data.settings.dashboard.widgets.spendingChart")).toBe(false);
  });

  it("applies the literal default dashboard.defaultView 'transactions'", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.dashboard.defaultView")).toBe("transactions");
  });

  it("applies default backup.googleDrive shape", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(false);
    expect(window.eval("data.settings.backup.googleDrive.lastBackup")).toBeNull();
  });

  it("applies default recurring settings shape", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.settings.recurring.autoCreate")).toBe(false);
    expect(window.eval("data.settings.recurring.notifications")).toBe(false);
  });
});

describe("mutation-kill: loadData top-level defaults", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("uses default balances {cu:0, revolut:0, cash:0} when balances are missing", () => {
    setSavedData(window, { transactions: [], settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.balances.cu")).toBe(0);
    expect(window.eval("data.balances.revolut")).toBe(0);
    expect(window.eval("data.balances.cash")).toBe(0);
  });

  it("uses transactions=[] when transactions are missing", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("Array.isArray(data.transactions)")).toBe(true);
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("falls back to the literal default categories list when categories are missing", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("data.categories")).toEqual([
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts & Donations",
      "Income",
      "Other",
    ]);
  });

  it("uses budgets={} when budgets are missing", () => {
    setSavedData(window, { settings: { version: "0.5.0" } });
    window.loadData();
    expect(window.eval("typeof data.budgets")).toBe("object");
    expect(window.eval("Object.keys(data.budgets).length")).toBe(0);
  });
});

describe("mutation-kill: loadData account migration", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("creates the literal default cu/revolut/cash accounts when accounts is missing, stamps version '0.3.5' and notifies upgrade to APP_VERSION", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setSavedData(window, { settings: { version: "0.5.0" }, balances: { cu: 1, revolut: 2, cash: 3 } });
    window.loadData();
    expect(window.eval("data.accounts.length")).toBe(3);
    expect(window.eval("data.accounts[0].id")).toBe("cu");
    expect(window.eval("data.accounts[0].name")).toBe("Credit Union");
    expect(window.eval("data.accounts[0].icon")).toBe("university");
    expect(window.eval("data.accounts[0].color")).toBe("#4a90e2");
    expect(window.eval("data.accounts[1].id")).toBe("revolut");
    expect(window.eval("data.accounts[1].name")).toBe("Revolut");
    expect(window.eval("data.accounts[1].icon")).toBe("credit-card");
    expect(window.eval("data.accounts[1].color")).toBe("#50c878");
    expect(window.eval("data.accounts[2].id")).toBe("cash");
    expect(window.eval("data.accounts[2].name")).toBe("Cash");
    expect(window.eval("data.accounts[2].icon")).toBe("money-bill-wave");
    expect(window.eval("data.accounts[2].color")).toBe("#ff9800");
    expect(messages[0]).toBe("Upgraded from v0.3.5 to v0.5.0");
    expect(window.eval("data.settings.version")).toBe("0.5.0");
  });

  it("backfills missing colors for cu/revolut/cash by id", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      accounts: [
        { id: "cu", name: "Credit Union", icon: "university" },
        { id: "revolut", name: "Revolut", icon: "credit-card" },
        { id: "cash", name: "Cash", icon: "money-bill-wave" },
      ],
    });
    window.loadData();
    expect(window.eval("data.accounts[0].color")).toBe("#4a90e2");
    expect(window.eval("data.accounts[1].color")).toBe("#50c878");
    expect(window.eval("data.accounts[2].color")).toBe("#ff9800");
  });

  it("preserves saved accounts (does not overwrite when accounts present)", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      accounts: [
        { id: "wallet", name: "My Wallet", icon: "briefcase", color: "#123456" },
      ],
    });
    window.loadData();
    expect(window.eval("data.accounts.length")).toBe(1);
    expect(window.eval("data.accounts[0].id")).toBe("wallet");
    expect(window.eval("data.accounts[0].color")).toBe("#123456");
  });

  it("assigns one of the six default fallback colors to unknown accounts missing a color", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      accounts: [{ id: "savings", name: "Savings", icon: "piggy-bank" }],
    });
    window.loadData();
    const allowed = ["#4a90e2", "#50c878", "#f44336", "#ff9800", "#9c27b0", "#795548"];
    expect(allowed).toContain(window.eval("data.accounts[0].color"));
  });
});

describe("mutation-kill: loadData transaction migration", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("defaults missing tx.category to 'Income' for income type", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      transactions: [
        { amount: 100, account: "cu", type: "income", description: "Salary", date: "2026-04-19" },
      ],
    });
    window.loadData();
    expect(window.eval("data.transactions[0].category")).toBe("Income");
  });

  it("defaults missing tx.category to 'Other' for expense type", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      transactions: [
        { amount: 7, account: "cash", type: "expense", description: "Coffee", date: "2026-04-19" },
      ],
    });
    window.loadData();
    expect(window.eval("data.transactions[0].category")).toBe("Other");
  });

  it("defaults missing tx booleans to false and missing notes/attachments to '' and []", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      transactions: [
        { amount: 7, account: "cash", type: "expense", description: "x", date: "2026-04-19" },
      ],
    });
    window.loadData();
    expect(window.eval("data.transactions[0].isRecurring")).toBe(false);
    expect(window.eval("data.transactions[0].isPinned")).toBe(false);
    expect(window.eval("data.transactions[0].notes")).toBe("");
    expect(window.eval("data.transactions[0].attachments")).toEqual([]);
  });

  it("preserves explicit category, notes, and attachments when present", () => {
    setSavedData(window, {
      settings: { version: "0.5.0" },
      transactions: [
        {
          amount: 7,
          account: "cash",
          type: "expense",
          description: "x",
          date: "2026-04-19",
          category: "Food & Dining",
          notes: "lunch",
          attachments: ["a.png"],
        },
      ],
    });
    window.loadData();
    expect(window.eval("data.transactions[0].category")).toBe("Food & Dining");
    expect(window.eval("data.transactions[0].notes")).toBe("lunch");
    expect(window.eval("data.transactions[0].attachments")).toEqual(["a.png"]);
  });

  it("triggers an upgrade notification with the previous and current version when version differs", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setSavedData(window, {
      settings: { version: "0.4.0" },
      accounts: [
        { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
        { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
        { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" },
      ],
    });
    window.loadData();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe("Upgraded from v0.4.0 to v0.5.0");
    expect(window.eval("data.settings.version")).toBe("0.5.0");
  });

  it("does not trigger an upgrade notification when version matches", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setSavedData(window, {
      settings: { version: "0.5.0" },
      accounts: [
        { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
        { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
        { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" },
      ],
    });
    window.loadData();
    expect(messages).toHaveLength(0);
  });
});

describe("mutation-kill: loadData reset-on-parse-error", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("resets to literal defaults when JSON cannot be parsed", () => {
    window.localStorage.setItem("money-manager-data", "{not-json");
    window.applyAppSettings = () => {};
    window.loadData();
    expect(window.eval("data.balances")).toEqual({ cu: 0, revolut: 0, cash: 0 });
    expect(window.eval("data.transactions")).toEqual([]);
    expect(window.eval("data.categories")).toEqual([
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts",
      "Other",
    ]);
    expect(window.eval("data.accounts.length")).toBe(3);
    expect(window.eval("data.accounts.map(a => a.id)")).toEqual(["cu", "revolut", "cash"]);
    expect(window.eval("data.accounts.map(a => a.color)")).toEqual(["#4a90e2", "#50c878", "#ff9800"]);
    expect(window.eval("data.settings.theme")).toBe("light");
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
  });
});

describe("mutation-kill: getAccountColor branches", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("returns the literal default '#607d8b' when data.accounts is null", () => {
    window.eval("data.accounts = null;");
    expect(window.getAccountColor("cu")).toBe("#607d8b");
  });

  it("returns the literal default '#607d8b' when data.accounts is not an array", () => {
    window.eval("data.accounts = { cu: { color: '#fff' } };");
    expect(window.getAccountColor("cu")).toBe("#607d8b");
  });

  it("returns the saved account color when present", () => {
    window.eval("data.accounts = [{ id: 'cu', color: '#abcdef' }];");
    expect(window.getAccountColor("cu")).toBe("#abcdef");
  });

  it("returns '#607d8b' when the matching account has no color", () => {
    window.eval("data.accounts = [{ id: 'cu' }];");
    expect(window.getAccountColor("cu")).toBe("#607d8b");
  });

  it("returns '#607d8b' when no account matches the id", () => {
    window.eval("data.accounts = [{ id: 'cu', color: '#abcdef' }];");
    expect(window.getAccountColor("nope")).toBe("#607d8b");
  });
});

describe("mutation-kill: searchTransactions", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "t1", amount: 12.34, account: "cu", type: "expense", description: "Coffee shop", category: "Food & Dining", date: "2026-04-19", notes: "ristretto", attachments: [] },
      { id: "t2", amount: 50, account: "cash", type: "income", description: "Refund", category: "Income", date: "2026-04-18", notes: "", attachments: [] },
      { id: "t3", amount: 9.99, account: "revolut", type: "expense", description: "Bookstore", category: "Shopping", date: "2026-03-12", notes: "", attachments: [] }
    ];`);
  });

  function listText() {
    return window.document.getElementById("tx-list").textContent;
  }
  function listCount() {
    return window.document.getElementById("tx-list").querySelectorAll("li").length;
  }

  it("calls renderTransactions when the query is empty (renders all 3 rows)", () => {
    window.searchTransactions("");
    expect(listCount()).toBe(3);
  });

  it("calls renderTransactions when the query is whitespace only (renders all 3 rows)", () => {
    window.searchTransactions("   ");
    expect(listCount()).toBe(3);
  });

  it("matches by description (case-insensitive)", () => {
    window.searchTransactions("COFFEE");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("Coffee shop");
  });

  it("matches by category", () => {
    window.searchTransactions("shopping");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("Bookstore");
  });

  it("matches by date string", () => {
    window.searchTransactions("2026-03");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("Bookstore");
  });

  it("matches by amount string", () => {
    window.searchTransactions("12.34");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("Coffee shop");
  });

  it("matches by notes", () => {
    window.searchTransactions("ristretto");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("Coffee shop");
  });

  it("renders the literal 'No transactions match your search' message when nothing matches", () => {
    window.searchTransactions("zzznomatch");
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("No transactions match your search");
    expect(html).toContain("no-transactions");
  });

  it("sorts by date descending under sortOrder='date-desc'", () => {
    window.eval("sortOrder = 'date-desc';");
    window.searchTransactions("o");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("Coffee shop");
    expect(items[items.length - 1].textContent).toContain("Bookstore");
  });

  it("sorts by date ascending under sortOrder='date-asc'", () => {
    window.eval("sortOrder = 'date-asc';");
    window.searchTransactions("o");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("Bookstore");
    expect(items[items.length - 1].textContent).toContain("Coffee shop");
  });

  it("sorts by amount descending under sortOrder='amount-desc'", () => {
    window.eval("sortOrder = 'amount-desc';");
    window.searchTransactions("o");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("Refund");
    expect(items[items.length - 1].textContent).toContain("Bookstore");
  });

  it("sorts by amount ascending under sortOrder='amount-asc'", () => {
    window.eval("sortOrder = 'amount-asc';");
    window.searchTransactions("o");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("Bookstore");
    expect(items[items.length - 1].textContent).toContain("Refund");
  });

  it("renders an arrow-down icon for expense rows", () => {
    window.searchTransactions("Coffee");
    expect(window.document.getElementById("tx-list").innerHTML).toContain("fa-arrow-down");
  });

  it("renders an arrow-up icon for income rows", () => {
    window.searchTransactions("Refund");
    expect(window.document.getElementById("tx-list").innerHTML).toContain("fa-arrow-up");
  });

  it("renders the category tag span when tx.category is present", () => {
    window.searchTransactions("Coffee");
    expect(window.document.getElementById("tx-list").innerHTML).toContain("category-tag");
  });

  it("falls back to literal '(no desc)' text when description is missing", () => {
    window.eval(`data.transactions = [{ id: 'q', amount: 1, account: 'cu', type: 'expense', description: '', category: 'Food & Dining', date: '2026-04-19', notes: 'flag', attachments: [] }];`);
    window.searchTransactions("flag");
    expect(window.document.getElementById("tx-list").textContent).toContain("(no desc)");
  });
});

describe("mutation-kill: filterByDateRange", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "a", amount: 1, account: "cu", type: "expense", description: "A", category: "Other", date: "2026-04-01", notes: "", attachments: [] },
      { id: "b", amount: 2, account: "cu", type: "expense", description: "B", category: "Other", date: "2026-04-15", notes: "", attachments: [] },
      { id: "c", amount: 3, account: "cu", type: "expense", description: "C", category: "Other", date: "2026-04-30", notes: "", attachments: [] }
    ];`);
  });

  function listCount() {
    return window.document.getElementById("tx-list").querySelectorAll("li").length;
  }
  function listText() {
    return window.document.getElementById("tx-list").textContent;
  }

  it("calls renderTransactions when both dates are null (renders all)", () => {
    window.filterByDateRange(null, null);
    expect(listCount()).toBe(3);
  });

  it("filters with startDate-only (>=) using a string", () => {
    window.filterByDateRange("2026-04-15", null);
    expect(listCount()).toBe(2);
    expect(listText()).toContain("B");
    expect(listText()).toContain("C");
    expect(listText()).not.toContain(">A<");
  });

  it("filters with endDate-only (<=) using a string", () => {
    window.filterByDateRange(null, "2026-04-15");
    expect(listCount()).toBe(2);
    expect(listText()).toContain("A");
    expect(listText()).toContain("B");
  });

  it("filters with both startDate and endDate", () => {
    window.filterByDateRange("2026-04-15", "2026-04-15");
    expect(listCount()).toBe(1);
    expect(listText()).toContain("B");
  });

  it("renders the literal 'No transactions in the selected date range' when result is empty", () => {
    window.filterByDateRange("2030-01-01", "2030-12-31");
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("No transactions in the selected date range");
    expect(html).toContain("no-transactions");
  });

  it("sorts result by date-desc under sortOrder='date-desc'", () => {
    window.eval("sortOrder = 'date-desc';");
    window.filterByDateRange("2026-04-01", "2026-04-30");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("C");
    expect(items[items.length - 1].textContent).toContain("A");
  });

  it("sorts result by date-asc under sortOrder='date-asc'", () => {
    window.eval("sortOrder = 'date-asc';");
    window.filterByDateRange("2026-04-01", "2026-04-30");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("A");
    expect(items[items.length - 1].textContent).toContain("C");
  });

  it("sorts result by amount-desc under sortOrder='amount-desc'", () => {
    window.eval("sortOrder = 'amount-desc';");
    window.filterByDateRange("2026-04-01", "2026-04-30");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("C");
    expect(items[items.length - 1].textContent).toContain("A");
  });

  it("sorts result by amount-asc under sortOrder='amount-asc'", () => {
    window.eval("sortOrder = 'amount-asc';");
    window.filterByDateRange("2026-04-01", "2026-04-30");
    const items = Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
    expect(items[0].textContent).toContain("A");
    expect(items[items.length - 1].textContent).toContain("C");
  });
});

describe("mutation-kill: initial in-memory data literal (no localStorage)", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("starts with the literal initial balances {cu:0, revolut:0, cash:0}", () => {
    expect(window.eval("data.balances")).toEqual({ cu: 0, revolut: 0, cash: 0 });
  });

  it("starts with the literal initial accounts cu/revolut/cash with their fields", () => {
    expect(window.eval("data.accounts")).toEqual([
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" },
    ]);
  });

  it("starts with the literal initial categories list (with 'Gifts')", () => {
    expect(window.eval("data.categories")).toEqual([
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts",
      "Other",
    ]);
  });

  it("starts with empty transactions, tags, bills, and budgets", () => {
    expect(window.eval("data.transactions")).toEqual([]);
    expect(window.eval("data.tags")).toEqual([]);
    expect(window.eval("data.bills")).toEqual([]);
    expect(window.eval("data.budgets")).toEqual({});
  });

  it("starts with the literal initial settings.theme='light' and accentColor='#4a90e2'", () => {
    expect(window.eval("data.settings.theme")).toBe("light");
    expect(window.eval("data.settings.accentColor")).toBe("#4a90e2");
  });

  it("starts with the literal initial dashboard widgets and defaultView='transactions'", () => {
    expect(window.eval("data.settings.dashboard.widgets.totalBalance")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.accounts")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.recentTransactions")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.upcomingBills")).toBe(false);
    expect(window.eval("data.settings.dashboard.widgets.spendingChart")).toBe(false);
    expect(window.eval("data.settings.dashboard.defaultView")).toBe("transactions");
  });

  it("starts with the literal initial backup.googleDrive shape and recurring shape", () => {
    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(false);
    expect(window.eval("data.settings.backup.googleDrive.lastBackup")).toBeNull();
    expect(window.eval("data.settings.recurring.autoCreate")).toBe(false);
    expect(window.eval("data.settings.recurring.notifications")).toBe(false);
  });

  it("starts with empty pinnedTransactions and recurringTransactions arrays", () => {
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
    expect(window.eval("data.settings.recurringTransactions")).toEqual([]);
  });

  it("starts with the module-level constants STORAGE_KEY, APP_VERSION, currentTxIndex=-1, currentView='transactions', modalInitialized=false, currentMap=null", () => {
    expect(window.eval("STORAGE_KEY")).toBe("money-manager-data");
    expect(window.eval("APP_VERSION")).toBe("0.5.0");
    expect(window.eval("currentTxIndex")).toBe(-1);
    expect(window.eval("currentView")).toBe("transactions");
    expect(window.eval("modalInitialized")).toBe(false);
    expect(window.eval("currentMap")).toBeNull();
  });
});

describe("mutation-kill: deleteTransaction boundaries and ledger", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "a", amount: 25, account: "cu", type: "expense", description: "A", category: "Other", date: "2026-04-01", isPinned: false, isRecurring: false, notes: "", attachments: [] },
      { id: "b", amount: 100, account: "cu", type: "income", description: "B", category: "Income", date: "2026-04-02", isPinned: false, isRecurring: false, notes: "", attachments: [] }
    ];
    data.balances.cu = 75;`);
  });

  it("does nothing when index is negative", () => {
    window.deleteTransaction(-1);
    expect(window.eval("data.transactions.length")).toBe(2);
    expect(window.eval("data.balances.cu")).toBe(75);
  });

  it("does nothing when index equals data.transactions.length", () => {
    window.deleteTransaction(2);
    expect(window.eval("data.transactions.length")).toBe(2);
    expect(window.eval("data.balances.cu")).toBe(75);
  });

  it("removes the transaction and adds back its expense amount to the balance", () => {
    window.deleteTransaction(0);
    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.transactions[0].id")).toBe("b");
    expect(window.eval("data.balances.cu")).toBe(100);
  });

  it("removes the transaction and subtracts back its income amount from the balance", () => {
    window.deleteTransaction(1);
    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.transactions[0].id")).toBe("a");
    expect(window.eval("data.balances.cu")).toBe(-25);
  });

  it("removes the transaction id from settings.pinnedTransactions when pinned", () => {
    window.eval(`data.transactions[0].isPinned = true;
                 data.settings.pinnedTransactions = ["a", "other"];`);
    window.deleteTransaction(0);
    expect(window.eval("data.settings.pinnedTransactions")).toEqual(["other"]);
  });
});

describe("mutation-kill: confirmReset wipes data to literal defaults", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [{ id: "x", amount: 1, account: "cu", type: "expense", description: "X", category: "Other", date: "2026-04-01", isPinned: false, isRecurring: false, notes: "", attachments: [] }];
    data.balances.cu = 12345;
    data.settings.theme = "dark";
    data.settings.accentColor = "#000000";
    data.settings.recurring.autoCreate = true;
    data.settings.dashboard.widgets.totalBalance = false;
    data.settings.dashboard.defaultView = "charts";`);
  });

  it("resets balances to literal {cu:0, revolut:0, cash:0}", () => {
    window.confirmReset();
    expect(window.eval("data.balances")).toEqual({ cu: 0, revolut: 0, cash: 0 });
  });

  it("resets transactions to []", () => {
    window.confirmReset();
    expect(window.eval("data.transactions")).toEqual([]);
  });

  it("resets accounts to the three literal defaults with correct ids/names/icons/colors", () => {
    window.confirmReset();
    expect(window.eval("data.accounts")).toEqual([
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" },
    ]);
  });

  it("resets categories to the literal default list", () => {
    window.confirmReset();
    expect(window.eval("data.categories")).toEqual([
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts",
      "Other",
    ]);
  });

  it("resets settings to the literal defaults (theme=light, accentColor=#4a90e2, version=APP_VERSION)", () => {
    window.confirmReset();
    expect(window.eval("data.settings.theme")).toBe("light");
    expect(window.eval("data.settings.accentColor")).toBe("#4a90e2");
    expect(window.eval("data.settings.version")).toBe("0.5.0");
    expect(window.eval("data.settings.pinnedTransactions")).toEqual([]);
    expect(window.eval("data.settings.recurringTransactions")).toEqual([]);
  });

  it("resets dashboard widgets and defaultView to literal defaults", () => {
    window.confirmReset();
    expect(window.eval("data.settings.dashboard.widgets.totalBalance")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.accounts")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.recentTransactions")).toBe(true);
    expect(window.eval("data.settings.dashboard.widgets.upcomingBills")).toBe(false);
    expect(window.eval("data.settings.dashboard.widgets.spendingChart")).toBe(false);
    expect(window.eval("data.settings.dashboard.defaultView")).toBe("transactions");
  });

  it("resets backup and recurring settings to literal defaults", () => {
    window.confirmReset();
    expect(window.eval("data.settings.backup.googleDrive.connected")).toBe(false);
    expect(window.eval("data.settings.backup.googleDrive.lastBackup")).toBeNull();
    expect(window.eval("data.settings.recurring.autoCreate")).toBe(false);
    expect(window.eval("data.settings.recurring.notifications")).toBe(false);
  });

  it("resets tags=[], bills=[], budgets={}", () => {
    window.confirmReset();
    expect(window.eval("data.tags")).toEqual([]);
    expect(window.eval("data.bills")).toEqual([]);
    expect(window.eval("data.budgets")).toEqual({});
  });

  it("calls showUpdateNotification with the literal success message", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    window.confirmReset();
    expect(messages).toContain("All data has been reset successfully");
  });

  it("hides the reset-confirm-modal and removes modal-open from body", () => {
    window.document.getElementById("reset-confirm-modal").classList.remove("hidden");
    window.document.body.classList.add("modal-open");
    window.confirmReset();
    expect(window.document.getElementById("reset-confirm-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });
});

describe("mutation-kill: processRecurringTransactions frequency boundaries", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`
      data.settings.recurring.autoCreate = true;
      data.settings.recurring.notifications = false;
      data.transactions = [];
      data.balances.cu = 0;
      data.balances.cash = 0;
      data.balances.revolut = 0;
    `);
  });

  function setupRec(spec) {
    window.eval(`data.settings.recurringTransactions = ${JSON.stringify(spec)};`);
  }

  it("does nothing when settings.recurring.autoCreate is false", () => {
    window.eval(`data.settings.recurring.autoCreate = false;`);
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 1, account: "cu", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("skips an inactive recurring transaction", () => {
    setupRec([{ id: "r", active: false, frequency: "daily", amount: 1, account: "cu", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("creates a transaction when lastCreated is missing (daily)", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
    expect(window.eval("data.balances.cash")).toBe(-5);
  });

  it("does not fire daily when same-day (0 days since lastCreated)", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-25" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires daily when lastCreated is two days ago (above >=1-day threshold)", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-23" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("does not fire weekly at 6 days (just below the >=7 boundary)", () => {
    setupRec([{ id: "r", active: true, frequency: "weekly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-19" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires weekly at 8 days (above the >=7-day threshold)", () => {
    setupRec([{ id: "r", active: true, frequency: "weekly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-17" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("does not fire biweekly at 13 days (just below >=14)", () => {
    setupRec([{ id: "r", active: true, frequency: "biweekly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-12" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires biweekly at 15 days (above the >=14-day threshold)", () => {
    setupRec([{ id: "r", active: true, frequency: "biweekly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-10" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("does not fire monthly when lastCreated was earlier in the same month", () => {
    setupRec([{ id: "r", active: true, frequency: "monthly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-15" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires monthly when lastCreated was the previous month (>=1 month diff)", () => {
    setupRec([{ id: "r", active: true, frequency: "monthly", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-03-15" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("does not fire quarterly at 2 months (just below >=3)", () => {
    setupRec([{ id: "r", active: true, frequency: "quarterly", amount: 5, account: "cu", type: "income", description: "x", category: "Income", lastCreated: "2026-02-25" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires quarterly at exactly the >=3-month boundary", () => {
    setupRec([{ id: "r", active: true, frequency: "quarterly", amount: 5, account: "cu", type: "income", description: "x", category: "Income", lastCreated: "2026-01-25" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("does not fire yearly at 11 months (just below >=12)", () => {
    setupRec([{ id: "r", active: true, frequency: "yearly", amount: 5, account: "cu", type: "income", description: "x", category: "Income", lastCreated: "2025-05-25" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(0);
  });

  it("fires yearly at exactly the >=12-month boundary", () => {
    setupRec([{ id: "r", active: true, frequency: "yearly", amount: 5, account: "cu", type: "income", description: "x", category: "Income", lastCreated: "2025-04-25" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions.length")).toBe(1);
  });

  it("sets isRecurring=true and isPinned=false on the auto-created transaction", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions[0].isRecurring")).toBe(true);
    expect(window.eval("data.transactions[0].isPinned")).toBe(false);
  });

  it("uses [] as default tags when recurringTx.tags is missing", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions[0].tags")).toEqual([]);
  });

  it("preserves recurringTx.tags when present", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24", tags: ["bill", "auto"] }]);
    window.processRecurringTransactions();
    expect(window.eval("data.transactions[0].tags")).toEqual(["bill", "auto"]);
  });

  it("notifies with the literal 'Created recurring' message when notifications is true", () => {
    window.eval(`data.settings.recurring.notifications = true;`);
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "Coffee", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(messages).toContain("Created recurring expense: Coffee");
  });

  it("does not notify when notifications is false", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "Coffee", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(messages).toEqual([]);
  });

  it("updates lastCreated to today's ISO date after firing", () => {
    setupRec([{ id: "r", active: true, frequency: "daily", amount: 5, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" }]);
    window.processRecurringTransactions();
    expect(window.eval("data.settings.recurringTransactions[0].lastCreated")).toBe("2026-04-25");
  });

  it("applies expense vs income sign correctly to balance updates", () => {
    setupRec([
      { id: "exp", active: true, frequency: "daily", amount: 7, account: "cash", type: "expense", description: "x", category: "Other", lastCreated: "2026-04-24" },
      { id: "inc", active: true, frequency: "daily", amount: 9, account: "cu", type: "income", description: "y", category: "Income", lastCreated: "2026-04-24" },
    ]);
    window.processRecurringTransactions();
    expect(window.eval("data.balances.cash")).toBe(-7);
    expect(window.eval("data.balances.cu")).toBe(9);
  });
});

describe("mutation-kill: saveEditedTransaction sync ledger", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "tx-old", amount: 20, account: "cu", type: "expense", description: "old", category: "Other", date: "2026-04-01", isPinned: false, isRecurring: false, notes: "", attachments: [] }
    ];
    data.balances.cu = -20;
    currentTxIndex = 0;
    var tags = [];`);
    window.document.getElementById("edit-tx-amount").value = "30";
    window.document.getElementById("edit-tx-account").value = "cu";
    window.document.getElementById("edit-tx-type").value = "expense";
    window.document.getElementById("edit-tx-desc").value = "new";
    window.document.getElementById("edit-tx-date").value = "2026-04-10";
    window.document.getElementById("edit-tx-category").value = "Food & Dining";
    window.document.getElementById("edit-tx-recurring").checked = false;
    window.document.getElementById("edit-tx-pinned").checked = false;
    window.document.getElementById("edit-tx-notes").value = "noted";
  });

  it("returns early when currentTxIndex is negative", () => {
    window.eval("currentTxIndex = -1;");
    window.saveEditedTransaction();
    expect(window.eval("data.transactions[0].amount")).toBe(20);
    expect(window.eval("data.balances.cu")).toBe(-20);
  });

  it("returns early when currentTxIndex equals data.transactions.length", () => {
    window.eval("currentTxIndex = 1;");
    window.saveEditedTransaction();
    expect(window.eval("data.transactions[0].amount")).toBe(20);
    expect(window.eval("data.balances.cu")).toBe(-20);
  });

  it("reverses old expense and applies new expense to the balance", () => {
    window.saveEditedTransaction();
    expect(window.eval("data.balances.cu")).toBe(-30);
    expect(window.eval("data.transactions[0].amount")).toBe(30);
    expect(window.eval("data.transactions[0].description")).toBe("new");
    expect(window.eval("data.transactions[0].category")).toBe("Food & Dining");
    expect(window.eval("data.transactions[0].notes")).toBe("noted");
  });

  it("reverses old expense and applies new income (sign flip across types)", () => {
    window.document.getElementById("edit-tx-type").value = "income";
    window.saveEditedTransaction();
    expect(window.eval("data.balances.cu")).toBe(30);
  });

  it("adds the txId to settings.pinnedTransactions when newly pinned", () => {
    window.document.getElementById("edit-tx-pinned").checked = true;
    window.saveEditedTransaction();
    expect(window.eval("data.settings.pinnedTransactions")).toContain("tx-old");
  });

  it("removes the txId from settings.pinnedTransactions when unpinned", () => {
    window.eval(`data.transactions[0].isPinned = true;
                 data.settings.pinnedTransactions = ["tx-old", "tx-other"];`);
    window.document.getElementById("edit-tx-pinned").checked = false;
    window.saveEditedTransaction();
    expect(window.eval("data.settings.pinnedTransactions")).toEqual(["tx-other"]);
  });

  it("hides edit-tx-modal and removes modal-open class from body on success", () => {
    window.document.getElementById("edit-tx-modal").classList.remove("hidden");
    window.document.body.classList.add("modal-open");
    window.saveEditedTransaction();
    expect(window.document.getElementById("edit-tx-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });
});

describe("mutation-kill: getDaysDifference and getMonthsDifference boundaries", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
  });

  it("returns 0 for same-day Date objects regardless of time", () => {
    expect(window.getDaysDifference(new Date("2026-04-25T01:00:00Z"), new Date("2026-04-25T23:00:00Z"))).toBe(0);
  });

  it("returns 1 for exactly 24h apart", () => {
    expect(window.getDaysDifference(new Date("2026-04-24T12:00:00Z"), new Date("2026-04-25T12:00:00Z"))).toBe(1);
  });

  it("returns absolute (positive) value when arguments are reversed", () => {
    expect(window.getDaysDifference(new Date("2026-04-25T12:00:00Z"), new Date("2026-04-22T12:00:00Z"))).toBe(3);
  });

  it("returns 0 months for same year/month", () => {
    expect(window.getMonthsDifference(new Date(2026, 3, 1), new Date(2026, 3, 30))).toBe(0);
  });

  it("counts month diff including year crossings", () => {
    expect(window.getMonthsDifference(new Date(2025, 10, 15), new Date(2026, 1, 15))).toBe(3);
  });

  it("returns a negative value when first date is later than second (no abs)", () => {
    expect(window.getMonthsDifference(new Date(2026, 5, 1), new Date(2026, 0, 1))).toBe(-5);
  });
});

describe("mutation-kill: formatAmt edge cases", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
  });

  it("uses the literal '€' prefix", () => {
    expect(window.formatAmt(0)).toBe("€0.00");
  });

  it("rounds half-up at the second decimal boundary", () => {
    expect(window.formatAmt(0.005)).toBe("€0.01");
    expect(window.formatAmt(0.004)).toBe("€0.00");
  });

  it("formats large numbers without grouping", () => {
    expect(window.formatAmt(1234567.89)).toBe("€1234567.89");
  });
});

describe("mutation-kill: renderTransactions filter, sort, pinned ordering, render", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "t1", amount: 10, account: "cu",      type: "expense", description: "Aaa", category: "Food & Dining", date: "2026-04-10", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] },
      { id: "t2", amount: 20, account: "cash",    type: "income",  description: "Bbb", category: "Income",         date: "2026-04-15", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] },
      { id: "t3", amount: 30, account: "revolut", type: "expense", description: "Ccc", category: "Shopping",       date: "2026-04-20", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] }
    ];`);
  });

  function items() {
    return Array.from(window.document.getElementById("tx-list").querySelectorAll("li"));
  }

  it("renders all transactions when filters.account='all' and filters.type='all'", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    expect(items().length).toBe(3);
  });

  it("renders only matching account when filters.account is specific", () => {
    window.eval("filters = { account: 'cu', type: 'all' };");
    window.renderTransactions();
    const it = items();
    expect(it.length).toBe(1);
    expect(it[0].textContent).toContain("Aaa");
  });

  it("renders only matching type when filters.type is specific", () => {
    window.eval("filters = { account: 'all', type: 'expense' };");
    window.renderTransactions();
    const it = items();
    expect(it.length).toBe(2);
    expect(it.map(li => li.textContent).join(" ")).toContain("Aaa");
    expect(it.map(li => li.textContent).join(" ")).toContain("Ccc");
  });

  it("intersects account+type filters", () => {
    window.eval("filters = { account: 'cu', type: 'expense' };");
    window.renderTransactions();
    expect(items().length).toBe(1);
    expect(items()[0].textContent).toContain("Aaa");
  });

  it("sorts by date-desc directly", () => {
    window.eval("filters = { account: 'all', type: 'all' }; sortOrder = 'date-desc';");
    window.renderTransactions();
    const it = items();
    expect(it[0].textContent).toContain("Ccc");
    expect(it[2].textContent).toContain("Aaa");
  });

  it("sorts by date-asc directly", () => {
    window.eval("filters = { account: 'all', type: 'all' }; sortOrder = 'date-asc';");
    window.renderTransactions();
    const it = items();
    expect(it[0].textContent).toContain("Aaa");
    expect(it[2].textContent).toContain("Ccc");
  });

  it("sorts by amount-desc directly", () => {
    window.eval("filters = { account: 'all', type: 'all' }; sortOrder = 'amount-desc';");
    window.renderTransactions();
    const it = items();
    expect(it[0].textContent).toContain("Ccc");
    expect(it[2].textContent).toContain("Aaa");
  });

  it("sorts by amount-asc directly", () => {
    window.eval("filters = { account: 'all', type: 'all' }; sortOrder = 'amount-asc';");
    window.renderTransactions();
    const it = items();
    expect(it[0].textContent).toContain("Aaa");
    expect(it[2].textContent).toContain("Ccc");
  });

  it("places pinned transactions before non-pinned regardless of sort", () => {
    window.eval(`data.transactions[2].isPinned = true;
                 filters = { account: 'all', type: 'all' };
                 sortOrder = 'date-asc';`);
    window.renderTransactions();
    const it = items();
    expect(it[0].textContent).toContain("Ccc");
    expect(it[0].classList.contains("pinned")).toBe(true);
  });

  it("adds the literal 'pinned' class to pinned <li>", () => {
    window.eval(`data.transactions[0].isPinned = true;
                 filters = { account: 'all', type: 'all' };`);
    window.renderTransactions();
    const it = items();
    const pinnedLi = it.find(li => li.textContent.includes("Aaa"));
    expect(pinnedLi.classList.contains("pinned")).toBe(true);
  });

  it("renders the recurring icon class 'fa-sync-alt' when isRecurring is true", () => {
    window.eval(`data.transactions[0].isRecurring = true;
                 filters = { account: 'all', type: 'all' };`);
    window.renderTransactions();
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("fa-sync-alt");
    expect(html).toContain("recurring-icon");
  });

  it("does not render the recurring icon when isRecurring is false", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).not.toContain("fa-sync-alt");
  });

  it("renders 'arrow-down' icon for expense and 'arrow-up' icon for income", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("fa-arrow-down");
    expect(html).toContain("fa-arrow-up");
  });

  it("falls back to literal '(no desc)' when tx.description is empty", () => {
    window.eval(`data.transactions = [{ id: "x", amount: 1, account: "cu", type: "expense", description: "", category: "Other", date: "2026-04-10", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] }];
                 filters = { account: 'all', type: 'all' };`);
    window.renderTransactions();
    expect(window.document.getElementById("tx-list").textContent).toContain("(no desc)");
  });

  it("renders a tx-tags container with one tx-tag span per tag when tags are present", () => {
    window.eval(`data.transactions[0].tags = ["bill", "auto"];
                 filters = { account: 'all', type: 'all' };`);
    window.renderTransactions();
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("tx-tags");
    expect((html.match(/tx-tag\b/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("bill");
    expect(html).toContain("auto");
  });

  it("does not render a tx-tags container when tags array is empty", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    expect(window.document.getElementById("tx-list").innerHTML).not.toContain("tx-tags");
  });

  it("does not render a tx-tags container when tags is undefined", () => {
    window.eval(`data.transactions = [{ id: "x", amount: 1, account: "cu", type: "expense", description: "x", category: "Other", date: "2026-04-10", isPinned: false, isRecurring: false, notes: "", attachments: [] }];
                 filters = { account: 'all', type: 'all' };`);
    window.renderTransactions();
    expect(window.document.getElementById("tx-list").innerHTML).not.toContain("tx-tags");
  });

  it("uses formatAmt to render the amount with the € prefix", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    expect(window.document.getElementById("tx-list").textContent).toContain("€10.00");
    expect(window.document.getElementById("tx-list").textContent).toContain("€20.00");
  });

  it("populates the account-dot background-color from getAccountColor (per account)", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    const html = window.document.getElementById("tx-list").innerHTML;
    expect(html).toContain("#4a90e2");
    expect(html).toContain("#50c878");
    expect(html).toContain("#ff9800");
  });

  it("sets data-account and data-id attributes on each <li>", () => {
    window.eval("filters = { account: 'all', type: 'all' };");
    window.renderTransactions();
    const it = items();
    expect(it[0].getAttribute("data-account")).toBeTruthy();
    expect(it[0].getAttribute("data-id")).toBeTruthy();
  });
});

describe("mutation-kill: openTransactionDetails / li click handler info HTML", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`data.transactions = [
      { id: "t1", amount: 12.34, account: "cu", type: "expense", description: "Latte", category: "Food & Dining", date: "2026-04-19", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] }
    ];
    filters = { account: 'all', type: 'all' };`);
  });

  it("renders the literal labels Description/Account/Type/Amount/Date/Category in info HTML", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    const html = window.document.getElementById("tx-info").innerHTML;
    expect(html).toContain("<strong>Description:</strong>");
    expect(html).toContain("<strong>Account:</strong>");
    expect(html).toContain("<strong>Type:</strong>");
    expect(html).toContain("<strong>Amount:</strong>");
    expect(html).toContain("<strong>Date:</strong>");
    expect(html).toContain("<strong>Category:</strong>");
  });

  it("maps account 'cu' to literal 'Credit Union' in the details HTML", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("Credit Union");
  });

  it("maps account 'revolut' to literal 'Revolut' in the details HTML", () => {
    window.eval(`data.transactions[0].account = 'revolut';`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("Revolut");
  });

  it("falls back to literal 'Unknown Account' when the account id is not in data.accounts", () => {
    window.eval(`data.transactions[0].account = 'ghost';`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("Unknown Account");
  });

  it("renders Type as the literal 'Income' or 'Expense' (capitalized)", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("<strong>Type:</strong> Expense");

    window.eval(`data.transactions[0].type = 'income';`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("<strong>Type:</strong> Income");
  });

  it("toggles the pin button between 'Pin' and 'Unpin' based on tx.isPinned", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("pin-tx-btn").innerHTML).toContain("Pin");
    expect(window.document.getElementById("pin-tx-btn").innerHTML).not.toContain("Unpin");

    window.eval(`data.transactions[0].isPinned = true;`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("pin-tx-btn").innerHTML).toContain("Unpin");
  });

  it("removes 'hidden' from transaction-modal and adds 'modal-open' to body", () => {
    window.document.getElementById("transaction-modal").classList.add("hidden");
    window.document.body.classList.remove("modal-open");
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("transaction-modal").classList.contains("hidden")).toBe(false);
    expect(window.document.body.classList.contains("modal-open")).toBe(true);
  });

  it("falls back to literal 'Uncategorized' when category is missing", () => {
    window.eval(`data.transactions[0].category = '';`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("Uncategorized");
  });

  it("includes 'Recurring: Yes' line only when isRecurring is true", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).not.toContain("Recurring:");

    window.eval(`data.transactions[0].isRecurring = true;`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("<strong>Recurring:</strong> Yes");
  });

  it("includes 'Notes:' line only when notes is non-empty (after trim)", () => {
    window.eval(`data.transactions[0].notes = "   ";`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).not.toContain("<strong>Notes:</strong>");

    window.eval(`data.transactions[0].notes = "important";`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).toContain("<strong>Notes:</strong> important");
  });

  it("includes 'Attachments' section only when attachments array is non-empty", () => {
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    expect(window.document.getElementById("tx-info").innerHTML).not.toContain("attachment-section");

    window.eval(`data.transactions[0].attachments = [{ data: "data:image/png;base64,abc" }];`);
    window.openTransactionDetails(window.eval("data.transactions[0]"));
    const html = window.document.getElementById("tx-info").innerHTML;
    expect(html).toContain("attachment-section");
    expect(html).toContain("attachment-list");
    expect(html).toContain("attachment-item");
    expect(html).toContain("data:image/png;base64,abc");
  });
});

describe("mutation-kill: saveAccount add path", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.eval(`currentEditingAccountId = null;`);
  });

  function setForm(name, id, icon, color) {
    window.document.getElementById("new-account-name").value = name;
    window.document.getElementById("new-account-id").value = id;
    window.document.getElementById("new-account-icon").value = icon;
    window.document.getElementById("new-account-color").value = color;
  }

  it("does not add an account when name is empty and shows the literal validation message", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setForm("   ", "", "wallet", "#000000");
    const before = window.eval("data.accounts.length");
    window.saveAccount();
    expect(window.eval("data.accounts.length")).toBe(before);
    expect(messages).toContain("Please enter an account name");
  });

  it("adds a new account with name/icon/color and initializes its balance to 0", () => {
    setForm("Savings", "savings", "piggy-bank", "#ff00aa");
    window.saveAccount();
    const accounts = window.eval("JSON.stringify(data.accounts)");
    expect(accounts).toContain("savings");
    const last = window.eval("data.accounts[data.accounts.length - 1]");
    expect(last.id).toBe("savings");
    expect(last.name).toBe("Savings");
    expect(last.icon).toBe("piggy-bank");
    expect(last.color).toBe("#ff00aa");
    expect(window.eval("data.balances.savings")).toBe(0);
  });

  it("auto-generates a slug id from the name when id is left blank (lowercase, spaces -> -, strips disallowed chars)", () => {
    setForm("My New Wallet!", "", "wallet", "#123456");
    window.saveAccount();
    const last = window.eval("data.accounts[data.accounts.length - 1]");
    expect(last.id).toBe("my-new-wallet");
  });

  it("appends '-1' suffix when generated id collides", () => {
    window.eval(`data.accounts.push({ id: "wallet", name: "X", icon: "w", color: "#000000" });`);
    setForm("Wallet", "", "wallet", "#000000");
    window.saveAccount();
    const last = window.eval("data.accounts[data.accounts.length - 1]");
    expect(last.id).toBe("wallet-1");
  });

  it("auto-generates a unique id when the user-provided id collides with an existing account", () => {
    setForm("New Cash", "cu", "wallet", "#abcdef");
    window.saveAccount();
    const last = window.eval("data.accounts[data.accounts.length - 1]");
    expect(last.id).toBe("cu-1");
  });

  it("hides the accounts-modal and removes modal-open after a successful add", () => {
    window.document.getElementById("accounts-modal").classList.remove("hidden");
    window.document.body.classList.add("modal-open");
    setForm("Savings", "savings", "piggy-bank", "#ff00aa");
    window.saveAccount();
    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });

  it("calls showUpdateNotification with the literal added-success message", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    setForm("Savings", "savings", "piggy-bank", "#ff00aa");
    window.saveAccount();
    expect(messages.some(m => m.includes('Account "Savings" added successfully'))).toBe(true);
  });
});

describe("mutation-kill: saveAccount edit path", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  function setForm(name, id, icon, color) {
    window.document.getElementById("new-account-name").value = name;
    window.document.getElementById("new-account-id").value = id;
    window.document.getElementById("new-account-icon").value = icon;
    window.document.getElementById("new-account-color").value = color;
  }

  it("updates the matching account's name/icon/color when currentEditingAccountId points to it", () => {
    window.eval(`currentEditingAccountId = "cu";`);
    setForm("Renamed CU", "ignored", "bank", "#abcdef");
    window.saveAccount();
    const cu = window.eval("data.accounts.find(a => a.id === 'cu')");
    expect(cu.name).toBe("Renamed CU");
    expect(cu.icon).toBe("bank");
    expect(cu.color).toBe("#abcdef");
  });

  it("calls showUpdateNotification with the literal updated-success message", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    window.eval(`currentEditingAccountId = "cu";`);
    setForm("Renamed CU", "", "bank", "#abcdef");
    window.saveAccount();
    expect(messages.some(m => m.includes('Account "Renamed CU" updated successfully'))).toBe(true);
  });

  it("does nothing to data.accounts when currentEditingAccountId does not match any account", () => {
    window.eval(`currentEditingAccountId = "nonexistent";`);
    const before = window.eval("JSON.stringify(data.accounts)");
    setForm("Whatever", "", "icon", "#000000");
    window.saveAccount();
    expect(window.eval("JSON.stringify(data.accounts)")).toBe(before);
  });
});

describe("mutation-kill: deleteAccount paths", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
    window.confirm = () => true;
  });

  it("returns early when currentEditingAccountId is null", () => {
    window.eval(`currentEditingAccountId = null;`);
    const before = window.eval("data.accounts.length");
    window.deleteAccount();
    expect(window.eval("data.accounts.length")).toBe(before);
  });

  it("alerts and returns when there is only one account left (literal alert message)", () => {
    let alerted = "";
    window.alert = (m) => { alerted = m; };
    window.eval(`data.accounts = [{ id: "only", name: "Only", icon: "x", color: "#000000" }];
                 currentEditingAccountId = "only";`);
    window.deleteAccount();
    expect(window.eval("data.accounts.length")).toBe(1);
    expect(alerted).toContain("must have at least one account");
  });

  it("returns without changes when confirm() returns false", () => {
    window.confirm = () => false;
    window.eval(`currentEditingAccountId = "cu";`);
    const before = window.eval("data.accounts.length");
    window.deleteAccount();
    expect(window.eval("data.accounts.length")).toBe(before);
  });

  it("removes the account, deletes its balance, and reassigns its transactions to literal 'unknown'", () => {
    window.eval(`data.accounts = [
      { id: "cu", name: "Credit Union", icon: "u", color: "#4a90e2" },
      { id: "cash", name: "Cash", icon: "c", color: "#ff9800" }
    ];
    data.balances = { cu: 99, cash: 5 };
    data.transactions = [
      { id: "t1", amount: 1, account: "cu", type: "expense", description: "x", category: "Other", date: "2026-04-01", isPinned: false, isRecurring: false, notes: "", attachments: [], tags: [] }
    ];
    currentEditingAccountId = "cu";`);
    window.deleteAccount();
    expect(window.eval("data.accounts.find(a => a.id === 'cu')")).toBeUndefined();
    expect(window.eval("'cu' in data.balances")).toBe(false);
    expect(window.eval("data.transactions[0].account")).toBe("unknown");
  });

  it("resets currentEditingAccountId to null after deletion", () => {
    window.eval(`currentEditingAccountId = "cu";`);
    window.deleteAccount();
    expect(window.eval("currentEditingAccountId")).toBeNull();
  });

  it("notifies via showUpdateNotification with the deleted-account message including formatted balance", () => {
    const messages = [];
    window.showUpdateNotification = (m) => messages.push(m);
    window.eval(`data.balances.cu = 42; currentEditingAccountId = "cu";`);
    window.deleteAccount();
    expect(messages.some(m => m.includes('Account "Credit Union" deleted'))).toBe(true);
    expect(messages.some(m => m.includes("€42.00"))).toBe(true);
  });
});

describe("mutation-kill: openNewAccountModal / openEditAccountModal / cancelAccountModal", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("openNewAccountModal: clears form fields, sets icon='university', color='#4a90e2', resets currentEditingAccountId", () => {
    window.eval(`currentEditingAccountId = "cu";`);
    window.document.getElementById("new-account-name").value = "stale";
    window.document.getElementById("new-account-id").value = "stale";
    window.openNewAccountModal();
    expect(window.document.getElementById("new-account-name").value).toBe("");
    expect(window.document.getElementById("new-account-id").value).toBe("");
    expect(window.document.getElementById("new-account-icon").value).toBe("university");
    expect(window.document.getElementById("new-account-color").value).toBe("#4a90e2");
    expect(window.eval("currentEditingAccountId")).toBeNull();
  });

  it("openNewAccountModal: hides the delete-account-container", () => {
    window.document.getElementById("delete-account-container").classList.remove("hidden");
    window.openNewAccountModal();
    expect(window.document.getElementById("delete-account-container").classList.contains("hidden")).toBe(true);
  });

  it("openEditAccountModal: sets currentEditingAccountId to the supplied id and prefills form with that account's fields", () => {
    window.openEditAccountModal("revolut");
    expect(window.eval("currentEditingAccountId")).toBe("revolut");
    expect(window.document.getElementById("new-account-name").value).toBe("Revolut");
    expect(window.document.getElementById("new-account-id").value).toBe("revolut");
    expect(window.document.getElementById("new-account-icon").value).toBe("credit-card");
    expect(window.document.getElementById("new-account-color").value).toBe("#50c878");
  });

  it("openEditAccountModal: shows the delete-account-container", () => {
    window.document.getElementById("delete-account-container").classList.add("hidden");
    window.openEditAccountModal("cu");
    expect(window.document.getElementById("delete-account-container").classList.contains("hidden")).toBe(false);
  });

  it("cancelAccountModal: resets currentEditingAccountId to null and hides accounts-modal + modal-open", () => {
    window.eval(`currentEditingAccountId = "cu";`);
    window.document.getElementById("accounts-modal").classList.remove("hidden");
    window.document.body.classList.add("modal-open");
    window.cancelAccountModal();
    expect(window.eval("currentEditingAccountId")).toBeNull();
    expect(window.document.getElementById("accounts-modal").classList.contains("hidden")).toBe(true);
    expect(window.document.body.classList.contains("modal-open")).toBe(false);
  });
});

describe("mutation-kill: renderBalances / renderAccountCards / renderTotalBalance", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("renderBalances: writes formatAmt() of each account balance into .balance text", () => {
    window.eval(`data.balances = { cu: 12.5, revolut: -3, cash: 0 };`);
    window.renderBalances();
    const cards = Array.from(window.document.querySelectorAll(".card[data-account]"));
    const byAcc = Object.fromEntries(cards.map(c => [c.dataset.account, c.querySelector(".balance").textContent]));
    expect(byAcc.cu).toBe("€12.50");
    expect(byAcc.revolut).toBe("€-3.00");
    expect(byAcc.cash).toBe("€0.00");
  });

  it("renderBalances: defaults missing balance entries to 0 (formatted as €0.00)", () => {
    window.eval(`data.accounts.push({ id: "savings", name: "Savings", icon: "x", color: "#000000" });`);
    window.renderBalances();
    const card = window.document.querySelector(".card[data-account='savings']");
    expect(card.querySelector(".balance").textContent).toBe("€0.00");
  });

  it("renderAccountCards: appends a final 'Add Account' card with id 'add-new-account-btn'", () => {
    window.renderAccountCards();
    const addCard = window.document.getElementById("add-new-account-btn");
    expect(addCard).not.toBeNull();
    expect(addCard.classList.contains("add-account-card")).toBe(true);
    expect(addCard.textContent).toContain("Add Account");
  });

  it("renderAccountCards: backfills data.accounts when null", () => {
    window.eval("data.accounts = null;");
    window.renderAccountCards();
    expect(window.eval("data.accounts.length")).toBe(3);
    expect(window.eval("data.accounts.map(a => a.id)")).toEqual(["cu", "revolut", "cash"]);
  });

  it("renderAccountCards: backfills data.tags=[] when missing", () => {
    window.eval("data.tags = null;");
    window.renderAccountCards();
    expect(window.eval("Array.isArray(data.tags)")).toBe(true);
  });

  it("renderAccountCards: backfills data.bills=[] when missing", () => {
    window.eval("data.bills = null;");
    window.renderAccountCards();
    expect(window.eval("Array.isArray(data.bills)")).toBe(true);
  });
});

describe("mutation-kill: updateFilters and updateAccountOptions", () => {
  let window;
  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("updateFilters: resets filters.account to literal 'all' when current value is not present in options", () => {
    window.eval(`filters.account = "ghost-account";`);
    window.updateFilters();
    expect(window.eval("filters.account")).toBe("all");
    expect(window.document.getElementById("account-filter").value).toBe("all");
  });

  it("updateFilters: keeps filters.account when its option exists", () => {
    window.eval(`filters.account = "cu";`);
    window.updateFilters();
    expect(window.eval("filters.account")).toBe("cu");
    expect(window.document.getElementById("account-filter").value).toBe("cu");
  });

  it("updateFilters: returns early without throwing when account-filter element is missing", () => {
    const f = window.document.getElementById("account-filter");
    f.parentNode.removeChild(f);
    expect(() => window.updateFilters()).not.toThrow();
  });

  it("updateAccountOptions: returns early without throwing when tx-account/edit-tx-account are missing", () => {
    window.document.getElementById("tx-account").remove();
    expect(() => window.updateAccountOptions()).not.toThrow();
  });

  it("updateAccountOptions: backfills data.accounts to defaults when null", () => {
    window.eval("data.accounts = null;");
    window.updateAccountOptions();
    expect(window.eval("data.accounts.length")).toBe(3);
  });

  it("updateAccountOptions: re-creates the literal 'All Accounts' option if missing", () => {
    const filter = window.document.getElementById("account-filter");
    filter.innerHTML = "";
    window.updateAccountOptions();
    const allOpt = filter.querySelector('option[value="all"]');
    expect(allOpt).not.toBeNull();
    expect(allOpt.textContent).toBe("All Accounts");
  });
});
