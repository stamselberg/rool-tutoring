<script lang="ts">
  import type { ReactiveSpace } from '@rool-dev/svelte';
  import type { Question, Answer } from './types';

  interface Props {
    space: ReactiveSpace;
    question: Question;
    index: number;
    total: number;
    answer: Answer;
    onAnswer: (value: Answer) => void;
  }

  let { space, question, index, total, answer, onAnswer }: Props = $props();

  // Resolve diagram source: SVG string, media URL, or object ID reference
  let diagramSrc = $state<string | null>(null);

  function svgToBlobUrl(svg: string): string {
    return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  }

  $effect(() => {
    diagramSrc = null;
    const ref = question.diagramImage;
    const svg = question.diagramSvg;

    // Priority: direct SVG string on the question
    if (svg) {
      diagramSrc = svgToBlobUrl(svg);
      return () => {
        if (diagramSrc) URL.revokeObjectURL(diagramSrc);
      };
    }

    if (!ref) return;

    let cancelled = false;

    if (ref.startsWith('http')) {
      // Media URL — fetch with auth
      space.fetchMedia(ref).then(async (res) => {
        if (cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        diagramSrc = URL.createObjectURL(blob);
      });
    } else {
      // Object ID — fetch the referenced object for its svgCode
      space.getObject(ref).then((obj) => {
        if (cancelled || !obj) return;
        const svg = (obj as Record<string, any>).svgCode;
        if (typeof svg === 'string') {
          diagramSrc = svgToBlobUrl(svg);
        }
      });
    }

    return () => {
      cancelled = true;
      if (diagramSrc) URL.revokeObjectURL(diagramSrc);
    };
  });

  const TOPIC_COLORS: Record<string, string> = {
    Light: '#f59e0b',
    Sound: '#3b82f6',
    Echolocation: '#10b981',
    Ultrasound: '#8b5cf6',
    Waves: '#ef4444',
    'Oscilloscope Traces': '#ec4899',
  };

  let topicColor = $derived(TOPIC_COLORS[question.topic] ?? '#6366f1');
  let inputEl: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (question.questionType === 'fill' && inputEl) {
      inputEl.focus();
    }
  });
</script>

<div class="px-5 py-6">
  <!-- Progress bar -->
  <div class="flex items-center gap-3 mb-5">
    <div class="flex-1 h-1.5 bg-gray-200 rounded-full">
      <div
        class="h-full rounded-full transition-all duration-400"
        style="width: {((index + 1) / total) * 100}%; background: {topicColor};"
      ></div>
    </div>
    <span class="text-xs font-semibold text-gray-400 whitespace-nowrap">
      {index + 1}/{total}
    </span>
  </div>

  <!-- Topic badge -->
  <span
    class="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
    style="background: {topicColor}18; color: {topicColor};"
  >
    {question.topic}
  </span>

  <!-- Question text -->
  <h2 class="text-lg font-semibold text-gray-900 leading-snug mb-5">
    {question.question}
  </h2>

  <!-- Diagram -->
  {#if question.diagramImage || question.diagramSvg}
    {#if diagramSrc}
      <img
        src={diagramSrc}
        alt="Diagram for question"
        class="max-w-full max-h-64 rounded-lg border border-gray-200 mb-5 mx-auto"
      />
    {:else}
      <div
        class="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 mb-5"
      >
        <span class="text-gray-400 text-sm">Loading diagram...</span>
      </div>
    {/if}
  {/if}

  <!-- Multiple choice -->
  {#if question.questionType === 'mc' && question.options}
    <div class="flex flex-col gap-2">
      {#each question.options as opt, i}
        {@const selected = answer === i}
        <button
          class="flex items-center gap-3 px-4 py-3 border-2 rounded-xl text-left text-sm transition-all
            {selected
            ? 'border-current shadow-sm'
            : 'border-gray-200 hover:border-gray-300'}"
          style={selected
            ? `border-color: ${topicColor}; background: ${topicColor}10;`
            : ''}
          onclick={() => onAnswer(i)}
        >
          <span
            class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={selected
              ? `background: ${topicColor}; color: white;`
              : 'background: #f1f5f9; color: #64748b;'}
          >
            {String.fromCharCode(65 + i)}
          </span>
          <span class="text-gray-800">{opt}</span>
        </button>
      {/each}
    </div>

    <!-- True / False -->
  {:else if question.questionType === 'tf'}
    <div class="flex gap-3">
      {#each [true, false] as val}
        {@const selected = answer === val}
        <button
          class="flex-1 py-3.5 border-2 rounded-xl text-base font-semibold transition-all
            {selected ? 'shadow-sm' : 'border-gray-200 hover:border-gray-300'}"
          style={selected
            ? `border-color: ${topicColor}; background: ${topicColor}10; color: ${topicColor};`
            : 'color: #1e293b;'}
          onclick={() => onAnswer(val)}
        >
          {val ? 'True' : 'False'}
        </button>
      {/each}
    </div>

    <!-- Fill in the blank -->
  {:else if question.questionType === 'fill'}
    <input
      bind:this={inputEl}
      type="text"
      value={answer ?? ''}
      oninput={(e) => onAnswer(e.currentTarget.value)}
      placeholder="Type your answer..."
      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none transition-colors"
      style="focus: border-color: {topicColor};"
    />
  {/if}
</div>
