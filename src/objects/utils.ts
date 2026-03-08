import type { RoolObject } from '@rool-dev/svelte';
import type { Quiz, Question, Attempt } from '../types';

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Truncate text without cutting inside a $...$ LaTeX block. */
function safeTruncate(text: string, max: number): string {
  const cut = text.slice(0, max);
  // Count unescaped $ signs — if odd, we're mid-formula
  const dollars = cut.match(/\$/g);
  if (dollars && dollars.length % 2 !== 0) {
    // Back up to before the unclosed $
    const lastDollar = cut.lastIndexOf('$');
    return cut.slice(0, lastDollar);
  }
  return cut;
}

export function objectSummary(obj: RoolObject): string {
  switch (obj.type) {
    case 'quiz': {
      const q = obj as unknown as Quiz;
      return q.title || obj.id;
    }
    case 'question': {
      const q = obj as unknown as Question;
      const text = q.question || '';
      return text.length > 60 ? safeTruncate(text, 57) + '...' : text || obj.id;
    }
    case 'attempt': {
      const a = obj as unknown as Attempt;
      return `${a.studentName || 'Student'} \u2014 ${a.score}/${a.total}`;
    }
    default:
      return obj.id;
  }
}
