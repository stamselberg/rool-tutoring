<script lang="ts">
  import type { Question } from '../types';

  interface Props {
    question: Question;
  }

  let { question: q }: Props = $props();

  function difficultyColor(d: string): string {
    switch (d) {
      case 'foundation':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'higher':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  function questionTypeBadge(t: string): string {
    switch (t) {
      case 'mc':
        return 'Multiple Choice';
      case 'tf':
        return 'True / False';
      case 'fill':
        return 'Fill in the Blank';
      default:
        return t;
    }
  }
</script>

<div class="p-3 space-y-2 bg-white">
  <div class="flex flex-wrap gap-1.5 mb-1">
    <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
      {questionTypeBadge(q.questionType)}
    </span>
    <span
      class="text-[10px] px-2 py-0.5 rounded-full {difficultyColor(
        q.difficulty,
      )}"
    >
      {q.difficulty}
    </span>
    <span
      class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
    >
      {q.topic}
    </span>
    {#if q.subtopic && q.subtopic !== q.topic}
      <span
        class="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400"
      >
        {q.subtopic}
      </span>
    {/if}
  </div>
  <p class="text-sm text-gray-800">{q.question}</p>
  {#if q.questionType === 'mc' && q.options}
    <ol class="text-xs text-gray-600 space-y-0.5 ml-4 list-[upper-alpha]">
      {#each q.options as opt, i}
        <li class={i === q.correctAnswer ? 'font-semibold text-green-700' : ''}>
          {opt}
        </li>
      {/each}
    </ol>
  {:else if q.questionType === 'tf'}
    <p class="text-xs text-green-700 font-medium">
      Answer: {q.correctAnswer ? 'True' : 'False'}
    </p>
  {:else if q.questionType === 'fill'}
    <p class="text-xs text-green-700 font-medium">
      Answer: {q.correctAnswer}
    </p>
    {#if q.acceptAlternatives?.length}
      <p class="text-[10px] text-gray-400">
        Also accepted: {q.acceptAlternatives.join(', ')}
      </p>
    {/if}
  {/if}
  <details class="text-xs text-gray-500">
    <summary class="cursor-pointer hover:text-gray-700">Explanation</summary>
    <p class="mt-1">{q.explanation}</p>
  </details>
</div>
