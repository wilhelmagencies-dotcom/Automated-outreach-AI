# START HERE: Carl's overview

**You only talk to one chat: "⭐ GENERAL".** Tell it anything. It starts helper chats for each
job by itself, and it tells you what got done and what you need to do. You never need to open
another chat.

Last updated: 19.10.2026, 13:20

---

## Your to-do list (most important first)

0. **Type Peter's onOffice login into the app** (Peter / PM Real Estate → onOffice card):
   customer `PeterMenzelRealEstate`, user `Gregory`, and the password from his WhatsApp.
   The app stores it encrypted. The General chat will tell you the exact place to click.
1. **Approve the 30 PPM ads in the app** (OK1, then OK2). They have been waiting since 14.10.
2. **Peter's first ads:** when the app emails you about his batch, give OK1 and OK2.
   Peter wants to start **tomorrow, Tue 20.10**. A helper chat is connecting his onOffice
   (email, leads, listings) right now; it will tell you what to approve.
3. **Lead data is open to the public.** Quick fix now: turn on password protection for the HQ
   app on Netlify. Real fix: the General chat needs the live backend code, or access to the
   Railway project that runs it (see subject 3).
4. **Put Peter's first review in your calendar: Mon 26.10, afternoon** (his date).
5. After his system is live, ask Peter to change the onOffice password he sent on WhatsApp.
6. **Decide Peter's closings goal** (how many sales), so it can go on his system page.
7. **Get your mum's answers** to the 38 open questions (including permission to use the
   "before" photos). Then her system can be built.
8. Keep Anthropic credit topped up with auto-reload on. Without credit the ads and Sofia's
   replies stop (this happened on 18.10).

---

## Subjects

| # | Subject | Status | Folder |
|---|---|---|---|
| 1 | **Ads and leads system** (PPM and Peter) | Running. Ads waiting for your OK. Two bugs found on 18.10 (price floor, experimental ads); fix status is unclear. | `subjects/1-ads-ppm-and-peter/` |
| 2 | **Peter Menzel (PM Real Estate), new client** | Onboarded. Starts Tue 20.10. onOffice login received 19.10, being connected now. First review Mon 26.10 afternoon. Closings goal still open. | `subjects/2-peter-menzel-client/` |
| 3 | **Backend security (lead data is public)** | Fix is built and tested, but **not live**. Blocked: the live code is not on GitHub. | `subjects/3-backend-security/` |
| 4 | **Mum: Nordic Designs** | Sales decks done. Waiting for her answers. | `subjects/4-mum-nordic-designs/` |

### Links

- PPM and Peter ad rules: `subjects/1-ads-ppm-and-peter/ad_lead_rules_2026_10_04.md`
- Bugs and Peter's ad status (18.10): `subjects/1-ads-ppm-and-peter/ppm_status_and_peter_onboarding_2026_10_18.md`
- Peter's system page: https://claude.ai/artifact/EJDSDtT5QVnZhKc4jCi7fW
- Peter's ad concept board: https://claude.ai/artifact/MhTtS9RkBr9Up3hUh4Qrb4
- Notes from the first meeting with Peter: https://docs.google.com/document/d/1EPPsr1r6BP0dZ4PLrrarat4m7mukWpDf_JgkvBNkze0/edit
- Mum: meeting 1 deck: https://claude.ai/artifact/D2ft49oU7CJfUQf3i1Egso
- Mum: meeting 2 deck: https://claude.ai/artifact/PKqSk47iQhpojPQdofJJGT

---

## Workers running now (helper chats; you don't need to open them)

| Subject | Chat | Where it runs | Since |
|---|---|---|---|
| 1 Ads and leads system | "↳ Ads system (laptop worker)" | **Your laptop** (needs it switched on) | 07.10 |
| 2 Peter Menzel | "↳ Peter: connect onOffice email and leads" | Cloud | 19.10 |

## Automatic jobs (scheduled tasks)

| Job | How often | What it does |
|---|---|---|
| Experimental ad designer | Every hour, at :29 | Designs new experimental ads for all clients in the cloud. Never sends anything and never changes Meta or budgets. |

---

## Subjects and repos (for the General chat)

| Subject | Repo |
|---|---|
| 1 Ads and leads system | `wilhelmagencies-dotcom/ppm-system` (code is also on the laptop) |
| 2 Peter Menzel | `wilhelmagencies-dotcom/Automated-outreach-AI` |
| 3 Backend security | `wilhelmagencies-dotcom/Automated-outreach-AI` (+ the live backend code once found) |
| 4 Mum: Nordic Designs | `wilhelmagencies-dotcom/Automated-outreach-AI` |

How the General chat works is written down in `CLAUDE.md`.
