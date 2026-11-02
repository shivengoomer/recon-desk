Write `backend/scripts/seed.py` (seeded RNG, deterministic) generating realistic Indian D2C home-brand data (candles, cushions, wall art, bedsheets):
- 300 orders over 60 days, prepaid (UPI/card) and COD, 3 channels.
- Gateway settlement CSV: fee ~2% + GST, 2-3 day lag, batched payouts.
- COD remittance CSV: delays, short remittances.
- Returns CSV: ~12% return rate, partial returns, refunds.
- Inject KNOWN problems, recorded in `backend/seed_data/ground_truth.json`: duplicate refunds, underpaid COD, missing payments, reference typos/format differences ("ord-1042" vs "ORD1042"), rounding differences, split payments, refund without return.
- Fake names and masked phones only. Create 2 demo users (analyst, finance_admin), passwords from env.
- `--import` flag loads everything through the same service layer the upload endpoint uses.
Commit: feat: seed data with ground truth.
