export const policy = {
  version: "ctrl-policy/2",
  control: { scale: 2, timeMax: 1.5, timeDays: 90, reputationMax: 1.3, reputationScale: 100, dailyCap: 3000 },
  tiers: [
    { name: "OBSERVER", minimum: 0, proposals: 0, jobs: 0, parallel: 0, jobBudget: 0, capabilities: ["browse"] },
    { name: "OPERATOR", minimum: 1000, proposals: 3, jobs: 0, parallel: 0, jobBudget: 0, capabilities: ["browse", "propose", "support"] },
    { name: "PILOT", minimum: 10000, proposals: 5, jobs: 3, parallel: 1, jobBudget: 0.1, capabilities: ["browse", "propose", "support", "research", "transform"] },
    { name: "ARCHITECT", minimum: 50000, proposals: 8, jobs: 5, parallel: 2, jobBudget: 0.25, capabilities: ["browse", "propose", "support", "research", "transform", "build"] },
    { name: "DIRECTOR", minimum: 200000, proposals: 12, jobs: 8, parallel: 3, jobBudget: 0.5, capabilities: ["browse", "propose", "support", "research", "transform", "build", "private"] },
  ],
  allocation: { maximumMultiplier: 1.25 },
  mission: { minLength: 15, maxLength: 500, proposalCost: 20, maxSupport: 500, maxSteps: 12, timeoutMs: 120000, budgetUsd: 0.25, retries: 2, maxOutputTokens: 1200 },
  lab: { researchCost: 30, transformCost: 15, buildCost: 60, maxInput: 12000 },
  reputation: { proposed: 1, accepted: 5, completed: 8, useful: 3, failed: -2, moderated: -10 },
} as const;
export type TierName = typeof policy.tiers[number]["name"];
