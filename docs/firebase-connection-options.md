# Firebase connection and automation options

Checked against official documentation: 21 November 2026 (WIB).

The official Firebase plugin is available in the user's plugin catalog but is not installed/connected in this session. Its availability was discovered; no Firebase project, account connection, permissions or live configuration was created by this release.

Firebase's official MCP server supports AI clients performing authorized project/app, backend and deployment tasks. Once connected, use its exposed capabilities for supported operations and verify results; do not assume every console task is automatable or that a plugin connection supplies billing/IAM authorization. Owner sign-in, project selection and any required authorization still belong to the owner. Use console/CLI only for capabilities the connector cannot complete. Do not place administrative credentials in the browser application or repository.

In this application, the planned integration is Firebase AI Logic for explicit image requests plus App Check. QA records, studies and inspection plans currently remain browser-local. This integration is not a requirement for numeric model fitting or step 5's rule-based inspection workflow.

Firebase and Supabase have overlapping backend capabilities. Firebase now also offers PostgreSQL through SQL Connect (formerly Data Connect); the claim that Firebase has no PostgreSQL option is no longer accurate. This does not make SQL Connect interchangeable with Supabase's API, nor require a database migration for the present prototype. No overall adoption comparison is established here.

Next integration checks are the registered Web app/public configuration, supported image-capable model, production App Check/domain setup, real image response, actual inference-source label and routing/error behavior. Saving the application's settings alone does not establish a working connection. The official plugin/MCP should reduce manual setup where its connected tools support the required operation.

References:

- Official Firebase MCP: https://firebase.google.com/docs/ai-assistance/mcp-server
- Firebase SQL Connect: https://firebase.google.com/products/sql-connect
- Estimator alternatives for a later ML experiment: https://scikit-learn.org/stable/modules/ensemble.html
- Leakage and train-only preprocessing: https://scikit-learn.org/stable/common_pitfalls.html#data-leakage
