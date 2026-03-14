<script lang="ts">
  import type {
    ReactiveChannel,
    ReactiveWatch,
    RoolObject,
  } from '@rool-dev/svelte';
  import type { Question, Quiz, Attempt } from './types';
  import ObjectRow from './objects/ObjectRow.svelte';
  import QuizView from './objects/QuizView.svelte';
  import QuestionView from './objects/QuestionView.svelte';
  import AttemptView from './objects/AttemptView.svelte';
  import SvgDiagramView from './objects/SvgDiagramView.svelte';

  interface Props {
    channel: ReactiveChannel;
  }

  let { channel }: Props = $props();

  let collection = $state<ReactiveWatch | null>(null);

  $effect(() => {
    const c = channel.watch({});
    collection = c;
    return () => c.close();
  });

  let objects = $derived(collection?.objects ?? []);

  // --- Group objects by type ---

  const KNOWN_TYPES = ['quiz', 'question', 'svg_diagram', 'attempt'] as const;
  type KnownType = (typeof KNOWN_TYPES)[number];

  interface ObjectGroup {
    key: string;
    label: string;
    items: RoolObject[];
  }

  let groups = $derived.by((): ObjectGroup[] => {
    const byType: Record<string, RoolObject[]> = {};
    const other: RoolObject[] = [];

    for (const obj of objects) {
      const t = obj.type;
      if (typeof t === 'string' && KNOWN_TYPES.includes(t as KnownType)) {
        (byType[t] ??= []).push(obj);
      } else {
        other.push(obj);
      }
    }

    const result: ObjectGroup[] = [];
    for (const t of KNOWN_TYPES) {
      if (byType[t]?.length) {
        result.push({ key: t, label: t, items: byType[t] });
      }
    }
    if (other.length) {
      result.push({ key: '_other', label: 'Other', items: other });
    }
    return result;
  });

  let openGroups = $state<Record<string, boolean>>({
    quiz: true,
    question: true,
    svg_diagram: true,
    attempt: true,
    _other: true,
  });

  function toggleGroup(key: string) {
    openGroups[key] = !openGroups[key];
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
      {#each groups as group (group.key)}
        <div class="border-b border-gray-100">
          <button
            class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            onclick={() => toggleGroup(group.key)}
          >
            <span
              class="text-gray-400 text-xs transition-transform {openGroups[
                group.key
              ]
                ? 'rotate-90'
                : ''}">&triangleright;</span
            >
            <span class="font-medium text-sm text-gray-700 capitalize"
              >{group.label}</span
            >
            <span
              class="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"
              >{group.items.length}</span
            >
          </button>

          {#if openGroups[group.key]}
            <div class="pb-1">
              {#each group.items as obj (obj.id)}
                <ObjectRow {obj} {channel}>
                  {#snippet view()}
                    {#if obj.type === 'quiz'}
                      <QuizView quiz={obj as unknown as Quiz} />
                    {:else if obj.type === 'question'}
                      <QuestionView question={obj as unknown as Question} />
                    {:else if obj.type === 'svg_diagram'}
                      <SvgDiagramView diagram={obj as Record<string, any>} />
                    {:else if obj.type === 'attempt'}
                      <AttemptView attempt={obj as unknown as Attempt} />
                    {/if}
                  {/snippet}
                </ObjectRow>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>
