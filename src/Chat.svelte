<script lang="ts">
  import type { ReactiveChannel, Interaction } from '@rool-dev/svelte';
  import RichText from './RichText.svelte';
  import DiagramPreviews from './DiagramPreviews.svelte';
  import DiagramSummaries from './DiagramSummaries.svelte';

  interface Props {
    channel: ReactiveChannel;
  }

  let { channel }: Props = $props();

  let input = $state('');
  let isSending = $state(false);
  let messagesEl: HTMLElement | null = $state(null);

  let interactions = $derived(channel.interactions);

  // Find the last interaction that created/modified objects (for full preview)
  let latestDiagramMsgId = $derived.by(() => {
    for (let i = interactions.length - 1; i >= 0; i--) {
      if (interactions[i].modifiedObjectIds?.length) return interactions[i].id;
    }
    return null;
  });

  // Auto-scroll on new messages
  $effect(() => {
    if (interactions.length > 0 && messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  async function send() {
    if (!input.trim() || isSending) return;

    const text = input.trim();
    input = '';
    isSending = true;

    try {
      await channel.checkpoint();
      await channel.prompt(text);
    } finally {
      isSending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<div
  class="w-full shrink-0 snap-start md:flex-1 md:shrink md:snap-align-none flex flex-col min-w-0"
>
  <div class="flex-1 overflow-y-auto p-4 space-y-4" bind:this={messagesEl}>
    {#if interactions.length === 0}
      <div class="text-center py-16 text-gray-500">
        <p class="text-lg mb-2">Welcome!</p>
        <p class="text-sm">
          Ask the AI to create objects, answer questions, or help with tasks.
        </p>
      </div>
    {:else}
      {#each interactions as msg (msg.id)}
        <div class="flex justify-end">
          <div
            class="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2"
          >
            <p class="text-sm whitespace-pre-wrap">{msg.input}</p>
          </div>
        </div>
        <div class="flex justify-start">
          <div
            class="max-w-[75%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm prose prose-sm prose-gray max-w-none"
          >
            {#if msg.output}
              <RichText source={msg.output} />
            {:else}
              <p class="text-sm text-gray-400 italic">Thinking...</p>
            {/if}
            {#if msg.modifiedObjectIds?.length}
              {#if msg.id === latestDiagramMsgId}
                <DiagramPreviews {channel} objectIds={msg.modifiedObjectIds} />
              {:else}
                <DiagramSummaries
                  {channel}
                  objectIds={msg.modifiedObjectIds}
                  toolCalls={msg.toolCalls}
                />
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="border-t border-gray-200 bg-white p-4">
    <div class="flex gap-2">
      <textarea
        class="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-32"
        placeholder="Type a message..."
        rows="1"
        bind:value={input}
        onkeydown={handleKeydown}
        disabled={isSending}
      ></textarea>
      <button
        class="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
        onclick={send}
        disabled={isSending || !input.trim()}
      >
        {isSending ? '...' : 'Send'}
      </button>
    </div>
  </div>
</div>
