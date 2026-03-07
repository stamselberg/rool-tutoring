<script lang="ts">
  import type {
    ReactiveSpace,
    ReactiveCollection,
    RoolObject,
  } from '@rool-dev/svelte';
  import type { Question, Quiz, Attempt } from './types';

  interface Props {
    space: ReactiveSpace;
  }

  let { space }: Props = $props();

  let collection = $state<ReactiveCollection | null>(null);

  $effect(() => {
    const c = space.collection({});
    collection = c;
    return () => c.close();
  });

  let objects = $derived(collection?.objects ?? []);

  // --- Group objects by known type ---

  const KNOWN_TYPES = ['quiz', 'question', 'attempt'] as const;
  type KnownType = (typeof KNOWN_TYPES)[number];

  let grouped = $derived.by(() => {
    const groups: Record<string, RoolObject[]> = {};
    const other: RoolObject[] = [];

    for (const obj of objects) {
      const t = obj.type;
      if (typeof t === 'string' && KNOWN_TYPES.includes(t as KnownType)) {
        (groups[t] ??= []).push(obj);
      } else {
        other.push(obj);
      }
    }

    return { groups, other };
  });

  // --- Collapse state ---

  let openGroups = $state<Record<string, boolean>>({
    quiz: true,
    question: true,
    attempt: true,
    _other: true,
  });

  let expandedObjects = $state<Record<string, boolean>>({});
  let rawMode = $state<Record<string, boolean>>({});
  let statCache = $state<
    Record<
      string,
      { modifiedAt: number; modifiedBy: string; modifiedByName: string | null } | null
    >
  >({});

  function toggleGroup(key: string) {
    openGroups[key] = !openGroups[key];
  }

  function toggleObject(id: string) {
    const wasExpanded = expandedObjects[id];
    expandedObjects[id] = !wasExpanded;

    if (!wasExpanded && !(id in statCache)) {
      space.stat(id).then((s) => {
        statCache[id] = s ?? null;
      });
    }
  }

  function toggleRaw(id: string) {
    rawMode[id] = !rawMode[id];
  }

  // --- Helpers ---

  function objectSummary(obj: RoolObject): string {
    if (obj.type === 'quiz') {
      const q = obj as unknown as Quiz;
      return q.title || obj.id;
    }
    if (obj.type === 'question') {
      const q = obj as unknown as Question;
      const text = q.question || '';
      return text.length > 60 ? text.slice(0, 57) + '...' : text || obj.id;
    }
    if (obj.type === 'attempt') {
      const a = obj as unknown as Attempt;
      return `${a.studentName || 'Student'} — ${a.score}/${a.total}`;
    }
    return obj.id;
  }

  function formatTime(ms: number): string {
    return new Date(ms).toLocaleString();
  }

  function difficultyColor(d: string): string {
    if (d === 'foundation') return 'bg-green-100 text-green-700';
    if (d === 'intermediate') return 'bg-yellow-100 text-yellow-700';
    if (d === 'higher') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  }

  function questionTypeBadge(t: string): string {
    if (t === 'mc') return 'Multiple Choice';
    if (t === 'tf') return 'True / False';
    if (t === 'fill') return 'Fill in the Blank';
    return t;
  }
</script>

<aside
  class="w-full shrink-0 snap-start md:w-96 md:shrink md:snap-align-none border-l border-gray-200 bg-white flex flex-col"
