import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/search.page';
import { ImageCoresPage } from '../pages/image-cores.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Search Tests
 *
 * These tests verify keyword search, vector search, and tag filtering functionality.
 * Migrated from: test/system/search_test.rb
 */

test.describe('Search', () => {
  let searchPage: SearchPage;
  let imageCoresPage: ImageCoresPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page objects
    searchPage = new SearchPage(page);
    imageCoresPage = new ImageCoresPage(page); // For test 3 setup
  });

  test('keyword search, all tags allowed', async ({ page }) => {
    // 1. Visit search page and verify no initial results
    await searchPage.goto();
    let memeCount = await searchPage.getMemeCount();
    console.log(`Initial meme count: ${memeCount}`);
    expect(memeCount).toBe(0);

    // 2. Search for "fucks" - should find 1 meme
    console.log('Searching for "fucks"...');
    await searchPage.fillSearch('fucks');
    memeCount = await searchPage.getMemeCount();
    expect(memeCount).toBe(1);

    // 3. Search for "pills" - should find 1 meme
    console.log('Searching for "pills"...');
    await searchPage.fillSearch('pills');
    memeCount = await searchPage.getMemeCount();
    expect(memeCount).toBe(1);

    // 4. Search for "weird" - should find 1 meme
    console.log('Searching for "weird"...');
    await searchPage.fillSearch('weird');
    memeCount = await searchPage.getMemeCount();
    expect(memeCount).toBe(1);

    // 5. Search for "image" - should find 4 memes (matches multiple descriptions)
    console.log('Searching for "image"...');
    await searchPage.fillSearch('image');
    memeCount = await searchPage.getMemeCount();
    expect(memeCount).toBe(4);
  });

  test('keyword search, tag filter allowed', async ({ page }) => {
    // 1. Visit search page
    await searchPage.goto();
    console.log('Opened search page');

    // 2. Open tag dropdown and select tag 1
    await searchPage.openTagDropdown();
    await searchPage.selectTag(1);
    await searchPage.closeTagDropdown();
    console.log('Selected tag 1 filter');

    // 3. Search for "fucks" - should be filtered out (tagged with unselected tag)
    console.log('Searching for "fucks" with tag 1 filter...');
    await searchPage.fillSearch('fucks');
    let memeCount = await searchPage.getMemeCount();
    console.log(`Meme count with tag 1 filter: ${memeCount}`);
    expect(memeCount).toBe(0);

    // 4. Change tag selection - select tag 0, unselect tag 1
    await searchPage.openTagDropdown();
    await searchPage.selectTag(0);
    await searchPage.unselectTag(1);
    await searchPage.closeTagDropdown();
    console.log('Changed to tag 0 filter');

    // 5. Search for "weird" - should be filtered out (tagged with unselected tag)
    console.log('Searching for "weird" with tag 0 filter...');
    await searchPage.fillSearch('weird');
    memeCount = await searchPage.getMemeCount();
    console.log(`Meme count with tag 0 filter: ${memeCount}`);
    expect(memeCount).toBe(0);
  });

  test('vector search, all tags allowed', async ({ page }) => {
    // Part 1: Setup - Create embeddings by editing a meme description
    // This is necessary because embeddings are only created when a description is saved
    console.log('Setting up: Creating embeddings by editing a meme...');

    await imageCoresPage.gotoRoot();
    console.log('Navigated to root page');

    await imageCoresPage.clickGenerateDescription();
    await page.waitForURL(/\/image_cores\/\d+$/);
    console.log(`Navigated to meme show page: ${page.url()}`);

    await imageCoresPage.clickEditDetails();
    await page.waitForURL(/\/image_cores\/\d+\/edit$/);
    console.log(`Navigated to edit page: ${page.url()}`);

    // Update description with specific text for semantic search testing
    const newDescription = "an image saying for now we see through a glass darkly";
    await imageCoresPage.fillDescription(newDescription);
    console.log(`Updated description to: "${newDescription}"`);

    // Update tags (required by original test)
    await imageCoresPage.openTagDropdown();
    await imageCoresPage.selectTag(1);
    await imageCoresPage.closeTagDropdown();
    console.log('Selected tag 1');

    // Save changes (this creates embeddings)
    await imageCoresPage.clickSave();
    await page.waitForURL(/\/image_cores\/\d+$/);
    console.log('Saved changes - embeddings created');

    // Part 2: Test keyword search
    console.log('\nTesting keyword search...');
    await searchPage.goto();

    await searchPage.fillSearch('darkly');
    let memeCount = await searchPage.getMemeCount();
    console.log(`Keyword search for "darkly": ${memeCount} result(s)`);
    expect(memeCount).toBe(1);

    // Part 3: Toggle to vector mode and test exact match
    console.log('\nToggling to vector search mode...');
    await searchPage.toggleToVectorMode();
    const mode = await searchPage.getSearchMode();
    expect(mode).toBe('vector');

    await searchPage.fillSearch('darkly');
    memeCount = await searchPage.getMemeCount();
    console.log(`Vector search for "darkly": ${memeCount} result(s)`);
    expect(memeCount).toBe(1);

    // Part 4: Test semantic search with synonym
    // "black" should find the meme with "darkly" due to vector similarity
    console.log('\nTesting semantic search with synonym...');
    await searchPage.fillSearch('black');
    memeCount = await searchPage.getMemeCount();
    console.log(`Vector search for "black" (synonym of "darkly"): ${memeCount} result(s)`);
    expect(memeCount).toBe(1); // Semantic search finds "darkly" via vector similarity!
  });
});
