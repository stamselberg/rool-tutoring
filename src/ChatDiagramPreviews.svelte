<script lang="ts">
  import type { ReactiveChannel, Interaction } from '@rool-dev/svelte';

  type ToolCall = Interaction['toolCalls'][number];

  interface Props {
    channel: ReactiveChannel;
    objectIds: string[];
    toolCalls: ToolCall[];
    isLatest: boolean;
  }

  let { channel, objectIds, toolCalls, isLatest }: Props = $props();

  // === Full preview mode (latest interaction only) ===

  interface DiagramPreview {
    id: string;
    title: string;
    blobUrl: string;
  }

  let previews = $state<DiagramPreview[]>([]);

  function svgToBlobUrl(svg: string): string {
    return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  }

  $effect(() => {
    if (!isLatest) return;

    const ids = objectIds;
    if (!ids.length) return;

    let cancelled = false;
    const urls: string[] = [];

    Promise.all(ids.map((id) => channel.getObject(id))).then((objects) => {
      if (cancelled) return;

      const result: DiagramPreview[] = [];
      for (const obj of objects) {
        if (!obj) continue;
        const o = obj as Record<string, any>;

        if (o.type === 'svg_diagram' && typeof o.svgCode === 'string') {
          const url = svgToBlobUrl(o.svgCode);
          urls.push(url);
          result.push({ id: o.id, title: o.title ?? 'Diagram', blobUrl: url });
        }
      }
      previews = result;
    });

    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
      previews = [];
    };
  });

  // === Summary mode (older interactions) ===

  interface DiagramSummary {
    id: string;
    title: string;
    exists: boolean;
  }

  // Track expanded summaries: id → blob URL
  let expandedSvgs = $state<Record<string, string>>({});
  let loadingId = $state<string | null>(null);

  async function toggleExpand(s: DiagramSummary) {
    if (!s.exists) return;

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
        expandedSvgs = { ...expandedSvgs, [s.id]: svgToBlobUrl(o.svgCode) };
      }
    } finally {
      loadingId = null;
    }
  }

  let summaries = $derived.by((): DiagramSummary[] => {
    if (isLatest) return [];

    const results: DiagramSummary[] = [];
    const idSet = new Set(objectIds);

    for (const tc of toolCalls) {
      if (tc.name !== 'upsert_new_type' && tc.name !== 'upsert_object')
        continue;

      const input = tc.input as Record<string, any> | null;
      const data = input?.data;
      if (!data || data.type !== 'svg_diagram') continue;

      // Parse the result JSON to get the object ID
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
        exists: channel.stat(id) !== undefined,
      });
    }

    return results;
  });
</script>

{#if isLatest && previews.length > 0}
  <div class="flex flex-wrap gap-2 mt-2">
    {#each previews as p (p.id)}
      <div
        class="w-full border border-gray-200 rounded-lg overflow-hidden bg-white"
      >
        <img src={p.blobUrl} alt={p.title} class="w-full max-h-64" />
        <div class="px-2 py-1 text-xs text-gray-500 truncate">{p.title}</div>
      </div>
    {/each}
  </div>
{:else if !isLatest && summaries.length > 0}
  <div class="mt-2 space-y-1.5">
    <div class="flex flex-wrap gap-1.5">
      {#each summaries as s (s.id)}
        <button
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors {s.exists
            ? expandedSvgs[s.id]
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
            : 'bg-gray-50 text-gray-300 line-through cursor-default'}"
          onclick={() => toggleExpand(s)}
          disabled={!s.exists || loadingId === s.id}
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
          {#if !s.exists}
            <span class="text-[10px]">(superseded)</span>
          {/if}
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
