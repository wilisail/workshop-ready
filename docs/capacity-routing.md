# Capacity readers and guarded routing

## Browser: owner-initiated, limited readings

Click **Check device** to read the browser's approximate RAM estimate, logical processors, site storage usage/quota, local-model availability and online/offline hint. **Refresh reading** takes another snapshot.

These readings are kept in page state. The app does not add them to an AI request or upload a hardware report. Chrome may round or clamp RAM and processor information for privacy. Site storage quota is not free disk space on the Chrome profile drive. `navigator.onLine` is a hint; it does not prove a particular API is reachable.

Websites do not have a standard API for exact free system RAM, total system CPU utilization, every process's usage, or general GPU VRAM availability. A permission checkbox cannot turn those unavailable APIs into exact readings. Those fields must stay unknown unless an owner runs an appropriate native reader.

## Automatic route decisions

Every non-cloud-only Generate request checks local-model readiness again rather than trusting an older displayed snapshot.

| Selected policy | Local model ready, online | Local unavailable/not ready, online | Browser reports offline |
| --- | --- | --- | --- |
| Cloud only | Cloud | Cloud | Visible error; retain draft |
| Prefer cloud, allow device | Cloud preferred; local fallback prepared | Cloud, no model download | Local only if model is ready; otherwise error |
| Prefer device, allow cloud | Device preferred; cloud fallback allowed | Cloud immediately, no model download | Local only if model is ready; otherwise error |
| Device only | Local, no cloud | Error if unsupported; an explicit request may download a supported model | Local only if already downloaded; otherwise error |

Preparing a downloaded model can still allocate working memory. If preparation fails in an allowed preference mode while online, the app selects cloud. Local-only never becomes cloud, including after an error. Actual response source comes from the SDK, not from the requested policy.

This readiness guard does not claim to be an exact live RAM monitor. Firebase project setup and end-to-end tests are still needed before claiming real cloud or Chrome-local generation works.

## Terminal: the environment where the owner launches it

Read-only Node command:

```sh
npm run capacity
```

It reports visible/effective RAM, available and used memory, percentages with an explicit denominator, logical processors available to the process, a short CPU-load sample and storage on the current volume where exposed. Container constraints are considered where Node exposes them. Physical CPU cores are left unknown where not available.

Run it on your laptop to measure your laptop environment. Running in WSL reports the Linux VM; running in a cloud terminal reports that cloud environment. A hosted web server's free RAM is not extra RAM for a visitor's browser.

For native Windows host detail without a model download:

```powershell
.\scripts\get-device-capacity.ps1
```

No report is uploaded. Neither reader collects username, hostname, serial number or a process list. Owners can choose whether to share the output.

## Optional Qwen limits

The Windows Qwen launcher reads capacity before and after downloads. Default limits:

| Limit | Default |
| --- | --- |
| Available RAM needed to start | 1,536 MiB |
| Observed model process budget | 1,024 MiB |
| System available-memory reserve | 512 MiB |
| CPU threads | 2 |
| Context | 1,024 tokens |
| Maximum output | 160 tokens |
| Runtime deadline | 120 seconds |
| Concurrent launches | One per checkout |

The observed Linux peak was about 573 MiB; the larger start check leaves room for platform differences and other programs. The watchdog polls and stops only the model it launched when limits are crossed. It cannot guarantee that an instantaneous peak will never occur or reserve memory against other applications.

If a local start is blocked, the script retains no generated note files and reports that cloud mode is an alternative. It does **not** silently upload notes or claim a cloud result. The application still needs Firebase setup and an explicit allowed processing mode.

Cross-platform Node reader: exercised in Linux. Windows CIM reader, Windows model runtime and watchdog: source reviewed but not run on the owner's laptop yet.

## References

- [Browser device-memory estimate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)
- [Browser logical processors](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)
- [Firebase inference modes](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options)
- [Microsoft OS memory properties](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-operatingsystem)
- [Node OS metrics](https://nodejs.org/api/os.html)
