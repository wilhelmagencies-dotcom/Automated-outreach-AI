# PPM ad status and Peter Menzel onboarding, 18.10.2026 10:20 CEST

Written by the cloud chat from the live app (Railway logs of `web`, `/feed/ad-status.json`,
`/feed/billing.json`) and Gmail. It can't see the local `ppm-system` files. Paste into the local
"Ad & lead system" chat next to ad_lead_rules_2026_10_04.md.

## 1. PPM: the new ads

A new PPM batch started building today at 10:15 CEST (last NO-CAT batch went live 07.10, cadence is
5 days, so it was due).

What the build is doing:
- 30 ads planned: 15 proven + 15 experimental. English only (English: 99 leads, 8 booked.
  Spanish and German: 0 booked).
- Proven half locked to Bendinat, Llucmajor, Son Vida (where the bookings came from).
- All price-free, as Carl asked for NO-CAT.
- Steered toward buyers ready now (urgency and timeline angles first).
- 2 lines Meta keeps rejecting are dropped ("off market finest homes never reach",
  "finest homes never appear portal").
- 2 proven ads borrowed from RL Real Estate Ibiza for the experimental half.

Problems to fix:
1. The new experimental generator made nothing. Log: "invented experimental ads: None kept of None",
   "designer set: 0 of 15", "experimental ideas: 0 generated". The experimental half falls back to the
   older generator, which is the "ads all look the same" problem again. The insight engine is not
   running in the real build.
2. Price floor raised from EUR 1M to EUR 5M this morning; it now only pictures homes from EUR 5.35M to
   10M (37 cheaper homes left out). But 6 of PPM's 9 target leads came from the 3.5 to 5M band, and
   Carl's target is 3 to 10M. This cuts out where most good leads came from. Carl decides.
3. Nothing goes live before Carl's ok (rule from 04.10). Check the batch lands in pending, not live.

Results so far (whole account):
- Spend CHF 569, 150 leads, 9 target leads (EUR 3.5M+), 6%. CHF 63 per target lead.
- The app says "switch recommended": only 11 of 150 became real qualified buyers.
- 4 ads delivering now (proven A and C at EUR 4,995,000, two insight experimental ads), 10 leads, 1 booked.
- Best ever: PPM NO-CAT Bendinat V-3850 (14 leads, 5 booked), igubkh strategy 3 (3 booked).
- Next invoice WA-PPM-005, EUR 3,500, due 24.10.

## 2. Peter Menzel (PM Real Estate): onboarding

State: `pm_real_estate` exists in the app (app made 15.10, trial EUR 2,900 invoiced 13.10), but he is
NOT onboarded in the Hub. So: 0 ads, no WhatsApp number, nothing paid started. The plan said ads live
Thu 15.10, so he is 3 days late.

Onboard him in the Hub (Add a Client, prefilled):
https://wilhelm-hub.netlify.app/#addclient&name=PM%20Real%20Estate&website=https%3A%2F%2Fwww.pm-realestate.com&contact=Peter%20Menzel

What to fill in:

| Field | Value | Source |
|---|---|---|
| Contact | Peter Menzel, peter@pm-realestate.com | his emails |
| Monthly fee | EUR 2,900 (trial invoiced 13.10) | billing feed |
| Buyer band | EUR 1M to 5M, most around 2M | meeting |
| Facebook page id | The new "PM Real Estate" page Giuditta Malavasi made on 14.10. Copy the id from the page | meeting notes 14.10 |
| Listings | Secret Marketing: pm-realestate.com id 3847. Own: id 4295. Partner: Port d'Andratx expose on falc.landingpage.immobilien (link in his email of 14.10). Plus the homes on the concept board: Calatrava palace, Establiments finca, Paseo Maritimo penthouse | his email 14.10, concept board |
| Who takes meetings | Peter | blueprint |
| Bookings | By email, never same day | blueprint |
| CRM | onOffice | blueprint |
| Ad budget | MISSING, Carl | |
| His WhatsApp number | MISSING, Carl | |
| Ad countries | MISSING. PPM data: most leads from DE, CH, AT | ad-status feed |
| Buyer languages | MISSING. PPM data says English (all 8 PPM bookings) | build log |

Fix after onboarding: the app note for pm_real_estate says "objective = EUR 3.5M+ buyers". Peter's band
is EUR 1M to 5M. Make sure the onboarding sets his band, or his ads will chase the wrong buyers.

## 3. How Peter's first ads should be made (adapted to PPM's new batch)

Rule from 04.10 (new client by budget range): normal ads copy the normal ads working right now for
clients with the same budget; experimental ads use knowledge pooled from all of them.

Adapt:
1. Do NOT copy PPM's new batch. It now targets EUR 5M to 10M, and Peter targets 1M to 5M.
   Use the PPM ads that worked in the 1M to 5M range (proven A/C/G/H/L/N at EUR 2.2M to 5M,
   NO-CAT Bendinat V-3850) plus Direct Estates (EUR 1M to 1.65M, 4 booked). Several clients
   share this budget, so mix them.
2. Peter and PPM are both on Mallorca and reach the same buyers. Tailor each ad to Peter's own homes
   and brand (concept board: shutter green, sandstone, brass, no prices). No near-copies of PPM ads
   in the same feed.
3. Start Peter's build after the PPM batch finishes, so it reads PPM's latest results and the two
   builds don't run at once.
4. Fix the empty experimental generator (section 1, problem 1) first, or Peter's experimental half
   will also fall back to the old look.
5. Peter's first batch goes to Carl for review. Nothing live before his ok.

## 4. Also seen

The app access token is sent in the URL (`?token=...`), so Railway writes it into the logs in plain
text. Move it to a header and change the token.

## To-dos

Carl:
- [ ] Decide the PPM price floor: keep EUR 5M or go back to 3M (3.5 to 5M brought 6 of 9 target leads)
- [ ] Review the new PPM batch in the app before it goes live
- [ ] Onboard Peter in the Hub with the table above; fill ad budget, WhatsApp number, countries, languages

Local chat:
- [ ] Find why the experimental generator returns None and fix it before the next build
- [ ] Check the PPM batch is waiting for Carl's ok, not live
- [ ] After Peter's onboarding: set his band to EUR 1M to 5M, then build his first batch as in section 3
- [ ] Move the app token out of the URL and change it
