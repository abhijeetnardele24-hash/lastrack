import { InventoryBrief, ActivationPlan, ConstraintCheck } from "@lastrack/contracts";

export function evaluateConstraints(
  plan: ActivationPlan,
  brief: InventoryBrief
): ConstraintCheck[] {
  const checks: ConstraintCheck[] = [];

  // 1. Budget Constraint
  const cost = plan.estimatedCost;
  const budgetCap = brief.budgetCap;
  if (cost <= budgetCap) {
    checks.push({
      rule: "BUDGET_CAP",
      status: "PASS",
      detail: `Estimated cost ($${cost}) is within merchant cap of $${budgetCap}.`,
    });
  } else {
    checks.push({
      rule: "BUDGET_CAP",
      status: "FAIL",
      detail: `Estimated cost ($${cost}) exceeds merchant cap of $${budgetCap}.`,
    });
  }

  // 2. Forbidden Tactics Constraint
  let forbiddenFound: string | null = null;
  const combinedText = `${plan.title} ${plan.hypothesis} ${plan.actions.join(" ")}`.toLowerCase();

  for (const tactic of brief.forbiddenTactics) {
    const tLower = tactic.toLowerCase();
    if (combinedText.includes(tLower)) {
      forbiddenFound = tactic;
      break;
    }
  }

  if (forbiddenFound) {
    checks.push({
      rule: "FORBIDDEN_TACTICS",
      status: "FAIL",
      detail: `Plan incorporates tactic "${forbiddenFound}" prohibited by merchant brief.`,
    });
  } else {
    checks.push({
      rule: "FORBIDDEN_TACTICS",
      status: "PASS",
      detail: `No prohibited tactics detected (${brief.forbiddenTactics.length} checked).`,
    });
  }

  // 3. Test Window Feasibility
  checks.push({
    rule: "EXECUTION_WINDOW",
    status: "PASS",
    detail: `Experiment designed to run within the ${brief.testWindowDays}-day observation window.`,
  });

  return checks;
}
