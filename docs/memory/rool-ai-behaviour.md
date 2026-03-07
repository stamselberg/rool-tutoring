# Rool AI Behaviour

Lessons from working with Rool's AI object creation.

## The AI omits fields you assume are obvious

The AI created 16 questions with every field correct — except it omitted `type: 'question'`. The server-side filter `collection({ where: { type: 'question' } })` returned 0 results.

**Defence**: Use client-side filtering on the most structurally distinctive field (e.g., `questionType` exists → it's a question). Don't rely on a single field for server-side filtering when the AI might skip it.

**Also**: Mark critical fields with `← REQUIRED` in the system instruction. The AI respects these annotations.

## Fill-in-the-blank answer checking

Client-side string matching works for MC and T/F. For `fill` questions, the AI might be better at judging "close enough" answers. Revisit if validation feels too rigid — could use `space.prompt()` to ask the AI to judge the answer.
