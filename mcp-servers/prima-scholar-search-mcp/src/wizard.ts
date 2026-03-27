/**
 * Scholar Search Wizard.
 *
 * Analyses a raw query to detect disciplines, suggest optimal sources,
 * and generate structured questions for the user before searching.
 */

import {
  Discipline,
  SourceName,
  WizardAnalysis,
  WizardQuestion,
  WizardResult,
} from "./types.js";

// ── Discipline Detection ─────────────────────────────────────────────

interface DisciplinePattern {
  discipline: Discipline;
  keywords: string[];
  weight: number;
}

const DISCIPLINE_PATTERNS: DisciplinePattern[] = [
  {
    discipline: "psychology",
    keywords: [
      "psychology", "psychological", "cognition", "cognitive", "behaviour",
      "behavior", "personality", "motivation", "emotion", "mental health",
      "well-being", "wellbeing", "self-determination", "self-efficacy",
      "mindset", "resilience", "attachment", "psychotherapy", "counselling",
      "counseling", "anxiety", "depression", "perception", "attention",
      "memory", "learning", "developmental", "clinical psychology",
      "positive psychology", "flow state", "intrinsic motivation",
      "big five", "neo-pi", "psychometric", "self-regulation",
    ],
    weight: 1,
  },
  {
    discipline: "education",
    keywords: [
      "education", "educational", "teaching", "learning", "pedagogy",
      "curriculum", "classroom", "student", "teacher", "school",
      "higher education", "university", "academic achievement",
      "instructional", "e-learning", "online learning", "blended learning",
      "assessment", "literacy", "stem education", "training",
      "professional development", "adult learning", "andragogy",
    ],
    weight: 1,
  },
  {
    discipline: "neuroscience",
    keywords: [
      "neuroscience", "neurology", "neural", "brain", "cortex",
      "hippocampus", "amygdala", "dopamine", "serotonin", "synapse",
      "neuroplasticity", "fmri", "eeg", "neuroimaging", "neurotransmitter",
      "prefrontal", "cerebral", "nervous system", "cognitive neuroscience",
      "neuropathology", "neuropsychology",
    ],
    weight: 1,
  },
  {
    discipline: "business_management",
    keywords: [
      "business", "management", "organisation", "organization",
      "organisational", "organizational", "leadership", "strategy",
      "entrepreneurship", "innovation", "marketing", "human resources",
      "supply chain", "operations", "corporate", "stakeholder",
      "competitive advantage", "performance management", "team",
      "workplace", "employee", "job satisfaction", "burnout",
      "engagement", "productivity", "agile", "change management",
    ],
    weight: 1,
  },
  {
    discipline: "computer_science",
    keywords: [
      "computer science", "machine learning", "artificial intelligence",
      "deep learning", "neural network", "algorithm", "software",
      "programming", "data science", "natural language processing",
      "nlp", "computer vision", "robotics", "cybersecurity",
      "distributed systems", "cloud computing", "database",
      "large language model", "llm", "transformer", "reinforcement learning",
      "generative ai", "gpt", "bert", "diffusion model",
    ],
    weight: 1,
  },
  {
    discipline: "philosophy_humanities",
    keywords: [
      "philosophy", "philosophical", "ethics", "moral", "epistemology",
      "ontology", "metaphysics", "phenomenology", "hermeneutics",
      "existentialism", "aesthetics", "logic", "rhetoric", "literature",
      "history", "cultural studies", "art history", "linguistics",
      "semiotics", "critical theory", "postmodernism", "stoicism",
    ],
    weight: 1,
  },
  {
    discipline: "biomedical",
    keywords: [
      "biomedical", "medicine", "clinical", "disease", "therapy",
      "pharmacology", "drug", "pathology", "oncology", "cardiology",
      "immunology", "genetics", "genomics", "epidemiology", "public health",
      "vaccine", "infection", "cancer", "diabetes", "surgery",
      "diagnosis", "treatment", "patient", "hospital", "cell biology",
      "molecular biology", "biochemistry", "physiology",
    ],
    weight: 1,
  },
  {
    discipline: "engineering",
    keywords: [
      "engineering", "mechanical", "electrical", "civil", "structural",
      "materials science", "thermodynamics", "fluid dynamics", "control systems",
      "manufacturing", "aerospace", "automotive", "chemical engineering",
      "biomedical engineering", "renewable energy", "sustainability",
      "design", "simulation", "finite element", "cad",
    ],
    weight: 1,
  },
  {
    discipline: "social_sciences",
    keywords: [
      "sociology", "sociological", "anthropology", "political science",
      "public policy", "social work", "criminology", "demography",
      "gender studies", "race", "inequality", "globalisation",
      "globalization", "migration", "urban", "rural", "community",
      "social capital", "social network", "governance", "democracy",
    ],
    weight: 1,
  },
  {
    discipline: "mathematics_physics",
    keywords: [
      "mathematics", "mathematical", "physics", "quantum", "relativity",
      "topology", "algebra", "calculus", "statistics", "probability",
      "differential equations", "linear algebra", "number theory",
      "particle physics", "cosmology", "astrophysics", "optics",
      "condensed matter", "string theory", "geometry",
    ],
    weight: 1,
  },
  {
    discipline: "economics",
    keywords: [
      "economics", "economic", "macroeconomics", "microeconomics",
      "econometrics", "fiscal", "monetary", "trade", "gdp",
      "inflation", "labour market", "labor market", "financial",
      "banking", "investment", "behavioural economics", "behavioral economics",
      "game theory", "welfare economics", "development economics",
    ],
    weight: 1,
  },
];

