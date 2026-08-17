import { MONTHLY_CYCLE_STATUS } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError } from "@/lib/errors";
import { MonthlyCycleModel } from "@/lib/models";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function periodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  return `${MONTHS[month - 1]} ${year}`;
}

/**
 * Writes (expenses, payments, meal entries, adjustments) into a FINALIZED
 * or CLOSED accounting period are rejected. This is the "closed periods
 * are protected" invariant, enforced in every mutating service.
 */
export async function assertPeriodWritable(organizationId: string, date: Date): Promise<void> {
  await connectToDatabase();
  const cycle = await MonthlyCycleModel.findOne({
    organizationId,
    startDate: { $lte: date },
    endDate: { $gt: date },
  });
  if (!cycle) {
    return;
  }
  if (cycle.status === MONTHLY_CYCLE_STATUS.FINALIZED || cycle.status === MONTHLY_CYCLE_STATUS.CLOSED) {
    throw new BusinessRuleError(
      `The accounting period ${periodLabel(cycle.periodKey)} is ${cycle.status.toLowerCase()} and can no longer be modified`
    );
  }
}
