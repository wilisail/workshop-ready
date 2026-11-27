# Optional Firebase connection: retained, inactive and unverified

Reviewed: 27 November 2026 (WIB).

**The current delivery keeps Firebase as an optional connector point. It does not include Firebase setup or a live Firebase demonstration.** The Vercel/browser bead counter, local records, numeric ML, public-health QA and inspection workflow run independently of this connector. The [current workplan](remaining-steps-and-goals.md) supersedes the historical mandatory-Firebase plan.

## What the connector means here

| Part | Current state | Activation boundary |
| --- | --- | --- |
| Image adapter | Retained in `src/lib/image-ai.ts`, using Firebase AI Logic and App Check | An operator must select the Firebase image method and request a count. |
| Public configuration form | Retained in Data & settings; saved on that browser | Saving does not switch the counting method, initialize Firebase or verify a connection. |
| Public build variables | Template retained in `.env.example` | Configuration alone does not select the Firebase engine. |
| Small bead counter | Default for a fresh browser, with Vercel preferred and browser fallback | Its code path calls the same-origin counter or local worker; it never falls back to Firebase. |
| Chrome managed-model route | Adapter readiness checks retained; no readiness claimed | Separate from the small CV worker. No model download or preparation occurs just by opening the app or saving settings. |
| Older text-note adapter | Retained in `src/lib/ai.ts`; not wired into the current dashboard | No current dashboard action invokes it. |
| Shared database / record sync | Not connected | Keeping Firebase adapter code does not connect Firebase storage, Firestore or Supabase. |

The settings tag distinguishes **Inactive · not configured**, **Inactive · configuration saved**, and **Selected · unverified**. Selecting an engine is a preference, not a connection test. Any later count must retain its actual source and still requires human review. Previously saved browser preferences are preserved; this release does not reset them.

The app may cache its own JavaScript bundles for offline use, including optional adapter code. Downloading same-origin application assets does not initialize Firebase, request an App Check token, call a model or demonstrate provider integration.

## Future activation, only if the scope changes

1. Choose an authorized Firebase project/Web app and an enabled image-capable model. Recheck the current official documentation and project-specific limits; a sample model ID is not evidence of availability.
2. Configure production App Check and the deployed domain. Keep administrative credentials and debug tokens out of the public app, repository and form.
3. Save public configuration and deliberately select the Firebase image method. Request a count on suitable non-sensitive test material, then verify the real response, App Check behaviour, errors and actual inference-source label.
4. Test any managed on-device route separately on compatible hardware; a successful hosted result or local CV count does not establish managed-model support.

These are future verification requirements, not tasks scheduled in step 6D. No console changes, Firebase project creation, billing activation, plugin connection, model call or managed-model download is performed for this step. The public demo and connector code do not establish Firebase contest eligibility.

Current official references, consulted for the deferred setup boundary:

- [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started)
- [Firebase AI Logic and App Check](https://firebase.google.com/docs/ai-logic/app-check)

See [step 6D review evidence](wolbachia-step-6d.md) for the source audit and controlled no-provider-request check.
