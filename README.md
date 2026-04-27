# Money Manager QA Project

This repository is being used for a software quality assurance project focused on testing the `Money-Manager` application as the system under test.

## Testing Methodology

This project is organized around three main testing activities:

- Black-box testing using Equivalence Partitioning (EP), Boundary Analysis (BA), and Error Guessing (EG). For workflows with interacting inputs, combinatorial thinking was also used where practical.
- White-box testing using unit tests and lightweight integration-style tests. These tests are guided by the internal logic and state of the application, with the goal of achieving as high branch coverage as practical at both the function level and the overall system level.
- Black-box GUI testing using Playwright to validate complete user-visible workflows in the browser.

Code coverage and mutation testing are treated as test effectiveness and quality evaluation activities rather than separate primary testing types.
Coverage reporting in this repository is based on the white-box suites, while black-box and GUI tests are used mainly for behavior validation and defect discovery.

## Current Test Artifacts

- White-box pure function tests: [qa-tests/whitebox/func.test.js](./qa-tests/whitebox/func.test.js)
- White-box DOM/state tests: [qa-tests/whitebox/dom.test.js](./qa-tests/whitebox/dom.test.js)
- Black-box functional tests: [qa-tests/blackbox/functional.test.js](./qa-tests/blackbox/functional.test.js)
- Black-box GUI tests: [qa-tests/blackbox/gui.spec.js](./qa-tests/blackbox/gui.spec.js)
- Mutation-targeted tests: [qa-tests/mutation/kill.test.js](./qa-tests/mutation/kill.test.js)
- Coverage report: [coverage/index.html](./coverage/index.html)
- Mutation report: [qa-tests/mutation/reports/mutation-report.html](./qa-tests/mutation/reports/mutation-report.html)
- CI workflow: [.github/workflows/ci.yml](./.github/workflows/ci.yml)

## How To Run

```bash
npm test
npm run test:whitebox
npm run test:whitebox:func
npm run test:whitebox:dom
npm run test:blackbox
npm run test:coverage
npm run test:gui
npm run test:mutation
npm run test:mutation:fresh
```

Mutation testing uses Stryker and requires Node 20 or newer. `npm run test:mutation` uses Stryker's incremental cache when available. `npm run test:mutation:fresh` removes the incremental result file first and then runs Stryker with all available CPU cores:

```bash
npm run test:mutation:fresh
```

## Current Coverage Summary

- Statements: `79.75%` (`3171 / 3976`)
- Branches: `73.71%` (`373 / 506`)
- Functions: `89.36%` (`84 / 94`)
- Lines: `79.75%` (`3171 / 3976`)

These coverage results come from the white-box suites:

- `qa-tests/whitebox/func.test.js`
- `qa-tests/whitebox/dom.test.js`

## Current Mutation Testing Summary

- Tool: `StrykerJS`
- Mutated source file: `app.js`
- Mutants generated: `3524`
- Killed mutants: `1779`
- Timed out mutants: `21`
- Survived mutants: `914`
- Mutants with no coverage: `810`
- Total mutation score: `51.08%`
- Covered mutation score: `66.32%`

Mutation testing shows that the current suite kills a little over half of all generated mutants, while a large number of mutants either survive or are not covered. The next useful testing work is to add targeted tests around the surviving and no-coverage areas listed in the Stryker HTML report.

## Current Test Run Status

- `npm test`: passed (`131` tests)
- `npm run test:coverage`: passed (`120` white-box tests)
- `npm run test:gui`: failed after Playwright discovery was narrowed to GUI specs only (`10` passed, `2` failed)
- `npm run test:mutation:fresh`: passed in the latest full run, but took `14 minutes 46 seconds`

The GUI failures are current known behavior gaps:

- Editing a transaction through the browser workflow did not update the visible transaction list from `Old Coffee` to `Updated Coffee`.
- Deleting the `cash` account did not relabel an existing cash transaction as `Unknown Account`; the transaction details still showed `Cash`.

## Limitations

- Coverage is measured from the white-box suites only, so the coverage percentages do not include the black-box functional or GUI Playwright suites.
- Branch coverage is lower than statement and function coverage, which means some conditional paths in `app.js` are still untested.
- Mutation testing found `914` surviving mutants and `810` mutants with no coverage, so the test suite still misses important behavior and uncovered code paths.
- Mutation testing is expensive for this project. The latest fresh run took `14 minutes 46 seconds` using 32 workers, so it is better suited to manual or scheduled CI rather than every push.
- GUI testing requires a browser-capable environment. In this sandbox, Chromium could not launch until the test was rerun outside the sandbox.
- Some browser-adjacent behavior is mocked in tests, including charting, maps, geolocation, and parts of Google Drive backup behavior. Those integrations are not verified against real external services.

## Notes

- The tests are organized under `qa-tests/whitebox` and `qa-tests/blackbox`
- The white-box suite uses `Vitest` with `jsdom` and is split into pure-function tests and DOM/state integration-style tests
- The black-box non-GUI suite covers app logic from an external behavior perspective without browser automation
- The GUI black-box suite uses `Playwright`
- The original application source was kept as the system under test
- Coverage reporting is generated in CI and summarized in the workflow run
- Mutation testing is useful for evaluating test effectiveness, but it is much slower than the normal test and coverage runs. It should not run on every push or pull request by default; a manual or scheduled CI job is a better fit.
