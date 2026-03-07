<script lang="ts">
  import type { ReactiveSpace } from '@rool-dev/svelte';

  interface Props {
    space: ReactiveSpace;
    objectIds: string[];
  }

  let { space, objectIds }: Props = $props();

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
    const ids = objectIds;
    if (!ids.length) return;

    let cancelled = false;
    const urls: string[] = [];

    Promise.all(ids.map((id) => space.getObject(id))).then((objects) => {
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
</script>

{#if previews.length > 0}
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
{/if}
