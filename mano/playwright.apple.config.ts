// Existing runtime assertions with an already running server and installed Edge.
// This is browser coverage, not WKWebView/PhotoKit validation.
import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,webServer:undefined,use:{...base.use,
  baseURL:process.env.APPLE_RUNTIME_URL||'http://127.0.0.1:4186',
  launchOptions:{channel:process.env.APPLE_BROWSER_CHANNEL||'msedge'}}});
