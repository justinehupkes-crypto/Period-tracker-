// Built-in symptom knowledge base.
// Plain-language summaries written for someone coming off long-term hormonal
// contraception (combined pill, then the etonogestrel implant). This is general
// information to help you ask good questions — it is not a diagnosis.
//
// Fields:
//   id, name, category
//   about     – what the symptom is
//   hormonal  – how it can relate to the cycle / stopping hormonal contraception
//   stress    – how stress, sleep and workload can play in
//   gp        – reasons to book a routine GP / doctor appointment
//   urgent    – reasons to get same-day / emergency care
//   query     – research search terms (Europe PMC syntax)
//   redFlag   – logging this symptom at all should prompt prompt medical review

window.KB = [
  {
    id: "cramps", name: "Period cramps", category: "Pain",
    about: "Cramping lower-belly pain around your period, caused by prostaglandins making the uterus contract.",
    hormonal: "The pill and the implant both often reduce period pain, so cramps can feel new or worse once you're off them. It may be the first time in years you're feeling your natural cycle. Pain that stops you from working or gets worse over time can be a sign of endometriosis or adenomyosis. Hormonal contraception can hide these conditions for years.",
    stress: "Stress and poor sleep can make pain feel worse, but they don't usually cause severe cramps on their own.",
    gp: ["Pain that stops you from working, studying or sleeping", "Painkillers like ibuprofen don't help", "Pain is getting worse each cycle", "Pain with bowel movements, peeing or sex"],
    urgent: ["Sudden severe one-sided pain, especially if your period is late (possible ectopic pregnancy)", "Pain with fever, vomiting or fainting"],
    query: '(dysmenorrhea OR "menstrual pain") AND (endometriosis OR "oral contraceptive discontinuation" OR prostaglandin)'
  },
  {
    id: "pelvic_pain", name: "Severe pelvic pain", category: "Pain", redFlag: true,
    about: "Strong pain low in the belly or pelvis that's more than your usual period cramps.",
    hormonal: "It can be linked to ovulation, ovarian cysts or endometriosis, which may have been hidden by contraception.",
    stress: "Stress isn't a typical cause of severe pain. Don't put it down to stress without getting checked.",
    gp: ["Ongoing or recurring pelvic pain, even if it's mild"],
    urgent: ["Sudden or severe pain", "One-sided pain with a late period or a positive pregnancy test", "Pain with fever, vomiting, fainting or unusual discharge"],
    query: '"pelvic pain" AND (women OR "reproductive age") AND (ovarian cyst OR endometriosis OR ectopic)'
  },
  {
    id: "ovulation_pain", name: "Mid-cycle / ovulation pain", category: "Pain",
    about: "A one-sided twinge or ache about two weeks before your period (mittelschmerz). Sometimes there's light spotting with it.",
    hormonal: "Both the pill and the implant usually stop ovulation, so this can be completely new to you. It's usually a sign your ovaries are working again.",
    stress: "Stress can delay ovulation, so this pain can move around from cycle to cycle.",
    gp: ["It lasts more than a day or two", "It's severe or happens at other times in your cycle too"],
    urgent: ["Severe pain with a positive pregnancy test, fever or fainting"],
    query: 'mittelschmerz OR ("ovulation pain")'
  },
  {
    id: "heavy_bleeding", name: "Heavy bleeding", category: "Bleeding",
    about: "Periods that soak through pads or tampons every 1–2 hours, pass clots bigger than a 2 cm coin, or last more than 7 days.",
    hormonal: "The implant often makes bleeding light or rare, and pill bleeds are usually light. Your natural periods may be heavier than you remember. Heavy bleeding can also come from fibroids, polyps, adenomyosis, thyroid problems or bleeding disorders.",
    stress: "Stress mostly makes bleeding irregular rather than heavier.",
    gp: ["Heavy periods for more than 1–2 cycles", "Feeling tired, breathless or dizzy (possible low iron). Ask for a full blood count and ferritin test"],
    urgent: ["Soaking at least one pad or tampon per hour for several hours", "Feeling faint, a racing heart or chest pain"],
    query: '"heavy menstrual bleeding" AND (iron deficiency OR fibroids OR adenomyosis OR "bleeding disorder")'
  },
  {
    id: "spotting", name: "Spotting between periods", category: "Bleeding",
    about: "Light bleeding or brown discharge outside your period.",
    hormonal: "It's common in the first few months after stopping hormonal contraception. It can also happen around ovulation or just before a period, when progesterone is low.",
    stress: "Stress can upset your hormone timing and cause irregular spotting.",
    gp: ["Spotting that keeps happening after 3 months off contraception", "Any bleeding after sex", "If you're overdue for a cervical screening test"],
    urgent: ["Spotting with pain and a late period or positive pregnancy test"],
    query: '"intermenstrual bleeding" OR ("spotting" AND "menstrual cycle")'
  },
  {
    id: "postcoital_bleeding", name: "Bleeding after sex", category: "Bleeding", redFlag: true,
    about: "Bleeding during or after sex.",
    hormonal: "This isn't usually caused by hormone changes.",
    stress: "This isn't caused by stress.",
    gp: ["Always get it checked: cervical screening, an STI test and an exam. It's usually something minor like a cervical ectropion, but it should be checked."],
    urgent: ["Heavy bleeding or severe pain"],
    query: '"postcoital bleeding" AND (cause OR evaluation)'
  },
  {
    id: "irregular_cycle", name: "Irregular / late periods", category: "Bleeding",
    about: "Cycles shorter than 21 days, longer than 35 days, or varying by more than 7–9 days from one cycle to the next.",
    hormonal: "Cycles often take up to 3 months to settle after stopping the pill. Fertility usually returns within weeks after implant removal. Long or missing cycles can be a sign of PCOS, which the pill can hide. They can also come from thyroid problems, high prolactin or hypothalamic amenorrhoea.",
    stress: "This is a big factor. Ongoing stress, under-eating, heavy exercise and poor sleep can suppress the brain signals (GnRH) that trigger ovulation. That delays or skips periods.",
    gp: ["No period for 3 months (do a pregnancy test first)", "Cycles that stay shorter than 21 or longer than 35 days", "Irregular cycles with acne, extra hair growth or hair thinning"],
    urgent: ["A late period with severe pain, or heavy bleeding after a positive pregnancy test"],
    query: '("post-pill amenorrhea" OR "return of menses" OR "hypothalamic amenorrhea" OR "polycystic ovary syndrome") AND contraception'
  },
  {
    id: "acne", name: "Acne / skin breakouts", category: "Skin & hair",
    about: "Breakouts, often on the jaw, chin and back.",
    hormonal: "Many pills lower androgens and calm the skin, so acne can flare after stopping. This often peaks around 3–6 months, then settles. The etonogestrel implant can itself cause acne in some people, so things can go either way. Ongoing acne with irregular cycles is worth checking for PCOS.",
    stress: "Cortisol and poor sleep can make breakouts worse.",
    gp: ["Painful, cystic or scarring acne", "Acne with irregular periods or new hair growth"],
    urgent: [],
    query: '(acne) AND ("oral contraceptive" discontinuation OR androgen OR "polycystic ovary")'
  },
  {
    id: "hair_shedding", name: "Hair shedding / thinning", category: "Skin & hair",
    about: "More hair than usual in the shower or brush, or thinning at the part.",
    hormonal: "Shedding 2–4 months after a hormone change (telogen effluvium) is well described. It usually recovers within 6–12 months. Androgen-pattern thinning can show up once the pill's anti-androgen effect wears off.",
    stress: "Major stress is a classic trigger for telogen effluvium, about 2–3 months after the stressful period.",
    gp: ["Shedding for more than 6 months, or patchy bald spots", "Ask about iron (ferritin), thyroid and vitamin D tests"],
    urgent: [],
    query: '("telogen effluvium" OR "hair loss") AND ("oral contraceptive" OR "hormonal contraception" OR stress)'
  },
  {
    id: "hirsutism", name: "New hair growth (face/body)", category: "Skin & hair",
    about: "Coarse dark hair on the chin, upper lip, chest or belly.",
    hormonal: "A sign of higher androgen levels. It can show up after the pill stops suppressing them. It's a common feature of PCOS.",
    stress: "This isn't typically caused by stress.",
    gp: ["New coarse hair growth, especially with irregular periods or acne"],
    urgent: ["Rapid new hair growth with a deepening voice (rare, needs prompt review)"],
    query: 'hirsutism AND ("polycystic ovary syndrome" OR androgen)'
  },
  {
    id: "breast_tenderness", name: "Breast tenderness", category: "Body",
    about: "Sore, swollen or heavy breasts.",
    hormonal: "It's usually cyclic and peaks in the week before your period, when progesterone is high after ovulation. It often reappears once you start ovulating again.",
    stress: "This isn't strongly linked to stress.",
    gp: ["A new lump, skin dimpling, or nipple changes or discharge", "Pain in one specific spot that doesn't come and go with your cycle"],
    urgent: [],
    query: '(mastalgia OR "breast pain") AND (cyclical OR menstrual)'
  },
  {
    id: "bloating", name: "Bloating", category: "Digestion",
    about: "A full, swollen belly.",
    hormonal: "It's common before and during periods because of progesterone and prostaglandins.",
    stress: "Stress affects the gut-brain axis and can cause bloating at any point in your cycle.",
    gp: ["Persistent bloating on most days for 3+ weeks, especially with feeling full quickly or a change in bowel habit (always worth checking)"],
    urgent: [],
    query: '(bloating OR "gastrointestinal symptoms") AND "menstrual cycle"'
  },
  {
    id: "digestive", name: "Bowel changes (diarrhoea/constipation)", category: "Digestion",
    about: "Loose stools or constipation.",
    hormonal: "Prostaglandins can cause diarrhoea around your period. Progesterone can slow the gut beforehand. Painful bowel movements during periods can be a sign of endometriosis.",
    stress: "A very common stress response. It overlaps with IBS.",
    gp: ["Painful bowel movements around your period", "Blood in your stool or unexplained weight loss (always get these checked)"],
    urgent: [],
    query: '("gastrointestinal symptoms" AND menstruation) OR ("bowel endometriosis")'
  },
  {
    id: "headache", name: "Headaches / migraine", category: "Head & mood",
    about: "Headaches or migraines.",
    hormonal: "Falling oestrogen just before a period can trigger menstrual migraine. Some people's headaches improve off the pill. Others get new cycle-linked ones.",
    stress: "Stress, screen time, poor sleep and dehydration are common triggers.",
    gp: ["New or regular headaches, or migraines with aura"],
    urgent: ["Sudden 'worst ever' headache", "A headache with weakness, confusion, trouble speaking, vision loss, fever or a stiff neck"],
    query: '"menstrual migraine" AND (estrogen withdrawal OR contraception)'
  },
  {
    id: "mood", name: "Mood swings / irritability", category: "Head & mood",
    about: "Feeling more emotional, irritable or tearful.",
    hormonal: "Being sensitive to normal hormone swings can show up as PMS. More severe PMDD can appear once natural cycles return, often in the 1–2 weeks before a period, easing once bleeding starts.",
    stress: "PhD workload, deadlines and sleep loss can drive mood changes independently. Tracking which phase they fall in helps tell them apart.",
    gp: ["Mood symptoms that affect your work or relationships, especially if they follow your cycle (ask about PMDD)"],
    urgent: ["Thoughts of harming yourself. Contact a crisis line or emergency services now."],
    query: '("premenstrual dysphoric disorder" OR "premenstrual syndrome" OR mood) AND ("hormonal contraception" OR discontinuation)'
  },
  {
    id: "anxiety", name: "Anxiety", category: "Head & mood",
    about: "Feeling worried, on edge or panicky.",
    hormonal: "Anxiety can get worse in the late luteal (premenstrual) phase. Some people notice changes after starting or stopping hormonal contraception.",
    stress: "The strongest driver for most people is stress itself.",
    gp: ["Anxiety that's ongoing or affects your daily life. Campus counselling services can help too."],
    urgent: ["Chest pain, fainting, or thoughts of self-harm"],
    query: 'anxiety AND ("menstrual cycle" OR "luteal phase" OR "hormonal contraception")'
  },
  {
    id: "low_mood", name: "Low mood", category: "Head & mood",
    about: "Feeling flat, sad or unmotivated.",
    hormonal: "Low mood can be cyclic (PMS/PMDD) or unrelated to your cycle. Hormonal contraception affects mood differently from person to person.",
    stress: "Long-term stress and burnout are major causes.",
    gp: ["Low mood most days for two weeks or more"],
    urgent: ["Thoughts of suicide or self-harm. Contact a crisis line or emergency services now."],
    query: '(depression OR "depressive symptoms") AND ("hormonal contraception" OR "menstrual cycle")'
  },
  {
    id: "brain_fog", name: "Brain fog / poor concentration", category: "Head & mood",
    about: "Trouble focusing, remembering or thinking clearly.",
    hormonal: "Some people notice it before their period. Low iron from heavier periods can also cause it.",
    stress: "Very common with overwork, poor sleep and anxiety.",
    gp: ["It's ongoing. Ask about iron, B12 and thyroid tests."],
    urgent: ["Sudden confusion"],
    query: '("cognitive" OR concentration) AND ("menstrual cycle" OR "iron deficiency")'
  },
  {
    id: "fatigue", name: "Fatigue", category: "Body",
    about: "Ongoing tiredness that doesn't go away with rest.",
    hormonal: "It's common around your period. If your periods are heavier now, iron deficiency is a frequent hidden cause.",
    stress: "Stress and sleep debt are the usual culprits.",
    gp: ["Fatigue lasting more than a few weeks. Ask about iron (ferritin), thyroid, B12 and vitamin D tests."],
    urgent: ["Fatigue with breathlessness, chest pain or fainting"],
    query: '(fatigue) AND ("heavy menstrual bleeding" OR "iron deficiency without anaemia")'
  },
  {
    id: "insomnia", name: "Poor sleep", category: "Body",
    about: "Trouble falling or staying asleep.",
    hormonal: "Progesterone drops before your period, and body temperature rises in the luteal phase. Both can disturb sleep.",
    stress: "Stress and screen time late at night are major factors.",
    gp: ["Insomnia lasting more than a few weeks"],
    urgent: [],
    query: '(sleep OR insomnia) AND ("menstrual cycle" OR "luteal phase")'
  },
  {
    id: "hot_flushes", name: "Hot flushes / night sweats", category: "Body",
    about: "Sudden waves of heat or sweating, especially at night.",
    hormonal: "Hormone shifts can cause these, but in your 20s–30s they're less typical. Get them checked if they keep happening.",
    stress: "Anxiety can cause sweats too.",
    gp: ["Hot flushes or sweats that keep happening, especially with missed periods (ask about thyroid and FSH tests), or with weight loss or fever"],
    urgent: [],
    query: '("night sweats" OR "hot flashes") AND (premenopausal OR "young women")'
  },
  {
    id: "palpitations", name: "Heart palpitations", category: "Body",
    about: "Noticing your heart pounding, racing or skipping.",
    hormonal: "Palpitations can change across the cycle. They can also come from low iron or thyroid problems.",
    stress: "Caffeine, anxiety and lack of sleep are common triggers.",
    gp: ["Palpitations that keep happening. Ask for an ECG and blood tests."],
    urgent: ["Palpitations with chest pain, breathlessness or fainting"],
    query: 'palpitations AND ("menstrual cycle" OR "iron deficiency" OR thyroid)'
  },
  {
    id: "dizziness", name: "Dizziness / fainting", category: "Body", redFlag: true,
    about: "Feeling light-headed, faint or actually fainting.",
    hormonal: "Heavy bleeding can cause anaemia. Severe period pain can cause a faint feeling.",
    stress: "Skipping meals, dehydration and anxiety can all contribute.",
    gp: ["Any episode of fainting", "Regular light-headedness. Ask for an iron and full blood count test."],
    urgent: ["Fainting with heavy bleeding, chest pain or severe pelvic pain"],
    query: '(syncope OR dizziness) AND ("heavy menstrual bleeding" OR anaemia OR dysmenorrhea)'
  },
  {
    id: "discharge", name: "Change in discharge", category: "Body",
    about: "Changes in the amount, colour or texture of vaginal discharge.",
    hormonal: "Clear, stretchy 'egg-white' mucus around ovulation is normal and may be new to you. The pill and implant suppress it.",
    stress: "This isn't strongly linked to stress.",
    gp: ["Strong smell, itch, green or grey colour, or pain. Get checked for thrush, bacterial vaginosis (BV) or an STI."],
    urgent: ["Discharge with fever and pelvic pain"],
    query: '("cervical mucus" AND ovulation) OR ("vaginal discharge" AND evaluation)'
  },
  {
    id: "libido", name: "Libido change", category: "Body",
    about: "Higher or lower interest in sex.",
    hormonal: "Libido often rises around ovulation once natural cycles return. Some people find it improves after stopping hormonal contraception.",
    stress: "Stress and fatigue commonly lower libido.",
    gp: ["It's bothering you"],
    urgent: [],
    query: '(libido OR "sexual desire") AND ("hormonal contraception" OR "menstrual cycle")'
  },
  {
    id: "painful_sex", name: "Pain during sex", category: "Pain",
    about: "Pain during or after sex (dyspareunia), especially deep pain.",
    hormonal: "Deep pain during sex can be a sign of endometriosis. Low oestrogen can cause dryness.",
    stress: "Tension can contribute, but get the pain assessed first.",
    gp: ["Get it checked if it keeps happening"],
    urgent: [],
    query: 'dyspareunia AND (endometriosis OR "hormonal contraception")'
  },
  {
    id: "joint_pain", name: "Joint / muscle aches", category: "Body",
    about: "Aches in joints or muscles.",
    hormonal: "Some people notice aches change across the cycle. Prostaglandins can cause aches around periods.",
    stress: "Stress, posture (hours at a desk) and poor sleep all contribute.",
    gp: ["Joints that are swollen, hot or stiff in the morning, or aches that last"],
    urgent: [],
    query: '("joint pain" OR arthralgia) AND ("menstrual cycle" OR estrogen)'
  },
  {
    id: "weight_change", name: "Weight / appetite change", category: "Body",
    about: "Changes in appetite, cravings or weight.",
    hormonal: "Appetite often rises in the luteal phase. Unexplained weight gain with irregular cycles can be a sign of PCOS or thyroid problems.",
    stress: "Stress can increase or decrease appetite.",
    gp: ["Unexplained weight change of more than about 5%"],
    urgent: [],
    query: '(appetite OR "weight gain") AND ("menstrual cycle" OR "hormonal contraception discontinuation")'
  }
];

// Urgent red flags shown in the safety panel regardless of what you log.
window.RED_FLAGS = [
  "Soaking at least one pad or tampon per hour for several hours, or passing large clots",
  "Severe or sudden pelvic pain, especially one-sided, or with a late period or positive pregnancy test",
  "Fainting, a racing heart, breathlessness or chest pain",
  "Pain or swelling in one calf, or sudden shortness of breath",
  "Fever with pelvic pain or unusual discharge",
  "A sudden severe headache, or one with weakness, confusion or vision loss",
  "Thoughts of suicide or self-harm"
];
