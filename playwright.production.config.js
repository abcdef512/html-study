import {defineConfig} from '@playwright/test';
import {launchOptions} from './playwright.runtime.js';
export default defineConfig({testDir:'./tests',testMatch:'production.spec.js',workers:1,use:{baseURL:'http://127.0.0.1:4174',launchOptions},webServer:{command:'npm run build && npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',url:'http://127.0.0.1:4174',reuseExistingServer:false}});
