<script lang="ts">
  import Markdown from '@humanspeak/svelte-markdown';
  import katex from 'katex';
  import 'katex/contrib/mhchem';
  import markedKatex from 'marked-katex-extension';

  interface Props {
    source: string;
    isInline?: boolean;
  }

  let { source, isInline = false }: Props = $props();

  const extensions = [markedKatex({ throwOnError: false })];
</script>

<Markdown {source} {extensions} {isInline}>
  {#snippet inlineKatex(props)}
    {@html katex.renderToString(props.text, { displayMode: false, throwOnError: false })}
  {/snippet}
  {#snippet blockKatex(props)}
    {@html katex.renderToString(props.text, { displayMode: true, throwOnError: false })}
  {/snippet}
</Markdown>
