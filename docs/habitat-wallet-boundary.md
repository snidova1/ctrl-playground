# SEC-01: Wallet-gated durable Habitat worlds

This change closes the independently reproduced guest-to-world bypass from
`docs/security-adversarial-report.md` (security PR #4).

## Boundary

- Personal Habitat worlds and all `/api/habitat/*` routes require an **existing
  server-verified `ctrl_session` for a non-demo wallet identity**. A
  `ctrl_plaza` guest cookie never establishes that identity.
- Invalid wallet sessions cannot fall back to a valid plaza guest cookie.
- A demo user session is not a wallet login.
- This patch changes no onchain keys, fees, live token balance, or network state.
  Durable Habitat creation remains offchain and does not mint a world key.
- `/api/plaza/*` and Common Ground keep their guest access rules.

## Browser flow

The guest workshop button creates its existing `ctrl_plaza` session, then opens
`/courtyard`, the established shared Common Ground. It does **not** start the
wallet-only personal-world onboarding flow. Users with a verified wallet can
continue to create one durable private home through `POST /api/habitat/profile`.

## Regression

`tests/unit/habitat-wallet-boundary.test.ts` exercises:

1. A legitimate anonymous plaza cookie can still use plaza state.
2. That cookie cannot create a durable Habitat profile/world.
3. Missing/forged wallet cookies, combined forged-wallet + valid-plaza cookies,
   and demo sessions cannot bypass Habitat.
4. Guest attempts to save, change world settings, interact or visit through
   Habitat are denied.
5. A server-issued non-demo wallet session still creates exactly one home and
   can save its objects with optimistic revision control.

This is a focused remediation of SEC-01. The separate low-priority SEC-02
80KB request-size preflight remains a distinct hardening task.

### Integration

Base: `work/integration`. Do not merge by force or deploy automatically.
The security worker's previously expected-failure SEC-01 assertion should be
converted to a normal positive regression **after** this fix lands in its
test baseline. The existing guest-page copy has been updated so the browser
does not pretend anonymous users can own a durable world.
