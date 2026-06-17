import { JOURNEY_STAGES, type JourneyStage } from "./constants";

export interface VantageQuestion {
  id: string;
  text: string;
}

export interface VantageCategory {
  key: string;
  label: string;
  weight: number; // percentage weight of overall score
  questions: VantageQuestion[];
}

// 9 categories, weights sum to 100
export const VANTAGE_CATEGORIES: VantageCategory[] = [
  {
    key: "founder",
    label: "Founder",
    weight: 15,
    questions: [
      { id: "founder_1", text: "How committed are you to building this venture full-time?" },
      { id: "founder_2", text: "How relevant is your experience to this problem space?" },
      { id: "founder_3", text: "How resilient have you been through past setbacks?" },
    ],
  },
  {
    key: "problem",
    label: "Problem",
    weight: 15,
    questions: [
      { id: "problem_1", text: "How clearly can you articulate the problem you solve?" },
      { id: "problem_2", text: "How painful is this problem for your customers?" },
      { id: "problem_3", text: "How frequently do customers face this problem?" },
    ],
  },
  {
    key: "market",
    label: "Market",
    weight: 15,
    questions: [
      { id: "market_1", text: "How large is your addressable market?" },
      { id: "market_2", text: "How fast is your market growing?" },
      { id: "market_3", text: "How well do you understand your competitive landscape?" },
    ],
  },
  {
    key: "validation",
    label: "Validation",
    weight: 15,
    questions: [
      { id: "validation_1", text: "How much customer evidence supports your solution?" },
      { id: "validation_2", text: "How strong is your early traction (users/waitlist)?" },
      { id: "validation_3", text: "How much have customers paid or committed to pay?" },
    ],
  },
  {
    key: "product",
    label: "Product",
    weight: 10,
    questions: [
      { id: "product_1", text: "How mature is your product (idea → MVP → live)?" },
      { id: "product_2", text: "How well does your product solve the core problem?" },
    ],
  },
  {
    key: "team",
    label: "Team",
    weight: 10,
    questions: [
      { id: "team_1", text: "How complete is your founding team for what you need now?" },
      { id: "team_2", text: "How well does your team cover key skills (tech, business)?" },
    ],
  },
  {
    key: "revenue",
    label: "Revenue",
    weight: 10,
    questions: [
      { id: "revenue_1", text: "How proven is your revenue model?" },
      { id: "revenue_2", text: "How consistent is your revenue or sales pipeline?" },
    ],
  },
  {
    key: "scalability",
    label: "Scalability",
    weight: 5,
    questions: [
      { id: "scalability_1", text: "How easily can your model scale across markets?" },
    ],
  },
  {
    key: "investment_readiness",
    label: "Investment Readiness",
    weight: 5,
    questions: [
      { id: "investment_readiness_1", text: "How prepared are you to raise (deck, data room, metrics)?" },
    ],
  },
];

export const TOTAL_QUESTIONS = VANTAGE_CATEGORIES.reduce(
  (sum, c) => sum + c.questions.length,
  0,
);

export type VantageAnswers = Record<string, number>; // questionId -> 1..5

export interface VantageResult {
  categoryScores: Record<string, number>; // 0..100 per category
  score: number; // overall 0..100
  vantagePoint: number; // 0..1000
  fundability: number; // 0..100
  investmentReadiness: number; // 0..100
  stage: JourneyStage;
  report: {
    strengths: { label: string; score: number }[];
    weaknesses: { label: string; score: number }[];
    nextActions: string[];
  };
}

function categoryScore(cat: VantageCategory, answers: VantageAnswers): number {
  const vals = cat.questions.map((q) => answers[q.id] ?? 0);
  const max = cat.questions.length * 5;
  const sum = vals.reduce((a, b) => a + b, 0);
  if (max === 0) return 0;
  return Math.round((sum / max) * 100);
}

function stageFor(score: number): JourneyStage {
  const thresholds = [30, 45, 60, 70, 80, 90];
  for (let i = 0; i < thresholds.length; i++) {
    if (score < thresholds[i]) return JOURNEY_STAGES[i];
  }
  return JOURNEY_STAGES[JOURNEY_STAGES.length - 1];
}

const NEXT_ACTION_MAP: Record<string, string> = {
  founder: "Sharpen your founder story and demonstrate full-time commitment.",
  problem: "Run more customer interviews to validate the problem's severity.",
  market: "Quantify your TAM/SAM/SOM and map your competitors.",
  validation: "Gather more proof — pilots, letters of intent, or paying users.",
  product: "Ship the next core feature and tighten your MVP.",
  team: "Close a key hire or advisor gap in your founding team.",
  revenue: "Validate and document your revenue model with real numbers.",
  scalability: "Show how your model expands beyond your first market.",
  investment_readiness: "Prepare your pitch deck, metrics and data room.",
};

export function computeVantage(answers: VantageAnswers): VantageResult {
  const categoryScores: Record<string, number> = {};
  for (const cat of VANTAGE_CATEGORIES) {
    categoryScores[cat.key] = categoryScore(cat, answers);
  }

  const score = Math.round(
    VANTAGE_CATEGORIES.reduce(
      (sum, c) => sum + categoryScores[c.key] * (c.weight / 100),
      0,
    ),
  );

  const vantagePoint = Math.round(score * 10);

  const fundability = Math.round(
    categoryScores.market * 0.25 +
      categoryScores.validation * 0.25 +
      categoryScores.revenue * 0.2 +
      categoryScores.problem * 0.15 +
      categoryScores.investment_readiness * 0.15,
  );

  const investmentReadiness = Math.round(
    categoryScores.team * 0.3 +
      categoryScores.revenue * 0.25 +
      categoryScores.scalability * 0.2 +
      categoryScores.investment_readiness * 0.25,
  );

  const ranked = VANTAGE_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    score: categoryScores[c.key],
  })).sort((a, b) => b.score - a.score);

  const strengths = ranked.slice(0, 3).map((r) => ({ label: r.label, score: r.score }));
  const weaknesses = ranked
    .slice(-3)
    .reverse()
    .map((r) => ({ label: r.label, score: r.score }));
  const nextActions = ranked
    .slice(-3)
    .map((r) => NEXT_ACTION_MAP[r.key])
    .filter(Boolean);

  return {
    categoryScores,
    score,
    vantagePoint,
    fundability,
    investmentReadiness,
    stage: stageFor(score),
    report: { strengths, weaknesses, nextActions },
  };
}
