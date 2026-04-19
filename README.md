# Money Manager QA Project

This repository is being used for a software quality assurance project focused on testing the `Money-Manager` application as the system under test.

## Project Progress

- [x] Step 1: Clone the repository and inspect the project structure
- [x] Step 2: Measure logic LOC and identify major logic-heavy areas
- [x] Step 3: Review core workflows and expected behavior
- [x] Step 4: Design black-box test cases using EP, BA, and EG
- [x] Step 5: Implement initial white-box and unit-style tests with `Vitest` and `jsdom`
- [x] Step 6: Add GUI black-box tests with `Playwright` and record discovered defects
- [x] Step 7: Set up coverage measurement and review statement, branch, and function coverage
- [ ] Step 8: Run mutation testing and record the initial mutation score
- [ ] Step 9: Add targeted tests to improve the mutation score
- [ ] Step 10: Prepare the final report and presentation materials

## Current Test Artifacts

- White-box tests: [app.test.js](./app.test.js)
- Black-box GUI tests: [tests/blackbox.spec.js](./tests/blackbox.spec.js)
- Proposal notes for steps `1-5`: [docs/proposal-steps-1-5.md](./docs/proposal-steps-1-5.md)
- CI workflow: [.github/workflows/ci.yml](./.github/workflows/ci.yml)

## How To Run

```bash
npm test
npm run test:coverage
npm run test:blackbox
```

## Current Coverage Summary

- Statements: `50.17%`
- Branches: `58.88%`
- Functions: `61.11%`
- Lines: `50.17%`

## Notes

- The white-box suite uses `Vitest` with `jsdom`
- The GUI black-box suite uses `Playwright`
- The original application source was kept as the system under test
- Coverage reporting is generated in CI and summarized in the workflow run