// ── Discipline → Source Mapping ──────────────────────────────────────

const DISCIPLINE_SOURCES: Record<Discipline, { primary: SourceName[]; secondary: SourceName[] }> = {
  psychology: {
    primary: ["openalex", "semantic_scholar", "pubmed"],
    secondary: ["crossref", "europe_pmc"],
  },
  education: {
    primary: ["eric", "openalex", "semantic_scholar"],
    secondary: ["crossref"],
  },
  neuroscience: {
    primary: ["pubmed", "europe_pmc", "biorxiv"],
    secondary: ["semantic_scholar", "openalex"],
  },
  business_management: {
    primary: ["openalex", "semantic_scholar", "crossref"],
    secondary: ["eric"],
  },
  computer_science: {
    primary: ["semantic_scholar", "arxiv", "dblp"],
    secondary: ["openalex"],
  },
  philosophy_humanities: {
    primary: ["openalex", "crossref"],
    secondary: ["semantic_scholar"],
  },
  biomedical: {
    primary: ["pubmed", "europe_pmc", "biorxiv"],
    secondary: ["openalex", "semantic_scholar"],
  },
  engineering: {
    primary: ["openalex", "semantic_scholar", "arxiv"],
    secondary: ["dblp", "crossref"],
  },
  social_sciences: {
    primary: ["openalex", "semantic_scholar", "crossref"],
    secondary: ["eric"],
  },
  mathematics_physics: {
    primary: ["arxiv", "semantic_scholar", "openalex"],
    secondary: ["dblp"],
  },
  economics: {
    primary: ["openalex", "crossref", "semantic_scholar"],
    secondary: ["arxiv"],
  },
  multidisciplinary: {
    primary: ["openalex", "semantic_scholar", "crossref"],
    secondary: ["pubmed", "arxiv", "core"],
  },
};

// ── Query Analysis ───────────────────────────────────────────────────

function detectDisciplines(query: string): { disciplines: Discipline[]; confidence: "high" | "medium" | "low" } {
  const queryLower = query.toLowerCase();
  const scores = new Map<Discipline, number>();

  for (const pattern of DISCIPLINE_PATTERNS) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (queryLower.includes(keyword)) {
        score += pattern.weight;
      }
    }
    if (score > 0) {
      scores.set(pattern.discipline, score);
    }
  }

  if (scores.size === 0) {
    return { disciplines: ["multidisciplinary"], confidence: "low" };
  }

  // Sort by score descending
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];

  // Take disciplines within 50% of top score
  const threshold = topScore * 0.5;
  const detected = sorted
    .filter(([, score]) => score >= threshold)
    .map(([discipline]) => discipline);

  const confidence: "high" | "medium" | "low" =
    topScore >= 3 ? "high" : topScore >= 2 ? "medium" : "low";

  return { disciplines: detected, confidence };
}

