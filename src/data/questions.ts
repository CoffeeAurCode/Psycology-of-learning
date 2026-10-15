import raw from "./questions.json";

export type Question = {
  id: number; // week*100 + number, matches public.questions.id
  week: number;
  q: string;
  options: string[];
  answer: number; // 0-based
  note?: string;
};

export const QUESTIONS: Question[] = raw as Question[];
export const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const WEEKS = [...new Set(QUESTIONS.map((q) => q.week))].sort((a, b) => a - b);
export const TEST_SIZE = 100;

export const WEEK_TOPICS: Record<number, string> = {
  0: "Intro to psychology",
  1: "What is learning",
  2: "Behaviourism & intelligence",
  3: "Memory",
  4: "Thinking & Bloom",
  5: "Motivation",
  6: "Emotional intelligence",
  7: "Learning & instruction",
  8: "Pedagogy",
  9: "E-learning",
  10: "Teaching & assessment",
  11: "Social cognition",
  12: "Sustainability",
};

export const LETTERS = "ABCD";
export const numberInWeek = (q: Question) => q.id % 100;
