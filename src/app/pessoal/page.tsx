import { FinanceDashboard } from "@/components/finance-dashboard";
import { getCurrentMonthKey, isValidMonthKey } from "@/lib/finance";

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const initialMonth = isValidMonthKey(params.month) ? params.month : getCurrentMonthKey();

  return <FinanceDashboard scope="personal" initialMonth={initialMonth} />;
}
