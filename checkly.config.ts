import { defineConfig } from 'checkly'

/**
 * See https://www.checklyhq.com/docs/cli/project-structure/ for documentation
 */
const config = defineConfig({
  /* A human readable name for your project. */
  projectName: 'Shogunito',
  /* A logical ID for this project. */
  logicalId: 'shogunito-project',
  /* Physical location of the checks. */
  checks: {
    /* A glob pattern that matches the checks in your project. */
    checkMatch: '**/__checks__/**/*.check.ts',
    /* Explicitly exclude certain files. */
    ignoreDirectoriesMatch: [],
    /* A pattern that matches the browser checks in your project. */
    browserChecks: {
      testMatch: '**/__checks__/**/*.spec.ts',
    },
  },
})

export default config
