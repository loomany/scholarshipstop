export type StaticEssayGuide = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  oneSentence: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    body: string;
    bullets: string[];
  }>;
  checklist: string[];
  doDont: Array<{ do: string; dont: string }>;
  examples: string[];
  links: Array<{ href: string; label: string }>;
  faq: Array<{ question: string; answer: string }>;
};

const DEFAULT_UPDATED_AT = '2026-05-17T00:00:00.000Z';

const commonLinks = [
  { href: '/essay', label: 'Open Essay Mentor' },
  { href: '/scholarships', label: 'Browse scholarships' },
  { href: '/financial-aid-disclaimer', label: 'Financial aid disclaimer' }
];

export const STATIC_ESSAY_GUIDES: StaticEssayGuide[] = [
  {
    slug: 'examples',
    title: 'Scholarship Essay Examples and How to Use Them',
    description:
      'Study scholarship essay examples without copying them. Learn how to analyze structure, evidence, and revision choices.',
    h1: 'Scholarship Essay Examples',
    intro:
      'Examples are useful when they teach structure, not when they become a script. Use them to notice how a strong essay connects a prompt, a specific story, and a clear next step.',
    oneSentence:
      'A good scholarship essay example helps you understand structure while still writing an original answer from your own facts.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'How to read an example',
        body:
          'Do not start by copying the opening line. First identify the prompt, the applicant profile, the turning point, and the evidence that makes the essay believable.',
        bullets: [
          'Underline the main claim in each paragraph.',
          'Mark the concrete evidence: project, job, family duty, service, research, or challenge.',
          'Notice how the ending connects the award to a realistic academic or career step.'
        ]
      },
      {
        title: 'Build your own version',
        body:
          'Turn the example into a planning tool. Replace every borrowed detail with a fact from your life, then revise until the essay sounds specific to you.',
        bullets: [
          'Use your own timeline, people, numbers, and choices.',
          'Keep the provider mission in mind without flattering the committee.',
          'Check that every paragraph answers the prompt.'
        ]
      }
    ],
    checklist: [
      'Identify the prompt type.',
      'Write your own thesis in one sentence.',
      'Choose one main story instead of several vague claims.',
      'Add concrete evidence.',
      'Connect the ending to your next educational step.',
      'Confirm the essay follows the provider word limit.'
    ],
    doDont: [
      {
        do: 'Use examples to study structure and pacing.',
        dont: 'Copy sentences, personal stories, or emotional language.'
      },
      {
        do: 'Borrow the idea of evidence-based storytelling.',
        dont: 'Invent hardship, leadership, awards, or volunteer work.'
      }
    ],
    examples: [
      'Weak: I have always wanted to help people. Stronger: After tutoring six classmates in algebra, I learned that I enjoy breaking difficult ideas into steps.',
      'Weak: This scholarship would change my life. Stronger: This award would cover the certification exam fee I need before my first clinical placement.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/checklist', label: 'Essay checklist' },
      { href: '/essays/mistakes', label: 'Common essay mistakes' }
    ],
    faq: [
      {
        question: 'Can I reuse a scholarship essay example?',
        answer:
          'You can reuse the structure as a learning model, but the final essay should be written from your own facts, goals, and prompt requirements.'
      },
      {
        question: 'Should my essay sound dramatic?',
        answer:
          'Not necessarily. A focused, specific, honest essay is usually stronger than a dramatic essay that does not answer the prompt.'
      }
    ]
  },
  {
    slug: 'outline',
    title: 'Scholarship Essay Outline: A Simple Structure That Works',
    description:
      'Plan a scholarship essay with a clear hook, evidence, reflection, and next step before drafting.',
    h1: 'Scholarship Essay Outline',
    intro:
      'A scholarship essay outline keeps your answer from becoming a list of achievements. The goal is to make one focused argument about fit.',
    oneSentence:
      'A strong outline gives each paragraph a job: answer the prompt, prove it with evidence, and connect it to the award.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Five-part outline',
        body:
          'Most scholarship essays can be planned with five parts: hook, context, evidence, reflection, and future use of the award.',
        bullets: [
          'Hook: a specific moment, decision, or problem.',
          'Context: why the moment matters.',
          'Evidence: what you did, learned, built, or changed.',
          'Reflection: what the evidence shows about you.',
          'Next step: how the scholarship supports a real plan.'
        ]
      },
      {
        title: 'Keep the prompt visible',
        body:
          'Before drafting, rewrite the prompt as a checklist. Each paragraph should satisfy one part of that checklist.',
        bullets: [
          'Circle required themes like need, leadership, service, or goals.',
          'Mark any requested word count or formatting rule.',
          'Reserve the last paragraph for a concrete next step.'
        ]
      }
    ],
    checklist: [
      'Write the prompt in plain English.',
      'Choose one central claim.',
      'Pick the strongest evidence.',
      'Plan a reflection sentence for each body paragraph.',
      'End with how the award helps your next step.'
    ],
    doDont: [
      { do: 'Outline before drafting.', dont: 'Start with a generic life story.' },
      {
        do: 'Use one main story with clear evidence.',
        dont: 'List every activity on your resume.'
      }
    ],
    examples: [
      'Prompt: Explain your career goals. Outline: clinical volunteer moment, healthcare interest, coursework, next training step, scholarship impact.',
      'Prompt: Describe leadership. Outline: problem in a club, action taken, result, lesson, how that lesson shapes college plans.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/career-goals', label: 'Career goals essay' },
      { href: '/essays/leadership', label: 'Leadership essay' }
    ],
    faq: [
      {
        question: 'How many paragraphs should a scholarship essay have?',
        answer:
          'Many essays work well in four or five paragraphs, but the prompt and word limit matter more than a fixed count.'
      },
      {
        question: 'Should I outline short essays too?',
        answer:
          'Yes. A short outline prevents repetition and helps you spend limited words on the strongest evidence.'
      }
    ]
  },
  {
    slug: 'checklist',
    title: 'Scholarship Essay Checklist Before Submission',
    description:
      'Use this scholarship essay checklist to revise for prompt fit, evidence, clarity, formatting, and final submission risk.',
    h1: 'Scholarship Essay Checklist',
    intro:
      'A final essay check should test more than grammar. It should confirm that the essay answers the prompt, uses real evidence, and follows every provider instruction.',
    oneSentence:
      'Before submitting, check prompt fit, evidence, word count, documents, and official provider instructions.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'First pass: strategy',
        body:
          'Read the essay as if you are the reviewer. The main point should be clear without needing your resume next to it.',
        bullets: [
          'The first paragraph answers the prompt quickly.',
          'The body includes specific evidence.',
          'The ending explains why the award matters now.'
        ]
      },
      {
        title: 'Second pass: submission safety',
        body:
          'Scholarship essays often fail because of missing instructions, not weak writing. Confirm the rules on the provider page before uploading.',
        bullets: [
          'Check word count, file type, deadline, and timezone.',
          'Confirm whether the essay must be anonymous.',
          'Make sure your name, school, and contact information match the application.'
        ]
      }
    ],
    checklist: [
      'The essay answers the exact prompt.',
      'The introduction is specific, not generic.',
      'Every claim has evidence.',
      'The essay avoids invented facts and exaggerated promises.',
      'Word count and formatting match the provider rules.',
      'A second reader checked clarity.',
      'The official deadline and submission route are confirmed.'
    ],
    doDont: [
      { do: 'Read the essay aloud once.', dont: 'Submit the first clean draft.' },
      {
        do: 'Check the official provider instructions.',
        dont: 'Trust a copied deadline from a secondary website.'
      }
    ],
    examples: [
      'Revision note: Replace "I am passionate" with the project, course, or responsibility that proves the passion.',
      'Submission note: If the provider requests PDF only, do not upload a document file even if the form accepts it.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/examples', label: 'Essay examples' },
      { href: '/essays/mistakes', label: 'Mistakes to avoid' }
    ],
    faq: [
      {
        question: 'What is the most important final check?',
        answer:
          'Prompt fit. A polished essay that does not answer the prompt is still a weak scholarship essay.'
      },
      {
        question: 'Can ScholarshipTop guarantee my essay will win?',
        answer:
          'No. ScholarshipTop provides writing guidance and planning support, but selection decisions belong to the scholarship provider.'
      }
    ]
  },
  {
    slug: 'mistakes',
    title: 'Common Scholarship Essay Mistakes to Avoid',
    description:
      'Avoid common scholarship essay mistakes: generic openings, unsupported claims, prompt drift, vague need statements, and missed instructions.',
    h1: 'Common Scholarship Essay Mistakes',
    intro:
      'Most weak scholarship essays are not bad because the applicant lacks a story. They are weak because the story is too general, too disconnected from the prompt, or missing proof.',
    oneSentence:
      'The biggest scholarship essay mistake is writing a polished essay that could belong to anyone.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Mistake 1: generic claims',
        body:
          'Words like passionate, hardworking, and deserving are not proof. Replace them with actions, choices, and results.',
        bullets: [
          'Name the project, class, job, or responsibility.',
          'Show what changed because of your action.',
          'Use details you can defend if asked.'
        ]
      },
      {
        title: 'Mistake 2: ignoring the provider',
        body:
          'A scholarship essay should not flatter the organization, but it should understand what the provider asked for.',
        bullets: [
          'Check whether the prompt emphasizes service, need, leadership, field, or goals.',
          'Avoid sending the same essay to every award without revision.',
          'Confirm whether the provider asks for specific examples.'
        ]
      }
    ],
    checklist: [
      'Remove generic opening sentences.',
      'Replace unsupported traits with proof.',
      'Check every paragraph against the prompt.',
      'Cut resume repetition.',
      'Confirm final instructions on the official page.'
    ],
    doDont: [
      { do: 'Use concrete examples.', dont: 'Depend on adjectives alone.' },
      { do: 'Revise for the specific provider prompt.', dont: 'Send one unchanged essay everywhere.' }
    ],
    examples: [
      'Generic: I am a leader. Better: I organized a weekend food drive after our school club lost its sponsor.',
      'Generic: I need this scholarship. Better: This award would cover the lab fee that is not included in my current aid package.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/checklist', label: 'Final checklist' },
      { href: '/scholarship-scam-warning', label: 'Scholarship scam warning' }
    ],
    faq: [
      {
        question: 'Is it bad to mention financial need?',
        answer:
          'No. Financial need can be important, but it should be specific, honest, and connected to your education plan.'
      },
      {
        question: 'Can I reuse one essay?',
        answer:
          'You can reuse parts of a strong essay, but revise the framing for each prompt and provider.'
      }
    ]
  },
  {
    slug: 'financial-need',
    title: 'How to Write a Financial Need Scholarship Essay',
    description:
      'Write a financial need scholarship essay that is honest, specific, and connected to your education plan.',
    h1: 'Financial Need Scholarship Essay Guide',
    intro:
      'A financial need essay should explain the gap between your resources and your education plan without turning the whole essay into a list of hardships.',
    oneSentence:
      'A strong financial need essay connects a real funding gap to a realistic academic next step.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Explain the gap clearly',
        body:
          'Use plain language. The committee needs to understand what cost is hard to cover and why the scholarship would help.',
        bullets: [
          'Mention specific education costs when appropriate.',
          'Explain family, work, or aid limits without oversharing.',
          'Connect the award to enrollment, materials, transportation, fees, or exams.'
        ]
      },
      {
        title: 'Balance need with agency',
        body:
          'Financial need matters, but the essay should also show what you are doing with the opportunity.',
        bullets: [
          'Include coursework, work, service, or responsibilities.',
          'Show how you have planned around constraints.',
          'End with a concrete next step.'
        ]
      }
    ],
    checklist: [
      'Name the education goal.',
      'Describe the funding gap honestly.',
      'Avoid exaggeration.',
      'Show effort or planning.',
      'Explain how the award would be used.',
      'Check whether supporting financial documents are required.'
    ],
    doDont: [
      { do: 'Be specific about costs.', dont: 'Share private details the prompt does not ask for.' },
      { do: 'Connect need to your plan.', dont: 'Make the essay only about hardship.' }
    ],
    examples: [
      'This award would help cover the certification exam and required supplies for my first semester in the nursing program.',
      'Because I work weekends to help with household costs, a smaller textbook award would reduce the hours I need to add during exam weeks.'
    ],
    links: [
      ...commonLinks,
      { href: '/scholarships', label: 'Find need-aware scholarships' },
      { href: '/resources/scholarship-documents-checklist', label: 'Documents checklist' }
    ],
    faq: [
      {
        question: 'Should I include exact family income?',
        answer:
          'Only include exact income if the prompt or application requests it. Otherwise, explain the funding gap in practical terms.'
      },
      {
        question: 'Can I mention work or family responsibilities?',
        answer:
          'Yes, if they help explain your education path and financial context without distracting from the prompt.'
      }
    ]
  },
  {
    slug: 'career-goals',
    title: 'How to Write a Career Goals Scholarship Essay',
    description:
      'Plan a career goals scholarship essay with specific motivation, evidence, and realistic next steps.',
    h1: 'Career Goals Scholarship Essay Guide',
    intro:
      'A career goals essay should show why the goal makes sense for you now, not just what job title you want later.',
    oneSentence:
      'A strong career goals essay links your past evidence, current study plan, and next professional step.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Make the goal believable',
        body:
          'Reviewers do not need a perfect ten-year plan. They need a goal that connects to your choices and preparation.',
        bullets: [
          'Name the field or role clearly.',
          'Show what introduced you to the work.',
          'Include coursework, service, projects, jobs, or research that support the goal.'
        ]
      },
      {
        title: 'Use the scholarship as a bridge',
        body:
          'The award should connect to a practical next step, such as tuition, books, certification, travel, equipment, or unpaid field experience.',
        bullets: [
          'Explain what the award makes easier or possible.',
          'Avoid promising outcomes you cannot guarantee.',
          'Keep the focus on education and preparation.'
        ]
      }
    ],
    checklist: [
      'State the goal in one clear sentence.',
      'Add one specific origin story or evidence point.',
      'Connect your study plan to the goal.',
      'Explain how the scholarship supports the next step.',
      'End with a realistic contribution or direction.'
    ],
    doDont: [
      { do: 'Use evidence from your path.', dont: 'Write only about future dreams.' },
      { do: 'Be realistic and specific.', dont: 'Promise guaranteed impact or success.' }
    ],
    examples: [
      'My goal is to become a public health analyst focused on rural access, a direction that began when I helped translate clinic forms for neighbors.',
      'The scholarship would help cover the data certificate I need before applying for a summer health research placement.'
    ],
    links: [
      ...commonLinks,
      { href: '/resources/medical-scholarships-guide', label: 'Medical scholarships guide' },
      { href: '/essays/financial-need', label: 'Financial need essay' },
      { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' },
      { href: '/compare/universities', label: 'Compare universities' },
      { href: '/essays/outline', label: 'Essay outline' },
      { href: '/scholarships/stem', label: 'STEM scholarships' }
    ],
    faq: [
      {
        question: 'What if my career goal may change?',
        answer:
          'You can be honest about a direction rather than a fixed title. Explain the field, problem, or kind of work you are preparing for.'
      },
      {
        question: 'Should I mention salary?',
        answer:
          'Usually no. Focus on preparation, service, skill, and education unless the prompt specifically asks about economic goals.'
      }
    ]
  },
  {
    slug: 'leadership',
    title: 'How to Write a Leadership Scholarship Essay',
    description:
      'Write a leadership scholarship essay with a real problem, action, result, and lesson instead of generic leadership claims.',
    h1: 'Leadership Scholarship Essay Guide',
    intro:
      'Leadership essays are strongest when they describe a specific problem and what you did when other people depended on your judgment.',
    oneSentence:
      'A leadership essay should show action, responsibility, result, and reflection.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Choose a real leadership moment',
        body:
          'Leadership does not have to mean president of a club. It can mean organizing, mediating, tutoring, caring for family, starting a project, or taking responsibility.',
        bullets: [
          'Start with a problem, not a title.',
          'Explain what you personally did.',
          'Name the outcome or lesson.'
        ]
      },
      {
        title: 'Show growth',
        body:
          'Committees often want to see how you think under pressure. Include what you learned and how it changed your next action.',
        bullets: [
          'Avoid claiming you solved everything alone.',
          'Credit the team or community when relevant.',
          'Connect the lesson to your education plan.'
        ]
      }
    ],
    checklist: [
      'Identify the problem.',
      'Explain your role.',
      'Describe the action you took.',
      'Show a result or change.',
      'Reflect on the lesson.',
      'Connect leadership to the scholarship prompt.'
    ],
    doDont: [
      { do: 'Write about responsibility.', dont: 'Rely only on titles.' },
      { do: 'Show collaboration.', dont: 'Make yourself the only hero.' }
    ],
    examples: [
      'When our robotics team lost meeting space, I coordinated a rotating schedule with the library and two parents so we could finish the build.',
      'Tutoring my younger cousin every night taught me to break tasks into repeatable steps, which now shapes how I lead study groups.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/examples', label: 'Essay examples' },
      { href: '/scholarships', label: 'Find leadership scholarships' }
    ],
    faq: [
      {
        question: 'Can family responsibility count as leadership?',
        answer:
          'Yes, if the prompt allows a broad definition. Explain the responsibility, choices, and skills without overstating the situation.'
      },
      {
        question: 'Do I need a leadership title?',
        answer:
          'No. A clear example of initiative and responsibility can be stronger than a title with no evidence.'
      }
    ]
  },
  {
    slug: 'why-do-you-deserve-this-scholarship',
    title: 'How to Answer: Why Do You Deserve This Scholarship?',
    description:
      'Answer the common scholarship prompt without sounding entitled. Connect fit, evidence, need, and next steps.',
    h1: 'Why Do You Deserve This Scholarship?',
    intro:
      'This prompt is not asking you to declare that you are better than every other applicant. It asks you to explain why your profile fits the purpose of the award.',
    oneSentence:
      'Answer this prompt by proving fit with evidence, not by claiming entitlement.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Translate deserve into fit',
        body:
          'Use the provider criteria as your frame. If the award values service, discuss service. If it values field commitment, discuss your preparation.',
        bullets: [
          'Name the fit between your profile and the award.',
          'Support the fit with one or two facts.',
          'Explain how the award helps the next step.'
        ]
      },
      {
        title: 'Stay confident and grounded',
        body:
          'The tone should be clear and grateful, not apologetic or boastful.',
        bullets: [
          'Avoid saying you deserve it more than others.',
          'Avoid generic gratitude without evidence.',
          'Keep the ending practical.'
        ]
      }
    ],
    checklist: [
      'Identify the scholarship purpose.',
      'State your fit.',
      'Give evidence.',
      'Mention need only if relevant.',
      'Connect the award to a concrete next step.'
    ],
    doDont: [
      { do: 'Use evidence to show fit.', dont: 'Compare yourself against unknown applicants.' },
      { do: 'Keep a respectful tone.', dont: 'Sound guaranteed or entitled.' }
    ],
    examples: [
      'I fit this scholarship because my volunteer tutoring and planned education major match its focus on future teachers.',
      'The award would help me cover required lab supplies for the semester in which I begin supervised research.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/checklist', label: 'Before submitting' },
      { href: '/how-we-rank-scholarships', label: 'How recommendations work' }
    ],
    faq: [
      {
        question: 'Should I say I deserve the scholarship?',
        answer:
          'You can use the language of the prompt, but support it with fit, evidence, and a realistic next step.'
      },
      {
        question: 'Should I mention other applicants?',
        answer:
          'Usually no. Focus on your fit rather than speculating about other students.'
      }
    ]
  },
  {
    slug: 'personal-statement',
    title: 'Scholarship Personal Statement Guide',
    description:
      'Write a scholarship personal statement that connects background, motivation, evidence, and future direction.',
    h1: 'Scholarship Personal Statement',
    intro:
      'A scholarship personal statement gives the committee a coherent picture of who you are, what shaped your direction, and why the award fits your next step.',
    oneSentence:
      'A personal statement should make your background, motivation, and plan feel connected.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Find the through-line',
        body:
          'The best personal statements are not full autobiographies. They choose the details that explain your current direction.',
        bullets: [
          'Pick two or three moments that connect.',
          'Explain choices, not just events.',
          'End with the education path you are pursuing.'
        ]
      },
      {
        title: 'Avoid resume repetition',
        body:
          'A personal statement can mention achievements, but it should reveal meaning and motivation that a resume cannot show.',
        bullets: [
          'Use reflection after each example.',
          'Show how your thinking changed.',
          'Keep the tone specific and direct.'
        ]
      }
    ],
    checklist: [
      'Choose a central theme.',
      'Use specific examples.',
      'Explain why the examples matter.',
      'Connect to academic or career direction.',
      'Cut details that do not support the prompt.'
    ],
    doDont: [
      { do: 'Make the statement coherent.', dont: 'Try to include your whole life.' },
      { do: 'Reflect on examples.', dont: 'Repeat your resume line by line.' }
    ],
    examples: [
      'A first-generation student might connect family translation responsibilities to interest in public policy or healthcare access.',
      'A transfer student might explain how community college clarified the field they now want to pursue.'
    ],
    links: [
      ...commonLinks,
      { href: '/essays/financial-need', label: 'Financial need essay' },
      { href: '/essays/career-goals', label: 'Career goals essay' }
    ],
    faq: [
      {
        question: 'Is a personal statement the same as a scholarship essay?',
        answer:
          'Sometimes. A personal statement is a broad essay about your background and direction, while many scholarship essays answer a narrower prompt.'
      },
      {
        question: 'How personal should it be?',
        answer:
          'Personal enough to explain your path, but not so private that it distracts from the prompt or makes you uncomfortable.'
      }
    ]
  },
  {
    slug: 'stem',
    title: 'How to Write a STEM Scholarship Essay',
    description:
      'Plan a STEM scholarship essay around projects, coursework, research, service, and a clear technical direction.',
    h1: 'STEM Scholarship Essay Guide',
    intro:
      'A STEM scholarship essay should show how you think, build, test, research, or solve problems. Avoid only saying that you like science or technology.',
    oneSentence:
      'A strong STEM essay uses technical evidence and explains why the work matters.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'Use technical evidence',
        body:
          'Projects, labs, code, internships, robotics, tutoring, research, and coursework can all become evidence if you explain your role clearly.',
        bullets: [
          'Describe the problem you worked on.',
          'Name your contribution.',
          'Explain what you learned or what changed.'
        ]
      },
      {
        title: 'Connect STEM to impact',
        body:
          'The essay should connect technical interest to a person, community, industry, research question, or career direction.',
        bullets: [
          'Avoid jargon that does not serve the story.',
          'Define technical terms when needed.',
          'Show curiosity and persistence.'
        ]
      }
    ],
    checklist: [
      'Name your STEM field or direction.',
      'Use a specific project or learning moment.',
      'Explain your role.',
      'Connect skills to future study.',
      'Confirm if the provider wants a major, GPA, or research plan.'
    ],
    doDont: [
      { do: 'Show how you solve problems.', dont: 'List STEM buzzwords.' },
      { do: 'Explain your contribution.', dont: 'Let the project sound like someone else did the work.' }
    ],
    examples: [
      'Instead of "I love engineering," explain how testing a bridge model taught you to revise after failure.',
      'Instead of "AI is the future," describe a dataset, tool, or ethics question you actually explored.'
    ],
    links: [
      ...commonLinks,
      { href: '/scholarships/stem', label: 'STEM scholarships' },
      { href: '/scholarships/engineering', label: 'Engineering scholarships' }
    ],
    faq: [
      {
        question: 'Should a STEM essay include technical details?',
        answer:
          'Yes, but only enough to show your role and thinking. The essay should still be readable for non-specialist reviewers.'
      },
      {
        question: 'Can I write about a class project?',
        answer:
          'Yes. A class project can work if you explain the problem, your contribution, and what it shows about your direction.'
      }
    ]
  },
  {
    slug: 'no-essay-scholarships',
    title: 'No-Essay Scholarships: What They Are and How to Use Them',
    description:
      'Understand no-essay scholarships, how they differ from essay awards, and what students should verify before applying.',
    h1: 'No-Essay Scholarships',
    intro:
      'No-essay scholarships can save time, but they are not automatically easier to win. Many are broad, high-volume opportunities, so students should verify the source and balance them with better-fit awards.',
    oneSentence:
      'No-essay scholarships reduce writing effort, but students still need to check eligibility, source, deadline, and selection rules.',
    updatedAt: DEFAULT_UPDATED_AT,
    sections: [
      {
        title: 'What no-essay usually means',
        body:
          'No-essay means the provider does not ask for a traditional written essay. The application may still require forms, eligibility answers, enrollment proof, or account creation.',
        bullets: [
          'Check whether a short-answer question still exists.',
          'Confirm eligibility before entering personal information.',
          'Read how the winner is selected.'
        ]
      },
      {
        title: 'How to use them wisely',
        body:
          'Use no-essay awards as part of a balanced scholarship plan, not the whole plan.',
        bullets: [
          'Save low-effort options with clear official sources.',
          'Prioritize better-fit awards when time is limited.',
          'Watch for application fees or unclear contact details.'
        ]
      }
    ],
    checklist: [
      'Confirm no essay is actually required.',
      'Check eligibility rules.',
      'Confirm deadline and selection method.',
      'Avoid application fees unless the provider is clearly legitimate.',
      'Balance no-essay awards with fit-based scholarships.'
    ],
    doDont: [
      { do: 'Use no-essay awards for quick additions.', dont: 'Depend only on broad sweepstakes-style awards.' },
      { do: 'Confirm official source.', dont: 'Submit sensitive data to unclear sites.' }
    ],
    examples: [
      'A no-essay award with a clear provider, deadline, and rules can be worth saving as a quick application.',
      'A no-essay listing with no official source or unclear selection rules should be treated as a lead to verify, not an automatic application.'
    ],
    links: [
      ...commonLinks,
      { href: '/scholarships/no-essay', label: 'No essay scholarships' },
      { href: '/compare/no-essay-vs-essay-scholarships', label: 'No-essay vs essay scholarships' },
      { href: '/scholarship-scam-warning', label: 'Scam warning' }
    ],
    faq: [
      {
        question: 'Are no-essay scholarships legitimate?',
        answer:
          'Some are legitimate and some need extra caution. Check the official source, eligibility, deadline, selection method, and privacy expectations before applying.'
      },
      {
        question: 'Are no-essay scholarships easier to win?',
        answer:
          'They can be easier to submit, but broad eligibility often means more competition. A targeted essay scholarship may be a better fit.'
      }
    ]
  }
];

export function getStaticEssayGuide(
  slug: string | null | undefined
): StaticEssayGuide | null {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;
  return (
    STATIC_ESSAY_GUIDES.find((guide) => guide.slug.toLowerCase() === normalized) ??
    null
  );
}
