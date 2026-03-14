<script lang="ts">
  import type { ReactiveChannel, Interaction } from '@rool-dev/svelte';

  type ToolCall = Interaction['toolCalls'][number];

  interface Props {
    channel: ReactiveChannel;
    objectIds: string[];
    toolCalls: ToolCall[];
  }

  let { channel, objectIds, toolCalls }: Props = $props();

  interface DiagramSummary {
    id: string;
    title: string;
  }

  let expandedSvgs = $state<Record<string, string>>({});
  let loadingId = $state<string | null>(null);

  async function toggleExpand(s: DiagramSummary) {
    if (expandedSvgs[s.id]) {
      URL.revokeObjectURL(expandedSvgs[s.id]);
      const { [s.id]: _, ...rest } = expandedSvgs;
      expandedSvgs = rest;
      return;
    }

    loadingId = s.id;
    try {
      const obj = await channel.getObject(s.id);
      if (!obj) return;
      const o = obj as Record<string, any>;
      if (o.type === 'svg_diagram' && typeof o.svgCode === 'string') {
        const url = URL.createObjectURL(
          new Blob([o.svgCode], { type: 'image/svg+xml' }),
        );
        expandedSvgs = { ...expandedSvgs, [s.id]: url };
      }
    } finally {
      loadingId = null;
    }
  }

  // Revoke expanded blob URLs on destroy
  $effect(() => {
    return () => {
      for (const url of Object.values(expandedSvgs)) {
        URL.revokeObjectURL(url);
      }
    };
  });

  let summaries = $derived.by((): DiagramSummary[] => {
    const results: DiagramSummary[] = [];
    const idSet = new Set(objectIds);

    for (const tc of toolCalls) {
      if (tc.name !== 'upsert_new_type' && tc.name !== 'upsert_object')
        continue;

      const input = tc.input as Record<string, any> | null;
      const data = input?.data;
      if (!data || data.type !== 'svg_diagram') continue;

      let id: string | undefined;
      try {
        const parsed = JSON.parse(tc.result);
        id = parsed.id;
      } catch {
        // skip if result isn't parseable
      }
      if (!id || !idSet.has(id)) continue;

      results.push({
        id,
        title: data.title ?? 'Diagram',
      });
    }

    return results;
  });
</script>

{#if summaries.length > 0}
  <div class="mt-2 space-y-1.5">
    <div class="flex flex-wrap gap-1.5">
      {#each summaries as s (s.id)}
        <button
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors {expandedSvgs[
            s.id
          ]
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'}"
          onclick={() => toggleExpand(s)}
          disabled={loadingId === s.id}
        >
          {#if loadingId === s.id}
            <div
              class="w-3 h-3 shrink-0 border border-gray-300 border-t-gray-500 rounded-full animate-spin"
            ></div>
          {:else}
            <svg
              class="w-3 h-3 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 8h6M8 5v6" />
            </svg>
          {/if}
          {s.title}
        </button>
      {/each}
    </div>
    {#each summaries as s (s.id)}
      {#if expandedSvgs[s.id]}
        <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <img src={expandedSvgs[s.id]} alt={s.title} class="w-full max-h-64" />
          <div class="px-2 py-1 text-xs text-gray-500 truncate">{s.title}</div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
