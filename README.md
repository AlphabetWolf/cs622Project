# Money Manager QA Project

This repository is being used for a software quality assurance project focused on testing the `Money-Manager` application as the system under test.

## Testing Methodology

This project is organized around three main testing activities:

- Black-box testing using Equivalence Partitioning (EP), Boundary Analysis (BA), and Error Guessing (EG). For workflows with interacting inputs, combinatorial thinking was also used where practical.
- White-box testing using unit tests and lightweight integration-style tests. These tests are guided by the internal logic and state of the application, with the goal of achieving as high branch coverage as practical at both the function level and the overall system level.
- Black-box GUI testing using Playwright to validate complete user-visible workflows in the browser.

Code coverage and mutation testing are treated as test effectiveness and quality evaluation activities rather than separate primary testing types.

## Project Progress

- [x] Step 1: Clone the repository and inspect the project structure
- [x] Step 2: Measure logic LOC and identify major logic-heavy areas
- [x] Step 3: Review core workflows and expected behavior
- [x] Step 4: Design black-box test cases using EP, BA, and EG
- [x] Step 5: Implement initial white-box unit and integration-style tests with `Vitest` and `jsdom`
- [x] Step 6: Add GUI black-box tests with `Playwright` and record discovered defects
- [x] Step 7: Set up coverage measurement and review statement, branch, and function coverage
- [ ] Step 8: Run mutation testing and record the initial mutation score
- [ ] Step 9: Add targeted tests to improve the mutation score
- [ ] Step 10: Prepare the final report and presentation materials

## Current Test Artifacts

- White-box pure function tests: [qa-tests/whitebox/func.test.js](./qa-tests/whitebox/func.test.js)
- White-box DOM/state tests: [qa-tests/whitebox/dom.test.js](./qa-tests/whitebox/dom.test.js)
- Black-box functional tests: [qa-tests/blackbox/functional.test.js](./qa-tests/blackbox/functional.test.js)
- Black-box GUI tests: [qa-tests/blackbox/gui.spec.js](./qa-tests/blackbox/gui.spec.js)
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
```

## Current Coverage Summary

- Statements: `74.59%`
- Branches: `67.81%`
- Functions: `86.02%`
- Lines: `74.59%`

## Notes

- The tests are organized under `qa-tests/whitebox` and `qa-tests/blackbox`
- The white-box suite uses `Vitest` with `jsdom` and is split into pure-function tests and DOM/state integration-style tests
- The black-box non-GUI suite covers app logic from an external behavior perspective without browser automation
- The GUI black-box suite uses `Playwright`
- The original application source was kept as the system under test
- Coverage reporting is generated in CI and summarized in the workflow run
- Mutation testing is planned as a follow-up activity to evaluate test effectiveness
