# Shared sign-in frontend

Set `NEXT_PUBLIC_ECOSYSTEM_SSO_ENABLED=true` only after the updated Social9 backend and vCueHub provider have been deployed and configured. Keep the existing `NEXT_PUBLIC_API_URL` pointing directly to the verified backend; no `/service` prefix is introduced.

The login page offers **Continue with VisionaryCue**. New registration uses that same shared account flow when enabled. Existing Social9 password login remains available.

`/auth/ecosystem/start` creates a browser verifier in session storage. `/auth/ecosystem/callback` exchanges the one-time handoff and stores the normal Social9 session. Existing accounts are shown an ownership form before linking; shared email matches alone never merge their content or subscriptions.

Tokens and passwords are not included in redirect URLs. The callback removes its one-time code from the address bar before exchanging it. Enabling shared sign-in requires a frontend rebuild.
