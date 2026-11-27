# Step 6B: prepared offline operation and local fallback

Updated: 27 November 2026 (WIB).

The [three delivery goals](remaining-steps-and-goals.md) remain network visibility, a practical public-health workflow trial, and local processing as fallback to cloud-first operation. Firebase remains an optional, unverified connector. **Owner-operated laptop checks remain deferred.**

## Implemented behaviour

- **Data & settings → Prepare for offline use** checks the active app version, every required cached asset, and the small counting worker. A browser connection hint or an old saved result cannot certify preparation.
- The production build gives the HTML and service worker a matching build identifier. Missing files, wrong content types and HTML from a different release stay unconfirmed. **Prepare offline use** repairs missing assets while connected; **Check saved assets** works without internet.
- The service worker caches the built app, worker, styles and required chunks. After initial preparation, it supplies the app shell for a cold offline reopening. A failed new installation preserves the previous working copy; one preceding asset cache is retained for already-open tabs.
- API responses and POST requests are never supplied from this app-asset cache. A cached service response cannot impersonate a fresh cloud count or connection check.
- Cloud-first uses the local worker when the browser is offline, or when its hosted count fails despite a connected hint. The saved routing note explicitly records permitted fallback. Device-only makes no image upload; cloud-only remains blocked offline.
- Original images, computed results, independent human reviews and exports remain browser-local. Reconnection permits hosted computation again; it does not upload the saved record collection or add shared database sync.
- Offline startup checks the prepared copy without treating a failed network update as proof that the existing cache is unusable.

The local image engine is deterministic CV for bead proxies, not a trained biological detector or a local language model. Numeric modelling remains its separate experimental workflow.

## Browser verification

**111 automated tests, the compiled Node API smoke check, the TypeScript/Vite production build and seven actual Chromium browser scenarios passed locally.** Browser tests use the production build with the real local HTTP handler, not mocked image counts. The local test browser was Chromium 158 from the pinned `@sparticuz/chromium` test-only package; it is not a production dependency. CI uses Playwright's pinned Chromium download.

| Scenario | Observed result |
| --- | --- |
| Full browser restart with networking disabled | A prepared persistent browser profile reopened the app from its service worker; the test asserts the navigation response came from that worker |
| New work while offline | A fresh generated eight-bead record was saved and counted as 8 locally, with zero counting POST requests; a separate human correction to 0 was saved |
| Offline export and second restart | CSV and JSON downloads retained original estimate 8, reviewed count 0, runtime and generated-proxy provenance; the review survived another complete browser restart |
| Reconnection | The chosen cloud-first policy used the real HTTP counter again; original history remained and a new count required a fresh review |
| Missing worker asset | Preparation stayed unconfirmed offline; reconnecting and repairing restored the complete cache |
| Mixed-release HTML | An HTML build mismatch stayed unconfirmed and was repaired from the connected origin |
| Other failures and restrictions | Connected service failure used permitted worker fallback; cloud-only stayed blocked offline; failed initial caching could be retried; a never-prepared profile could not cold-open offline |

The persistent-profile test also checked the 390 px layout for page overflow and confirmed no `/api/` requests were stored in the app cache. These are controlled software checks with a synthetic proxy; they are not a physical test of Wili's laptop, real-photo accuracy or public-health effectiveness.

### Reproduce the checks

```sh
npm ci
npm test
npm run build
npx playwright install --with-deps chromium --only-shell
npm run test:offline
```

The test server binds to `127.0.0.1:4174`. Service workers must remain enabled. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and optional JSON `PLAYWRIGHT_CHROMIUM_ARGS` allow an already-installed test browser; no custom executable is required for the normal CI workflow. `E2E_BASE_URL` can select an explicitly chosen deployed app instead of the local preview.

## Deferred owner check: 20–30 minutes, after implementation

1. Open https://workshop-ready-theta.vercel.app/#settings in the browser/profile you will use offline. Keep internet connected until **App assets prepared on this browser** appears. If needed, press **Prepare offline use** and then **Check saved assets**.
2. Keep **Small bead counter** and **Prefer Vercel, allow browser fallback** selected. Disconnect internet, close the app tab, then reopen that same link in the same browser/profile.
3. In Image review, load the generated example or a prepared bead photo. Count locally, save a human review, and export CSV/audit JSON. Close and reopen again to confirm the records remain.
4. Reconnect and run a new cloud-first count. Check its actual runtime and retained history. A fresh count needs a fresh human review.

First preparation requires a connection. Clearing site data or changing browser/profile removes access to that copy; export records for backup. The audit/CSV exports contain records and history, not the original image bytes. A cache-ready label concerns app assets; image-storage failures remain separate and visible in the image workspace.

## Hosted release evidence

CI and public deployment verification are recorded here after the release. The owner check above stays pending until performed.

## References

- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — install/activate lifecycle and offline response handling.
- [Playwright: Service Workers](https://playwright.dev/docs/service-workers) — real worker activation and network interception during testing.
- [Playwright: BrowserContext](https://playwright.dev/docs/api/class-browsercontext) — browser network emulation and persistent context behaviour.
