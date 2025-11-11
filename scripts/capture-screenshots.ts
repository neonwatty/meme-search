/**
 * Screenshot Capture Script for Auto-Scan Feature Documentation
 *
 * Captures 23 screenshots across 7 sections documenting the auto-scan feature.
 * Run with: npx tsx scripts/capture-screenshots.ts
 *
 * Prerequisites:
 * - Rails test server running on port 3000
 * - PostgreSQL test database available
 * - Chromium installed via Playwright
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import { ImagePathsPage } from '../playwright/pages/settings/image-paths.page';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const RAILS_APP_DIR = path.join(__dirname, '../meme_search/meme_search_app');

// Desktop viewport for documentation
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

interface ScreenshotSection {
  name: string;
  directory: string;
  captures: ScreenshotCapture[];
}

interface ScreenshotCapture {
  filename: string;
  description: string;
  setup: (page: Page, context: CaptureContext) => Promise<void>;
  viewport?: { width: number; height: number };
  darkMode?: boolean;
  clip?: boolean; // Whether to clip to specific element
}

interface CaptureContext {
  imagePathsPage: ImagePathsPage;
  browser: Browser;
  context: BrowserContext;
  pathIds: Map<string, number>;
}

interface PathStateUpdate {
  scan_status?: number;
  scan_frequency_minutes?: number | null;
  last_scanned_at?: string | null;
  last_scan_error?: string | null;
  currently_scanning?: boolean;
}

class ProgressReporter {
  private totalScreenshots: number = 0;
  private capturedCount: number = 0;
  private failedCount: number = 0;

  start(total: number): void {
    this.totalScreenshots = total;
    console.log(`\n📸 Starting capture of ${total} screenshots...\n`);
  }

  onSuccess(filename: string): void {
    this.capturedCount++;
    const progress = ((this.capturedCount / this.totalScreenshots) * 100).toFixed(1);
    console.log(`    ✅ [${this.capturedCount}/${this.totalScreenshots}] ${progress}% - ${filename}`);
  }

  onFailure(filename: string, error: Error): void {
    this.failedCount++;
    console.error(`    ❌ [FAILED] ${filename}: ${error.message}`);
  }

  finish(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Capture Summary:`);
    console.log(`   ✅ Success: ${this.capturedCount}`);
    console.log(`   ❌ Failed: ${this.failedCount}`);
    console.log(`   📁 Location: ${SCREENSHOTS_DIR}`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

class ScreenshotAutomation {
  private browser!: Browser;
  private pathIds: Map<string, number> = new Map();
  private reporter: ProgressReporter = new ProgressReporter();

  async run(): Promise<void> {
    console.log('🚀 Starting screenshot automation...\n');

    try {
      await this.setup();
      await this.captureAllSections();
      console.log('\n✅ All screenshots captured successfully!');
      this.reporter.finish();
    } catch (error) {
      console.error('\n❌ Screenshot automation failed:', error);
      this.reporter.finish();
      throw error;
    } finally {
      await this.teardown();
    }
  }

  private async setup(): Promise<void> {
    console.log('🔧 Setting up...\n');

    // Launch browser
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });

    // Create screenshot directories
    await this.createScreenshotDirectories();

    // Reset database and seed with test data
    await this.resetDatabase();
    await this.seedAutoScanPaths();

    console.log('\n✅ Setup complete\n');
  }

  private async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async createScreenshotDirectories(): Promise<void> {
    const sections = [
      '01-user-problem',
      '02-manual-rescan',
      '03-create-path-with-autoscan',
      '04-autoscan-states',
      '05-index-overview',
      '06-edit-frequency',
      '07-workflow-narrative'
    ];

    for (const section of sections) {
      const dir = path.join(SCREENSHOTS_DIR, section);
      await fs.mkdir(dir, { recursive: true });
    }

    console.log('✅ Screenshot directories created');
  }

  private async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting test database...');

    try {
      const prefix = await this.getCommandPrefix();
      await execAsync(
        `${prefix}bin/rails db:test:prepare RAILS_ENV=test`,
        { cwd: RAILS_APP_DIR }
      );
      console.log('✅ Database reset complete');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  private async seedAutoScanPaths(): Promise<void> {
    console.log('🌱 Seeding auto-scan test paths...');

    const rubyScript = `
      ImagePath.destroy_all

      # State 1: Manual only
      p1 = ImagePath.create!(
        name: "example_memes_1",
        scan_frequency_minutes: nil,
        scan_status: :idle
      )

      # State 2: Up to date (scanned 15 minutes ago, frequency 30 min)
      p2 = ImagePath.create!(
        name: "example_memes_2",
        scan_frequency_minutes: 30,
        last_scanned_at: 15.minutes.ago,
        scan_status: :idle
      )

      # State 3: Due now (scanned 70 minutes ago, frequency 60 min)
      p3 = ImagePath.create!(
        name: "test_valid_directory",
        scan_frequency_minutes: 60,
        last_scanned_at: 70.minutes.ago,
        scan_status: :idle
      )

      # State 4: Currently scanning
      p4 = ImagePath.create!(
        name: "test_empty_directory",
        scan_frequency_minutes: 360,
        last_scanned_at: 30.minutes.ago,
        scan_status: :scanning,
        currently_scanning: true
      )

      # State 5: Failed scan
      p5 = ImagePath.create!(
        name: "comics",
        scan_frequency_minutes: 1440,
        last_scanned_at: 5.minutes.ago,
        scan_status: :failed,
        last_scan_error: "Permission denied: cannot read directory"
      )

      # State 6: First scan pending (never scanned)
      p6 = ImagePath.create!(
        name: "memes",
        scan_frequency_minutes: 30,
        last_scanned_at: nil,
        scan_status: :idle
      )

      # Print IDs for tracking
      puts "PATHS_CREATED:"
      [p1, p2, p3, p4, p5, p6].each do |p|
        puts "#{p.name}:#{p.id}"
      end
    `.replace(/\n      /g, '\n'); // Remove extra indentation

    try {
      const prefix = await this.getCommandPrefix();
      const { stdout } = await execAsync(
        `${prefix}bin/rails runner -e test '${rubyScript}'`,
        { cwd: RAILS_APP_DIR }
      );

      // Parse path IDs
      const lines = stdout.split('\n');
      const pathsStartIndex = lines.findIndex(l => l.includes('PATHS_CREATED:'));
      if (pathsStartIndex >= 0) {
        lines.slice(pathsStartIndex + 1).forEach(line => {
          const match = line.match(/^(.+):(\d+)$/);
          if (match) {
            this.pathIds.set(match[1], parseInt(match[2], 10));
          }
        });
      }

      console.log('✅ Seeded paths:', Array.from(this.pathIds.keys()).join(', '));
    } catch (error) {
      console.error('❌ Path seeding failed:', error);
      throw error;
    }
  }

  private async updatePathState(pathName: string, updates: PathStateUpdate): Promise<void> {
    const updatesParts: string[] = [];

    if (updates.scan_status !== undefined) {
      updatesParts.push(`scan_status: ${updates.scan_status}`);
    }
    if (updates.scan_frequency_minutes !== undefined) {
      updatesParts.push(`scan_frequency_minutes: ${updates.scan_frequency_minutes === null ? 'nil' : updates.scan_frequency_minutes}`);
    }
    if (updates.last_scanned_at !== undefined) {
      const value = updates.last_scanned_at === null ? 'nil' : `'${updates.last_scanned_at}'`;
      updatesParts.push(`last_scanned_at: ${value}`);
    }
    if (updates.last_scan_error !== undefined) {
      const value = updates.last_scan_error === null ? 'nil' : `'${updates.last_scan_error}'`;
      updatesParts.push(`last_scan_error: ${value}`);
    }
    if (updates.currently_scanning !== undefined) {
      updatesParts.push(`currently_scanning: ${updates.currently_scanning}`);
    }

    const rubyScript = `
      path = ImagePath.find_by!(name: "${pathName}")
      path.update_columns(${updatesParts.join(', ')})
      puts "Updated #{path.name}"
    `.replace(/\n      /g, '\n');

    const prefix = await this.getCommandPrefix();
    await execAsync(
      `${prefix}bin/rails runner -e test '${rubyScript}'`,
      { cwd: RAILS_APP_DIR }
    );
  }

  private async getCommandPrefix(): Promise<string> {
    try {
      await execAsync('which mise');
      return 'mise exec -- ';
    } catch {
      return '';
    }
  }

  private async captureAllSections(): Promise<void> {
    const sections = this.defineScreenshotSections();

    // Count total screenshots
    const totalScreenshots = sections.reduce((sum, s) => sum + s.captures.length, 0);
    this.reporter.start(totalScreenshots);

    for (const section of sections) {
      console.log(`\n📸 ${section.name}...`);
      await this.captureSection(section);
    }
  }

  private async captureSection(section: ScreenshotSection): Promise<void> {
    const sectionDir = path.join(SCREENSHOTS_DIR, section.directory);

    for (const capture of section.captures) {
      try {
        // Create new context for clean state
        const context = await this.browser.newContext({
          viewport: capture.viewport || DESKTOP_VIEWPORT,
          colorScheme: capture.darkMode ? 'dark' : 'light',
          baseURL: BASE_URL
        });

        const page = await context.newPage();
        const imagePathsPage = new ImagePathsPage(page);

        const captureContext: CaptureContext = {
          imagePathsPage,
          browser: this.browser,
          context,
          pathIds: this.pathIds
        };

        // Run setup function
        await capture.setup(page, captureContext);

        // Wait for UI to settle
        await page.waitForTimeout(500);

        // Capture screenshot
        const screenshotPath = path.join(sectionDir, capture.filename);
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          type: 'png'
        });

        this.reporter.onSuccess(capture.filename);

        // Cleanup
        await context.close();

      } catch (error) {
        this.reporter.onFailure(capture.filename, error as Error);
        if ((error as Error).message !== 'MANUAL_STEP_REQUIRED') {
          throw error;
        }
      }
    }
  }

  private defineScreenshotSections(): ScreenshotSection[] {
    return [
      {
        name: 'Section 1: User Problem',
        directory: '01-user-problem',
        captures: [
          {
            filename: '01-tracked-path-no-changes.png',
            description: 'Index page with manual-only paths',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');
            }
          },
          {
            filename: '02-manual-only-state.png',
            description: 'Close-up of manual-only path card',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              const card = page.locator('div[id^="image_path_"]').first();
              await card.scrollIntoViewIfNeeded();
            }
          }
        ]
      },

      {
        name: 'Section 2: Manual Rescan',
        directory: '02-manual-rescan',
        captures: [
          {
            filename: '01-rescan-button-index.png',
            description: 'Rescan button on index page',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Highlight rescan button
              await page.evaluate(() => {
                const btn = document.querySelector('button');
                if (btn && btn.textContent?.includes('Rescan')) {
                  btn.style.outline = '3px solid #ef4444';
                  btn.style.outlineOffset = '4px';
                }
              });
            }
          },
          {
            filename: '02-rescan-complete-message.png',
            description: 'Flash message after rescan',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Inject flash message
              await page.evaluate(() => {
                const flashHTML = `
                  <div data-controller="alert" class="fixed top-4 right-4 bg-green-400 text-white p-4 rounded-lg shadow-lg z-50">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                      <span>Added 3 new images, removed 1 orphaned record</span>
                    </div>
                  </div>
                `;
                document.body.insertAdjacentHTML('afterbegin', flashHTML);
              });
            }
          },
          {
            filename: '03-rescan-button-show.png',
            description: 'Rescan button on show page',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Click into first path
              const firstCard = page.locator('div[id^="image_path_"]').first();
              await firstCard.click();
              await page.waitForLoadState('networkidle');
            }
          }
        ]
      },

      {
        name: 'Section 3: Create Path with Auto-Scan',
        directory: '03-create-path-with-autoscan',
        captures: [
          {
            filename: '01-new-path-form.png',
            description: 'New path form with scan frequency dropdown',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await ctx.imagePathsPage.clickCreateNew();
            }
          },
          {
            filename: '02-frequency-dropdown-options.png',
            description: 'Dropdown showing all frequency options',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await ctx.imagePathsPage.clickCreateNew();

              // Focus and expand dropdown
              const dropdown = page.locator('select[name="image_path[scan_frequency_minutes]"]');
              await dropdown.click();
              await page.waitForTimeout(300);
            }
          },
          {
            filename: '03-frequency-selected-30min.png',
            description: 'Form with 30 minutes selected',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await ctx.imagePathsPage.clickCreateNew();
              await ctx.imagePathsPage.selectScanFrequency('30');
            }
          },
          {
            filename: '04-path-created-first-scan-pending.png',
            description: 'Newly created path with first scan pending status',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Find the "memes" path card (first scan pending)
              const memesCard = page.locator('div[id^="image_path_"]', {
                has: page.locator('text=/memes/')
              }).first();
              await memesCard.scrollIntoViewIfNeeded();
            }
          }
        ]
      },

      {
        name: 'Section 4: Auto-Scan States',
        directory: '04-autoscan-states',
        captures: [
          {
            filename: '01-manual-only.png',
            description: 'Manual only state (gray)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'example_memes_1');
            }
          },
          {
            filename: '02-up-to-date.png',
            description: 'Up to date state (emerald)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'example_memes_2');
            }
          },
          {
            filename: '03-due-now.png',
            description: 'Due now state (amber)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'test_valid_directory');
            }
          },
          {
            filename: '04-scanning.png',
            description: 'Scanning state (blue with spinner)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'test_empty_directory');
            }
          },
          {
            filename: '05-failed.png',
            description: 'Failed state (red with error)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'comics');
            }
          },
          {
            filename: '06-first-scan-pending.png',
            description: 'First scan pending state (purple)',
            setup: async (page, ctx) => {
              await this.capturePathCard(page, 'memes');
            }
          }
        ]
      },

      {
        name: 'Section 5: Index Overview',
        directory: '05-index-overview',
        captures: [
          {
            filename: '01-mixed-states-light-mode.png',
            description: 'Index with all states (light mode)',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');
              await page.evaluate(() => window.scrollTo(0, 0));
            }
          },
          {
            filename: '02-mixed-states-dark-mode.png',
            description: 'Index with all states (dark mode)',
            darkMode: true,
            setup: async (page, ctx) => {
              await this.toggleDarkMode(page, true);
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');
              await page.evaluate(() => window.scrollTo(0, 0));
            }
          },
          {
            filename: '03-full-page-context.png',
            description: 'Full page context with navigation',
            setup: async (page, ctx) => {
              await this.toggleDarkMode(page, false);
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');
              await page.evaluate(() => window.scrollTo(0, 0));
            }
          }
        ]
      },

      {
        name: 'Section 6: Edit Frequency',
        directory: '06-edit-frequency',
        captures: [
          {
            filename: '01-edit-form-current-settings.png',
            description: 'Edit form showing current frequency',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Click edit on first path
              const firstEdit = page.getByRole('link', { name: 'Edit path' }).first();
              await firstEdit.click();
              await page.waitForLoadState('networkidle');

              await ctx.imagePathsPage.clickEditThisPath();
            }
          },
          {
            filename: '02-change-frequency-dropdown.png',
            description: 'Changing frequency in dropdown',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              const firstEdit = page.getByRole('link', { name: 'Edit path' }).first();
              await firstEdit.click();
              await page.waitForLoadState('networkidle');

              await ctx.imagePathsPage.clickEditThisPath();

              // Open dropdown
              const dropdown = page.locator('select[name="image_path[scan_frequency_minutes]"]');
              await dropdown.click();
              await page.waitForTimeout(300);
            }
          },
          {
            filename: '03-updated-frequency-confirmation.png',
            description: 'Confirmation after updating frequency',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');

              // Inject success message
              await page.evaluate(() => {
                const flashHTML = `
                  <div data-controller="alert" class="fixed top-4 right-4 bg-green-400 text-white p-4 rounded-lg shadow-lg z-50">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                      <span>Directory path successfully updated!</span>
                    </div>
                  </div>
                `;
                document.body.insertAdjacentHTML('afterbegin', flashHTML);
              });
            }
          }
        ]
      },

      {
        name: 'Section 7: Workflow Narrative',
        directory: '07-workflow-narrative',
        captures: [
          {
            filename: '01-github-issue-116.png',
            description: 'GitHub issue screenshot',
            setup: async (page, ctx) => {
              await page.goto('https://github.com/neonwatty/meme-search/issues/116');
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);
            }
          },
          {
            filename: '02-manual-rescan-solution.png',
            description: 'Manual rescan workflow',
            setup: async (page, ctx) => {
              await ctx.imagePathsPage.goto();
              await page.waitForLoadState('networkidle');
            }
          }
        ]
      }
    ];
  }

  private async capturePathCard(page: Page, pathName: string): Promise<void> {
    await page.goto(`${BASE_URL}/settings/image_paths`);
    await page.waitForLoadState('networkidle');

    // Find card containing the path name
    const card = page.locator('div[id^="image_path_"]', {
      has: page.locator(`text=/${pathName}/`)
    }).first();

    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  private async toggleDarkMode(page: Page, enable: boolean): Promise<void> {
    await page.evaluate((darkMode) => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }, enable);
    await page.waitForTimeout(300);
  }
}

// Main execution
async function main() {
  const automation = new ScreenshotAutomation();
  await automation.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ScreenshotAutomation };
