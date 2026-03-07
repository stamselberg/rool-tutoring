<script lang="ts">
  import type {
    ReactiveSpace,
    ReactiveCollection,
    Rool,
  } from '@rool-dev/svelte';
  import type { Question, Answer, Quiz } from './types';
  import QuestionScreen from './QuestionScreen.svelte';
  import Results from './Results.svelte';

  interface Props {
    space: ReactiveSpace;
    rool: Rool;
  }

  let { space, rool }: Props = $props();

  // Quiz state
  let phase = $state<'idle' | 'active' | 'results'>('idle');
  let currentIndex = $state(0);
  let answers = $state<Answer[]>([]);
  let selectedQuizId = $state<string | null>(null);

  // Reactive collection — all objects in the space
  let collection = $state<ReactiveCollection | null>(null);

  $effect(() => {
    const c = space.collection({});
    collection = c;
    return () => c.close();
  });

  // All objects from the space
  let objects = $derived((collection?.objects ?? []) as Record<string, any>[]);

  // All question objects (for ID lookup)
  let allQuestions = $derived(
    objects.filter((o) => 'questionType' in o) as unknown as Question[],
  );

  // All quiz objects, newest first
  let quizzes = $derived(
    (
      objects.filter(
        (o) => o.type === 'quiz' && Array.isArray(o.questionIds),
      ) as unknown as Quiz[]
    ).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
  );

  // Questions for the selected quiz, in quiz-specified order
  let activeQuestions = $derived.by((): Question[] => {
    const quiz = quizzes.find((q) => q.id === selectedQuizId);
    if (!quiz) return [];
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
    return quiz.questionIds
      .map((id: string) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined);
  });

  function start() {
    if (activeQuestions.length === 0) return;
    answers = Array(activeQuestions.length).fill(null);
    currentIndex = 0;
    phase = 'active';
  }

  function handleAnswer(value: Answer) {
    answers[currentIndex] = value;
  }

  function next() {
    if (currentIndex < activeQuestions.length - 1) {
      currentIndex++;
    } else {
      phase = 'results';
    }
  }

  function prev() {
    if (currentIndex > 0) currentIndex--;
  }

  function restart() {
    phase = 'idle';
    currentIndex = 0;
    answers = [];
    selectedQuizId = null;
  }

  let canProceed = $derived(
    answers[currentIndex] !== null &&
      answers[currentIndex] !== undefined &&
      answers[currentIndex] !== '',
  );
</script>

<!-- Idle: quiz selection -->
{#if phase === 'idle'}
  <div class="flex-1 flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      {#if quizzes.length === 0}
        <div class="text-4xl mb-3">&#128172;</div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">No quizzes yet</h2>
        <p class="text-gray-500 text-sm leading-relaxed">
          Switch to <strong>Chat</strong> and ask the AI to generate a quiz. For example:
          "My child is in Year 8 studying Light and Sound — can you create a quiz?"
        </p>
      {:else if !selectedQuizId}
        <div class="text-4xl mb-3">&#128218;</div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Choose a Quiz</h2>
        <p class="text-gray-500 text-sm mb-6">
          {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'} available
        </p>
        <div class="flex flex-col gap-3">
          {#each quizzes as quiz}
            {@const count = quiz.questionIds.length}
            <button
              class="w-full px-5 py-4 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl text-left transition-colors"
              onclick={() => (selectedQuizId = quiz.id)}
            >
              <div class="font-semibold text-gray-900">{quiz.title}</div>
              <div class="text-xs text-gray-400 mt-1">
                {count} question{count === 1 ? '' : 's'}
              </div>
            </button>
          {/each}
        </div>
      {:else}
        {@const quiz = quizzes.find((q) => q.id === selectedQuizId)}
        {#if quiz}
          <div class="text-4xl mb-3">&#128218;</div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h2>
          <p class="text-gray-500 text-sm mb-6">
            {activeQuestions.length} question{activeQuestions.length === 1
              ? ''
              : 's'}
          </p>

          {@const topics = [...new Set(activeQuestions.map((q) => q.topic))]}
          <div class="flex flex-wrap justify-center gap-2 mb-6">
            {#each topics as topic}
              <span
                class="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full"
              >
                {topic}
              </span>
            {/each}
          </div>

          <div class="flex gap-3 justify-center">
            <button
              class="px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-500 text-sm"
              onclick={() => (selectedQuizId = null)}
            >
              &larr; Back
            </button>
            <button
              class="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              onclick={start}
            >
              Start Quiz
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Active: show current question -->
{:else if phase === 'active'}
  <div class="flex-1 flex flex-col max-w-xl mx-auto w-full">
    <div class="flex-1">
      {#key currentIndex}
        <QuestionScreen
          question={activeQuestions[currentIndex]}
          index={currentIndex}
          total={activeQuestions.length}
          answer={answers[currentIndex]}
          onAnswer={handleAnswer}
        />
      {/key}
    </div>

    <div class="px-5 pb-6 flex gap-3">
      {#if currentIndex > 0}
        <button
          class="px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-500 text-sm"
          onclick={prev}
        >
          &larr; Back
        </button>
      {/if}
      <button
        class="flex-1 py-3 rounded-xl font-semibold text-sm transition-all
          {canProceed
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-200 text-gray-400 cursor-default'}"
        onclick={next}
        disabled={!canProceed}
      >
        {currentIndex === activeQuestions.length - 1
          ? 'Finish Quiz'
          : 'Next \u2192'}
      </button>
    </div>
  </div>

  <!-- Results -->
{:else}
  <div class="flex-1 overflow-y-auto">
    <Results
      {space}
      {rool}
      questions={activeQuestions}
      {answers}
      quizId={selectedQuizId!}
      onRestart={restart}
    />
  </div>
{/if}
