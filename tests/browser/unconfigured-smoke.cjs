const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../dist');
const output = path.resolve(__dirname, '../../test-results/unconfigured-browser');
fs.mkdirSync(output, { recursive: true });
const contentTypes = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  const target = [candidate, `${candidate}.html`, path.join(candidate, 'index.html')].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!target) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(target).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  const checks = [];
  const visit = (route) => page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  try {
    await visit('/spells');
    await page.locator('#catalog-title').waitFor();
    const save = page.locator('button[id$="-save"]').first();
    const spellId = (await save.getAttribute('id')).replace(/^spell-card-catalog-/, '').replace(/-save$/, '');
    const stored = JSON.stringify({ version: 1, savedIds: [spellId], historyIds: [] });
    await page.evaluate((value) => localStorage.setItem('spelling-spells:preferences:v1', value), stored);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await save.getAttribute('aria-pressed'), 'false');
    await save.click();
    await page.waitForURL(`${baseUrl}/signin`);
    await page.getByText('Account connection unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1')), stored);
    await visit('/spells');
    assert.equal(await save.getAttribute('aria-pressed'), 'false');
    checks.push('Guest bookmark clicks require sign-in and preserve legacy device bookmarks for import');

    await visit('/saved');
    await page.waitForURL(`${baseUrl}/signin`);
    await page.getByText('Account connection unavailable', { exact: true }).waitFor();
    assert.equal(await page.locator('#saved-page').count(), 0);
    assert.equal(await page.locator('#saved-device-import').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1')), stored);
    checks.push('Saved shelf redirects guests to sign-in without exposing legacy device bookmarks');

    for (const route of ['/signin', '/signup']) {
      await visit(route);
      await page.getByText('Account connection unavailable', { exact: true }).waitFor();
      for (const id of ['auth-email', 'auth-password', 'auth-google-button']) assert.equal(await page.locator(`#${id}`).isDisabled(), true);
      assert.equal(await page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1')), stored);
      checks.push(`${route} fails closed without configuration and preserves device bookmarks`);
    }
    await page.screenshot({ path: path.join(output, 'signup-desktop.png'), fullPage: true });

    for (const route of ['/users', '/dashboard']) {
      await visit(route);
      await page.getByText(route === '/dashboard' ? 'Sign in to view the private workspace' : 'Sign in to view this', { exact: true }).first().waitFor();
      assert.equal(await page.locator('tbody tr[id^="owner-user-"]').count(), 0);
      checks.push(`${route} direct access denies guest private data`);
    }

    await visit('/auth/callback?error=access_denied');
    await page.locator('#auth-callback-signin').waitFor();
    assert.equal(await page.locator('#auth-callback-page').count(), 1);
    checks.push('Static OAuth callback renders safe recovery when unconfigured');
    await page.locator('#auth-callback-signin').click();
    await page.getByText('Account connection unavailable', { exact: true }).waitFor();
    assert.equal(await page.locator('#auth-email').isDisabled(), true);
    checks.push('Callback failure cannot enable credentials without configuration');

    await visit('/reset-password');
    await page.locator('#password-recovery-continue').waitFor();
    assert.equal(await page.locator('#password-recovery-form').count(), 0);
    checks.push('Password change fields hidden without recovery session');

    await page.setViewportSize({ width: 400, height: 860 });
    await visit('/signin');
    await page.getByText('Account connection unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
    await page.screenshot({ path: path.join(output, 'signin-mobile.png'), fullPage: true });
    checks.push('400px auth layout has no horizontal overflow');

    await page.evaluate(() => localStorage.setItem('spelling-spells:preferences:v1', '{unreadable-preserve-this'));
    await visit('/saved');
    await page.waitForURL(`${baseUrl}/signin`);
    await page.getByText('Account connection unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1')), '{unreadable-preserve-this');
    checks.push('Unreadable device preferences preserved through guest saved-shelf redirect');

    assert.deepEqual(errors, []);
    assert.deepEqual([...new Set(external)], []);
    checks.push('No uncaught page errors or external backend requests');
    const report = { status: 'passed', scope: 'Unconfigured local static export only; no authenticated/cloud flow verified', browser: await browser.version(), checks };
    fs.writeFileSync(path.join(output, 'browser-smoke.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
