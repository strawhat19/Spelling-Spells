const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../dist');
const output = path.resolve(__dirname, '../../test-results/auth-flow-browser');
const backendOrigin = 'https://qtfajiuilwdtywkklbjq.supabase.co';
const contentTypes = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const userId = '9b79238d-eec1-4e59-9d78-68b047229b42';
const accountId = 'User_1_Account_2026-10-16_00000000-0000-4000-8000-000000000001';
const fixtureEmail = 'signup-browser@example.test';
const fixtureName = 'Browser Test';
const fixturePassword = 'BrowserOnly-DoNotSend-2026';
const fixtureDate = '2026-10-16T12:00:00.000Z';
const googleUnavailable = 'Google sign-in is not available yet. Use email and password, or try again later.';
const googleCheckFailed = 'Google sign-in could not be checked. Check your connection and try again, or use email and password.';

fs.mkdirSync(output, { recursive: true });
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  const target = [candidate, `${candidate}.html`, path.join(candidate, 'index.html')].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!target) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(target).pipe(response);
});

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const userFixture = (confirmed, uid = userId) => ({
  id: uid,
  aud: 'authenticated',
  role: 'authenticated',
  email: uid === userId ? fixtureEmail : 'other-browser@example.test',
  identities: [],
  created_at: fixtureDate,
  updated_at: fixtureDate,
  email_confirmed_at: confirmed ? fixtureDate : null,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: fixtureName },
});

// This unsigned fixture is accepted only by the intercepted HTTP responses below.
const sessionFixture = (uid = userId) => ({
  user: userFixture(true, uid),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token-not-valid',
  access_token: [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ aud: 'authenticated', role: 'authenticated', sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
    'browser-test-signature',
  ].join('.'),
});

