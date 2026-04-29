export interface BlogPost {
  slug: string;
  title: string;
  htmlTitle: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  category: string;
  author: string;
  date: string;
  datePublished: string;
  readTime: string;
  ldJson: object;
  bottomCta: { heading: string; text: string };
  exitModal: { heading: string; text: string };
  inlineCtaHtml: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  // ── Post 0: breast-mri-saved-1200 ───────────────────────────────────
  {
    slug: "breast-mri-saved-1200",
    title: "How Elena Helped One User Save $1,200 on a Breast MRI",
    htmlTitle: "How Elena Helped One User Save $1,200 on a Breast MRI",
    description:
      "A real Elena story grounded in healthcare pricing evidence: one user needed a breast MRI, and Elena helped her compare the cash-pay and insurance paths before she booked.",
    ogTitle: "How Elena Helped One User Save $1,200 on a Breast MRI",
    ogDescription:
      "One user needed a breast MRI. Elena helped her find a cash-pay option and save $1,200.",
    category: "Customer Story",
    author: "Alex Reinhart",
    date: "April 2026",
    datePublished: "2026-04-29",
    readTime: "5 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How Elena Helped One User Save $1,200 on a Breast MRI",
      author: { "@type": "Person", name: "Alex Reinhart" },
      datePublished: "2026-04-29",
      publisher: { "@type": "Organization", name: "Elena Health" },
      description:
        "A customer story about using Elena to compare MRI pricing, understand cash-pay versus insurance pricing, and avoid overpaying for imaging.",
    },
    bottomCta: {
      heading: "Need imaging, but don’t know what it should cost?",
      text: "Elena helps you compare quoted prices, site of service, and cash-pay versus insurance options before you book the scan.",
    },
    exitModal: {
      heading: "Don’t book the first MRI you’re quoted.",
      text: "Elena helps you compare imaging options before you book, including when the cash price is better than the obvious insurance path.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">This is the kind of navigation problem Elena is built for.</p>
  <h3>Find the cheaper imaging option before you book.</h3>
  <p class="blog-cta-context">Tell Elena what scan you need, upload your insurance card if you have one, and she can help you compare the paths in front of you.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">A user came to Elena needing a breast MRI. She did not need help deciding whether the scan was medically necessary. She needed help with the part patients get stuck doing alone: figuring out where to go, what questions to ask, and whether the “insured” path was actually the cheapest one. Elena helped her compare the options in front of her and find a cash-pay route that saved about <strong>$1,200</strong>.</p>

<p>That is not a quirky one-off story. It is a very normal US healthcare pricing problem. A recent JAMA Network Open study looking at hospital prices for a common MRI found a median commercial negotiated price of <strong>$2,268</strong>, with an interquartile range from about <strong>$1,900 to $3,197</strong>. In other words: even within the same broad category of imaging, prices move a lot.<sup>1</sup></p>

<h2>The practical problem: imaging prices are wildly variable, and patients book in the dark</h2>

<p>When people hear “breast MRI,” they often assume the main question is clinical. Sometimes it is. But once the scan has been recommended, the next problem becomes operational: where should you get it, what will it cost there, what facility fee is buried in the quote, and is the insurance route actually helping?</p>

<p>That is where people lose hours. They are forced to compare hospital systems, outpatient imaging centers, insurer cost estimators, prior authorization rules, deductibles, and whatever cash-pay rates they can get by phone. CMS price transparency rules were supposed to make this easier by requiring hospitals to publish their standard charges, including discounted cash prices and payer-negotiated rates. But the burden of turning that information into a real decision still sits on the patient.<sup>2</sup></p>

<h2>What Elena actually did</h2>

<p>In this case, Elena helped with the tactical work most patients hate doing:</p>

<ul>
  <li>pinning down the exact scan and site-of-service question so she was comparing like with like</li>
  <li>separating the “doctor told me I need this” question from the “where should I get it done?” question</li>
  <li>surfacing a cash-pay option that would have been easy to miss if she defaulted to the first hospital path</li>
  <li>helping her weigh the real out-of-pocket tradeoff instead of assuming “in-network” automatically meant “cheaper”</li>
</ul>

<p>That last point matters. A 2023 Health Affairs analysis of hospital transparency data found that cash prices were lower than a hospital’s median commercial negotiated rate in <strong>47%</strong> of instances across shoppable services.<sup>3</sup> “Use your insurance” is not the same thing as “this is your cheapest option.”</p>

<blockquote>
  <p>What she needed was not more medical information. She needed a way to compare the actual financial paths before she booked.</p>
</blockquote>

<h2>Why that comparison can save real money</h2>

<p>Another recent imaging study using transparency-in-coverage data found substantial price variation across common imaging services, with facility fees varying much more than the professional component.<sup>4</sup> That is why two facilities can both be offering “an MRI” while producing very different bills.</p>

<p>So when Elena helped this user find a cheaper cash-pay option and save about <strong>$1,200</strong>, the lesson was not just “great, one person saved money.” The lesson was: this is exactly the kind of decision patients keep getting pushed into without enough support.</p>

<p>And it is avoidable. If you know the order, the CPT-level service you are roughly trying to price, the type of facility you are comparing, and whether your deductible or coinsurance makes insurance unattractive, you can often rule out bad options before you ever schedule.</p>

${`<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">This is where Elena is most useful: before you book the expensive default.</p>
  <h3>Bring Elena the order, the quote, or the question.</h3>
  <p class="blog-cta-context">She can help you compare facilities, sanity-check the insurance path, and decide whether the cash-pay route is worth pursuing.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`}

<h2>What this says about the product</h2>

<p>This story is useful because it makes Elena’s job concrete. We are not trying to replace radiologists or tell people whether they should get a breast MRI. We are helping with the ugly middle layer between “you need this” and “here is the smartest way to get it done.”</p>

<p>That means helping people:</p>

<ul>
  <li>translate a vague care instruction into a concrete shopping problem</li>
  <li>compare the real options instead of just the first obvious one</li>
  <li>spot when a “covered” path is still financially bad</li>
  <li>walk into scheduling with better questions and fewer surprises</li>
</ul>

<p>If you have ever had an imaging order in one hand and a scary quote in the other, you already understand why this matters. The real value is not abstract. It is getting to a cheaper, cleaner answer before you are locked into the wrong booking.</p>

<p class="blog-footnote"><small><sup>1</sup> Ge Bai et al., JAMA Network Open, 2023. <sup>2</sup> CMS Hospital Price Transparency rules require hospitals to post discounted cash prices and payer-specific negotiated charges. <sup>3</sup> Wang et al., Health Affairs, 2023. <sup>4</sup> Zhang et al., 2025 analysis of transparency-in-coverage imaging prices.</small></p>`,
  },

  // ── Post 0b: genetic-testing-prevention-plan ───────────────────────
  {
    slug: "genetic-testing-prevention-plan",
    title: "How Elena Helped One User Turn Genetic Testing and Bloodwork Into a Prevention Plan",
    htmlTitle: "How Elena Helped One User Turn Genetic Testing and Bloodwork Into a Prevention Plan",
    description:
      "A real Elena story grounded in preventive-care evidence: one user uploaded genetic testing and bloodwork, and Elena helped narrow what follow-up actually made sense.",
    ogTitle: "How Elena Helped One User Turn Genetic Testing and Bloodwork Into a Prevention Plan",
    ogDescription:
      "One user came in with genetic testing and bloodwork. Elena helped turn it into a clearer preventive-care plan.",
    category: "Customer Story",
    author: "Alex Reinhart",
    date: "April 2026",
    datePublished: "2026-04-29",
    readTime: "6 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How Elena Helped One User Turn Genetic Testing and Bloodwork Into a Prevention Plan",
      author: { "@type": "Person", name: "Alex Reinhart" },
      datePublished: "2026-04-29",
      publisher: { "@type": "Organization", name: "Elena Health" },
      description:
        "A customer story about using Elena to organize bloodwork, family history, and genetic testing into a clearer, risk-based preventive-care follow-up plan.",
    },
    bottomCta: {
      heading: "Already have labs, screenings, or genetic testing?",
      text: "Elena helps you organize existing results into a risk-based next-step plan, so you can stop guessing about which follow-up is actually worth doing.",
    },
    exitModal: {
      heading: "Turn your results into a real prevention plan.",
      text: "Elena helps you turn bloodwork, family history, and genetic testing into a clearer list of next questions, screenings, and follow-up conversations.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">A lot of preventive care confusion starts after the testing, not before it.</p>
  <h3>Elena helps you figure out what follow-up actually makes sense.</h3>
  <p class="blog-cta-context">Upload what you already have, tell Elena what you’re trying to understand, and get to a more organized next-step plan.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">One user came to Elena with the kind of folder a lot of health-conscious people accumulate over time: genetic testing results, prior bloodwork, and a vague sense that there were probably “next steps” hidden somewhere in all of it. His question was simple: given what I already have, what follow-up actually makes sense?</p>

<p>That is a much better preventive-care question than “what other tests can I order?” Good prevention is not about collecting every possible lab. It is about matching next steps to actual risk. The CDC explicitly advises people to bring family history and prior testing into care decisions because that information can help clinicians decide <em>which</em> screening tests are needed and <em>when</em> they should start.<sup>1</sup></p>

<h2>The problem: people have data, but no usable framework for what to do with it</h2>

<p>By the time this user came to Elena, he did not need another generic wellness checklist. He already had information. What he lacked was structure. Which pieces of his existing bloodwork mattered? Did any family-history pattern suggest earlier or different screening? Did the genetic report point to something actionable, or was it just noise?</p>

<p>This is where prevention often breaks down. People are told to “be proactive,” but they are rarely given a method for translating old labs, family history, symptoms, screening history, and genetics into a concrete plan.</p>

<p>So they either freeze, or they over-order. Neither is good medicine.</p>

<h2>What Elena actually helped with</h2>

<p>Elena helped turn that pile of information into a more tactical workup plan:</p>

<ul>
  <li>organizing the uploaded bloodwork and genetic report into a single picture</li>
  <li>separating signal from noise instead of treating every result as equally important</li>
  <li>identifying where existing information already supported follow-up and where it did not</li>
  <li>narrowing the next questions, labs, or screenings to the ones most worth discussing with a clinician</li>
</ul>

<p>That may sound simple, but it is aligned with how evidence-based prevention is actually supposed to work. The CDC notes that family history can change what screening tests a person needs and when they should start.<sup>1</sup> The USPSTF likewise recommends risk assessment and genetic counseling for people with the right family-history pattern for BRCA-related cancers, while recommending against routine risk assessment or testing in people without that risk profile.<sup>2</sup> In other words: prevention is supposed to get more specific as your risk picture gets clearer, not more indiscriminate.</p>

<blockquote>
  <p>The value was not “more data.” The value was turning existing data into a cleaner set of next questions.</p>
</blockquote>

<h2>Why this is a real clinical problem, not just an organizational one</h2>

<p>People often think preventive care means adding more tests. But screening and follow-up have tradeoffs. The CDC’s genetics guidance makes the same basic point: genetic testing can guide care, but the right next step depends on personal and family history, and genetic counseling can help decide whether further testing is actually appropriate.<sup>3</sup></p>

<p>That is why Elena’s job here was not to generate a giant “do everything” list. It was to help the user ask better questions:</p>

<ul>
  <li>Which abnormalities or patterns in my existing labs deserve follow-up?</li>
  <li>Does my family history change what screening timeline makes sense?</li>
  <li>Does this genetic result suggest a specific conversation, referral, or screening pathway, or not yet?</li>
  <li>What is worth bringing to a doctor now versus just filing away?</li>
</ul>

${`<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">This is where Elena can be useful before a portal full of results turns into overwhelm.</p>
  <h3>Upload the labs, family history, or genetics report you already have.</h3>
  <p class="blog-cta-context">Elena can help organize it into the next questions, follow-up items, and clinician conversations that are most worth having.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`}

<h2>What this says about preventive care product design</h2>

<p>For Elena, this kind of case is important because it shows the product does not need to invent a diagnosis to be useful. It can be useful by making existing information legible and more actionable.</p>

<p>That means helping people:</p>

<ul>
  <li>organize prior bloodwork and testing</li>
  <li>figure out which results are worth escalating</li>
  <li>prioritize follow-up instead of chasing every possible panel</li>
  <li>prepare for a more productive conversation with a clinician or genetic counselor</li>
</ul>

<p>If you already have bloodwork, family history, or a genetics report and feel like the problem is not “get more information” but “decide what this should lead to,” that is the problem Elena is trying to solve.</p>

<p class="blog-footnote"><small><sup>1</sup> CDC Family Health History guidance says family history can help clinicians decide which screening tests are needed and when to start them. <sup>2</sup> USPSTF BRCA-related cancer recommendation supports risk assessment and genetic counseling for higher-risk patients, not routine testing for everyone. <sup>3</sup> CDC genetic counseling guidance emphasizes using personal and family history to decide whether genetic testing is appropriate and how results should guide care.</small></p>`,
  },

  // ── Post 1: 47-minutes-on-hold ──────────────────────────────────────
  {
    slug: "47-minutes-on-hold",
    title: "47 Minutes on Hold With Insurance. This Is Why We're Building Elena.",
    htmlTitle: "47 Minutes on Hold With Insurance. This Is Why We\u2019re Building Elena.",
    description: "A founder\u2019s account of watching someone spend 47 minutes on hold with her insurance company \u2014 and the problem that inspired Elena.",
    ogTitle: "47 Minutes on Hold With Insurance. This Is Why We're Building Elena.",
    ogDescription: "47 minutes on hold with insurance. What if you never had to do that again?",
    category: "Founder\u2019s Journal",
    author: "Abhi Wangoo",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "6 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "47 Minutes on Hold With Insurance. This Is Why We're Building Elena.",
      author: { "@type": "Person", name: "Abhi Wangoo" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
      description:
        "A founder\u2019s account of watching someone spend 47 minutes on hold with her insurance company, and the problem that inspired Elena.",
    },
    bottomCta: {
      heading: "We\u2019re building Elena to make these calls for you.",
      text: "Your doctor, your insurance company, your billing department. Elena handles the hold time and the back-and-forth. You get a summary when she\u2019s done.",
    },
    exitModal: {
      heading: "Done sitting on hold?",
      text: "We\u2019re building an AI that calls your insurance, your doctor, and your billing department so you don\u2019t have to. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">We\u2019re building Elena to handle exactly this kind of problem.</p>
  <h3>Never sit on hold with insurance again.</h3>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">While researching this problem, I sat on a Zoom call with someone who was trying to resolve a claim denial with Anthem. She was on hold for 47 minutes. When she finally got a human, the call lasted 8 minutes. The rep asked her to call back with a different reference number. That\u2019s the moment I knew we were building the right thing.</p>

<p>I\u2019m going to call her Priya (not her real name). She\u2019s 29, works in marketing, and has what should be straightforward employer-sponsored insurance through Anthem. She\u2019d had a routine blood panel at her annual checkup, the claim was denied as \u201cnot medically necessary,\u201d and she owed $380.</p>

<p>Priya knew the denial was wrong. Her plan covers preventive labs at 100%. But knowing it\u2019s wrong and getting it fixed are two completely different problems.</p>

<h2>How long do people actually spend on healthcare phone calls?</h2>

<p>Before I walk through what happened, here\u2019s what the data says about hold times. This matched what I\u2019ve heard from dozens of people I\u2019ve spoken to:</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>Call Type</th>
        <th>Average Hold Time</th>
        <th>Average Call Duration</th>
        <th>Resolution on First Call</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Insurance claim inquiry</strong></td>
        <td>25 - 55 min</td>
        <td>8 - 15 min</td>
        <td>~40%</td>
      </tr>
      <tr>
        <td><strong>Prior authorization</strong></td>
        <td>15 - 40 min</td>
        <td>10 - 20 min</td>
        <td>~30%</td>
      </tr>
      <tr>
        <td><strong>Doctor\u2019s office appointment</strong></td>
        <td>5 - 20 min</td>
        <td>3 - 8 min</td>
        <td>~85%</td>
      </tr>
      <tr>
        <td><strong>Billing dispute</strong></td>
        <td>20 - 45 min</td>
        <td>10 - 25 min</td>
        <td>~35%</td>
      </tr>
      <tr>
        <td><strong>Pharmacy/prescription issue</strong></td>
        <td>10 - 30 min</td>
        <td>5 - 12 min</td>
        <td>~60%</td>
      </tr>
    </tbody>
  </table>
</div>

<p>That means for the most common healthcare phone tasks, you\u2019re looking at 30-70 minutes of your day gone for a 35-40% chance of actually resolving the issue on the first try. Most people need 2-3 calls.</p>

<h2>What happened when Priya called manually</h2>

<p>I was watching her screen over Zoom, taking notes for our product development. Here\u2019s the timeline:</p>

<ol>
  <li><strong>0:00</strong> - Priya dials the number on the back of her insurance card</li>
  <li><strong>0:02</strong> - Automated menu. Press 1 for English. Press 3 for claims. Press 2 for claim status. Enter member ID.</li>
  <li><strong>0:04</strong> - \u201cYour estimated wait time is... 35 to 45 minutes.\u201d Hold music starts.</li>
  <li><strong>0:47</strong> - A representative answers. Priya explains the situation.</li>
  <li><strong>0:52</strong> - Rep says the claim was processed under the wrong billing code. The provider submitted it as diagnostic, not preventive. Priya needs to call the provider to resubmit.</li>
  <li><strong>0:55</strong> - Priya asks if Anthem can handle it. Rep says no, the provider has to initiate the correction.</li>
</ol>

<p>Total time: 55 minutes. Outcome: she now needs to make a second call to the doctor\u2019s office and ask them to resubmit with the correct code. Which means another 10-20 minutes on hold with the provider, then waiting 2-4 weeks for reprocessing.</p>

<p>Priya told me: \u201cI almost just paid the $380. It\u2019s not worth my time.\u201d And she\u2019s someone who knew the denial was wrong and had the knowledge to explain why. Most people would have just paid.</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">What if you didn\u2019t have to make that call?</p>
  <h3>Elena sits on hold so you don\u2019t have to.</h3>
  <p class="blog-cta-context">Describe the problem. Elena calls your insurance, your doctor, your billing department. You get a summary when she\u2019s done.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>This is the problem we\u2019re building Elena to solve</h2>

<p>Priya\u2019s situation is fixable. The claim was coded wrong \u2014 preventive lab submitted as diagnostic (a CPT modifier mismatch). Fixing it requires two phone calls: one to the provider to resubmit the claim with the correct code, one to the insurer to flag it for reprocessing. That\u2019s it. But those two calls would cost Priya another 60-90 minutes of hold time she doesn\u2019t have.</p>

<p>This is exactly what we\u2019re building Elena to handle. The vision:</p>

<ol>
  <li><strong>You tell Elena about the problem</strong> \u2014 in plain language, from your phone. \u201cI got a $380 bill for a blood test that should be covered.\u201d</li>
  <li><strong>Elena identifies the issue</strong> \u2014 in this case, the coding error between preventive and diagnostic billing.</li>
  <li><strong>Elena makes the calls</strong> \u2014 to the provider\u2019s billing department and the insurance company. She sits on hold so you don\u2019t have to.</li>
  <li><strong>You get a summary</strong> \u2014 what was said, what was resolved, what to expect next.</li>
</ol>

<p>We\u2019re not there yet \u2014 we\u2019re still building. But every conversation like Priya\u2019s tells us exactly what Elena needs to do.</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">We\u2019re building Elena to handle exactly this kind of problem.</p>
  <h3>Never sit on hold with insurance again.</h3>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>Why phone calls are the real bottleneck in healthcare</h2>

<p>The healthcare system runs on phone calls. Not apps, not portals, not email. Phone calls. Booking appointments, checking claim status, disputing bills, getting prior authorizations, asking about coverage. All of it requires calling someone, navigating a phone tree, and waiting.</p>

<p>The people who get the best outcomes in healthcare are the ones who make the calls. They call to negotiate bills. They call to appeal denials. They call to verify coverage before procedures. Everyone else pays more, waits longer, and gets worse results. It\u2019s not fair, but it\u2019s how the system works right now.</p>

<p>The question I kept asking while building Elena: what if everyone had someone who would make those calls for them?</p>

<h2>What I learned talking to 30+ people about the healthcare phone system</h2>

<p>After talking to dozens of people about their healthcare phone calls \u2014 on Reddit, through outreach, and in user interviews \u2014 some patterns became clear:</p>

<ul>
  <li><strong>Most people give up after one unsuccessful call.</strong> If the first call doesn\u2019t resolve it, they pay the bill or ignore the issue.</li>
  <li><strong>The biggest barrier isn\u2019t money, it\u2019s energy.</strong> People told me they\u2019d rather pay an unfair bill than spend another hour on hold. The mental cost of the call exceeds the financial cost of the error.</li>
  <li><strong>People who work hourly jobs can\u2019t make these calls at all.</strong> Insurance companies are open 8-5. If you work 8-5, you\u2019re choosing between your paycheck and your phone call.</li>
  <li><strong>Knowing what to say matters almost as much as making the call.</strong> The people who got results knew to ask for specific things: \u201cI\u2019d like to file a formal appeal,\u201d \u201cCan you reprocess this under preventive care codes,\u201d \u201cI\u2019m requesting an itemized bill under the No Surprises Act.\u201d</li>
</ul>

<h2>Have you ever spent an unreasonable amount of time on hold with a healthcare company?</h2>

<p>I collect these stories because they\u2019re what shape the product. Every time someone tells me \u201cI was on hold for an hour to ask a yes-or-no question,\u201d that becomes a use case we test. If you\u2019ve had a particularly bad experience with healthcare phone calls, I\u2019d genuinely like to hear about it.</p>`,
  },

  // ── Post 2: medical-bill-errors ─────────────────────────────────────
  {
    slug: "medical-bill-errors",
    title: "How to Check Your Medical Bill for Errors (Step-by-Step)",
    htmlTitle: "How to Check Your Medical Bill for Errors (Step-by-Step)",
    description:
      "Up to 80% of medical bills contain errors. Here\u2019s a step-by-step guide to finding overcharges, duplicate charges, and wrong codes on your hospital bill.",
    ogTitle: "How to Check Your Medical Bill for Errors (Step-by-Step)",
    ogDescription:
      "Up to 80% of medical bills contain errors. Here\u2019s how to find them and fight back.",
    category: "Educational Guide",
    author: "Abhi Wangoo",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "7 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Check Your Medical Bill for Errors",
      description:
        "A step-by-step guide to finding and disputing errors on hospital and medical bills, including duplicate charges, upcoding, and unbundling.",
      step: [
        {
          "@type": "HowToStep",
          name: "Request an itemized bill",
          text: "Call the billing department and ask for a fully itemized statement with CPT codes, not just a summary.",
        },
        {
          "@type": "HowToStep",
          name: "Check for duplicate charges",
          text: "Look for the same procedure, test, or supply listed more than once on the same date.",
        },
        {
          "@type": "HowToStep",
          name: "Verify the procedure codes",
          text: "Look up each CPT code to confirm it matches what was actually performed.",
        },
        {
          "@type": "HowToStep",
          name: "Compare against your EOB",
          text: "Cross-reference your itemized bill against the Explanation of Benefits from your insurer.",
        },
        {
          "@type": "HowToStep",
          name: "Check for unbundling",
          text: "Look for procedures that should be billed as a single bundled code but were split into separate charges.",
        },
        {
          "@type": "HowToStep",
          name: "Look up fair prices",
          text: "Compare each line item against Medicare rates or hospital price transparency data.",
        },
        {
          "@type": "HowToStep",
          name: "Dispute in writing",
          text: "Send a formal dispute letter to the billing department with the specific errors documented.",
        },
      ],
      author: { "@type": "Person", name: "Abhi Wangoo" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
    },
    bottomCta: {
      heading: "Elena finds billing errors and fights them for you.",
      text: "Upload a photo of your bill. Elena scans every line, compares against fair prices, and helps you dispute the errors.",
    },
    exitModal: {
      heading: "Don\u2019t overpay on your next medical bill.",
      text: "Elena scans your bills for errors and compares every charge against fair prices. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Checking bills manually works, but it takes time. Especially when you have multiple visits to reconcile.</p>
  <h3>Elena checks your bill automatically.</h3>
  <p class="blog-cta-context">Upload a photo of your bill and Elena scans every line item, flags errors, and compares charges against fair prices from CMS transparency data.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">Up to 80% of medical bills contain at least one error, according to Medical Billing Advocates of America. These aren\u2019t small rounding issues. Duplicate charges, wrong procedure codes, and fees for services that never happened can add hundreds or thousands of dollars to your bill. Here\u2019s how to catch them.</p>

<p>I started building Elena after hearing the same pattern repeat across dozens of conversations: someone gets a bill, pays it because it looks official, and never realizes they were overcharged. One person I spoke to had a $6,200 ER bill with three duplicate line items and a charge for a procedure room she never entered. That\u2019s $1,400 she would have just... paid.</p>

<p>You don\u2019t need special software to catch most errors. You need an itemized bill, 30 minutes, and the steps below.</p>

<h2>What kinds of errors show up on medical bills?</h2>

<p>Before you start checking, it helps to know what you\u2019re looking for. These are the most common billing errors, ranked by how often they appear:</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>Error Type</th>
        <th>What It Looks Like</th>
        <th>How Common</th>
        <th>Typical Overcharge</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Duplicate charges</strong></td>
        <td>Same CPT code billed twice on the same date</td>
        <td>Very common</td>
        <td>$200 - $3,000+</td>
      </tr>
      <tr>
        <td><strong>Upcoding</strong></td>
        <td>Billed for a more expensive procedure than what was done</td>
        <td>Common</td>
        <td>$500 - $5,000+</td>
      </tr>
      <tr>
        <td><strong>Unbundling</strong></td>
        <td>One procedure split into separate charges that should be bundled</td>
        <td>Common</td>
        <td>$300 - $2,000</td>
      </tr>
      <tr>
        <td><strong>Wrong patient info</strong></td>
        <td>Charges for someone else\u2019s procedure mixed into your bill</td>
        <td>Less common</td>
        <td>Varies widely</td>
      </tr>
      <tr>
        <td><strong>Services not rendered</strong></td>
        <td>Charges for tests, supplies, or consults that never happened</td>
        <td>Less common</td>
        <td>$100 - $1,500</td>
      </tr>
      <tr>
        <td><strong>Incorrect quantity</strong></td>
        <td>Billed for 3 units of something when you received 1</td>
        <td>Moderately common</td>
        <td>$50 - $500</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Step 1: Request an itemized bill</h2>

<p>The summary bill you get in the mail is almost useless for error-checking. It might say \u201cEmergency Services - $4,800\u201d with no detail on what that includes. You need the <strong>itemized statement</strong> that lists every individual charge with its CPT (Current Procedural Terminology) code.</p>

<p>Call the billing department and say: \u201cI\u2019d like a fully itemized bill with CPT codes for all charges.\u201d They\u2019re required to provide this. Under the No Surprises Act (effective January 2022), you have the right to receive a detailed bill within 30 days of request.</p>

<h2>Step 2: Check for duplicate charges</h2>

<p>This is the easiest error to spot. Scan every line and look for the same CPT code appearing more than once on the same date of service. Common duplicates include:</p>

<ul>
  <li>Lab tests (blood panels, urinalysis) billed twice</li>
  <li>Imaging (X-rays, CT scans) listed on two separate line items</li>
  <li>IV administration fees charged per-bag when it should be a single charge</li>
  <li>Room fees listed for multiple rooms on the same day</li>
</ul>

<h2>Step 3: Verify the procedure codes</h2>

<p>Every charge on your bill corresponds to a CPT code. You can look up any code on the AMA\u2019s CPT code lookup tool or a free site like FindACode.com. Check that the code matches what actually happened during your visit.</p>

<p>For example: CPT 99285 is the highest-level ER evaluation code, billed at $500-$1,500+ depending on the hospital. If you went to the ER for a sprained ankle and were seen for 15 minutes, you probably should have been billed 99283 (moderate complexity), not 99285 (high complexity). This is called <strong>upcoding</strong>, and it\u2019s one of the most common billing errors.</p>

<h2>Step 4: Compare against your EOB</h2>

<p>Your insurance company sends an Explanation of Benefits (EOB) after processing a claim. The EOB shows what the provider billed, what your insurance approved, and what you owe. Compare this line-by-line against your itemized bill.</p>

<p>Things to watch for:</p>
<ul>
  <li>The provider billing you for more than the \u201cpatient responsibility\u201d amount on the EOB</li>
  <li>Charges on your bill that don\u2019t appear on the EOB at all (meaning they were never submitted to insurance)</li>
  <li>Denied charges that the provider is billing you for directly, which may be appealable</li>
</ul>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Checking bills manually works, but it takes time. Especially when you have multiple visits to reconcile.</p>
  <h3>Elena checks your bill automatically.</h3>
  <p class="blog-cta-context">Upload a photo of your bill and Elena scans every line item, flags errors, and compares charges against fair prices from CMS transparency data.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>Step 5: Check for unbundling</h2>

<p>Some procedures are supposed to be billed together as a single \u201cbundled\u201d code. When a hospital splits them into separate charges, it\u2019s called <strong>unbundling</strong>, and it inflates the total.</p>

<p>A common example: a basic metabolic panel (BMP) is a single lab test that measures 8 things (sodium, potassium, glucose, etc.). The bundled CPT code is 80048 and costs $15-$40. If a hospital bills each of those 8 tests separately, the total can be $200-$400 for the same blood draw.</p>

<p>You can check for unbundling by looking for clusters of related lab or procedure codes on the same date. If you see 5-8 individual lab codes, search whether they should have been billed as a panel.</p>

<h2>Step 6: Look up fair prices for each charge</h2>

<p>Even if your bill has no outright errors, you might be overpaying relative to what the procedure should cost. Two ways to check:</p>

<ol>
  <li><strong>Medicare rates:</strong> Search any CPT code on Medicare.gov\u2019s Physician Fee Schedule to see what Medicare pays. Hospital charges are often 2-5x the Medicare rate. If your bill is 10x or more, that\u2019s worth questioning.</li>
  <li><strong>Hospital price transparency files:</strong> Since January 2021, the CMS Hospital Price Transparency Rule requires every hospital to publish their actual negotiated rates. These are public files you can download from the hospital\u2019s website (look for \u201cprice transparency\u201d or \u201cmachine-readable files\u201d). They\u2019re massive spreadsheets, but if you search for your CPT code, you can see the exact rate your insurer negotiated.</li>
</ol>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>Procedure</th>
        <th>Typical Hospital Charge</th>
        <th>Medicare Rate</th>
        <th>Average Negotiated Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>ER visit (moderate, CPT 99283)</td>
        <td>$1,200 - $2,500</td>
        <td>$150 - $250</td>
        <td>$400 - $800</td>
      </tr>
      <tr>
        <td>Basic metabolic panel (CPT 80048)</td>
        <td>$150 - $400</td>
        <td>$11 - $15</td>
        <td>$20 - $60</td>
      </tr>
      <tr>
        <td>Chest X-ray (CPT 71046)</td>
        <td>$300 - $1,000</td>
        <td>$25 - $35</td>
        <td>$50 - $150</td>
      </tr>
      <tr>
        <td>MRI brain without contrast (CPT 70551)</td>
        <td>$1,500 - $4,000</td>
        <td>$200 - $300</td>
        <td>$400 - $1,200</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Step 7: Dispute the errors in writing</h2>

<p>Once you\u2019ve found errors, don\u2019t just call. Send a <strong>written dispute letter</strong> to the billing department. Include:</p>

<ol>
  <li>Your name, account number, and date of service</li>
  <li>Each specific error with the line item, CPT code, and charged amount</li>
  <li>What the correct charge should be, with your reasoning</li>
  <li>A request for an adjusted bill within 30 days</li>
  <li>A note that you are requesting investigation under applicable state and federal billing regulations</li>
</ol>

<p>Send it certified mail so you have proof of delivery. Many billing departments will correct obvious errors (duplicates, wrong codes) within one billing cycle. For larger disputes, you may need to escalate to your state\u2019s insurance commissioner or file a complaint with CMS.</p>

<h2>What about charity care and financial assistance?</h2>

<p>If your bill is simply too large even without errors, most nonprofit hospitals are required to offer financial assistance under IRS Section 501(r). This applies to any hospital with tax-exempt status, which includes most major hospital systems. You can qualify for partial or full write-offs based on income, even if you have insurance.</p>

<p>Ask the billing department for their \u201cfinancial assistance policy\u201d or \u201ccharity care application.\u201d The income thresholds vary, but many hospitals offer discounts for households earning up to 400% of the Federal Poverty Level.</p>

<h2>Have you ever caught an error on a medical bill?</h2>

<p>I hear about these every week from people testing Elena. The most common reaction: \u201cI never would have caught that.\u201d If you\u2019ve found an error on a bill, or if you\u2019ve tried disputing one and hit a wall, I\u2019d genuinely like to hear about it. These stories are what shape what we build.</p>

<div class="blog-sources">
  <h2>Sources</h2>
  <ol>
    <li><a href="https://www.medicalbillingadvocates.com/" target="_blank" rel="noopener">Medical Billing Advocates of America</a> \u2014 \u201cUp to 80% of medical bills contain errors.\u201d</li>
    <li><a href="https://www.cms.gov/newsroom/fact-sheets/no-surprises-act-protections-against-surprise-medical-bills" target="_blank" rel="noopener">CMS: No Surprises Act Fact Sheet</a> \u2014 Patient rights to itemized bills and protections against surprise billing (effective January 2022).</li>
    <li><a href="https://www.cms.gov/hospital-price-transparency" target="_blank" rel="noopener">CMS: Hospital Price Transparency Rule</a> \u2014 Requires hospitals to publish machine-readable files of negotiated rates (effective January 2021).</li>
    <li><a href="https://www.cms.gov/medicare/payment/physician-fee-schedule" target="_blank" rel="noopener">CMS: Medicare Physician Fee Schedule</a> \u2014 Medicare reimbursement rates used as price benchmarks in the comparison table.</li>
    <li><a href="https://www.irs.gov/charities-non-profits/community-health-needs-assessment-for-charitable-hospital-organizations-section-501r3" target="_blank" rel="noopener">IRS: Section 501(r) Requirements</a> \u2014 Financial assistance requirements for tax-exempt hospitals.</li>
    <li><a href="https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines" target="_blank" rel="noopener">HHS ASPE: Federal Poverty Guidelines</a> \u2014 Income thresholds used by hospitals for charity care eligibility.</li>
  </ol>
</div>`,
  },

  // ── Post 3: mri-cost-comparison ─────────────────────────────────────
  {
    slug: "mri-cost-comparison",
    title: "The Same MRI Costs $400 or $2,500 \u2014 Here\u2019s How to Find the Cheap One",
    htmlTitle:
      "The Same MRI Costs $400 or $2,500 &mdash; Here\u2019s How to Find the Cheap One",
    description:
      "MRI prices vary by 5-10x depending on where you go. Here\u2019s how to find the actual negotiated price your insurance pays, before you book.",
    ogTitle:
      "The Same MRI Costs $400 or $2,500 \u2014 Here\u2019s How to Find the Cheap One",
    ogDescription:
      "MRI prices vary by 5-10x. Here\u2019s how to find the actual price before you book.",
    category: "Educational Guide",
    author: "Abhi Wangoo",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "7 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Find Cheap MRI Prices Near You",
      description:
        "A step-by-step guide to comparing MRI costs across facilities using insurance negotiated rates and price transparency data.",
      step: [
        {
          "@type": "HowToStep",
          name: "Understand why MRI prices vary",
          text: "Hospital-based MRIs cost 3-10x more than freestanding imaging centers for the same scan.",
        },
        {
          "@type": "HowToStep",
          name: "Check your insurance\u2019s negotiated rate",
          text: "Use your insurer\u2019s cost estimator tool or call member services to get the in-network negotiated rate.",
        },
        {
          "@type": "HowToStep",
          name: "Use hospital price transparency files",
          text: "Search the hospital\u2019s machine-readable pricing file for CPT 70553 or your specific MRI code.",
        },
        {
          "@type": "HowToStep",
          name: "Compare freestanding imaging centers",
          text: "Search for independent imaging centers in your area, which typically offer MRIs at 50-80% less than hospitals.",
        },
        {
          "@type": "HowToStep",
          name: "Ask about cash-pay prices",
          text: "Even with insurance, the cash price at a freestanding center can be cheaper than your in-network hospital copay.",
        },
      ],
      author: { "@type": "Person", name: "Abhi Wangoo" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
    },
    bottomCta: {
      heading: "Stop overpaying. Elena shows you the real price.",
      text: "Real negotiated rates from your insurance plan, at every facility near you. Before you book, not after.",
    },
    exitModal: {
      heading: "Find out what your MRI actually costs.",
      text: "Elena shows you real negotiated rates from your insurance, at every facility near you. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Parsing price transparency files and calling facilities isn\u2019t exactly how most people want to spend their afternoon.</p>
  <h3>Elena pulls the actual negotiated rates from your insurance plan &mdash; before you book.</h3>
  <p class="blog-cta-context">Snap a photo of your insurance card, tell Elena what scan you need, and she shows you the real price at every facility near you.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">A brain MRI without contrast (CPT 70551) costs between $400 and $2,500 depending on where you get it, even within the same city, on the same insurance plan. The scan is identical. The machine is identical. The radiologist reading it may even be the same person. The only difference is which building you walk into.</p>

<p>I learned this while building Elena\u2019s price comparison engine. We parse the machine-readable pricing files that hospitals are required to publish under the CMS Hospital Price Transparency Rule. When I first ran the numbers for MRIs in a single metro area, I thought our parser was broken. It wasn\u2019t. The prices really are that different.</p>

<h2>Why do MRI prices vary so much?</h2>

<p>Three main reasons:</p>

<ol>
  <li><strong>Hospital-based vs. freestanding imaging centers.</strong> Hospital outpatient departments add \u201cfacility fees\u201d on top of the scan itself. A freestanding imaging center doesn\u2019t have this overhead. The scan is the same; the billing structure is not.</li>
  <li><strong>Negotiated rates differ by insurer and plan.</strong> Your insurance company negotiates a separate rate with every facility. Anthem\u2019s rate at Hospital A might be $1,800, while Aetna\u2019s rate at the same hospital is $1,200. And both are different from the cash price.</li>
  <li><strong>Chargemaster pricing is arbitrary.</strong> The \u201clist price\u201d that hospitals publish has no relationship to actual costs. It\u2019s a starting point for negotiations, and if you\u2019re uninsured and don\u2019t ask about discounts, you get charged this inflated rate.</li>
</ol>

<h2>What does an MRI actually cost at different facilities?</h2>

<p>Here\u2019s what we found parsing price transparency data across major metro areas. These are real negotiated rates, not list prices:</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>Facility Type</th>
        <th>MRI Brain w/o Contrast (CPT 70551)</th>
        <th>MRI Knee (CPT 73721)</th>
        <th>MRI Lumbar Spine (CPT 72148)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Academic medical center</strong></td>
        <td>$1,800 - $3,500</td>
        <td>$1,500 - $3,000</td>
        <td>$1,600 - $3,200</td>
      </tr>
      <tr>
        <td><strong>Community hospital outpatient</strong></td>
        <td>$1,200 - $2,200</td>
        <td>$1,000 - $1,800</td>
        <td>$1,100 - $2,000</td>
      </tr>
      <tr>
        <td><strong>Freestanding imaging center (in-network)</strong></td>
        <td>$400 - $900</td>
        <td>$350 - $800</td>
        <td>$400 - $850</td>
      </tr>
      <tr>
        <td><strong>Freestanding imaging center (cash pay)</strong></td>
        <td>$300 - $600</td>
        <td>$250 - $500</td>
        <td>$300 - $550</td>
      </tr>
      <tr>
        <td><strong>Medicare rate (for reference)</strong></td>
        <td>$200 - $350</td>
        <td>$180 - $300</td>
        <td>$200 - $320</td>
      </tr>
    </tbody>
  </table>
</div>

<p>The freestanding center is 3-5x cheaper than the academic medical center for the same scan. If you haven\u2019t met your deductible yet, that difference comes straight out of your pocket.</p>

<h2>How to find the actual price before you book</h2>

<h3>Option 1: Your insurance company\u2019s cost estimator</h3>

<p>Most major insurers (Anthem, Aetna, UnitedHealthcare, Cigna) have an online cost estimator tool. Log in to your member portal and search for \u201cMRI\u201d in the cost estimator. It should show you estimated out-of-pocket costs at different in-network facilities near you.</p>

<p>The problem: these tools are often inaccurate, hard to find, and show estimated ranges rather than exact negotiated rates. They\u2019re a starting point, not a final answer.</p>

<h3>Option 2: Hospital price transparency files</h3>

<p>Since January 2021, the CMS Hospital Price Transparency Rule requires every hospital to publish machine-readable files containing their actual negotiated rates with every insurer. These are public and free to access.</p>

<p>How to use them:</p>
<ol>
  <li>Go to the hospital\u2019s website</li>
  <li>Search for \u201cprice transparency\u201d or \u201cstandard charges\u201d</li>
  <li>Download the machine-readable file (usually a CSV or JSON file, often huge)</li>
  <li>Search for your MRI\u2019s CPT code (e.g., 70551 for brain MRI without contrast)</li>
  <li>Find the row matching your insurance plan</li>
</ol>

<p>The problem: these files are enormous (sometimes gigabytes), formatted for machines not humans, and different hospitals use different formats. Practically nobody does this manually.</p>

<h3>Option 3: Call and ask</h3>

<p>Call the imaging center\u2019s scheduling department and ask: \u201cWhat is the negotiated rate for CPT [code] with [your insurance plan]?\u201d Some will tell you. Many will say they can\u2019t give you a price until after the scan. This is technically not true since the CMS rule requires price transparency, but in practice, getting a straight answer on the phone is hit or miss.</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Parsing price transparency files and calling facilities isn\u2019t exactly how most people want to spend their afternoon.</p>
  <h3>Elena pulls the actual negotiated rates from your insurance plan &mdash; before you book.</h3>
  <p class="blog-cta-context">Snap a photo of your insurance card, tell Elena what scan you need, and she shows you the real price at every facility near you.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>The cash-pay loophole that most people don\u2019t know about</h2>

<p>Here\u2019s something counterintuitive: even if you have insurance, paying cash at a freestanding imaging center can be cheaper than using your insurance at a hospital.</p>

<p>Example: Your insurance\u2019s negotiated rate for a knee MRI at your local hospital is $1,400. You haven\u2019t met your $2,000 deductible, so you owe the full $1,400. Meanwhile, a freestanding imaging center 10 minutes away offers the same MRI for $350 cash.</p>

<p>The catch: if you pay cash, it doesn\u2019t count toward your deductible. So you need to think about whether you\u2019re likely to hit your deductible this year. If you are (because of a planned surgery or ongoing treatment), using insurance and paying the higher rate might make sense long-term. If you\u2019re generally healthy and rarely hit your deductible, the cash price saves you real money.</p>

<h2>Questions to ask before booking any imaging</h2>

<ol>
  <li><strong>\u201cIs this facility hospital-based or freestanding?\u201d</strong> Hospital-based outpatient centers charge facility fees. Freestanding centers don\u2019t.</li>
  <li><strong>\u201cWhat is the negotiated rate for CPT [code] with my plan?\u201d</strong> Get the specific dollar amount, not a range.</li>
  <li><strong>\u201cWhat\u2019s your cash-pay price?\u201d</strong> Always compare this against your in-network price minus what you\u2019ve already paid toward your deductible.</li>
  <li><strong>\u201cDoes my doctor have a preference on where I go?\u201d</strong> Some doctors prefer specific facilities for image quality or radiologist expertise. But many say \u201canywhere in-network is fine.\u201d</li>
  <li><strong>\u201cCan I get the scan authorized before scheduling?\u201d</strong> Some insurers require prior authorization for MRIs. Getting this done before booking prevents surprise denials.</li>
</ol>

<h2>Have you ever been surprised by the cost of an MRI or imaging scan?</h2>

<p>Price variation in imaging is one of the most fixable problems in healthcare. The information exists, it\u2019s legally required to be public, and most people just don\u2019t know how to access it. If you\u2019ve dealt with an unexpectedly expensive scan, or found a way to get a better price, I\u2019d like to hear how it went.</p>

<div class="blog-sources">
  <h2>Sources</h2>
  <ol>
    <li><a href="https://www.cms.gov/hospital-price-transparency" target="_blank" rel="noopener">CMS: Hospital Price Transparency Rule</a> \u2014 Requires hospitals to publish machine-readable files of actual negotiated rates (effective January 2021). Price ranges in this article are derived from these public files.</li>
    <li><a href="https://www.cms.gov/medicare/payment/physician-fee-schedule" target="_blank" rel="noopener">CMS: Medicare Physician Fee Schedule</a> \u2014 Medicare reimbursement rates used as reference benchmarks in the comparison table.</li>
    <li><a href="https://www.cms.gov/newsroom/fact-sheets/no-surprises-act-protections-against-surprise-medical-bills" target="_blank" rel="noopener">CMS: No Surprises Act Fact Sheet</a> \u2014 Requires insurers to provide cost-estimator tools and protects against surprise billing.</li>
  </ol>
</div>`,
  },

  // ── Post 4: what-eob-means ──────────────────────────────────────────
  {
    slug: "what-eob-means",
    title: "What Your EOB Actually Means (And Why It\u2019s Not a Bill)",
    htmlTitle: "What Your EOB Actually Means (And Why It\u2019s Not a Bill)",
    description:
      "An Explanation of Benefits is not a bill. Here\u2019s a field-by-field breakdown of what every line on your EOB means and what to do if something looks wrong.",
    ogTitle: "What Your EOB Actually Means (And Why It\u2019s Not a Bill)",
    ogDescription:
      "Your EOB is not a bill. Here\u2019s what every line actually means.",
    category: "Educational Guide",
    author: "Abhi Wangoo",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "6 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": ["HowTo", "FAQPage"],
      name: "What Your EOB Actually Means",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is an EOB a bill?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. An Explanation of Benefits (EOB) is a statement from your insurance company showing how a claim was processed. It is not a bill and you should not pay from it. Wait for the actual bill from your provider.",
          },
        },
        {
          "@type": "Question",
          name: "What does 'amount not covered' mean on an EOB?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Amount not covered means your insurance did not pay for that portion of the charge. This could be because the service isn\u2019t covered, you haven\u2019t met your deductible, or the provider charged more than the allowed amount.",
          },
        },
        {
          "@type": "Question",
          name: "What should I do if my EOB shows a denied claim?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Check the denial reason code on the EOB. Common reasons include missing prior authorization, out-of-network provider, or incorrect billing codes. You can appeal most denials by contacting your insurer within 180 days.",
          },
        },
      ],
      author: { "@type": "Person", name: "Abhi Wangoo" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
    },
    bottomCta: {
      heading: "Elena reads your EOB and tells you what to do next.",
      text: "Snap a photo of any insurance document. Elena explains it in plain English and flags anything that looks wrong.",
    },
    exitModal: {
      heading: "Stop guessing what your insurance means.",
      text: "Elena explains your EOB, your bills, and your coverage in plain English. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Reading an EOB shouldn\u2019t require a decoder ring.</p>
  <h3>Snap a photo and Elena explains it in plain English.</h3>
  <p class="blog-cta-context">Elena reads your EOB, highlights anything that looks wrong, and tells you what to do about it.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">An Explanation of Benefits (EOB) is not a bill. It\u2019s a statement from your insurance company showing how they processed a claim from your doctor or hospital. You don\u2019t pay from your EOB. But you should read it, because it tells you whether you\u2019re about to get overcharged.</p>

<p>The number one question I hear from people testing Elena: \u201cI got this thing in the mail and I don\u2019t know if I\u2019m supposed to pay it.\u201d Nine times out of ten, it\u2019s an EOB. The formatting is confusing by design, the numbers look like you owe money, and the words \u201cTHIS IS NOT A BILL\u201d are printed in tiny font at the top where nobody reads.</p>

<h2>EOB vs. bill: what\u2019s the difference?</h2>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th></th>
        <th>Explanation of Benefits (EOB)</th>
        <th>Medical Bill</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Who sends it</strong></td>
        <td>Your insurance company</td>
        <td>Your doctor or hospital</td>
      </tr>
      <tr>
        <td><strong>Purpose</strong></td>
        <td>Shows how the claim was processed</td>
        <td>Requests payment for services</td>
      </tr>
      <tr>
        <td><strong>Should you pay from it?</strong></td>
        <td>No</td>
        <td>Yes (after verifying it matches the EOB)</td>
      </tr>
      <tr>
        <td><strong>When it arrives</strong></td>
        <td>After insurance processes the claim (1-4 weeks)</td>
        <td>After the EOB is issued (another 1-4 weeks)</td>
      </tr>
      <tr>
        <td><strong>What to do with it</strong></td>
        <td>Review it, save it, compare against the bill when it comes</td>
        <td>Compare against the EOB, then pay or dispute</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Every line on your EOB, explained</h2>

<p>EOBs look different across insurers, but they all contain the same core fields. Here\u2019s what each one means in plain English:</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>EOB Field</th>
        <th>What It Says</th>
        <th>What It Actually Means</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Provider</strong></td>
        <td>Name of doctor or facility</td>
        <td>Who submitted the claim. Make sure you actually saw this provider on the date listed.</td>
      </tr>
      <tr>
        <td><strong>Date of service</strong></td>
        <td>The date you received care</td>
        <td>Verify this matches your actual visit. Wrong dates can indicate a billing error or wrong-patient charge.</td>
      </tr>
      <tr>
        <td><strong>Billed amount</strong></td>
        <td>$X,XXX</td>
        <td>What the provider charged. This is the \u201clist price\u201d before any insurance discounts. It\u2019s almost always inflated.</td>
      </tr>
      <tr>
        <td><strong>Allowed amount</strong></td>
        <td>$XXX</td>
        <td>The maximum your insurance will pay for this service. This is the negotiated rate. The difference between billed and allowed is the \u201cdiscount\u201d you get for having insurance.</td>
      </tr>
      <tr>
        <td><strong>Insurance paid</strong></td>
        <td>$XXX</td>
        <td>What your insurance actually paid the provider. This comes out of the allowed amount.</td>
      </tr>
      <tr>
        <td><strong>Deductible applied</strong></td>
        <td>$XXX</td>
        <td>The portion of the allowed amount that counts toward your annual deductible. You owe this.</td>
      </tr>
      <tr>
        <td><strong>Copay</strong></td>
        <td>$XX</td>
        <td>Your fixed per-visit payment (e.g., $30 for a specialist visit). You owe this.</td>
      </tr>
      <tr>
        <td><strong>Coinsurance</strong></td>
        <td>$XXX</td>
        <td>Your percentage share of the allowed amount after the deductible. For example, if your plan is 80/20, you pay 20% of the allowed amount.</td>
      </tr>
      <tr>
        <td><strong>Amount not covered</strong></td>
        <td>$XXX</td>
        <td>Charges your insurance won\u2019t pay for. Could be out-of-network, not covered by your plan, or missing prior authorization.</td>
      </tr>
      <tr>
        <td><strong>Your responsibility</strong></td>
        <td>$XXX</td>
        <td>The total you owe: deductible + copay + coinsurance + amount not covered. This should match the bill you get from the provider.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Reading an EOB shouldn\u2019t require a decoder ring.</p>
  <h3>Snap a photo and Elena explains it in plain English.</h3>
  <p class="blog-cta-context">Elena reads your EOB, highlights anything that looks wrong, and tells you what to do about it.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>Is an EOB a bill?</h2>

<p>No. It says so on the document itself, though the text is usually small. An EOB is a report, not a request for payment. The actual bill comes from your provider separately, usually 2-4 weeks after the EOB.</p>

<p>This matters because many people accidentally pay from the EOB and then get double-billed when the actual provider bill arrives. Or they pay the bill without checking it against the EOB and miss overcharges.</p>

<p><strong>The rule:</strong> Wait for the actual bill. When it arrives, compare the \u201cyour responsibility\u201d amount on the EOB against the amount on the bill. They should match. If the bill is higher than what the EOB says you owe, that\u2019s a billing error.</p>

<h2>What does \u201camount not covered\u201d mean on an EOB?</h2>

<p>This is the most confusing and anxiety-inducing line on the EOB. \u201cAmount not covered\u201d means your insurance declined to pay for that charge. But there are very different reasons this happens, and some are fixable:</p>

<ul>
  <li><strong>You haven\u2019t met your deductible yet.</strong> Not actually \u201cnot covered\u201d in the denied sense. You just owe it out-of-pocket because your annual deductible hasn\u2019t been met.</li>
  <li><strong>The service isn\u2019t covered by your plan.</strong> Some plans don\u2019t cover certain services (like acupuncture or certain therapies). Check your plan\u2019s Summary of Benefits to confirm.</li>
  <li><strong>The provider is out-of-network.</strong> You may owe the full amount or a higher share. But under the No Surprises Act (2022), you\u2019re protected from surprise out-of-network billing for emergency services and certain non-emergency situations at in-network facilities.</li>
  <li><strong>Prior authorization was required and wasn\u2019t obtained.</strong> Your doctor was supposed to get approval before the service. This is often appealable, especially if the service was medically necessary.</li>
  <li><strong>The billing code was wrong.</strong> The provider used an incorrect CPT or diagnosis code, so the claim was processed incorrectly. This is the most common fixable reason and just requires the provider to resubmit.</li>
</ul>

<h2>What should I do if my EOB shows a denied claim?</h2>

<p>Step-by-step:</p>

<ol>
  <li><strong>Read the denial reason code.</strong> Every EOB includes a code or explanation for why a charge wasn\u2019t covered. This tells you what went wrong.</li>
  <li><strong>Call your insurance\u2019s member services line.</strong> Ask them to explain the denial in plain language and what your options are.</li>
  <li><strong>If it\u2019s a coding error:</strong> Call the provider\u2019s billing department and ask them to resubmit with the correct code.</li>
  <li><strong>If it\u2019s a legitimate denial you want to challenge:</strong> File a formal appeal. You have 180 days from the date of the EOB. Under the Affordable Care Act, your insurer must review appeals within 30 days (60 days for ongoing treatment).</li>
  <li><strong>If the appeal is denied:</strong> Request an external review. An independent third party reviews your case, and their decision is binding on the insurer. This is a federal right under the ACA.</li>
</ol>

<h2>When should you worry about your EOB?</h2>

<p>Most EOBs are uneventful. You got care, insurance processed it, you owe your normal copay or deductible amount. But flag these situations:</p>

<ul>
  <li>The \u201cbilled amount\u201d is dramatically higher than the \u201callowed amount\u201d and your provider might bill you the difference (this is \u201cbalance billing\u201d and is illegal for in-network providers and in many emergency situations under the No Surprises Act)</li>
  <li>Services appear that you don\u2019t remember receiving</li>
  <li>The dates of service don\u2019t match your actual visits</li>
  <li>A claim is denied for \u201cnot medically necessary\u201d when your doctor ordered it</li>
  <li>\u201cYour responsibility\u201d is significantly higher than you expected based on your plan\u2019s copay/coinsurance</li>
</ul>

<h2>Have you ever been confused by something on an EOB?</h2>

<p>EOBs are one of those things that everyone receives and almost nobody fully understands. If you\u2019ve ever stared at one wondering what it means, you\u2019re the majority. If you\u2019ve had a specific confusing experience with an EOB or caught an error by reading one carefully, I\u2019d like to hear about it.</p>

<div class="blog-sources">
  <h2>Sources</h2>
  <ol>
    <li><a href="https://www.cms.gov/newsroom/fact-sheets/no-surprises-act-protections-against-surprise-medical-bills" target="_blank" rel="noopener">CMS: No Surprises Act Fact Sheet</a> \u2014 Protections against surprise out-of-network billing (effective January 2022) and balance billing rules.</li>
    <li><a href="https://www.healthcare.gov/appeal-insurance-company-decision/appeals/" target="_blank" rel="noopener">Healthcare.gov: How to Appeal an Insurance Company Decision</a> \u2014 180-day appeal window, 30-day insurer review timeline, and right to external review under the ACA.</li>
    <li><a href="https://www.healthcare.gov/health-care-law-protections/" target="_blank" rel="noopener">Healthcare.gov: ACA Health Care Law Protections</a> \u2014 Consumer protections including the right to external review with a binding independent decision.</li>
  </ol>
</div>`,
  },

  // ── Post 5: managing-parents-healthcare ─────────────────────────────
  {
    slug: "managing-parents-healthcare",
    title: "Managing Your Parent\u2019s Healthcare From 1,000 Miles Away",
    htmlTitle: "Managing Your Parent\u2019s Healthcare From 1,000 Miles Away",
    description:
      "What remote caregiving actually looks like \u2014 and the problem that inspired us to build Elena for families managing a parent\u2019s healthcare from a distance.",
    ogTitle: "Managing Your Parent\u2019s Healthcare From 1,000 Miles Away",
    ogDescription:
      "What remote caregiving actually looks like, and what tools help.",
    category: "Founder\u2019s Journal",
    author: "Abhi Wangoo",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "7 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline:
        "Managing Your Parent\u2019s Healthcare From 1,000 Miles Away",
      author: { "@type": "Person", name: "Abhi Wangoo" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
      description:
        "What remote caregiving actually looks like, and the problem that inspired us to build Elena for families managing healthcare from a distance.",
    },
    bottomCta: {
      heading:
        "Caregiving is hard enough. We\u2019re building Elena to handle the logistics.",
      text: "One app to manage your parent\u2019s appointments, medications, bills, and insurance from your phone. Elena handles the calls and tracks everything.",
    },
    exitModal: {
      heading: "Managing a loved one\u2019s healthcare?",
      text: "We\u2019re building an app that tracks appointments, meds, and bills for your whole family. One place for everything. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">We\u2019re building Elena to manage your parent\u2019s appointments, meds, and bills from your phone.</p>
  <h3>One app for your whole family\u2019s healthcare.</h3>
  <p class="blog-cta-context">Set up profiles for yourself and the people you care for. Elena will track everything and make the calls.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">About 11 million Americans provide care for an aging parent while living more than an hour away. One of the first people who reached out to us \u2014 I\u2019ll call her Lisa \u2014 lives in Chicago and manages her mother\u2019s healthcare in Tampa. When we talked, she described juggling three specialists, two insurance plans, and a medication list that changes monthly. All from her phone, during her lunch break.</p>

<p>Lisa is 34 and works in finance. Her mom, who\u2019s 67, has Type 2 diabetes, high blood pressure, and early-stage kidney disease. That means a primary care doctor, an endocrinologist, a nephrologist, quarterly lab work, five daily medications, and an insurance situation that got more complicated when her mom switched from employer coverage to a Medicare Advantage plan last year.</p>

<p>Lisa didn\u2019t sign up for this role. Nobody does. But when her dad passed away two years ago, she became the person who keeps track of everything.</p>

<h2>What remote caregiving actually looks like</h2>

<p>When I first talked to Lisa, I assumed \u201cmanaging healthcare\u201d meant booking the occasional appointment. It\u2019s significantly more than that:</p>

<ul>
  <li><strong>Tracking medications.</strong> Five prescriptions, different refill schedules, two that interact badly if dosing isn\u2019t coordinated. Lisa\u2019s mom sometimes forgets whether she took her morning meds.</li>
  <li><strong>Coordinating between specialists.</strong> The endocrinologist adjusts insulin, the nephrologist changes a blood pressure med, and neither knows about the other\u2019s changes unless Lisa relays the information.</li>
  <li><strong>Managing insurance.</strong> Her mom\u2019s Medicare Advantage plan has a different formulary than her old employer plan. Two of her medications weren\u2019t covered and needed prior authorization.</li>
  <li><strong>Handling bills.</strong> Three different providers sending bills to her mom\u2019s house. Her mom can\u2019t read the fine print well and sometimes pays before Lisa can review them.</li>
  <li><strong>Booking and rescheduling appointments.</strong> When her mom misses an appointment (it happens), Lisa has to call from Chicago during work hours to reschedule.</li>
</ul>

<h2>The tools Lisa tried (and why they fell short)</h2>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th>Tool / Approach</th>
        <th>What It Does</th>
        <th>Where It Falls Short for Remote Caregivers</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Shared Google Calendar</strong></td>
        <td>Track appointments</td>
        <td>Doesn\u2019t track medications, doesn\u2019t remind about refills, can\u2019t book or cancel appointments</td>
      </tr>
      <tr>
        <td><strong>MyChart / patient portal</strong></td>
        <td>See test results, message providers</td>
        <td>Each provider has a different portal. No unified view. Can\u2019t place phone calls or manage insurance.</td>
      </tr>
      <tr>
        <td><strong>Medisafe (medication tracker)</strong></td>
        <td>Medication reminders</td>
        <td>Tracks pills but has no awareness of insurance, providers, or appointments. Siloed.</td>
      </tr>
      <tr>
        <td><strong>Shared Notes app</strong></td>
        <td>Keep running list of meds, conditions, questions</td>
        <td>Works but requires constant manual updating. No intelligence, no automation.</td>
      </tr>
      <tr>
        <td><strong>Calling providers directly</strong></td>
        <td>Book, cancel, ask questions</td>
        <td>Requires being available during business hours. Average hold times: 15-40 minutes per call.</td>
      </tr>
    </tbody>
  </table>
</div>

<p>The core problem: Lisa was using 5 different tools and still spending 4-6 hours per week managing her mom\u2019s healthcare. None of the tools talked to each other. Every provider change required manually updating everywhere else.</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Lisa needed one place for everything. That\u2019s what we built.</p>
  <h3>One app for your whole family\u2019s healthcare.</h3>
  <p class="blog-cta-context">Insurance, appointments, meds, and bills \u2014 for you and the people you care for. Elena makes the calls and tracks everything.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>What we\u2019re building Elena to do for caregivers like Lisa</h2>

<p>Every conversation with a remote caregiver tells us the same thing: the problem isn\u2019t any single task, it\u2019s that everything is fragmented across different tools, providers, and phone trees. Here\u2019s what we\u2019re building Elena to solve:</p>

<ol>
  <li><strong>One place for insurance, meds, and providers.</strong> Snap a photo of the insurance card, and Elena extracts plan details and formulary information. All medications, conditions, and doctors in one view \u2014 not five different apps.</li>
  <li><strong>Elena makes the phone calls.</strong> Need to reschedule a specialist appointment during a work meeting? Tell Elena from your phone. She calls the office, handles the hold time, and reports back what happened.</li>
  <li><strong>Bill scanning and error detection.</strong> Photograph a bill, and Elena checks it for duplicate charges, coding errors, and overcharges \u2014 the kinds of mistakes that cost Lisa\u2019s family hundreds of dollars.</li>
  <li><strong>Proactive refill reminders.</strong> Elena tracks when prescriptions are likely to run out based on dosing schedules and reminds you to coordinate refills before there\u2019s a gap.</li>
  <li><strong>Family profiles.</strong> Set up profiles for yourself and the people you care for. One app for your whole family\u2019s healthcare.</li>
</ol>

<p>We\u2019re still building \u2014 but every conversation with caregivers like Lisa shapes exactly what Elena becomes.</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">We\u2019re building Elena to manage your parent\u2019s appointments, meds, and bills from your phone.</p>
  <h3>One app for your whole family\u2019s healthcare.</h3>
  <p class="blog-cta-context">Set up profiles for yourself and the people you care for. Elena will track everything and make the calls.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>Legal things to set up before you need them</h2>

<p>One thing I learned talking to Lisa and other caregivers: you need paperwork in place before a crisis happens. Three documents that matter:</p>

<ol>
  <li><strong>HIPAA authorization form.</strong> Without this, providers can refuse to share your parent\u2019s medical information with you. It\u2019s a one-page form that authorizes specific people to access health records. Get one signed for each provider.</li>
  <li><strong>Healthcare power of attorney (healthcare proxy).</strong> This lets you make medical decisions if your parent can\u2019t. Each state has its own form. Many are available free from your state\u2019s bar association website.</li>
  <li><strong>A current medication list.</strong> Not a legal document, but critical. Keep a typed, dated list of every medication, dosage, prescribing doctor, and pharmacy. Update it every time anything changes. Bring it to every appointment.</li>
</ol>

<h2>Resources most remote caregivers don\u2019t know about</h2>

<ul>
  <li><strong>Area Agency on Aging (AAA).</strong> Every county has one. They provide free referrals for local services: meal delivery, transportation, in-home care, legal assistance. Find yours at eldercare.acl.gov or call 1-800-677-1116.</li>
  <li><strong>State Health Insurance Assistance Program (SHIP).</strong> Free Medicare counseling. If your parent recently switched to Medicare or Medicare Advantage, a SHIP counselor can review the plan and make sure it covers what they need.</li>
  <li><strong>Medicare.gov\u2019s plan comparison tool.</strong> If your parent\u2019s Medicare Advantage plan isn\u2019t covering their medications, the plan finder at Medicare.gov lets you compare every plan available in their zip code, filtered by the specific drugs they take.</li>
  <li><strong>Caregiver Action Network.</strong> Peer support and practical guides at caregiveraction.org. Not a product pitch, just a useful nonprofit for people in Lisa\u2019s situation.</li>
</ul>

<h2>Are you managing a parent\u2019s healthcare from a distance?</h2>

<p>The caregiver experience is one of the areas where we think Elena can make the biggest difference, but it\u2019s also the hardest to get right because every family\u2019s situation is unique. If you\u2019re managing a parent\u2019s healthcare remotely and have found tools, strategies, or workarounds that help, I\u2019d genuinely like to hear about them. And if there\u2019s something that consistently frustrates you that nobody\u2019s solved, that\u2019s even more useful.</p>`,
  },

  // ── Post 6: health-insurance-at-26 ──────────────────────────────────
  {
    slug: "health-insurance-at-26",
    title: "5 Things Nobody Teaches You About Health Insurance at 26",
    htmlTitle: "5 Things Nobody Teaches You About Health Insurance at 26",
    description:
      "You\u2019re turning 26 and losing your parent\u2019s insurance. Here are 5 things about deductibles, networks, plan types, and enrollment that nobody explains.",
    ogTitle: "5 Things Nobody Teaches You About Health Insurance at 26",
    ogDescription:
      "Losing your parent\u2019s insurance? Here\u2019s what nobody tells you.",
    category: "Educational Guide",
    author: "Alex Reinhart",
    date: "March 2026",
    datePublished: "2026-03-24",
    readTime: "8 min read",
    ldJson: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "5 Things Nobody Teaches You About Health Insurance at 26",
      description:
        "A practical guide to choosing and understanding health insurance when you age off your parent\u2019s plan at 26.",
      step: [
        {
          "@type": "HowToStep",
          name: "Understand what a deductible actually means for your wallet",
          text: "Your deductible is the amount you pay before insurance covers anything. A $2,000 deductible means you pay the first $2,000 of care each year.",
        },
        {
          "@type": "HowToStep",
          name: "Know the difference between HMO, PPO, and HDHP",
          text: "HMO plans are cheaper but require referrals and staying in-network. PPO plans cost more but let you see any doctor. HDHP plans have the lowest premiums but highest out-of-pocket costs.",
        },
        {
          "@type": "HowToStep",
          name: "Learn why in-network vs out-of-network matters more than you think",
          text: "Seeing an out-of-network doctor can cost 2-5x more, and some plans won\u2019t cover out-of-network care at all.",
        },
        {
          "@type": "HowToStep",
          name: "Understand special enrollment periods",
          text: "Losing your parent\u2019s coverage at 26 qualifies you for a 60-day special enrollment period on Healthcare.gov.",
        },
        {
          "@type": "HowToStep",
          name: "Know that preventive care is free on every plan",
          text: "Under the ACA, annual checkups, certain screenings, and vaccinations are covered at 100% with no copay, even before you meet your deductible.",
        },
      ],
      author: { "@type": "Person", name: "Alex Reinhart" },
      datePublished: "2026-03-24",
      publisher: { "@type": "Organization", name: "Elena Health" },
    },
    bottomCta: {
      heading: "New to insurance? Elena walks you through everything.",
      text: "Snap your insurance card, ask any question, and Elena explains your coverage in plain English. No jargon, no confusion.",
    },
    exitModal: {
      heading: "Health insurance doesn\u2019t have to be confusing.",
      text: "Elena explains your plan, finds your doctors, and handles the calls. Try it free.",
    },
    inlineCtaHtml: `<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Checking network status, comparing plan costs, and understanding your coverage shouldn\u2019t require a finance degree.</p>
  <h3>Elena explains your coverage, finds in-network doctors, and handles the calls.</h3>
  <p class="blog-cta-context">Snap a photo of your insurance card and ask Elena anything about your plan. She speaks English, not insurance.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>`,
    content: `<p class="blog-lede">When you turn 26, you lose your parent\u2019s health insurance. You have 60 days to find your own plan or go uninsured. Nobody teaches you how health insurance actually works before this happens, so here are the five things I wish someone had told me.</p>

<p>I started building Elena partly because of my own experience at 26. I had a job with insurance but had no idea what my deductible was, whether my doctor was in-network, or what would happen if I went to the ER. I was paying for something I didn\u2019t understand and hoping I\u2019d never need to use it. That\u2019s not how insurance should work.</p>

<p>Half the people who\u2019ve reached out to us about Elena are in the 22-30 age range, and the questions they ask are remarkably consistent. Here are the answers.</p>

<h2>1. Your deductible matters more than your premium</h2>

<p>The <strong>premium</strong> is what you pay every month just to have insurance. The <strong>deductible</strong> is how much you pay out of pocket before your insurance starts covering anything (except preventive care, which is always free).</p>

<p>Most people choose the plan with the lowest monthly premium. But a low premium usually means a high deductible, which means you pay more when you actually need care.</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th></th>
        <th>Low Premium Plan</th>
        <th>Mid Premium Plan</th>
        <th>High Premium Plan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Monthly premium</strong></td>
        <td>$180/mo ($2,160/yr)</td>
        <td>$320/mo ($3,840/yr)</td>
        <td>$450/mo ($5,400/yr)</td>
      </tr>
      <tr>
        <td><strong>Deductible</strong></td>
        <td>$6,000</td>
        <td>$2,000</td>
        <td>$500</td>
      </tr>
      <tr>
        <td><strong>If you need a $5,000 procedure</strong></td>
        <td>You pay $5,000 (haven\u2019t met deductible)</td>
        <td>You pay $2,000 + 20% of remaining $3,000 = $2,600</td>
        <td>You pay $500 + 10% of remaining $4,500 = $950</td>
      </tr>
      <tr>
        <td><strong>Total cost for the year (premium + procedure)</strong></td>
        <td>$7,160</td>
        <td>$6,440</td>
        <td>$6,350</td>
      </tr>
      <tr>
        <td><strong>If you don\u2019t need any care</strong></td>
        <td>$2,160</td>
        <td>$3,840</td>
        <td>$5,400</td>
      </tr>
    </tbody>
  </table>
</div>

<p>The math: if you\u2019re generally healthy and rarely use healthcare, the low-premium/high-deductible plan saves you money. But if anything happens, you\u2019re exposed. The mid-tier plan is often the sweet spot for people in their late 20s.</p>

<h2>2. HMO vs. PPO vs. HDHP: what the acronyms actually mean</h2>

<p>These are the three plan types you\u2019ll encounter. Each makes a different trade-off between cost, flexibility, and hassle:</p>

<div class="blog-table-wrapper">
  <table class="blog-table">
    <thead>
      <tr>
        <th></th>
        <th>HMO</th>
        <th>PPO</th>
        <th>HDHP + HSA</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Monthly cost</strong></td>
        <td>Lowest</td>
        <td>Highest</td>
        <td>Low</td>
      </tr>
      <tr>
        <td><strong>Can you see any doctor?</strong></td>
        <td>No. Must stay in-network. Need referrals for specialists.</td>
        <td>Yes. Can see anyone, but out-of-network costs more.</td>
        <td>Depends on the plan, but usually broad network access.</td>
      </tr>
      <tr>
        <td><strong>Need a referral for specialists?</strong></td>
        <td>Yes. Your PCP must refer you.</td>
        <td>No. Book directly.</td>
        <td>No.</td>
      </tr>
      <tr>
        <td><strong>Deductible</strong></td>
        <td>Low ($500-$1,500)</td>
        <td>Medium ($1,000-$3,000)</td>
        <td>High ($1,600-$7,000+)</td>
      </tr>
      <tr>
        <td><strong>Best for</strong></td>
        <td>People who don\u2019t mind picking a PCP and getting referrals. Want lower costs.</td>
        <td>People who want flexibility. Already have specialists they like.</td>
        <td>Healthy people who want to save via HSA tax benefits. Can handle a high deductible.</td>
      </tr>
      <tr>
        <td><strong>HSA eligible?</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes. Pre-tax savings for medical expenses. Rolls over yearly.</td>
      </tr>
    </tbody>
  </table>
</div>

<p><strong>The HSA advantage nobody mentions:</strong> If you choose an HDHP with an HSA (Health Savings Account), you can contribute pre-tax money that rolls over year to year. For someone in their mid-20s, maxing out your HSA ($4,150/year for individuals in 2026) is one of the best financial moves you can make. You get a tax deduction now, the money grows tax-free, and you can use it for medical expenses tax-free at any age.</p>

<h2>3. In-network vs. out-of-network matters way more than you think</h2>

<p>Every insurance plan has a \u201cnetwork\u201d of doctors and facilities that have agreed to accept the plan\u2019s negotiated rates. When you see an in-network provider, you pay the negotiated rate (which is often 50-80% less than the list price). When you see an out-of-network provider, you can pay 2-5x more, and some plans won\u2019t cover out-of-network care at all.</p>

<p>The trap: you go to an in-network hospital, but the anesthesiologist or radiologist who treats you is out-of-network. You had no choice in this. Under the <strong>No Surprises Act</strong> (effective January 2022), you\u2019re protected from surprise out-of-network bills in emergency situations and for certain non-emergency services at in-network facilities. But you need to know this right exists so you can fight back if it happens.</p>

<p>Before seeing any new provider, check whether they\u2019re in-network. You can do this on your insurer\u2019s website, by calling member services, or by asking the provider\u2019s office directly: \u201cDo you accept [plan name]?\u201d</p>

<div class="blog-cta-inline fade-in">
  <p class="blog-cta-context">Checking network status, comparing plan costs, and understanding your coverage shouldn\u2019t require a finance degree.</p>
  <h3>Elena explains your coverage, finds in-network doctors, and handles the calls.</h3>
  <p class="blog-cta-context">Snap a photo of your insurance card and ask Elena anything about your plan. She speaks English, not insurance.</p>
  <a href="/" class="blog-cta-link">Try Elena Free &rarr;</a>
</div>

<h2>4. Turning 26 gives you a special enrollment period</h2>

<p>Normally, you can only sign up for health insurance during Open Enrollment (November-January for marketplace plans). But losing your parent\u2019s coverage at 26 qualifies you for a <strong>Special Enrollment Period (SEP)</strong> of 60 days.</p>

<p>Your options during this window:</p>

<ol>
  <li><strong>Employer plan.</strong> If your job offers insurance, enroll. This is usually the cheapest option because your employer pays part of the premium. Tell HR you\u2019ve had a qualifying life event.</li>
  <li><strong>Healthcare.gov marketplace.</strong> If you don\u2019t have employer coverage, go to Healthcare.gov and apply. Depending on your income, you may qualify for subsidies that reduce your premium significantly. In 2026, a single person earning under ~$60,000 qualifies for some level of subsidy.</li>
  <li><strong>COBRA.</strong> You can continue your parent\u2019s plan for up to 36 months, but you pay the full premium (your parent\u2019s share + employer\u2019s share), which is usually $400-$700/month for an individual. This is rarely the cheapest option, but it\u2019s useful if you need continuity of care (same doctors, same network) for a few months while you transition.</li>
  <li><strong>Medicaid.</strong> If your income is under ~$20,000/year (varies by state), you may qualify for Medicaid, which has very low or no premiums and minimal cost-sharing.</li>
</ol>

<p><strong>The deadline matters:</strong> If you miss the 60-day window, you may be uninsured until the next Open Enrollment period. Set a calendar reminder for 30 days before your 26th birthday to start researching plans.</p>

<h2>5. Preventive care is free on every plan</h2>

<p>Under the Affordable Care Act, every health insurance plan must cover certain preventive services at 100% with no copay or deductible. This means you can get these for free even if you haven\u2019t met your deductible:</p>

<ul>
  <li>Annual wellness visit / physical exam</li>
  <li>Blood pressure screening</li>
  <li>Cholesterol screening (for certain ages/risk levels)</li>
  <li>Depression screening</li>
  <li>Diabetes screening (Type 2, for adults with high blood pressure)</li>
  <li>Immunizations (flu shot, Hepatitis B, HPV, etc.)</li>
  <li>STI screenings</li>
  <li>Contraception</li>
  <li>Tobacco use counseling</li>
</ul>

<p>The catch: these are only free when coded as \u201cpreventive.\u201d If your doctor runs a blood panel as part of your annual physical and codes it as \u201cdiagnostic\u201d (because they\u2019re checking on a specific symptom), it may be billed differently and subject to your deductible. If this happens and you think it was preventive, you can ask the provider to resubmit with the correct preventive care code.</p>

<h2>What confused you most about health insurance when you first got your own plan?</h2>

<p>I ask everyone who reaches out to us this question, and the answers are remarkably consistent: deductibles, in-network confusion, and \u201cI don\u2019t know what my plan actually covers.\u201d If you went through this transition and learned something the hard way, or if you\u2019re about to turn 26 and have questions, I\u2019d like to hear from you.</p>

<div class="blog-sources">
  <h2>Sources</h2>
  <ol>
    <li><a href="https://www.healthcare.gov/young-adults/children-under-26/" target="_blank" rel="noopener">Healthcare.gov: Coverage for Young Adults Under 26</a> \u2014 ACA Section 2714 requiring insurers to cover dependents until age 26.</li>
    <li><a href="https://www.healthcare.gov/glossary/special-enrollment-period/" target="_blank" rel="noopener">Healthcare.gov: Special Enrollment Period</a> \u2014 60-day enrollment window triggered by loss of coverage.</li>
    <li><a href="https://www.healthcare.gov/coverage/preventive-care-benefits/" target="_blank" rel="noopener">Healthcare.gov: Preventive Care Benefits</a> \u2014 ACA Section 2713 requiring 100% coverage of preventive services with no cost-sharing.</li>
    <li><a href="https://www.irs.gov/publications/p969" target="_blank" rel="noopener">IRS: Publication 969 \u2014 Health Savings Accounts</a> \u2014 HSA contribution limits and eligibility rules.</li>
    <li><a href="https://www.cms.gov/newsroom/fact-sheets/no-surprises-act-protections-against-surprise-medical-bills" target="_blank" rel="noopener">CMS: No Surprises Act Fact Sheet</a> \u2014 Protections against surprise out-of-network billing (effective January 2022).</li>
    <li><a href="https://www.dol.gov/general/topic/health-plans/cobra" target="_blank" rel="noopener">U.S. Department of Labor: COBRA Coverage</a> \u2014 Continuation coverage for up to 36 months after loss of group health plan.</li>
    <li><a href="https://www.medicaid.gov/medicaid/eligibility/index.html" target="_blank" rel="noopener">Medicaid.gov: Eligibility</a> \u2014 Income thresholds for Medicaid eligibility (varies by state).</li>
    <li><a href="https://www.healthcare.gov/lower-costs/" target="_blank" rel="noopener">Healthcare.gov: Savings on Marketplace Insurance</a> \u2014 Premium tax credit eligibility based on income and federal poverty level.</li>
  </ol>
</div>`,
  },
];

// ── Blog index for the listing page ───────────────────────────────────
export const BLOG_INDEX = [
  {
    slug: "breast-mri-saved-1200",
    title: "How Elena Helped One User Save $1,200 on a Breast MRI",
    description:
      "A real Elena story about helping a user compare imaging options and find a much cheaper cash-pay path.",
  },
  {
    slug: "genetic-testing-prevention-plan",
    title: "How Elena Helped One User Turn Genetic Testing and Bloodwork Into a Prevention Plan",
    description:
      "A real Elena story about using existing bloodwork and genetic testing to figure out which preventive next steps actually made sense.",
  },
  {
    slug: "medical-bill-errors",
    title: "How to Check Your Medical Bill for Errors",
    description:
      "Up to 80% of medical bills contain errors. A step-by-step guide to finding overcharges, duplicate charges, and wrong codes.",
  },
  {
    slug: "47-minutes-on-hold",
    title:
      "47 Minutes on Hold With Insurance. This Is Why We\u2019re Building Elena.",
    description:
      "A founder\u2019s account of watching someone spend 47 minutes on hold with her insurance company \u2014 and the problem that inspired Elena.",
  },
  {
    slug: "mri-cost-comparison",
    title:
      "The Same MRI Costs $400 or $2,500 \u2014 Here\u2019s How to Find the Cheap One",
    description:
      "MRI prices vary by 5-10x depending on where you go. How to find the actual negotiated price your insurance pays.",
  },
  {
    slug: "what-eob-means",
    title:
      "What Your EOB Actually Means (And Why It\u2019s Not a Bill)",
    description:
      "A field-by-field breakdown of what every line on your Explanation of Benefits means and what to do if something looks wrong.",
  },
  {
    slug: "managing-parents-healthcare",
    title:
      "Managing Your Parent\u2019s Healthcare From 1,000 Miles Away",
    description:
      "What remote caregiving actually looks like \u2014 tools, legal documents, and resources most caregivers don\u2019t know about.",
  },
  {
    slug: "health-insurance-at-26",
    title:
      "5 Things Nobody Teaches You About Health Insurance at 26",
    description:
      "You\u2019re turning 26 and losing your parent\u2019s insurance. What nobody explains about deductibles, networks, and enrollment.",
  },
];

// ── Helper to look up a single post by slug ───────────────────────────
export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
