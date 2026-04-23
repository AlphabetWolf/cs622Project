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

describe("white-box pure function tests", () => {
  let window;

  beforeEach(() => {
    window = createAppWindow();
    window.localStorage.clear();
  });

  it("formats euro amounts to two decimal places", () => {
    expect(window.formatAmt(42)).toBe("€42.00");
  });

  it("formats negative amounts correctly", () => {
    expect(window.formatAmt(-12.5)).toBe("€-12.50");
  });

  it("rounds formatted amounts to two decimals", () => {
    expect(window.formatAmt(12.345)).toBe("€12.35");
  });

  it("calculates whole-day differences", () => {
    expect(
      window.getDaysDifference(
        new Date("2026-04-01T00:00:00"),
        new Date("2026-04-04T00:00:00"),
      ),
    ).toBe(3);
  });

  it("returns zero whole-day difference for the same date", () => {
    expect(
      window.getDaysDifference(
        new Date("2026-04-01T00:00:00"),
        new Date("2026-04-01T00:00:00"),
      ),
    ).toBe(0);
  });

  it("calculates absolute whole-day differences when dates are reversed", () => {
    expect(
      window.getDaysDifference(
        new Date("2026-04-04T00:00:00"),
        new Date("2026-04-01T00:00:00"),
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

  it("calculates whole-month differences across years", () => {
    expect(
      window.getMonthsDifference(
        new Date("2025-11-15T00:00:00"),
        new Date("2026-02-15T00:00:00"),
      ),
    ).toBe(3);
  });

  it("returns negative whole-month differences when dates are reversed", () => {
    expect(
      window.getMonthsDifference(
        new Date("2026-04-15T00:00:00"),
        new Date("2026-01-15T00:00:00"),
      ),
    ).toBe(-3);
  });

  it("lightens colors without exceeding ff", () => {
    expect(window.adjustColor("#f0f0f0", 30, true)).toBe("#ffffff");
  });

  it("lightens colors by the requested amount when no clamping is needed", () => {
    expect(window.adjustColor("#102030", 16, true)).toBe("#203040");
  });

  it("darkens colors by applying a negative adjustment", () => {
    expect(window.adjustColor("#203040", -16)).toBe("#102030");
  });

  it("clamps darkened colors at zero", () => {
    expect(window.adjustColor("#050505", -16)).toBe("#000000");
  });

  it("returns todays date string in YYYY-MM-DD format", () => {
    const today = window.getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it("leaves the date unchanged for an unsupported recurring frequency", () => {
    expect(window.getNextOccurrence({ lastCreated: "2026-04-10", frequency: "custom" })).toBe(
      new Date("2026-04-10").toLocaleDateString(),
    );
  });

  it("formats byte-sized file sizes without conversion", () => {
    expect(window.formatFileSize(512)).toBe("512 bytes");
  });

  it("switches from bytes to KB exactly at 1024 bytes", () => {
    expect(window.formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats kilobyte-sized file sizes with one decimal place", () => {
    expect(window.formatFileSize(2048)).toBe("2.0 KB");
  });

  it("switches from KB to MB exactly at one megabyte", () => {
    expect(window.formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats megabyte-sized file sizes with one decimal place", () => {
    expect(window.formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
