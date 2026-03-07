import type { Question, Answer } from './types';

/** Check if a student's answer is correct for a given question object. */
export function checkAnswer(question: Question, answer: Answer): boolean {
  if (answer === null || answer === undefined || answer === '') return false;

  const type = question.questionType;

  if (type === 'mc') {
    return answer === question.correctAnswer;
  }

  if (type === 'tf') {
    return answer === question.correctAnswer;
  }

  if (type === 'fill') {
    const given = String(answer).trim().toLowerCase();
    const expected = String(question.correctAnswer).trim().toLowerCase();

    if (given === expected) return true;

    // Check numeric range
    if (question.acceptRange) {
      const num = parseFloat(given);
      if (
        !isNaN(num) &&
        num >= question.acceptRange[0] &&
        num <= question.acceptRange[1]
      ) {
        return true;
      }
    }

    // Check alternatives
    if (question.acceptAlternatives) {
      return question.acceptAlternatives.some(
        (alt) => given === String(alt).trim().toLowerCase(),
      );
    }

    return false;
  }

  return false;
}