const createScenario = async (browser, baseUrl, options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const authChannel = `spelling-spells:${backendOrigin}:auth`;
  if (options.observeBroadcast) await context.addInitScript((name) => {
    const NativeBroadcastChannel = window.BroadcastChannel;
    window.__authFlowBroadcastDeliveries = 0;
    window.BroadcastChannel = class extends NativeBroadcastChannel {
      constructor(channelName) {
        super(channelName);
        if (channelName === name) this.addEventListener('message', () => { window.__authFlowBroadcastDeliveries += 1; });
      }
    };
  }, authChannel);
  const session = sessionFixture();
  const identityGate = deferred();
  const accountGate = deferred();
  const resendGate = deferred();
  const settingsGate = deferred();
  const requests = [];
  const violations = [];
  const errors = [];
  const oauthAttempts = [];
  const navigations = [];
  if (!options.pauseHydration) { identityGate.resolve(); accountGate.resolve(); }
  if (!options.pauseResend) resendGate.resolve();
  if (!options.pauseSettings) settingsGate.resolve();
  const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': baseUrl, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(value) });
  const expectContract = (condition, message) => { if (!condition) violations.push(message); };

  await context.routeWebSocket('**/*', (socket) => {
    const url = new URL(socket.url());
    expectContract(url.origin === backendOrigin.replace('https:', 'wss:') && url.pathname.startsWith('/realtime/v1/'), 'Unexpected websocket target');
    socket.onMessage((raw) => {
      try {
        const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw));
        if (event === 'phx_join') {
          const postgres_changes = (payload.config?.postgres_changes ?? []).map((value, index) => ({ id: index + 1, ...value }));
          socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes } }]));
        } else if (event === 'heartbeat' || event === 'phx_leave') {
          socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
        }
      } catch { violations.push('Unexpected websocket message format'); }
    });
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseUrl) {
      expectContract(['GET', 'HEAD'].includes(request.method()), 'Unexpected local mutation request');
      return route.continue();
    }
    if (url.origin !== backendOrigin) {
      violations.push('Unexpected external origin was blocked');
      return route.abort();
    }
    if (request.method() === 'OPTIONS') return json(route, {});
    const endpoint = `${request.method()} ${url.pathname}`;
    requests.push(endpoint);
    const body = () => request.postDataJSON() ?? {};
    if (endpoint === 'GET /auth/v1/settings') {
      await settingsGate.promise;
      if (options.googleSettings === 'network-error') return route.abort('failed');
      if (options.googleSettings === 'http-error') return json(route, { error: 'Fixture unavailable' }, 503);
      if (options.googleSettings === 'invalid-json') return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': baseUrl }, body: '{invalid-json' });
      return json(route, { external: options.googleSettings === 'missing' ? {} : { google: options.googleSettings === 'enabled' } });
    }
    if (endpoint === 'GET /auth/v1/authorize') {
      oauthAttempts.push({
        navigation: request.isNavigationRequest(),
        providerAccepted: url.searchParams.get('provider') === 'google',
        callbackAccepted: url.searchParams.get('redirect_to') === `${baseUrl}/auth/callback`,
        pkceAccepted: url.searchParams.get('code_challenge_method') === 's256' && /^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') ?? ''),
      });
      return route.abort();
    }
    if (endpoint === 'POST /auth/v1/signup') {
      expectContract(body().email === fixtureEmail && body().password === fixturePassword && body().data?.display_name === fixtureName, 'Signup fixture did not pass the entered form fields');
      expectContract(url.searchParams.get('redirect_to') === `${baseUrl}/auth/callback`, 'Signup callback origin was not the current browser origin');
      return json(route, options.signupSession ? session : { user: userFixture(false) });
    }
    if (endpoint === 'GET /auth/v1/user') {
      expectContract(request.headers().authorization === `Bearer ${session.access_token}`, 'Identity verification did not use the mock session');
      await identityGate.promise;
      return json(route, userFixture(true));
    }
    if (endpoint === 'POST /auth/v1/resend') {
      expectContract(body().email === fixtureEmail && body().type === 'signup', 'Resend fixture did not use the pending signup email');
      await resendGate.promise;
      return json(route, {});
    }
    if (endpoint === 'POST /rest/v1/rpc/ensure_account') {
      expectContract(body().p_expected_auth_uid === userId, 'Account hydration did not bind the verified UID');
      await accountGate.promise;
      return json(route, [{ id: accountId, auth_uid: userId }]);
    }
    if (endpoint === 'GET /rest/v1/accounts') return json(route, { id: accountId, number: 1, auth_uid: userId, email: fixtureEmail, role: 'Subscriber', active: true, created_at: fixtureDate, updated_at: fixtureDate });
    if (endpoint === 'GET /rest/v1/profiles') return json(route, { account_id: accountId, privacy: 'private', display_name: fixtureName, avatar_url: null });
    if (endpoint === 'GET /rest/v1/saved_spells') return json(route, []);
    violations.push(`Unexpected mocked backend endpoint: ${endpoint}`);
    return route.abort();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame() && frame.url().startsWith(baseUrl)) navigations.push(new URL(frame.url()).pathname); });
  const visit = (pathname) => page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle' });
  const waitEditable = () => page.waitForFunction(() => document.querySelector('#auth-email')?.disabled === false && !document.querySelector('#auth-email')?.closest('fieldset')?.disabled);
  const waitRequest = async (endpoint) => {
    for (let count = 0; count < 400 && !requests.includes(endpoint); count++) await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(requests.includes(endpoint), true, `Expected intercepted ${endpoint}`);
  };
  const broadcastIdentityChange = async () => {
    const differentSession = sessionFixture('3ce4656a-bbcc-49cc-99ed-7386cc290c22');
    await page.evaluate(({ name, session }) => {
      const channel = new BroadcastChannel(name);
      channel.postMessage({ event: 'SIGNED_IN', session });
      channel.close();
    }, { name: authChannel, session: differentSession });
    await page.waitForFunction(() => window.__authFlowBroadcastDeliveries > 0);
  };
  const close = async () => {
    identityGate.resolve(); accountGate.resolve(); resendGate.resolve(); settingsGate.resolve();
    await context.close();
  };
  return { page, close, visit, requests, errors, violations, navigations, oauthAttempts, waitEditable, waitRequest, broadcastIdentityChange, identityGate, accountGate, resendGate, settingsGate };
};

