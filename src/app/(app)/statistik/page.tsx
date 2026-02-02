import { getAppContext } from "@/lib/appContext";
import StatistikOverviewServer from "./StatistikOverviewServer";

export default async function StatistikPage() {
  const { ctx, statsAggregationMode } = await getAppContext();
  const leagueName = ctx.selectedRowId
    ? ctx.rows.find((r) => r.id === ctx.selectedRowId)?.name ?? null
    : null;
  return <StatistikOverviewServer ctx={ctx} mode={statsAggregationMode} leagueName={leagueName} />;
}
