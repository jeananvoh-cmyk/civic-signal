# Frontend/mobile hardening

## Scope

This change set addresses the security counter-audit findings for the Web and Flutter clients:

- keep Resend credentials server-side;
- avoid persisting precise GPS data in Web localStorage;
- protect offline report data with secure storage on mobile;
- upload offline photos under the authenticated user's Storage prefix;
- keep private Storage paths instead of public URLs.

## Verification requirements

1. `resend_api_key` must not be accepted or sent by browser code.
2. Admin relay email must execute through an authenticated server-side Edge Function.
3. `signa_last_gps_v2` must not contain precise coordinates.
4. Offline mobile reports must use encrypted/secure local storage.
5. Offline photos must use `report-photos/<auth.uid>/...` paths.
6. Private photo paths must not be converted to public URLs.
7. Web and Flutter builds/tests must pass before merge.

The implementation patch is maintained in the audit workspace and must be applied to the current `main` snapshot before this finding is considered closed.
