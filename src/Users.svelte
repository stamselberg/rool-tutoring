<script lang="ts">
  import type { ReactiveChannel, Rool, RoolSpace } from '@rool-dev/svelte';
  import type { SpaceMember, RoolUserRole, LinkAccess } from '@rool-dev/sdk';

  interface Props {
    space: RoolSpace | null;
    channel: ReactiveChannel;
    rool: Rool;
  }

  let { space, channel, rool }: Props = $props();

  // Member list
  let members = $state<SpaceMember[]>([]);
  let loadingMembers = $state(true);
  let membersError = $state<string | null>(null);

  // Add user form
  let emailInput = $state('');
  let selectedRole = $state<RoolUserRole>('editor');
  let addingUser = $state(false);
  let addError = $state<string | null>(null);
  let addSuccess = $state<string | null>(null);

  // Remove user
  let removingUserId = $state<string | null>(null);

  // Link access — derived from channel, with local override after updates
  let linkAccessOverride = $state<LinkAccess | null>(null);
  let currentLinkAccess = $derived(linkAccessOverride ?? channel.linkAccess);
  let settingLinkAccess = $state(false);

  async function loadMembers() {
    loadingMembers = true;
    membersError = null;
    try {
      members = await space!.listUsers();
    } catch (e) {
      membersError = e instanceof Error ? e.message : 'Failed to load members';
    } finally {
      loadingMembers = false;
    }
  }

  $effect(() => {
    loadMembers();
  });

  async function addUser() {
    if (!emailInput.trim()) return;
    addError = null;
    addSuccess = null;
    addingUser = true;
    try {
      const existing = members.find(
        (m) => m.email.toLowerCase() === emailInput.trim().toLowerCase(),
      );
      if (existing) {
        addError = 'This user is already a member of this space.';
        return;
      }

      const user = await rool.searchUser(emailInput.trim());
      if (!user) {
        addError = 'No Rool user found with that email address.';
        return;
      }

      await space!.addUser(user.id, selectedRole);
      addSuccess = `Added ${user.email} as ${selectedRole}.`;
      emailInput = '';
      selectedRole = 'editor';
      await loadMembers();
    } catch (e) {
      addError = e instanceof Error ? e.message : 'Failed to add user';
    } finally {
      addingUser = false;
    }
  }

  async function removeUser(userId: string) {
    removingUserId = userId;
    try {
      await space!.removeUser(userId);
      await loadMembers();
    } catch (e) {
      membersError = e instanceof Error ? e.message : 'Failed to remove user';
    } finally {
      removingUserId = null;
    }
  }

  async function handleLinkAccess(value: LinkAccess) {
    settingLinkAccess = true;
    try {
      await space!.setLinkAccess(value);
      linkAccessOverride = value;
    } catch (e) {
      membersError =
        e instanceof Error ? e.message : 'Failed to update link access';
    } finally {
      settingLinkAccess = false;
    }
  }

  function roleBadgeClass(role: RoolUserRole): string {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'editor':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  function linkAccessLabel(value: LinkAccess): string {
    switch (value) {
      case 'none':
        return 'No access';
      case 'viewer':
        return 'Viewer';
      case 'editor':
        return 'Editor';
    }
  }
</script>

<div class="flex-1 overflow-y-auto">
  <div class="max-w-xl mx-auto px-5 py-8 space-y-6">
    <!-- Link Sharing -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-1">Link Sharing</h3>
      <p class="text-sm text-gray-500 mb-3">
        Control what access people get when they open this space via its link.
      </p>
      <div class="flex items-center gap-2">
        {#each ['none', 'viewer', 'editor'] as option}
          <button
            class="px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 {currentLinkAccess ===
            option
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            onclick={() => handleLinkAccess(option as LinkAccess)}
            disabled={settingLinkAccess}
          >
            {linkAccessLabel(option as LinkAccess)}
          </button>
        {/each}
        {#if settingLinkAccess}
          <div
            class="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"
          ></div>
        {/if}
      </div>
    </div>

    <!-- Add User -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">Add User</h3>
      <div class="flex gap-2">
        <input
          type="email"
          placeholder="Email address"
          bind:value={emailInput}
          class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none transition-colors"
          disabled={addingUser}
          onkeydown={(e) => {
            if (e.key === 'Enter') addUser();
          }}
        />
        <select
          bind:value={selectedRole}
          class="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none transition-colors"
          disabled={addingUser}
        >
          <option value="editor">Student</option>
          <option value="admin">Admin</option>
        </select>
        <button
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          onclick={addUser}
          disabled={addingUser || !emailInput.trim()}
        >
          {#if addingUser}
            <div
              class="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"
            ></div>
          {:else}
            Add
          {/if}
        </button>
      </div>
      {#if addError}
        <p class="mt-2 text-sm text-red-600">{addError}</p>
      {/if}
      {#if addSuccess}
        <p class="mt-2 text-sm text-green-600">{addSuccess}</p>
      {/if}
    </div>

    <!-- Members -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Members {#if !loadingMembers}({members.length}){/if}
      </h3>

      {#if loadingMembers}
        <div class="flex items-center gap-3 py-4 justify-center">
          <div
            class="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"
          ></div>
          <span class="text-sm text-gray-500">Loading members...</span>
        </div>
      {:else if membersError}
        <p class="text-sm text-red-600 py-2">{membersError}</p>
      {:else}
        <div class="space-y-2">
          {#each members as member (member.id)}
            <div
              class="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <span class="text-sm text-gray-900">{member.email}</span>
                <span
                  class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full {roleBadgeClass(
                    member.role,
                  )}"
                >
                  {member.role}
                </span>
              </div>
              {#if member.role !== 'owner'}
                <button
                  class="px-3 py-1 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  onclick={() => removeUser(member.id)}
                  disabled={removingUserId === member.id}
                >
                  {#if removingUserId === member.id}
                    <div
                      class="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"
                    ></div>
                  {:else}
                    Remove
                  {/if}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
