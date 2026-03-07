<script lang="ts">
  import type { Attempt } from '../types';
  import { formatTime } from './utils';

  interface Props {
    attempt: Attempt;
  }

  let { attempt: a }: Props = $props();

  let pct = $derived(Math.round((a.score / a.total) * 100));
  let scoreColor = $derived(
    a.score / a.total >= 0.7
      ? 'bg-green-100 text-green-700'
      : a.score / a.total >= 0.4
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700',
  );
</script>

<div class="p-3 space-y-2 bg-white">
  <div class="flex items-center gap-2">
    <span class="font-medium text-sm text-gray-900">
      {a.studentName || 'Student'}
    </span>
    <span class="text-[10px] px-2 py-0.5 rounded-full {scoreColor}">
      {a.score}/{a.total} ({pct}%)
    </span>
  </div>
  <div class="flex flex-wrap gap-1.5">
    {#if a.studentEmail}
      <span
        class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
      >
        {a.studentEmail}
      </span>
    {/if}
    {#if a.timestamp}
      <span
        class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
      >
        {formatTime(a.timestamp)}
      </span>
    {/if}
    <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
      Quiz: {a.quizId}
    </span>
  </div>
  <div class="space-y-0.5">
    {#each a.answers as ans}
      <div class="flex items-center gap-2 text-[11px] py-0.5">
        <span class={ans.correct ? 'text-green-600' : 'text-red-500'}>
          {ans.correct ? '\u2713' : '\u2717'}
        </span>
        <span class="text-gray-400 font-mono">{ans.questionId}</span>
        {#if !ans.correct && ans.given !== undefined}
          <span class="text-gray-400">
            gave <span class="text-red-500 font-medium">{ans.given}</span>
            expected
            <span class="text-green-600 font-medium">{ans.expected}</span>
          </span>
        {/if}
      </div>
    {/each}
  </div>
</div>
