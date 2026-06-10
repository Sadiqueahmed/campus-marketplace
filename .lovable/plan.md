
## Goal
Make CampusScribe accept real payments via Razorpay (UPI, cards, netbanking, wallets). Buyer pays in-app → 95% auto-routes to seller's Razorpay-linked account, 5% stays with the platform.

## Provider & model
- **Razorpay Standard Checkout** for the buyer payment UI (UPI/cards/netbanking/wallets, INR).
- **Razorpay Route** for the auto-split. Each seller becomes a Razorpay "Linked Account" (sub-merchant) under your platform account. At order time we create an Order with `transfers[]` — Razorpay credits the seller's linked account directly and keeps your 5% on the platform account.

## What the user must provide
1. A Razorpay account (razorpay.com → sign up, complete platform KYC).
2. **Razorpay Route** activated on that account (request from Razorpay dashboard → Route; usually approved within a day for marketplaces).
3. Two API secrets, added via the secrets tool:
   - `RAZORPAY_KEY_ID` (publishable, used in checkout)
   - `RAZORPAY_KEY_SECRET` (server-only, signs orders + verifies webhooks)
   - `RAZORPAY_WEBHOOK_SECRET` (set when creating the webhook in Razorpay dashboard)

I'll request these via the secrets tool at the start of the build step.

## Build steps

### 1. DB migration
- Add to `profiles`: `razorpay_account_id text` (sub-merchant id), `kyc_status text default 'NONE'` (NONE / PENDING / ACTIVATED), `payout_email text`, `payout_phone text`.
- Add to `orders`: `razorpay_order_id text`, `razorpay_payment_id text`, `razorpay_transfer_id text`, `payment_status text default 'CREATED'` (CREATED / PAID / FAILED / REFUNDED). Keep existing `status` for fulfillment state.
- Index `orders(razorpay_order_id)` for webhook lookup.

### 2. Seller onboarding (`/dashboard` → "Set up payouts" card)
- Form: legal name, email, phone, business type (individual/proprietorship), PAN, bank account + IFSC.
- Server fn `createLinkedAccount` → calls Razorpay `/v2/accounts` + `/v2/accounts/{id}/stakeholders` + `/v2/accounts/{id}/products` (route product, settlements bank account). Saves returned `acc_xxx` to `profiles.razorpay_account_id`, status `ACTIVATED` (or `PENDING` if Razorpay holds it for review).
- **Listings cannot be created until `razorpay_account_id` is set** — `createListing` server fn rejects with a friendly error, sell page shows the onboarding card instead of the form.

### 3. Checkout flow (buyer side, `/listing/$id` "Buy now")
- Replace the current `createOrder` (which just inserts a row) with:
  - `createRazorpayOrder({ listingId })` server fn: loads listing + seller, computes fee, calls Razorpay `/v1/orders` with `transfers: [{ account: seller.razorpay_account_id, amount: earnings*100, currency: "INR", notes: {...} }]`. Inserts `orders` row with `razorpay_order_id`, `payment_status='CREATED'`. Returns `{ orderId, razorpayOrderId, keyId, amount, buyerName, buyerEmail }`.
- Client loads `https://checkout.razorpay.com/v1/checkout.js` (lazy `<script>` injection), opens checkout with the returned params, prefills buyer email/name.
- On `handler` success: client calls `verifyRazorpayPayment({ orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature })` server fn → HMAC-SHA256 verify with `RAZORPAY_KEY_SECRET`, mark order `PAID`, mark physical listing `SOLD`, return to dashboard with success toast.
- On dismiss / failure: keep order row, set `payment_status='FAILED'`.

### 4. Webhook (defense in depth)
- `src/routes/api/public/razorpay-webhook.ts` (TanStack server route). Verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured`, `payment.failed`, `refund.processed`, `transfer.processed`. Idempotent updates on `orders` by `razorpay_order_id`.
- User configures the webhook URL in Razorpay dashboard pointing at `https://project--e6caa301-c634-4768-8027-74fd51f49110.lovable.app/api/public/razorpay-webhook` (I'll print the exact URL after the route exists).

### 5. UI polish
- Listing page Buy button: shows spinner during order create, opens Razorpay modal, shows toast on result.
- Dashboard:
  - Purchases tab: shows `payment_status` badge, "Download" link for digital notes once `PAID`.
  - Sales tab: shows seller earnings + payout state (Razorpay settles to seller's bank per their settlement schedule).
  - "Payouts" card showing KYC status; blocks listing creation if not activated.
- Listing detail still shows direct Call / WhatsApp for off-platform deals (unchanged), with a small "Pay in-app for buyer protection" hint above them.

## Technical notes
- All Razorpay API calls live in `src/lib/razorpay.server.ts` (server-only filename → never reaches client bundle); server fns in `src/lib/payments.functions.ts` import inside `.handler()` via `await import(...)`.
- Use Razorpay's REST API directly with `fetch` (Basic auth: `key_id:key_secret`). No SDK needed → keeps Worker runtime happy.
- Amounts handled in paise (integer) end-to-end; convert at UI edges only.
- Test mode: any `rzp_test_...` key works end-to-end with Razorpay's test UPI ID `success@razorpay`. Switch to `rzp_live_...` once KYC is live.

## Out of scope for this iteration
- Refund UI (will use webhook to flip status, but no buyer-initiated refund button yet — Razorpay dashboard handles it).
- Email receipts (deferred to email-domain setup).
- International cards (Razorpay supports it but needs separate activation; INR-only for now).
