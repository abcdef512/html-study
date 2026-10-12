import {defineConfig} from '@playwright/test';
import {launchOptions} from './playwright.runtime.js';
export default defineConfig({testDir:'./tests', testIgnore:'production.spec.js', workers:1, timeout:30000, use:{baseURL:'http://127.0.0.1:4173', launchOptions}, webServer:{command:'npm run dev -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI}});
