const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

function createBlackboxWindow() {
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
  window.confirm = () => true;
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
  window.localStorage.clear();
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

function submitTransaction(window, tx) {
  window.document.getElementById("add-btn").click();
  window.document.getElementById("tx-amount").value = String(tx.amount);
  window.document.getElementById("tx-account").value = tx.account;
  window.document.getElementById("tx-type").value = tx.type;
  window.document.getElementById("tx-category").value = tx.category;
  window.document.getElementById("tx-desc").value = tx.description;
  window.document.getElementById("tx-date").value = tx.date;
  window.document.getElementById("tx-form").dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true }),
  );
}

function changeValue(window, selector, value, eventName = "change") {
  const element = window.document.querySelector(selector);
  element.value = value;
  element.dispatchEvent(new window.Event(eventName, { bubbles: true }));
}

describe("black-box functional tests using EP, BA, EG, and simple combinations", () => {
  let window;

  beforeEach(() => {
    window = createBlackboxWindow();
  });

  it("EP: accepts a valid expense transaction through the public form", () => {
    submitTransaction(window, {
      amount: 12.5,
      account: "cash",
      type: "expense",
      category: "Food & Dining",
      description: "Coffee",
      date: "2026-04-19",
    });

    const txListText = window.document.getElementById("tx-list").textContent;
    expect(txListText).toContain("Coffee");
    expect(window.document.getElementById("total-balance").textContent).toContain("€-12.50");
  });

  it("BA: custom date filtering keeps a transaction exactly on the boundary", () => {
    submitTransaction(window, {
      amount: 20,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "Boundary Start",
      date: "2026-04-01",
    });
    submitTransaction(window, {
      amount: 21,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "Outside Range",
      date: "2026-04-02",
    });

    changeValue(window, "#date-range-filter", "custom");
    changeValue(window, "#custom-start-date", "2026-04-01");
    changeValue(window, "#custom-end-date", "2026-04-01");

    const txListText = window.document.getElementById("tx-list").textContent;
    expect(txListText).toContain("Boundary Start");
    expect(txListText).not.toContain("Outside Range");
  });

  it("EG: rejects an empty account name from the account form", () => {
    window.document.getElementById("add-new-account-btn").click();
    window.document.getElementById("new-account-name").value = "   ";
    window.document.getElementById("add-account-btn").click();

    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "Please enter an account name",
    );
  });

  it("EG: search ignores case and surrounding whitespace", () => {
    submitTransaction(window, {
      amount: 18,
      account: "cash",
      type: "expense",
      category: "Food & Dining",
      description: "Lunch",
      date: "2026-04-19",
    });

    changeValue(window, "#search-input", "  lUnCh  ", "input");
    expect(window.document.getElementById("tx-list").textContent).toContain("Lunch");
  });

  it("BA: clearing the search input restores the full visible transaction list", () => {
    submitTransaction(window, {
      amount: 18,
      account: "cash",
      type: "expense",
      category: "Food & Dining",
      description: "Lunch",
      date: "2026-04-19",
    });
    submitTransaction(window, {
      amount: 1200,
      account: "cu",
      type: "income",
      category: "Income",
      description: "Salary",
      date: "2026-04-20",
    });

    changeValue(window, "#search-input", "Lunch", "input");
    expect(window.document.getElementById("tx-list").textContent).toContain("Lunch");
    expect(window.document.getElementById("tx-list").textContent).not.toContain("Salary");

    changeValue(window, "#search-input", "   ", "input");
    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("Lunch");
    expect(text).toContain("Salary");
  });

  it("BA: end-date filtering includes a transaction exactly on the upper boundary", () => {
    submitTransaction(window, {
      amount: 15,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "Boundary End",
      date: "2026-04-30",
    });
    submitTransaction(window, {
      amount: 16,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "After Range",
      date: "2026-05-01",
    });

    changeValue(window, "#date-range-filter", "custom");
    changeValue(window, "#custom-start-date", "2026-04-01");
    changeValue(window, "#custom-end-date", "2026-04-30");

    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("Boundary End");
    expect(text).not.toContain("After Range");
  });

  it("EG: duplicate category names are rejected from the category manager", () => {
    window.showCategoriesModal();
    window.document.getElementById("new-category-input").value = "Other";

    window.addNewCategory();

    expect(window.document.querySelector(".update-notification")?.textContent || "").toContain(
      "This category already exists",
    );
  });

  it("Combinatorial: account and type filters together isolate the matching transaction", () => {
    submitTransaction(window, {
      amount: 20,
      account: "cash",
      type: "expense",
      category: "Food & Dining",
      description: "Cash Lunch",
      date: "2026-04-19",
    });
    submitTransaction(window, {
      amount: 500,
      account: "cu",
      type: "income",
      category: "Income",
      description: "Salary Credit",
      date: "2026-04-19",
    });

    changeValue(window, "#account-filter", "cu");
    changeValue(window, "#type-filter", "income");

    const txListText = window.document.getElementById("tx-list").textContent;
    expect(txListText).toContain("Salary Credit");
    expect(txListText).not.toContain("Cash Lunch");
  });

  it.fails("Combinatorial: clicking the same account card twice toggles the account filter off", () => {
    submitTransaction(window, {
      amount: 10,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "Cash Item",
      date: "2026-04-19",
    });
    submitTransaction(window, {
      amount: 20,
      account: "cu",
      type: "expense",
      category: "Other",
      description: "CU Item",
      date: "2026-04-19",
    });

    let cashCard = window.document.querySelector('.card[data-account="cash"]');
    cashCard.click();
    expect(window.document.getElementById("tx-list").textContent).toContain("Cash Item");
    expect(window.document.getElementById("tx-list").textContent).not.toContain("CU Item");

    cashCard = window.document.querySelector('.card[data-account="cash"]');
    cashCard.click();
    const text = window.document.getElementById("tx-list").textContent;
    expect(text).toContain("Cash Item");
    expect(text).toContain("CU Item");
  });

  it("EG: search matches transaction notes as well as descriptions", () => {
    submitTransaction(window, {
      amount: 42,
      account: "cash",
      type: "expense",
      category: "Other",
      description: "Hidden Note",
      date: "2026-04-19",
    });
    window.eval(`data.transactions[0].notes = "special boundary memo"; renderTransactions();`);

    changeValue(window, "#search-input", "memo", "input");

    expect(window.document.getElementById("tx-list").textContent).toContain("Hidden Note");
  });

  it("BA: a zero-amount bill can still be saved through the bill form", () => {
    window.showAddBillModal();
    window.document.getElementById("bill-desc").value = "Zero Bill";
    window.document.getElementById("bill-amount").value = "0";
    window.document.getElementById("bill-date").value = "2026-04-25";
    window.document.getElementById("bill-account").value = "cash";
    window.document.getElementById("bill-category").value = "Other";

    window.saveBill();

    expect(window.eval("data.bills.length")).toBe(1);
    expect(window.eval("data.bills[0].amount")).toBe(0);
  });
});