function suggestSources(disciplines: Discipline[]): SourceName[] {
  const sourceSet = new Set<SourceName>();

  for (const discipline of disciplines) {
    const mapping = DISCIPLINE_SOURCES[discipline];
    for (const source of mapping.primary) {
      sourceSet.add(source);
    }
  }

  return [...sourceSet];
}

// ── Question Generation ──────────────────────────────────────────────

function generateQuestions(
  disciplines: Discipline[],
  confidence: "high" | "medium" | "low"
): WizardQuestion[] {
  const questions: WizardQuestion[] = [];

  // Discipline confirmation/selection
  if (confidence === "low" || disciplines.includes("multidisciplinary")) {
    questions.push({
      id: "discipline",
      question: "What discipline or field is this research in?",
      options: [
        "psychology", "education", "neuroscience", "business_management",
        "computer_science", "philosophy_humanities", "biomedical",
        "engineering", "social_sciences", "mathematics_physics",
        "economics", "multidisciplinary",
      ],
      type: "select",
      default: disciplines[0] ?? "multidisciplinary",
    });
  } else if (disciplines.length > 1) {
    const disciplineLabels = disciplines.map(formatDisciplineLabel);
    questions.push({
      id: "discipline",
      question: `Your query spans ${disciplineLabels.join(" and ")}. Focus on one, or search both?`,
      options: [...disciplines, "both"],
      type: "select",
      default: "both",
    });
  }

  // Open access preference
  questions.push({
    id: "access",
    question: "Open access only, or include gated papers as secondary results?",
    options: ["open_access_only", "include_gated"],
    type: "select",
    default: "open_access_only",
  });

  // Date range
  questions.push({
    id: "date_range",
    question: "Date range?",
    options: ["last_5_years", "last_10_years", "last_20_years", "any"],
    type: "select",
    default: "last_10_years",
  });

  // Preprints
  const hasPreprint = disciplines.some((d) =>
    ["neuroscience", "biomedical", "computer_science", "mathematics_physics", "economics"].includes(d)
  );
  if (hasPreprint || disciplines.includes("multidisciplinary")) {
    questions.push({
      id: "type",
      question: "Include preprints, or peer-reviewed only?",
      options: ["peer_reviewed_only", "include_preprints"],
      type: "select",
      default: "include_preprints",
    });
  }

  // Optional author focus
  questions.push({
    id: "authors",
    question: "Any specific authors to prioritise? (optional)",
    type: "free_text",
    default: null,
  });

  return questions;
}

function formatDisciplineLabel(d: Discipline): string {
  const labels: Record<Discipline, string> = {
    psychology: "psychology",
    education: "education",
    neuroscience: "neuroscience",
    business_management: "business and management",
    computer_science: "computer science and AI",
    philosophy_humanities: "philosophy and humanities",
    biomedical: "biomedical and life sciences",
    engineering: "engineering",
    social_sciences: "social sciences",
    mathematics_physics: "mathematics and physics",
    economics: "economics",
    multidisciplinary: "multidisciplinary",
  };
  return labels[d] ?? d;
}

// ── Public API ───────────────────────────────────────────────────────

export function runWizard(query: string): WizardResult {
  const { disciplines, confidence } = detectDisciplines(query);
  const suggestedSourceList = suggestSources(disciplines);
  const questions = generateQuestions(disciplines, confidence);

  const currentYear = new Date().getFullYear();

  return {
    analysis: {
      detectedDisciplines: disciplines,
      suggestedSources: suggestedSourceList,
      confidence,
    },
    questions,
    suggestedSearch: {
      query,
      sources: suggestedSourceList,
      openAccessOnly: true,
      yearFrom: currentYear - 10,
      yearTo: currentYear,
      includePreprints: true,
      maxResults: 10,
    },
  };
}
