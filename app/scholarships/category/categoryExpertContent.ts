import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';

export type CategoryExpertFaqItem = {
  question: string;
  answer: string;
};

export type CategoryExpertRelatedLink = {
  label: string;
  href: string;
  description?: string;
};

export type CategoryExpertContent = {
  intro?: string;
  howThisPageWorks?: string;
  howToIncreaseChances?: string[];
  faqItems?: CategoryExpertFaqItem[];
  relatedLinks?: CategoryExpertRelatedLink[];
};

const CATEGORY_EXPERT_CONTENT: Partial<
  Record<ScholarshipCategoryId, CategoryExpertContent>
> = {
  arts: {
    faqItems: [
      {
        question: 'Who can apply for arts scholarships?',
        answer:
          'Arts scholarship eligibility depends on the provider and the discipline. Some awards support visual arts, design, photography, film, theater, dance, creative writing, or interdisciplinary work, while others are open to any student with a strong creative portfolio. Providers may ask for samples, an artist statement, school enrollment, GPA, financial need, local residency, or plans to continue studying or practicing the arts.'
      },
      {
        question: 'What should I prepare before applying for arts scholarships?',
        answer:
          'Start by organizing a small portfolio that matches the scholarship instructions. This may include images, videos, writing samples, performance links, project descriptions, or a resume of exhibitions, productions, publications, classes, or community arts work. Many arts scholarships also ask for an artist statement, so be ready to explain your influences, process, goals, and why the award would support your next step.'
      },
      {
        question: 'Do arts scholarships require a specific major?',
        answer:
          'Some arts scholarships require applicants to major in an arts-related field, but many do not. A provider may care more about demonstrated creative work, a portfolio, community involvement, or plans to keep developing as an artist. If you are undecided or combining art with another field, look for awards that accept creative practice, extracurricular work, or career goals rather than a strict major requirement.'
      }
    ]
  },
  music: {
    faqItems: [
      {
        question: 'Who can apply for music scholarships?',
        answer:
          'Music scholarships may support instrumentalists, vocalists, composers, producers, conductors, music education majors, music therapy students, or students active in ensembles and community performance. Some awards are tied to a college music program, while others come from foundations, local arts groups, or professional associations. Eligibility may depend on auditions, recordings, repertoire, school level, GPA, financial need, location, or intended major.'
      },
      {
        question: 'Do music scholarships usually require an audition?',
        answer:
          'Many music scholarships require an audition, recording, or performance sample, but not all of them do. Some awards focus on essays, leadership, community involvement, composition, music education, or financial need. If an audition is required, check the format, repertoire rules, accompaniment expectations, file type, and deadline early. Recording or scheduling an audition often takes more planning than a standard application form.'
      },
      {
        question: 'How can I strengthen a music scholarship application?',
        answer:
          'Choose application materials that show both skill and commitment. Useful details can include ensemble participation, private study, competitions, performances, songwriting, production work, teaching, church or community music, or plans for music education or therapy. If the prompt allows, explain how music has shaped your goals and what the scholarship would help you do next, rather than relying only on a list of activities.'
      }
    ]
  },
  stem: {
    intro:
      'Explore STEM scholarships for students in science, technology, engineering, math, computer science, data, research, and related technical fields. Compare deadlines, award amounts, GPA expectations, eligibility requirements, and application materials so you can focus on scholarships that match both your academic track and long-term goals.',
    faqItems: [
      {
        question: 'Who can apply for STEM scholarships?',
        answer:
          'STEM scholarship eligibility varies by provider. Some awards are open to any student pursuing science, technology, engineering, or math, while others focus on specific majors such as computer science, biology, engineering, data science, physics, or environmental science. Providers may also consider GPA, school level, research experience, financial need, location, identity, or participation in STEM clubs, competitions, internships, or community programs.'
      },
      {
        question: 'How can I make a STEM scholarship application stronger?',
        answer:
          'A strong STEM application usually connects your technical interests to real work you have done or want to do. Mention projects, research, coursework, internships, robotics, coding, lab experience, tutoring, or community problem-solving when relevant. If an essay is required, avoid only saying you like science or technology; explain what you are building toward and why the provider’s scholarship fits that path.'
      },
      {
        question: 'Are STEM scholarships only for students with very high GPAs?',
        answer:
          'Not always. Some STEM scholarships have firm GPA minimums, especially those tied to academic departments or professional organizations, but others weigh essays, financial need, service, leadership, first-generation status, or commitment to a specific field. Review the requirements before skipping an opportunity. If your GPA is not the strongest part of your profile, prioritize awards that value projects, persistence, experience, or career goals.'
      }
    ]
  },
  education: {
    intro:
      'Explore education scholarships for future teachers, school counselors, education majors, early childhood educators, special education students, and others preparing for work in schools or learning-focused careers. Compare eligibility, deadlines, award amounts, degree requirements, and service expectations before choosing where to apply.',
    faqItems: [
      {
        question: 'Who can apply for education scholarships?',
        answer:
          'Education scholarships may support undergraduate education majors, graduate students, future teachers, paraprofessionals, school counseling students, early childhood educators, special education candidates, or students pursuing educational leadership. Some awards require enrollment in a teacher preparation program, a specific certification track, or a commitment to work in a high-need subject or community after graduation.'
      },
      {
        question: 'What should I highlight in an education scholarship essay?',
        answer:
          'Education scholarship essays are often strongest when they show why you want to teach or support learners, not just that you enjoy school. Useful examples can include tutoring, mentoring, classroom volunteering, childcare work, advocacy, coaching, language support, or helping a student overcome a challenge. If the scholarship focuses on service, explain the community or student group you hope to serve.'
      },
      {
        question: 'Do education scholarships require a teaching commitment?',
        answer:
          'Some do, but not all. Certain teacher scholarships, grants, and loan-forgiveness style programs may require recipients to teach in a specific subject, state, district, or high-need school for a set period. Others are traditional scholarships with no work obligation. Read the provider terms carefully so you understand whether the award is a gift, a service-linked program, or tied to certification progress.'
      }
    ]
  },
  community: {
    faqItems: [
      {
        question: 'Who can apply for community scholarships?',
        answer:
          'Community scholarships often support students connected to a specific place, school, neighborhood, service organization, employer, faith group, civic club, or local foundation. Eligibility may depend on residency, high school, volunteer work, leadership, financial need, family background, or plans to give back locally. These awards can be especially useful because the applicant pool is often more focused than national scholarship programs.'
      },
      {
        question: 'What should I include in a community scholarship application?',
        answer:
          'Community scholarship applications are strongest when they show real connection to the group or place offering the award. Mention service, leadership, local projects, family responsibilities, work experience, school involvement, mentoring, or challenges you have helped address. If the provider asks about goals, connect your education plans to the community values behind the scholarship without overstating what you can promise.'
      },
      {
        question: 'Are community scholarships only for students with volunteer hours?',
        answer:
          'Not always. Volunteer work can help, but many community scholarships also consider financial need, academic effort, leadership, employment, family circumstances, school involvement, or local residency. Some providers want students who have contributed through service, while others want to reduce college costs for people from a specific area. Read each award carefully before assuming you need a large number of formal service hours.'
      }
    ]
  },
  humanities: {
    faqItems: [
      {
        question: 'Who can apply for humanities scholarships?',
        answer:
          'Humanities scholarships may support students studying history, literature, philosophy, languages, writing, religious studies, classics, cultural studies, ethics, or related fields. Some awards are tied to a specific major, while others welcome students whose coursework, research, service, or career goals involve human culture, communication, interpretation, or public understanding. Providers may consider essays, academic work, faculty recommendations, GPA, or financial need.'
      },
      {
        question: 'What should I emphasize in a humanities scholarship essay?',
        answer:
          'A strong humanities scholarship essay usually explains the questions, texts, histories, languages, or communities that matter to you. Instead of writing only that you enjoy reading or discussion, connect your interests to a project, course, research question, public service goal, or career path. Providers often want to see careful thinking, clear writing, intellectual curiosity, and a reason the award fits your direction.'
      },
      {
        question: 'Can humanities students find scholarships outside their major department?',
        answer:
          'Yes. Humanities students may qualify for scholarships connected to writing, languages, civic engagement, study abroad, teaching, public service, archives, journalism, museum work, law, or community leadership. Some awards care less about the exact major and more about the skills or goals behind it. Look beyond department pages and check local foundations, professional groups, and broad essay-based awards.'
      }
    ]
  },
  law: {
    intro:
      'Explore law scholarships for pre-law students, law school applicants, current J.D. students, paralegal students, legal studies majors, and students interested in public interest, civil rights, policy, advocacy, or legal service careers. Compare deadlines, eligibility details, award amounts, essays, and school-level requirements before applying.',
    faqItems: [
      {
        question: 'Who can apply for law scholarships?',
        answer:
          'Law scholarship eligibility depends on the award. Some scholarships are for current law students, while others support pre-law, legal studies, criminal justice, paralegal, public policy, or students planning to attend law school. Providers may also focus on public interest work, trial advocacy, diversity in the legal profession, local bar association membership, financial need, academic record, or a specific career goal.'
      },
      {
        question: 'What makes a law scholarship application competitive?',
        answer:
          'A competitive law scholarship application usually connects your academic record with clear motivation for legal study or legal service. Relevant examples can include internships, debate, mock trial, court volunteering, policy work, advocacy, community service, research, writing, or lived experience that shaped your interest in law. For essay-based awards, be specific about the legal issue or community you hope to serve.'
      },
      {
        question: 'Are law scholarships available before law school?',
        answer:
          'Yes. Some awards are designed for undergraduates considering law school or studying legal studies, political science, criminal justice, public policy, or related fields. Others are reserved for admitted or enrolled law students. If you are not yet in law school, check whether the provider requires proof of admission, current enrollment, LSAT plans, a declared major, or a broader interest in legal careers.'
      }
    ]
  },
  biology: {
    faqItems: [
      {
        question: 'Who can apply for biology scholarships?',
        answer:
          'Biology scholarship eligibility can include students studying general biology, molecular biology, ecology, genetics, microbiology, marine biology, neuroscience, pre-med, biotechnology, conservation, or related life science fields. Some awards focus on research experience, lab work, environmental service, healthcare goals, or a specific school level. Providers may also consider GPA, financial need, faculty recommendations, location, or membership in a science organization.'
      },
      {
        question: 'How can I make a biology scholarship application stronger?',
        answer:
          'Use concrete examples that show your interest in living systems, research, health, conservation, or science communication. Relevant details can include lab courses, independent research, fieldwork, internships, science fairs, hospital or clinic volunteering, environmental projects, tutoring, or campus organizations. If you have not done formal research yet, explain the questions you want to explore and the coursework or experiences that prepared you.'
      },
      {
        question: 'Are biology scholarships only for pre-med students?',
        answer:
          'No. Some biology scholarships support pre-med students, but many are open to broader life science paths such as ecology, genetics, conservation, biotechnology, teaching, public health, or research. Read the eligibility language closely. A scholarship may prefer healthcare goals, but another may prioritize environmental work, lab experience, academic curiosity, or plans to continue in graduate study or science-related service.'
      }
    ]
  },
  safety: {
    faqItems: [
      {
        question: 'Who can apply for safety scholarships?',
        answer:
          'Safety scholarships may support students interested in occupational safety, public health, emergency management, fire science, construction safety, environmental health, industrial hygiene, transportation safety, cybersecurity, or risk management. Eligibility varies by provider and may depend on major, career goals, work experience, certifications, professional association membership, GPA, financial need, location, or commitment to preventing harm in workplaces or communities.'
      },
      {
        question: 'What should I highlight in a safety scholarship application?',
        answer:
          'Focus on experiences that show responsibility, prevention, and practical problem-solving. This might include workplace safety training, emergency response, volunteer fire or EMS work, public health projects, cybersecurity labs, environmental compliance, construction experience, leadership roles, or coursework in risk and systems thinking. If the scholarship asks about career goals, explain what kind of safety problem you want to help solve.'
      },
      {
        question: 'Do safety scholarships require professional experience?',
        answer:
          'Some safety scholarships prefer applicants with work experience, certifications, internships, or membership in a professional organization, but many also consider students who are still building their path. Coursework, service, leadership, technical projects, or a clear career goal can be relevant. Check whether the provider requires a specific major or association membership before applying, because safety-related awards can be narrowly defined.'
      }
    ]
  },
  medical: {
    intro:
      'Explore medicine and healthcare scholarships for students pursuing pre-med, nursing, public health, allied health, biomedical science, and related paths. Compare eligibility details, deadlines, award amounts, GPA expectations, and application requirements so you can focus on opportunities that fit your program and career goals.',
    howThisPageWorks:
      'This page lists active medicine and healthcare scholarships from the ScholarshipTop catalog. Use filters to narrow results by GPA, deadline, award amount, eligibility, location, and application requirements before reviewing each provider page.',
    howToIncreaseChances: [
      'Prioritize scholarships that match your specific healthcare path, such as nursing, pre-med, public health, or allied health.',
      'Prepare service, clinical, research, or volunteer examples before you start scholarship essays.',
      'Check whether each provider requires enrollment in an accredited program, a minimum GPA, or proof of healthcare-related goals.',
      'Apply early when recommendation letters, transcripts, or program verification may be required.'
    ],
    faqItems: [
      {
        question: 'Who can apply for medicine and healthcare scholarships?',
        answer:
          'Eligibility depends on the scholarship provider. Some awards are open to broad healthcare majors, while others focus on nursing, pre-med, public health, pharmacy, therapy, allied health, or biomedical science. Many providers also consider school level, GPA, financial need, community service, location, or whether you are enrolled in an accredited program.'
      },
      {
        question: 'How should I choose which medical scholarships to apply for?',
        answer:
          'Start with scholarships where you meet most of the stated eligibility signals, including field of study, school level, GPA, location, and required materials. Then compare deadlines and effort level. A smaller, more specific healthcare scholarship can be a better use of time than a broad award if your background clearly matches the provider criteria.'
      },
      {
        question: 'What materials do medical scholarship applications often require?',
        answer:
          'Common requirements include a short essay, transcript, resume, recommendation letter, proof of enrollment, and details about healthcare career goals. Some scholarships may ask about clinical exposure, volunteering, research, leadership, or service to underserved communities. Always confirm the official provider requirements before submitting.'
      }
    ]
  },
  disability: {
    intro:
      'Explore disability scholarships for students with disabilities, chronic health conditions, neurodivergence, accessibility needs, or lived experience connected to disability advocacy and support. Compare eligibility language, documentation requirements, deadlines, award amounts, school level, and application materials so you can focus on opportunities that fit your situation.',
    faqItems: [
      {
        question: 'Who can apply for disability scholarships?',
        answer:
          'Disability scholarship eligibility can vary widely. Some awards are open to students with any documented disability, while others focus on a specific condition, chronic illness, learning difference, mobility disability, sensory disability, mental health condition, neurodivergence, or connection to disability advocacy. Providers may also consider school level, GPA, financial need, community involvement, field of study, or location.'
      },
      {
        question: 'Do disability scholarships require medical documentation?',
        answer:
          'Some disability scholarships ask for documentation, but requirements are not the same everywhere. A provider may request a short verification letter, proof of diagnosis, an accommodation letter, or a personal statement instead of medical records. Review the official instructions carefully and share only what is requested. If documentation feels unclear, contact the provider before submitting personal health information.'
      },
      {
        question: 'What should I write about in a disability scholarship essay?',
        answer:
          'A strong essay can discuss your goals, resilience, community, advocacy, accessibility needs, or the way your experience has shaped your education. You do not have to share more personal detail than the prompt requires. Focus on what the scholarship committee needs to understand: your path, what support would make possible, and how the award connects to your academic or career plans.'
      }
    ]
  }
};

export function resolveCategoryExpertContent(
  categoryId: ScholarshipCategoryId | null
): CategoryExpertContent | null {
  if (!categoryId) return null;
  return CATEGORY_EXPERT_CONTENT[categoryId] ?? null;
}
