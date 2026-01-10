import { defineConfig } from 'checkly';

export default defineConfig({
  projectName: 'Shogun Production',
  logicalId: 'shogun-monitoring',
  repoUrl: 'https://github.com/oinotna/shogun',
  checks: {
    locations: ['eu-west-1'],
    tags: ['production'],
    runtimeId: '2024.02',
    checkMatch: 'checkly/**/*.check.ts',
    browserChecks: {
      testMatch: 'checkly/**/*.spec.ts',
    },
  },
  cli: {
    runLocation: 'eu-west-1',
  },
});



