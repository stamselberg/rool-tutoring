<script lang="ts">
  import type { Quiz } from '../types';
  import { formatTime } from './utils';

  interface Props {
    quiz: Quiz;
  }

  let { quiz }: Props = $props();
</script>

<div class="p-3 space-y-2 bg-white">
  <div class="font-medium text-sm text-gray-900">
    {quiz.title}
  </div>
  <div class="flex flex-wrap gap-1.5">
    <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
      {quiz.questionIds?.length ?? 0} questions
    </span>
    {#if quiz.createdAt}
      <span
        class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
      >
        {formatTime(quiz.createdAt)}
      </span>
    {/if}
  </div>
  {#if quiz.questionIds?.length}
    <div class="text-[10px] text-gray-400 mt-1">
      IDs: {quiz.questionIds.join(', ')}
    </div>
  {/if}
</div>
