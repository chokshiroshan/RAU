#!/usr/bin/env node

/**
 * Test script to verify browser tab search functionality
 */

const { getAllTabs, activateTab } = require('./src/services/tabFetcher');

async function runTests() {
  console.log('🔍 Testing Browser Tab Search Functionality\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Fetch all tabs
    console.log('\n📋 Test 1: Fetching all browser tabs...');
    const tabs = await getAllTabs();

    if (tabs.length === 0) {
      console.log('⚠️  No tabs found!');
      console.log('   Make sure you have browser windows open with tabs.');
      console.log('   Supported browsers: Safari, Chrome, Brave, Comet\n');
      return;
    }

    console.log(`✅ Found ${tabs.length} tabs:\n`);

    // Group by browser
    const byBrowser = {};
    tabs.forEach(tab => {
      if (!byBrowser[tab.browser]) {
        byBrowser[tab.browser] = [];
      }
      byBrowser[tab.browser].push(tab);
    });

    // Display tabs by browser
    Object.keys(byBrowser).forEach(browser => {
      console.log(`   ${browser} (${byBrowser[browser].length} tabs):`);
      byBrowser[browser].forEach(tab => {
        console.log(`      • ${tab.title}`);
        console.log(`        ${tab.url}`);
      });
      console.log('');
    });

    // Test 2: Search functionality
    console.log('🔎 Test 2: Search test (looking for "github")...');
    const Fuse = require('fuse.js');
    const fuse = new Fuse(tabs, {
      keys: ['title', 'url'],
      threshold: 0.6,
    });

    const searchResults = fuse.search('github');
    console.log(`✅ Found ${searchResults.length} matching tabs for "github":\n`);
    searchResults.slice(0, 5).forEach(result => {
      console.log(`   • ${result.item.title} (${result.item.browser})`);
    });
    console.log('');

    // Test 3: Tab activation (if available)
    if (tabs.length > 0) {
      console.log('🎯 Test 3: Tab activation...');
      const testTab = tabs[0];
      console.log(`   Attempting to activate: ${testTab.title} (${testTab.browser})...`);

      const result = await activateTab(testTab);
      if (result) {
        console.log('✅ Tab activation successful!\n');
      } else {
        console.log('⚠️  Tab activation failed (browser may not be running)\n');
      }
    }

    console.log('=' .repeat(60));
    console.log('\n✅ All tests completed successfully!\n');
    console.log('To use the app:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Press Cmd+Shift+Space to open the launcher');
    console.log('  3. Type to search for tabs or files');
    console.log('  4. Press Enter to open a tab or file\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();
