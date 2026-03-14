<script lang="ts">
  import type { ReactiveChannel, Rool } from '@rool-dev/svelte';
  import type { Question, Answer } from './types';
  import { checkAnswer } from './checkAnswer';
  import RichText from './RichText.svelte';

  interface Props {
    channel: ReactiveChannel;
    rool: Rool;
    questions: Question[];
    answers: Answer[];
    quizId: string;
    onRestart: () => void;
  }

  let { channel, rool, questions, answers, quizId, onRestart }: Props =
    $props();

  // Score each question
  let results = $derived(
    questions.map((q, i) => ({
      ...q,
      userAnswer: answers[i],
      isCorrect: checkAnswer(q, answers[i]),
    })),
  );

  let score = $derived(results.filter((r) => r.isCorrect).length);
  let total = $derived(results.length);
  let pct = $derived(Math.round((score / total) * 100));

  // Topic breakdown
  let topicBreakdown = $derived.by(() => {
    const breakdown: Record<string, { correct: number; total: number }> = {};
    for (const r of results) {
      if (!breakdown[r.topic]) breakdown[r.topic] = { correct: 0, total: 0 };
      breakdown[r.topic].total++;
      if (r.isCorrect) breakdown[r.topic].correct++;
    }
    return breakdown;
  });

  // AI feedback
  let aiFeedback = $state<string | null>(null);
  let aiLoading = $state(false);
  let showDetails = $state(false);

  // On mount: create attempt object + request AI feedback
  let hasSentResults = false;
  $effect(() => {
    if (results.length > 0 && !hasSentResults) {
      hasSentResults = true;
      sendResults();
    }
  });

  async function sendResults() {
    // Create attempt object
    const user = rool.currentUser;
    const attemptData = {
      type: 'attempt',
      quizId,
      studentId: user?.id ?? null,
      studentEmail: user?.email ?? null,
      studentName: user?.name ?? null,
      timestamp: Date.now(),
      score,
      total,
      answers: results.map((r) => ({
        questionId: r.id,
        correct: r.isCorrect,
        ...(r.isCorrect
          ? {}
          : { given: r.userAnswer, expected: r.correctAnswer }),
      })),
    };
    await channel.createObject({ data: attemptData });

    // Build a summary for the AI
    const wrongSummary = results
      .filter((r) => !r.isCorrect)
      .map((r) => {
        const given = formatAnswer(r);
        const correct = formatCorrect(r);
        return `- "${r.question}" — answered: "${given}", correct: "${correct}"`;
      })
      .join('\n');

    const topicSummary = Object.entries(topicBreakdown)
      .map(([topic, { correct: c, total: t }]) => `${topic}: ${c}/${t}`)
      .join(', ');

    aiLoading = true;
    try {
      await channel.checkpoint();
      await channel.prompt(
        `The student just completed a quiz and scored ${score}/${total}.\n\nTopic breakdown: ${topicSummary}\n\n${
          wrongSummary
            ? `Questions they got wrong:\n${wrongSummary}`
            : 'They got every question right!'
        }\n\nPlease provide your feedback.`,
      );

      // Get the latest interaction for the feedback text
      const interactions = channel.interactions;
      const latest = interactions[interactions.length - 1];
      if (latest?.output) {
        aiFeedback = latest.output;
      }
    } finally {
      aiLoading = false;
    }
  }

  function gradeColor(correct: number, total: number): string {
    if (correct === total) return '#10b981';
    if (correct >= total * 0.5) return '#f59e0b';
    return '#ef4444';
  }

  function gradeLabel(correct: number, total: number): string {
    if (correct === total) return 'Strong';
    if (correct >= total * 0.5) return 'Review';
    return 'Needs work';
  }

  function formatAnswer(r: Question & { userAnswer: Answer }): string {
    if (r.userAnswer == null || r.userAnswer === '') return '—';
    if (r.questionType === 'mc' && r.options)
      return r.options[r.userAnswer as number] ?? '—';
    if (r.questionType === 'tf') return r.userAnswer ? 'True' : 'False';
    return String(r.userAnswer);
  }

  function formatCorrect(r: Question): string {
    if (r.questionType === 'mc' && r.options)
      return r.options[r.correctAnswer as number] ?? '—';
    if (r.questionType === 'tf') return r.correctAnswer ? 'True' : 'False';
    return String(r.correctAnswer);
  }
