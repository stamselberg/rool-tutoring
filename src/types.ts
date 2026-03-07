/** A question object as created by the AI and stored in the Rool space. */
export interface Question {
  id: string;
  type: 'question';
  topic: string;
  subtopic: string;
  questionType: 'mc' | 'tf' | 'fill';
  question: string;
  options?: string[]; // mc only — always 4
  correctAnswer: number | boolean | string; // index for mc, boolean for tf, string for fill
  acceptAlternatives?: string[]; // fill only
  acceptRange?: [number, number]; // fill only
  explanation: string;
  difficulty: 'foundation' | 'intermediate' | 'higher';
}

/** A quiz object grouping questions into a discrete set. */
export interface Quiz {
  id: string;
  type: 'quiz';
  title: string;
  questionIds: string[];
  createdAt: number;
}

/** A quiz attempt recording a student's answers and score. */
export interface Attempt {
  id: string;
  type: 'attempt';
  quizId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  total: number;
  timestamp: number;
  answers: AttemptAnswer[];
}

export interface AttemptAnswer {
  questionId: string;
  correct: boolean;
  given?: number | boolean | string;
  expected?: number | boolean | string;
}

/** The answer a student gives. Typed per question type. */
export type Answer = number | boolean | string | null;

/** A scored question with the student's answer attached. */
export interface ScoredQuestion extends Question {
  userAnswer: Answer;
  isCorrect: boolean;
}
