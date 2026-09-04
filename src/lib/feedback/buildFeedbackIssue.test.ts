import { describe, expect, it } from 'vitest';

import { buildFeedbackIssue } from './buildFeedbackIssue';
import type { FeedbackInput, FeedbackTechnicalContext } from './types';

const context: FeedbackTechnicalContext = {
  path: '/character/abc123',
  commitSha: 'deadbeef',
  userAgent: 'Mozilla/5.0 test',
  reporter: 'joueur@example.com',
};

describe('buildFeedbackIssue', () => {
  it('préfixe le titre par le type et pose les labels type + Retour joueur', () => {
    const input: FeedbackInput = {
      kind: 'bug',
      zone: 'character-sheet',
      description: 'Le bonus de DEF ne se met pas à jour.',
    };

    const issue = buildFeedbackIssue(input, context);

    expect(issue.title.startsWith('[Bug] ')).toBe(true);
    expect(issue.title).toContain('Le bonus de DEF ne se met pas à jour.');
    expect(issue.labelIds).toEqual(['bug', 'retour-joueur']);
  });

  it("le type 'idea' préfixe [Idée] et pose le label feature", () => {
    const input: FeedbackInput = {
      kind: 'idea',
      zone: 'codex',
      description: 'Ajouter un filtre par voie dans le codex.',
    };

    const issue = buildFeedbackIssue(input, context);

    expect(issue.title.startsWith('[Idée] ')).toBe(true);
    expect(issue.labelIds).toEqual(['feature', 'retour-joueur']);
  });

  it("le type 'rule-error' préfixe [Erreur de règle] et pose le label dédié", () => {
    const input: FeedbackInput = {
      kind: 'rule-error',
      zone: 'bestiary',
      description: 'Le troll régénère plus de PV que la page 312 ne dit.',
    };

    const issue = buildFeedbackIssue(input, context);

    expect(issue.title.startsWith('[Erreur de règle] ')).toBe(true);
    expect(issue.labelIds).toEqual(['rule-error', 'retour-joueur']);
  });

  it('la description contient le texte du joueur en haut et le contexte technique en bas', () => {
    const input: FeedbackInput = {
      kind: 'bug',
      zone: 'gm-screen',
      description: 'Le tour ne passe pas.',
    };

    const issue = buildFeedbackIssue(input, context);

    const textIndex = issue.description.indexOf('Le tour ne passe pas.');
    const contextIndex = issue.description.indexOf(context.path);
    expect(textIndex).toBeGreaterThanOrEqual(0);
    expect(contextIndex).toBeGreaterThan(textIndex);
    expect(issue.description).toContain(context.commitSha as string);
    expect(issue.description).toContain(context.userAgent as string);
    expect(issue.description).toContain(context.reporter);
  });
});