</script>

<div class="max-w-xl mx-auto px-5 py-8">
  <!-- Score header -->
  <div class="text-center mb-7">
    <div class="text-5xl mb-1">
      {#if pct >= 80}
        &#11088;
      {:else if pct >= 50}
        &#128077;
      {:else}
        &#128170;
      {/if}
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-1">Your Result</h1>
    <div
      class="text-5xl font-extrabold"
      style="color: {gradeColor(score, total)};"
    >
      {score}/{total}
    </div>
    <p class="text-sm text-gray-400">{pct}% correct</p>
  </div>

  <!-- Topic breakdown -->
  <div class="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-200">
    <h3 class="text-sm font-medium text-gray-500 mb-3">Topic Breakdown</h3>
    {#each Object.entries(topicBreakdown) as [topic, { correct: c, total: t }]}
      {@const color = gradeColor(c, t)}
      <div class="flex items-center gap-3 mb-2 last:mb-0">
        <span class="flex-1 text-sm text-gray-700">{topic}</span>
        <span class="text-sm font-semibold text-gray-700">{c}/{t}</span>
        <span
          class="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style="background: {color}18; color: {color};"
        >
          {gradeLabel(c, t)}
        </span>
      </div>
    {/each}
  </div>

  <!-- AI feedback -->
  <div
    class="rounded-2xl p-5 mb-5 border border-blue-200"
    style="background: linear-gradient(135deg, #eff6ff, #f0f9ff);"
  >
    <h3 class="text-sm font-medium text-blue-800 mb-3">AI Study Coach</h3>
    {#if aiLoading}
      <div class="flex items-center gap-3 text-blue-500">
        <div
          class="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"
        ></div>
        <span class="text-sm">Analysing your answers...</span>
      </div>
    {:else if aiFeedback}
      <div
        class="text-sm text-blue-900 leading-relaxed prose prose-sm prose-blue max-w-none"
      >
        <RichText source={aiFeedback} />
      </div>
    {:else if score === total}
      <p class="text-sm text-blue-900 leading-relaxed">
        Amazing work! You got every single question right. Keep it up!
      </p>
    {/if}
  </div>

  <!-- Show/hide answer details -->
  <button
    class="w-full py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 mb-3"
    onclick={() => (showDetails = !showDetails)}
  >
    {showDetails ? 'Hide' : 'Show'} all answers
  </button>

  {#if showDetails}
    <div class="flex flex-col gap-2 mb-5">
      {#each results as r, i}
        <div
          class="px-4 py-3 rounded-xl text-sm border"
          style="background: {r.isCorrect
            ? '#f0fdf4'
            : '#fef2f2'}; border-color: {r.isCorrect ? '#bbf7d0' : '#fecaca'};"
        >
          <div class="flex items-start gap-2">
            <span
              class="font-bold"
              style="color: {r.isCorrect ? '#16a34a' : '#dc2626'};"
            >
              Q{i + 1}
              {r.isCorrect ? '\u2713' : '\u2717'}
            </span>
            <span class="text-gray-500"
              ><RichText source={r.question} isInline /></span
            >
          </div>
          {#if !r.isCorrect}
            <div class="mt-1.5 text-xs">
              <span class="text-red-600"
                >Your answer: <RichText
                  source={formatAnswer(r)}
                  isInline
                /></span
              >
              <span class="text-gray-400 mx-2">&rarr;</span>
              <span class="text-green-600"
                >Correct: <RichText source={formatCorrect(r)} isInline /></span
              >
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Back to chat -->
  <div class="text-center">
    <button
      class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
      onclick={onRestart}
    >
      Back to Quizzes
    </button>
  </div>
</div>
