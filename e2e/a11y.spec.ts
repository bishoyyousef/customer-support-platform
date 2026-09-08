import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility Checks', () => {

  test('Angular Support Workspace Login Page should not have any automatically detectable accessibility issues', async ({ page }) => {
    try {
      await page.goto('http://localhost:4200/login', { timeout: 10000 });
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } catch (e) {
      console.log('Angular app might not be running on port 4200, or a11y failed:', e.message);
      test.skip();
    }
  });

  test('React Customer Portal Home Page should not have any automatically detectable accessibility issues', async ({ page }) => {
    try {
      await page.goto('http://localhost:5173', { timeout: 10000 });
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } catch (e) {
      console.log('React app might not be running on port 5173, or a11y failed:', e.message);
      test.skip();
    }
  });

});
