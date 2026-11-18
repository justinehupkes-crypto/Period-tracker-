# Cycle Notes

A private menstrual and symptom tracker. It's built for coming off long-term hormonal contraception and working out which changes are hormonal and which might need a doctor.

## What it does
- **Log**: record bleeding (spotting to very heavy), 27 built-in symptoms with severity, stress, mood, sleep, pregnancy tests and notes. You can add your own symptoms in your own words.
- **Calendar**: periods, cycle lengths, predicted next period and estimated ovulation window. The estimates are not contraception.
- **Patterns**: matches each symptom against the cycle phase you were in. Symptoms that keep landing in one phase are flagged *likely cyclic*. Symptoms spread across your cycle, or linked to your stress ratings, are flagged differently.
- **Symptoms & research**: plain-language notes on each symptom (how it can relate to the cycle or coming off contraception, how stress plays in, when to see a GP, when to get urgent care). It also does a live paper search on Europe PMC and links to PubMed, Scholar, Cochrane and community discussions.
- **Safety flags**: very heavy bleeding, red-flag symptoms, periods over 8 days, no period for 90+ days, cycles outside 21–35 days, repeated spotting, late periods (with a pregnancy-test prompt).
- **Doctor summary**: a printable page to take to a GP.

## Privacy
All data stays in your browser's localStorage on your device. Only research search terms are sent to Europe PMC. Use **Me & report → Export backup** regularly.

## Running it
No build step. Open `index.html` in a browser, or enable GitHub Pages for this repo (Settings → Pages → deploy from branch) to use it on your phone.

*Not a medical device. It can't diagnose anything.*
