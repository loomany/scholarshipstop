import fs from 'fs';
import path from 'path';

type Scholarship = {
  id: string;
  title: string;
  country: string;
  deadline: string;
  description: string;
  eligibility: string[];
  benefits: string;
  howToApply: string[];
  applyLink?: string;
};

const filePath = path.join(process.cwd(), 'data', 'scholarships.json');

const newScholarships: Scholarship[] = [
  {
    id: 'daad-epos-scholarship',
    title: 'DAAD EPOS Scholarship',
    country: 'Germany',
    deadline: 'Varies by program',
    description:
      'Scholarship for professionals from developing countries pursuing selected postgraduate programs in Germany.',
    eligibility: [
      'Bachelor degree and relevant professional experience',
      'Citizen of an eligible developing country',
      'Meets language and admission requirements',
      'Demonstrates development-focused motivation'
    ],
    benefits:
      'Monthly stipend, travel allowance, insurance support, and potential tuition support depending on program.',
    howToApply: [
      'Select an eligible EPOS course and review admission criteria',
      'Prepare motivation letter, references, and work certificates',
      'Submit scholarship and course application to the program'
    ],
    applyLink:
      'https://www.daad.de/en/study-and-research-in-germany/scholarships/'
  },
  {
    id: 'erasmus-mundus-joint-masters',
    title: 'Erasmus Mundus Joint Masters',
    country: 'Europe',
    deadline: 'Jan 2027',
    description:
      'Competitive scholarships for international students to study in joint master programs across multiple European universities.',
    eligibility: [
      'Holds a recognized bachelor degree',
      'Meets academic criteria for chosen joint master',
      'Provides required language proficiency documents',
      'Completes program-specific application on time'
    ],
    benefits:
      'Tuition coverage and monthly allowance, plus travel and installation support in many programs.',
    howToApply: [
      'Choose an Erasmus Mundus joint master program',
      'Prepare transcripts, recommendations, and statement of purpose',
      'Submit online application via the consortium portal'
    ],
    applyLink:
      'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en'
  },
  {
    id: 'swedish-institute-global-professionals',
    title: 'Swedish Institute Scholarship for Global Professionals',
    country: 'Sweden',
    deadline: 'Feb 2027',
    description:
      'Scholarship for future global leaders pursuing eligible master studies in Sweden.',
    eligibility: [
      'Citizen of an eligible country',
      'Admitted to an eligible Swedish master program',
      'Demonstrated leadership and professional experience',
      'Commitment to sustainable development impact'
    ],
    benefits:
      'Covers tuition fees and provides living stipend, insurance, and selected travel support.',
    howToApply: [
      'Apply to eligible Swedish master program through University Admissions',
      'Prepare SI scholarship documents and leadership evidence',
      'Submit scholarship application during SI application window'
    ],
    applyLink: 'https://si.se/en/apply/scholarships/'
  }
];

function readScholarships(): Scholarship[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Scholarship[];
}

function writeScholarships(data: Scholarship[]) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

type MergeResult = {
  data: Scholarship[];
  added: number;
  skipped: number;
};

function mergeScholarships(
  current: Scholarship[],
  incoming: Scholarship[]
): MergeResult {
  const byId = new Map(current.map((item) => [item.id, item]));
  const existingTitles = new Set(
    current.map((item) => item.title.trim().toLowerCase())
  );
  let added = 0;
  let skipped = 0;

  for (const scholarship of incoming) {
    const normalizedTitle = scholarship.title.trim().toLowerCase();
    const duplicateById = byId.has(scholarship.id);
    const duplicateByTitle = existingTitles.has(normalizedTitle);

    if (duplicateById || duplicateByTitle) {
      skipped += 1;
      continue;
    }

    byId.set(scholarship.id, scholarship);
    existingTitles.add(normalizedTitle);
    added += 1;
  }

  return {
    data: Array.from(byId.values()),
    added,
    skipped
  };
}

function main() {
  const current = readScholarships();
  const result = mergeScholarships(current, newScholarships);
  writeScholarships(result.data);

  console.log(`Current scholarships: ${current.length}`);
  console.log(`Added ${result.added} new scholarships`);
  console.log(`Skipped ${result.skipped} duplicate scholarships`);
  console.log(`Total scholarships: ${result.data.length}`);
}

main();

