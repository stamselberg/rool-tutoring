import type { RoolObject } from '@rool-dev/svelte';
import type { Quiz, Question, Attempt } from '../types';

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
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
      return text.length > 60 ? text.slice(0, 57) + '...' : text || obj.id;
    }
    case 'attempt': {
      const a = obj as unknown as Attempt;
      return `${a.studentName || 'Student'} \u2014 ${a.score}/${a.total}`;
    }
    default:
      return obj.id;
  }
}
