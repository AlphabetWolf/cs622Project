const vm = require("vm");

const originalRunInContext = vm.Script.prototype.runInContext;

const FROZEN_NOW = new Date("2026-04-25T12:00:00Z").getTime();
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(FROZEN_NOW);
    } else {
      super(...args);
    }
  }
  static now() {
    return FROZEN_NOW;
  }
}
FrozenDate.UTC = RealDate.UTC;
FrozenDate.parse = RealDate.parse;
globalThis.Date = FrozenDate;

vm.Script.prototype.runInContext = function patchedRunInContext(contextifiedObject, options) {
  if (contextifiedObject) {
    if (typeof globalThis.__stryker__ !== "undefined") {
      try {
        contextifiedObject.__stryker__ = globalThis.__stryker__;
      } catch (_) {
      }
    }
    try {
      contextifiedObject.Date = FrozenDate;
    } catch (_) {
    }
  }
  return originalRunInContext.call(this, contextifiedObject, options);
};