>
  <div class="px-4 py-3 border-b border-gray-200">
    <h2 class="font-medium text-gray-700">Objects ({objects.length})</h2>
  </div>
  <div class="flex-1 overflow-y-auto">
    {#if objects.length === 0}
      <p class="text-gray-400 text-sm text-center py-8">
        Objects created by the AI will appear here
      </p>
    {:else}
      <!-- Known type groups -->
      {#each KNOWN_TYPES as typeName}
        {@const items = grouped.groups[typeName] ?? []}
        {#if items.length > 0}
          <div class="border-b border-gray-100">
            <button
              class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              onclick={() => toggleGroup(typeName)}
            >
              <span
                class="text-gray-400 text-xs transition-transform {openGroups[
                  typeName
                ]
                  ? 'rotate-90'
                  : ''}">&triangleright;</span
              >
              <span class="font-medium text-sm text-gray-700 capitalize"
                >{typeName}</span
              >
              <span
                class="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"
                >{items.length}</span
              >
            </button>

            {#if openGroups[typeName]}
              <div class="pb-1">
                {#each items as obj (obj.id)}
                  {@const expanded = expandedObjects[obj.id]}
                  {@const isRaw = rawMode[obj.id]}
                  {@const stat = statCache[obj.id]}

                  <div class="mx-2 mb-1">
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
                      onclick={() => toggleObject(obj.id)}
                    >
                      <span
                        class="text-gray-300 text-[10px] transition-transform {expanded
                          ? 'rotate-90'
                          : ''}">&triangleright;</span
                      >
                      <span
                        class="flex-1 text-xs text-gray-600 truncate"
                        title={obj.id}
                      >
                        {objectSummary(obj)}
                      </span>
                      {#if stat}
                        <span class="text-[10px] text-gray-300 shrink-0">
                          {formatTime(stat.modifiedAt)}
                        </span>
                      {/if}
                    </button>

                    {#if expanded}
                      <div
                        class="ml-5 mr-1 mb-2 border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <!-- View / Raw toggle -->
                        <div
                          class="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-b border-gray-200"
                        >
                          <span class="text-[10px] text-gray-400 mr-1 truncate"
                            >{obj.id}</span
                          >
                          <span class="flex-1"></span>
                          <button
                            class="px-2 py-0.5 text-[10px] rounded {!isRaw
                              ? 'bg-white shadow-sm text-gray-700 font-medium'
                              : 'text-gray-400 hover:text-gray-600'}"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (isRaw) toggleRaw(obj.id);
                            }}
                          >
                            View
                          </button>
                          <button
                            class="px-2 py-0.5 text-[10px] rounded {isRaw
                              ? 'bg-white shadow-sm text-gray-700 font-medium'
                              : 'text-gray-400 hover:text-gray-600'}"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (!isRaw) toggleRaw(obj.id);
                            }}
                          >
                            Raw
                          </button>
                        </div>

                        {#if isRaw}
                          <pre
                            class="text-[11px] text-gray-600 p-3 overflow-auto max-h-64 bg-white">{JSON.stringify(obj, null, 2)}</pre>
                        {:else if typeName === 'quiz'}
                          {@const quiz = obj as unknown as Quiz}
                          <div class="p-3 space-y-2 bg-white">
                            <div class="font-medium text-sm text-gray-900">
                              {quiz.title}
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                              <span
                                class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                              >
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
                        {:else if typeName === 'question'}
                          {@const q = obj as unknown as Question}
                          <div class="p-3 space-y-2 bg-white">
                            <div class="flex flex-wrap gap-1.5 mb-1">
                              <span
                                class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                              >
                                {questionTypeBadge(q.questionType)}
                              </span>
                              <span
                                class="text-[10px] px-2 py-0.5 rounded-full {difficultyColor(q.difficulty)}"
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
                              <ol
                                class="text-xs text-gray-600 space-y-0.5 ml-4 list-[upper-alpha]"
                              >
                                {#each q.options as opt, i}
                                  <li
                                    class={i === q.correctAnswer
                                      ? 'font-semibold text-green-700'
                                      : ''}
                                  >
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
                                  Also accepted: {q.acceptAlternatives.join(
                                    ', ',
                                  )}
                                </p>
                              {/if}
                            {/if}
                            <details class="text-xs text-gray-500">
                              <summary
                                class="cursor-pointer hover:text-gray-700"
                                >Explanation</summary
                              >
                              <p class="mt-1">{q.explanation}</p>
                            </details>
                          </div>
                        {:else if typeName === 'attempt'}
                          {@const a = obj as unknown as Attempt}
                          <div class="p-3 space-y-2 bg-white">
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-sm text-gray-900">
                                {a.studentName || 'Student'}
                              </span>
                              <span
                                class="text-[10px] px-2 py-0.5 rounded-full {a.score / a.total >= 0.7
                                  ? 'bg-green-100 text-green-700'
                                  : a.score / a.total >= 0.4
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'}"
                              >
                                {a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%)
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
                              <span
                                class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                              >
                                Quiz: {a.quizId}
                              </span>
                            </div>
                            <!-- Answer breakdown -->
                            <div class="space-y-0.5">
                              {#each a.answers as ans}
                                <div
                                  class="flex items-center gap-2 text-[11px] py-0.5"
                                >
                                  <span
                                    class={ans.correct
                                      ? 'text-green-600'
                                      : 'text-red-500'}
                                  >
                                    {ans.correct ? '\u2713' : '\u2717'}
                                  </span>
                                  <span class="text-gray-400 font-mono"
                                    >{ans.questionId}</span
                                  >
                                  {#if !ans.correct && ans.given !== undefined}
                                    <span class="text-gray-400">
                                      gave <span class="text-red-500 font-medium"
                                        >{ans.given}</span
                                      >
                                      expected <span
                                        class="text-green-600 font-medium"
                                        >{ans.expected}</span
                                      >
                                    </span>
                                  {/if}
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/if}

                        {#if stat}
                          <div
                            class="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400 flex gap-3"
                          >
                            <span>Modified: {formatTime(stat.modifiedAt)}</span>
                            {#if stat.modifiedByName}
                              <span>by {stat.modifiedByName}</span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}

      <!-- Other / unknown type objects -->
      {#if grouped.other.length > 0}
        <div class="border-b border-gray-100">
          <button
            class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            onclick={() => toggleGroup('_other')}
          >
            <span
              class="text-gray-400 text-xs transition-transform {openGroups[
                '_other'
              ]
                ? 'rotate-90'
                : ''}">&triangleright;</span
            >
            <span class="font-medium text-sm text-gray-700">Other</span>
            <span
              class="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"
              >{grouped.other.length}</span
            >
          </button>

          {#if openGroups['_other']}
            <div class="pb-1">
              {#each grouped.other as obj (obj.id)}
                {@const expanded = expandedObjects[obj.id]}
                {@const stat = statCache[obj.id]}

                <div class="mx-2 mb-1">
                  <button
                    class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
                    onclick={() => toggleObject(obj.id)}
                  >
                    <span
                      class="text-gray-300 text-[10px] transition-transform {expanded
                        ? 'rotate-90'
                        : ''}">&triangleright;</span
                    >
                    <span class="text-xs text-gray-600 truncate" title={obj.id}>
                      {obj.id}
                    </span>
                    {#if typeof obj.type === 'string'}
                      <span
                        class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                      >
                        {obj.type}
                      </span>
                    {/if}
                    {#if stat}
                      <span
                        class="text-[10px] text-gray-300 ml-auto shrink-0"
                      >
                        {formatTime(stat.modifiedAt)}
                      </span>
                    {/if}
                  </button>

                  {#if expanded}
                    <div
                      class="ml-5 mr-1 mb-2 border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        class="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] text-gray-400"
                      >
                        {obj.id}
                      </div>
                      <pre
                        class="text-[11px] text-gray-600 p-3 overflow-auto max-h-64 bg-white">{JSON.stringify(obj, null, 2)}</pre>
                      {#if stat}
                        <div
                          class="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400 flex gap-3"
                        >
                          <span>Modified: {formatTime(stat.modifiedAt)}</span>
                          {#if stat.modifiedByName}
                            <span>by {stat.modifiedByName}</span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</aside>
