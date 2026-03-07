<script lang="ts">
  interface Props {
    diagram: { title?: string; svgCode?: string };
  }

  let { diagram }: Props = $props();

  let blobUrl = $state<string | null>(null);

  $effect(() => {
    const svg = diagram.svgCode;
    if (typeof svg === 'string') {
      const url = URL.createObjectURL(
        new Blob([svg], { type: 'image/svg+xml' }),
      );
      blobUrl = url;
      return () => URL.revokeObjectURL(url);
    } else {
      blobUrl = null;
    }
  });
</script>

<div class="p-3 space-y-2 bg-white">
  {#if diagram.title}
    <p class="text-xs font-medium text-gray-700">{diagram.title}</p>
  {/if}
  {#if blobUrl}
    <img
      src={blobUrl}
      alt={diagram.title ?? 'SVG diagram'}
      class="max-w-full max-h-48 rounded border border-gray-200 mx-auto"
    />
  {:else}
    <p class="text-xs text-gray-400">No SVG code</p>
  {/if}
</div>
