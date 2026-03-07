<script lang="ts">
  import { createRool, type ReactiveSpace } from '@rool-dev/svelte';
  import Splash from './Splash.svelte';
  import Header from './Header.svelte';
  import Chat from './Chat.svelte';
  import Objects from './Objects.svelte';
  import QuizFlow from './QuizFlow.svelte';
  import Users from './Users.svelte';
  import { SYSTEM_INSTRUCTION } from './systemInstruction';
  import { STUDENT_INSTRUCTION } from './studentInstruction';

  const APP_NAME = 'Tutoring';

  const rool = createRool();
  rool.init();

  let space = $state<ReactiveSpace | null>(null);
  let mode = $state<'chat' | 'quiz' | 'users'>('chat');

  let isAdmin = $derived(
    space != null && (space.role === 'owner' || space.role === 'admin'),
  );

  // Open space when ready
  $effect(() => {
    if (rool.authenticated && rool.spaces && !space) {
      openSpace();
    }
  });

  async function openSpace() {
    const spaces = rool.spaces!;
    const existing = spaces.find((s) => s.name === APP_NAME);

    // Determine role before opening to pick the right conversation
    const role = existing?.role ?? 'owner';
    const admin = role === 'owner' || role === 'admin';
    const conversationId = admin
      ? 'tutoring'
      : `student-${rool.currentUser?.id}`;

    space = existing
      ? await rool.openSpace(existing.id, { conversationId })
      : await rool.createSpace(APP_NAME, { conversationId });

    await space.setSystemInstruction(
      admin ? SYSTEM_INSTRUCTION : STUDENT_INSTRUCTION,
    );
  }
</script>

{#if rool.authenticated === undefined}
  <div class="min-h-dvh flex items-center justify-center bg-gray-50">
    <p class="text-gray-500">Loading...</p>
  </div>
{:else if rool.authenticated === false}
  <Splash appName={APP_NAME} onLogin={() => rool.login(APP_NAME)} />
{:else}
  <div class="min-h-dvh flex flex-col bg-gray-50">
    <Header
      appName={APP_NAME}
      {space}
      {mode}
      onModeChange={(m) => (mode = m)}
      onLogout={() => rool.logout()}
    />

    {#if !space}
      <div class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">Loading space...</p>
      </div>
    {:else if mode === 'chat'}
      {#if isAdmin}
        <div
          class="flex-1 flex overflow-x-auto snap-x snap-mandatory md:overflow-visible min-h-0"
        >
          <Chat {space} />
          <Objects {space} />
        </div>
      {:else}
        <Chat {space} />
      {/if}
    {:else if mode === 'users'}
      <Users {space} {rool} />
    {:else}
      <QuizFlow {space} {rool} />
    {/if}
  </div>
{/if}
