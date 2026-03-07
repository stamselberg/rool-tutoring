<script lang="ts">
  import type { ReactiveSpace, RoolObject } from '@rool-dev/svelte';
  import type { Snippet } from 'svelte';
  import { formatTime, objectSummary } from './utils';

  interface Props {
    obj: RoolObject;
    space: ReactiveSpace;
    /** Rendered view snippet for known types. If omitted, only raw JSON is shown. */
    view?: Snippet;
  }

  let { obj, space, view }: Props = $props();

  let expanded = $state(false);
  let isRaw = $state(false);
  let stat = $state<{
    modifiedAt: number;
    modifiedBy: string;
    modifiedByName: string | null;
  } | null>(null);
  let statLoaded = $state(false);

  function toggle() {
    expanded = !expanded;
    if (expanded && !statLoaded) {
      statLoaded = true;
      space.stat(obj.id).then((s) => {
        stat = s ?? null;
      });
    }
  }
</script>

<div class="mx-2 mb-1">
  <button
    class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
    onclick={toggle}
  >
    <span
      class="text-gray-300 text-[10px] transition-transform {expanded
        ? 'rotate-90'
        : ''}">&triangleright;</span
    >
    <span class="flex-1 text-xs text-gray-600 truncate" title={obj.id}>
      {objectSummary(obj)}
    </span>
    {#if typeof obj.type === 'string' && !view}
      <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
        {obj.type}
      </span>
    {/if}
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
      <!-- Header with id + optional View/Raw toggle -->
      <div
        class="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-b border-gray-200"
      >
        <span class="text-[10px] text-gray-400 mr-1 truncate">{obj.id}</span>
        <span class="flex-1"></span>
        {#if view}
          <button
            class="px-2 py-0.5 text-[10px] rounded {!isRaw
              ? 'bg-white shadow-sm text-gray-700 font-medium'
              : 'text-gray-400 hover:text-gray-600'}"
            onclick={() => (isRaw = false)}
          >
            View
          </button>
          <button
            class="px-2 py-0.5 text-[10px] rounded {isRaw
              ? 'bg-white shadow-sm text-gray-700 font-medium'
              : 'text-gray-400 hover:text-gray-600'}"
            onclick={() => (isRaw = true)}
          >
            Raw
          </button>
        {/if}
      </div>

      <!-- Content -->
      {#if !view || isRaw}
        <pre
          class="text-[11px] text-gray-600 p-3 overflow-auto max-h-64 bg-white">{JSON.stringify(
            obj,
            null,
            2,
          )}</pre>
      {:else}
        {@render view()}
      {/if}

      <!-- Stat footer -->
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
