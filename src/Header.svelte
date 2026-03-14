<script lang="ts">
  import type { ReactiveChannel } from '@rool-dev/svelte';

  type Mode = 'chat' | 'quiz' | 'users';

  interface Props {
    appName: string;
    channel: ReactiveChannel | null;
    mode: Mode;
    onModeChange: (mode: Mode) => void;
    onLogout: () => void;
  }

  let { appName, channel, mode, onModeChange, onLogout }: Props = $props();

  let canManageUsers = $derived(
    channel != null && (channel.role === 'owner' || channel.role === 'admin'),
  );

  $effect(() => {
    if (mode === 'users' && !canManageUsers) {
      onModeChange('chat');
    }
  });
</script>

<header
  class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between"
>
  <h1 class="text-lg font-semibold text-gray-900">{appName}</h1>

  <div class="flex items-center gap-3">
    {#if channel}
      <div class="flex bg-gray-100 rounded-lg p-0.5">
        <button
          class="px-3 py-1 text-sm font-medium rounded-md transition-colors {mode ===
          'chat'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}"
          onclick={() => onModeChange('chat')}
        >
          Chat
        </button>
        <button
          class="px-3 py-1 text-sm font-medium rounded-md transition-colors {mode ===
          'quiz'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}"
          onclick={() => onModeChange('quiz')}
        >
          Quiz
        </button>
        {#if canManageUsers}
          <button
            class="px-3 py-1 text-sm font-medium rounded-md transition-colors {mode ===
            'users'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}"
            onclick={() => onModeChange('users')}
          >
            Users
          </button>
        {/if}
      </div>
    {/if}
    <button
      class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      onclick={onLogout}
    >
      Sign out
    </button>
  </div>
</header>
