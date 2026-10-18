# PPM ads and Peter's first ads, 18.10.2026 (corrected 10:45 CEST)

Written by the cloud chat from the live app (Railway logs of `web`, `/feed/ad-status.json`) and the
app's emails. It can't see or change the local `ppm-system` code. Paste into the local
"Ad & lead system" chat next to ad_lead_rules_2026_10_04.md.

Carl's settings: floor EUR 1M, goal EUR 3M. Peter is onboarded in the Hub. Follow these as written.

## 1. Bug: the app moves the floor up to the goal

PPM build log, today 10:15 CEST:

    price floor: EUR 1,000,000 (unchanged)
    price floor RAISED toward the target: EUR 1,000,000 -> EUR 5,000,000 (target EUR 5,000,000)
    price target: advertising from EUR 5,350,000 to EUR 10,000,000 ... 37 cheaper properties excluded

So the app reads Carl's floor correctly, then overrides it. It also uses EUR 5M as the target, not
Carl's EUR 3M. Fix: the floor stays at what Carl wrote. The goal is what the ads aim at. It is never
used as a new floor. Remove or switch off the "raised toward the target" step.

Peter has the same problem. App email 18.10 03:39 CEST: "ad update cannot finish: not enough homes
in the target range. Only two homes in the property pool are in the target range." With the floor at
EUR 1M, his own homes and his partners' homes from EUR 1M up all count, and the build has enough homes.

## 2. PPM: where the new ads are

- The 30 ads built 14.10 are still waiting for Carl's OK1 (app email 17.10: "waited 3+ days").
- Today's rebuild made 10 of 30 (all proven, 0 experimental: "only 0 of 15 experimental ads could be
  made unique"). It was held, and the app put back the 14.10 preview.
- The experimental generator returns nothing ("invented experimental ads: None kept of None").
  Fix this, or every batch stops at 10 of 30.

## 3. Peter (PM Real Estate): why his ads haven't started

The automatic build did start after onboarding:
- 18.10 00:46 CEST: batch held, 10 of 30 ready (10 proven, 0 experimental).
- 18.10 02:51 CEST: the app asked "Build PM Real Estate's ads?" (Yes / Not yet). Still unanswered.
- 18.10 03:39 CEST: held, only 2 homes in the target range, so the designer made 2 experimental ads.
  FALC-MP-51320 (EUR 2,995,000) has no town in its data. The Port d'Andratx home (FALC-AnRe-92070)
  can carry at most 8 ads.

Fix, in this order:
1. Floor EUR 1M as Carl set it (section 1). That opens up the rest of his pool.
2. Fix the experimental generator (section 2), the same one that blocks PPM.
3. Add the town for FALC-MP-51320, taken from the listing, never guessed.
4. Rebuild. Ads are created paused: OK1 and OK2 from Carl as usual.

Source of his ads: the app found no client with his budget and uses PPM as the closest (alert
17.10). Under the 04.10 rule this is right. Use PPM ads that worked from EUR 1M up, not the new
EUR 5M+ ones. Both clients are on Mallorca, so tailor each ad to Peter's own homes, with no near-copies.

## 4. Also seen

The app access token goes in the URL (`?token=...`), so Railway writes it into the logs in plain
text. Move it to a header and change the token.

## To-dos

Carl:
- [ ] Give OK1 (or reject) the 30 PPM ads from 14.10
- [ ] Tell the ad chat: floor EUR 1M, goal EUR 3M, never raise the floor (paste section 1)
- [ ] Tick the 4 ad changes from Peter's 13.10 update call, if you want them in his first batch

Local ad chat:
- [ ] Remove the "floor raised toward the target" step and use Carl's goal of EUR 3M
- [ ] Fix the experimental generator that returns None
- [ ] Fill the town for FALC-MP-51320, then rebuild Peter's batch
- [ ] Move the app token out of the URL and change it