const submitSignup = async (scenario) => {
  await scenario.waitEditable();
  await scenario.page.locator('#auth-name').fill(fixtureName);
  await scenario.page.locator('#auth-email').fill(fixtureEmail);
  await scenario.page.locator('#auth-password').fill(fixturePassword);
  await scenario.page.locator('#auth-email-button').click();
};

const checkHeader = async (scenario, state) => {
  const page = scenario.page;
  const accountSelector = state === 'signed-in' ? '#header-account-trigger' : '#header-signin-link';
  for (const width of [1440, 1366, 400, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const theme = page.locator('#header-theme-toggle');
    await theme.waitFor({ state: 'visible' });
    const account = page.locator(accountSelector);
    await account.waitFor({ state: 'visible' });
    // The account shell transitions its footer margin across the mobile breakpoint.
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1, null, { timeout: 2500 });
    const geometry = await page.evaluate((selector) => {
      const theme = document.querySelector('#header-theme-toggle');
      const account = document.querySelector(selector);
      const accountRoot = account.closest('#header-account-menu') ?? account;
      const box = (element) => { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
      return { theme: box(theme), account: box(account), immediateSibling: theme.nextElementSibling === accountRoot, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    }, accountSelector);
    assert.equal(geometry.immediateSibling, true, `${state} account control must immediately follow theme at ${width}px`);
    for (const box of [geometry.theme, geometry.account]) {
      assert.equal(box.width >= 44 && box.height >= 44, true, `${state} header touch target below 44px at ${width}px`);
      assert.equal(box.x >= 0 && box.x + box.width <= width + 1, true, `${state} header control outside ${width}px viewport`);
    }
    assert.equal(Math.abs(geometry.theme.y + geometry.theme.height / 2 - geometry.account.y - geometry.account.height / 2) <= 1, true, `${state} header controls are vertically misaligned at ${width}px`);
    assert.equal(geometry.theme.x + geometry.theme.width <= geometry.account.x + 1, true, `${state} header controls overlap at ${width}px`);
    assert.equal(geometry.overflow, false, `${state} page overflows at ${width}px`);
    const label = await theme.getAttribute('aria-label');
    await theme.click();
    await page.waitForFunction((previous) => document.querySelector('#header-theme-toggle')?.getAttribute('aria-label') !== previous, label);
    if (state === 'signed-in') {
      await account.click();
      const popover = page.locator('#header-account-popover');
      await popover.waitFor({ state: 'visible' });
      const box = await popover.boundingBox();
      assert.equal(box.x >= 0 && box.x + box.width <= width + 1, true, `Account popover exceeds ${width}px viewport`);
      await page.keyboard.press('Escape');
      await popover.waitFor({ state: 'hidden' });
    }
    if (width <= 400) {
      const menu = page.locator('#header-menu-toggle');
      await menu.click();
      await page.locator('#mobile-navigation').waitFor({ state: 'visible' });
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await menu.click();
      await page.locator('#mobile-navigation').waitFor({ state: 'hidden' });
      await page.screenshot({ path: path.join(output, `header-${state}-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
};

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const checks = [];
  const requestCounts = [];
  let active;
  const finish = async (label) => {
    assert.deepEqual(active.violations, [], `${label} request contract`);
    assert.deepEqual(active.errors, [], `${label} page errors`);
    requestCounts.push({ scenario: label, endpoints: Object.fromEntries([...new Set(active.requests)].map((endpoint) => [endpoint, active.requests.filter((value) => value === endpoint).length])) });
    await active.close(); active = null;
  };
  try {
    active = await createScenario(browser, baseUrl, { signupSession: true, pauseHydration: true });
    await active.visit('/signup');
    await submitSignup(active);
    await active.waitRequest('GET /auth/v1/user');
    assert.equal(new URL(active.page.url()).pathname, '/signup', 'Signup must wait for server identity verification');
    assert.equal(active.requests.includes('POST /rest/v1/rpc/ensure_account'), false);
    active.identityGate.resolve();
    await active.waitRequest('POST /rest/v1/rpc/ensure_account');
    assert.equal(new URL(active.page.url()).pathname, '/signup', 'Signup must wait for the mapped account');
    active.accountGate.resolve();
    await active.page.waitForURL(`${baseUrl}/profile`);
    await active.page.locator('#profile-name').waitFor();
    assert.equal(await active.page.locator('#profile-name').inputValue(), fixtureName);
    assert.equal(await active.page.locator('#profile-metadata').innerText().then((text) => text.includes('Subscriber')), true);
    checks.push('Session signup automatically reaches the real profile only after verified user and private account hydration');
    await checkHeader(active, 'signed-in');
    checks.push('Signed-in avatar immediately follows working theme control; 44px targets, aligned menus and no overflow at 1440/1366/400/320px');
    await finish('session signup and signed-in header');

    for (const [requested, destination] of [['/saved', '/saved'], ['https://example.invalid/untrusted', '/profile']]) {
      active = await createScenario(browser, baseUrl, { signupSession: true });
      await active.visit(`/signup?returnTo=${encodeURIComponent(requested)}`);
      await submitSignup(active);
      await active.page.waitForURL(`${baseUrl}${destination}`);
      assert.equal(active.requests.some((endpoint) => endpoint.includes('import_saved_spells')), false);
      checks.push(requested === '/saved' ? 'Session signup respects allowlisted return destination without implicit device import' : 'Session signup rejects an external return destination');
      await finish(`session signup return ${destination}`);
    }

    active = await createScenario(browser, baseUrl, { pauseResend: true });
    await active.visit('/spells');
    await active.page.locator('button[id$="-save"]').first().click();
    await active.page.waitForFunction(() => JSON.parse(localStorage.getItem('spelling-spells:preferences:v1') ?? '{}').savedIds?.length === 1);
    const deviceData = await active.page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1'));
    await active.visit('/signup');
    await submitSignup(active);
    await active.page.locator('#auth-signup-confirmation').waitFor();
    assert.equal(new URL(active.page.url()).pathname, '/signup');
    assert.equal(await active.page.locator('#auth-open-profile').count(), 0);
    assert.equal(await active.page.locator('#header-account-trigger').count(), 0);
    assert.equal(await active.page.locator('#auth-password').count(), 0);
    assert.equal(active.requests.some((endpoint) => endpoint.includes('/rest/v1/') || endpoint === 'GET /auth/v1/user'), false);
    assert.equal(await active.page.evaluate(() => localStorage.getItem('spelling-spells:preferences:v1')), deviceData);
    checks.push('Signup without a session stays on signup with dedicated confirmation, no fake account and unchanged device bookmarks');
    await active.page.locator('#auth-resend-confirmation').click();
    await active.waitRequest('POST /auth/v1/resend');
    assert.equal(await active.page.locator('#auth-resend-confirmation').isDisabled(), true);
    active.resendGate.resolve();
    await active.page.locator('#auth-feedback').filter({ hasText: /check your inbox/i }).waitFor();
    assert.equal(await active.page.locator('#auth-signup-confirmation').count(), 1);
    assert.equal(new URL(active.page.url()).pathname, '/signup');
    assert.equal(active.navigations.includes('/signin'), false);
    assert.equal(active.requests.filter((endpoint) => endpoint === 'POST /auth/v1/signup').length, 1);
    assert.equal(active.requests.some((endpoint) => endpoint.includes('/rest/v1/')), false);
    checks.push('Confirmation resend disables while pending, preserves check-email state and never forces sign-in or repeats signup');
    await active.page.screenshot({ path: path.join(output, 'signup-check-email.png'), fullPage: true });
    await active.page.locator('#auth-change-confirmation-email').click();
    await active.page.locator('#auth-password').waitFor();
    assert.equal(await active.page.locator('#auth-password').inputValue(), '');
    assert.equal(await active.page.locator('#auth-signup-confirmation').count(), 0);
    assert.equal(new URL(active.page.url()).pathname, '/signup');
    checks.push('Choosing another confirmation email returns to signup intentionally with a cleared password');
    await finish('confirmation and resend');

    for (const [settings, message] of [['disabled', googleUnavailable], ['missing', googleUnavailable], ['http-error', googleCheckFailed], ['invalid-json', googleCheckFailed], ['network-error', googleCheckFailed]]) {
      active = await createScenario(browser, baseUrl, { googleSettings: settings });
      await active.visit('/signin');
      await active.waitEditable();
      if (settings === 'disabled') {
        await checkHeader(active, 'guest');
        checks.push('Guest sign-in control immediately follows working theme control; 44px targets, mobile navigation and no overflow at 1440/1366/400/320px');
      }
      await active.page.locator('#auth-google-button').click();
      await active.page.locator('#auth-feedback').filter({ hasText: message }).waitFor();
      assert.equal(new URL(active.page.url()).pathname, '/signin');
      assert.equal(active.oauthAttempts.length, 0);
      assert.deepEqual(active.requests, ['GET /auth/v1/settings']);
      checks.push(`Google ${settings} preflight remains in-app with friendly feedback and zero authorize navigation`);
      await finish(`Google ${settings}`);
    }

    active = await createScenario(browser, baseUrl, { googleSettings: 'enabled', pauseSettings: true, observeBroadcast: true });
    await active.visit('/signin');
    await active.waitEditable();
    await active.page.locator('#auth-google-button').click();
    await active.waitRequest('GET /auth/v1/settings');
    await active.broadcastIdentityChange();
    active.settingsGate.resolve();
    await active.page.locator('#auth-connection-notice').filter({ hasText: 'Account connection needs attention' }).waitFor();
    assert.equal(active.oauthAttempts.length, 0);
    assert.deepEqual(active.requests, ['GET /auth/v1/settings']);
    assert.equal(new URL(active.page.url()).pathname, '/signin');
    assert.equal(await active.page.locator('#header-account-trigger').count(), 0);
    assert.equal(await active.page.locator('#auth-open-profile').count(), 0);
    checks.push('Cross-tab identity change during Google preflight cancels OAuth without publishing a private account');
    await finish('Google cross-tab identity cancellation');

    active = await createScenario(browser, baseUrl, { googleSettings: 'enabled', pauseSettings: true });
    await active.visit('/signin');
    await active.waitEditable();
    await active.page.locator('#auth-google-button').click();
    await active.waitRequest('GET /auth/v1/settings');
    assert.equal(active.oauthAttempts.length, 0);
    assert.equal(await active.page.locator('#auth-google-button').isDisabled(), true);
    assert.equal(new URL(active.page.url()).pathname, '/signin');
    checks.push('Pending Google availability check prevents duplicate action and premature OAuth navigation');
    active.settingsGate.resolve();
    await active.waitRequest('GET /auth/v1/authorize');
    assert.equal(active.oauthAttempts.length, 1);
    assert.deepEqual(active.oauthAttempts[0], { navigation: true, providerAccepted: true, callbackAccepted: true, pkceAccepted: true });
    assert.deepEqual(active.requests, ['GET /auth/v1/settings', 'GET /auth/v1/authorize']);
    checks.push('Enabled Google preflight prepares SDK Google/PKCE/current-origin callback navigation, intercepted before any external network');
    await finish('Google enabled boundary only');

    const report = { status: 'passed', checkedAtUtc: new Date().toISOString(), scope: 'Configured local export with intercepted Supabase HTTP/websocket fixtures only; no live auth, emails, OAuth, users or database changes', browser: await browser.version(), checks, requestCounts, externalNetworkAllowed: false };
    fs.writeFileSync(path.join(output, 'auth-flow-smoke.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await active?.page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    const overflow = await active?.page.evaluate(() => ({
      viewport: innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')].map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.right > innerWidth + 1)
        .sort((first, second) => second.box.right - first.box.right)
        .slice(0, 15)
        .map(({ element, box }) => ({ id: element.id, tag: element.tagName, className: element.getAttribute('class'), left: box.left, right: box.right, width: box.width })),
    })).catch(() => null);
    const report = { status: 'failed', checkedAtUtc: new Date().toISOString(), scope: 'Mocked local browser only', message: error.message, checks, requests: active?.requests, violations: active?.violations, pageErrors: active?.errors, overflow };
    fs.writeFileSync(path.join(output, 'auth-flow-smoke.json'), JSON.stringify(report, null, 2));
    console.error(error);
    process.exitCode = 1;
  } finally {
    await active?.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
