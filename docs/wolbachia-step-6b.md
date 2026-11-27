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
| New work while offline | A fresh generated eight-bead record was saved and counted as 8 locally with no hosted counting response; an uncached API fetch independently confirmed blocked networking, and a separate human correction to 0 was saved |
| Offline export and second restart | CSV and JSON downloads retained original estimate 8, reviewed count 0, runtime and generated-proxy provenance; the review survived another complete browser restart |
| Reconnection | The chosen cloud-first policy used the real HTTP counter again; original history remained and a new count required a fresh review |
| Missing worker asset | Preparation stayed unconfirmed offline; reconnecting and repairing restored the complete cache |
| Mixed-release HTML | An HTML build mismatch stayed unconfirmed and was repaired from the connected origin |
| Other failures and restrictions | Connected service failure used permitted worker fallback; cloud-only stayed blocked offline; device-only made zero counting POST requests; failed initial caching could be retried; a never-prepared profile could not cold-open offline |

The persistent-profile test also checked the 390 px layout for page overflow and confirmed no `/api/` requests were stored in the app cache. These are controlled software checks with a synthetic proxy; they are not a physical test of Wili's laptop, real-photo accuracy or public-health effectiveness.

The test proves network isolation with a rejected uncached API request, not the browser's online hint. CI's Chromium can retain a connected hint when a persistent profile cold-starts with networking disabled; cloud-first must still recover to the local worker. Device-only is separately checked to make no image-service POST request at all.

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

The [GitHub CI run](https://github.com/wilisail/workshop-ready/actions/runs/45917910012) passed for release commit `b40b804e2dc6a088675a8d27c29c491de1ad417c`: 111 automated tests, the compiled Node API check, the production build and all seven browser scenarios. CI used Node 22 and Playwright's Chromium 151; the local browser checks also passed on Chromium 158. The cold-start test checks an actual rejected network request independently of the connection hint.

| Item | Verified result |
| --- | --- |
| Public app | https://workshop-ready-theta.vercel.app/#settings |
| Environment / state | Production / READY |
| Release commit | `b40b804e2dc6a088675a8d27c29c491de1ad417c` |
| Deployment | `dpl_4V98jpDSGjvLcCnR6KexpVkf337d` |
| Framework | Vite + React with the existing Node counting function |
| Build duration | Approximately 50 seconds from provider timestamps |
| Offline build identifier | `4fac25d3fdcd`, matching the locally tested build |
| Access | Existing public domain; no audience or authentication change |

On 27 November 2026 at approximately 07:42 WIB, opened the public settings page in the cloud browser without evaluator login. The new offline panel confirmed **10 / 10 assets saved**. Pressing **Prepare offline use** retained that confirmation, and the separate **Check bead service** action returned **Vercel counting service responded**. The HTML build identifier matched the locally tested build. No image or Firebase inference was needed for these checks.

The disconnected workflow was exercised against the production build in local and CI test browsers. The public deployment's asset preparation and service were checked online. **Wili's physical laptop/disconnection check stays deferred**, and real-photo/field evidence remains step 6C. Step 6B implementation, controlled offline verification, CI and the hosted release are complete.

## References

- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — install/activate lifecycle and offline response handling.
- [Playwright: Service Workers](https://playwright.dev/docs/service-workers) — real worker activation and network interception during testing.
- [Playwright: BrowserContext](https://playwright.dev/docs/api/class-browsercontext) — browser network emulation and persistent context behaviour.
