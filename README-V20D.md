# Ventic Pro V20D — GA4 Dedup Hotfix

Fixes duplicate analytics events when Google Tag Manager is configured.

Before:
- dataLayer event: ventic_order_intent
- direct gtag event: order_intent

This could cause two analytics events for one customer action.

After:
- With NEXT_PUBLIC_GTM_ID configured, only the Ventic dataLayer event is emitted externally.
- GTM/GA4 handles the event.
- Direct gtag remains only as a fallback when GTM is not configured.
- Internal first-party conversion tracking remains unchanged.

No migration.
No new env variables.

Commit:
V20D - prevent duplicate GA4 conversion events
