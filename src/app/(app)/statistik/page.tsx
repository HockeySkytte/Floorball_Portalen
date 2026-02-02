import { getAppContext } from "@/lib/appContext";
import StatistikOverviewServer from "./StatistikOverviewServer";

export default async function StatistikPage() {
  const { ctx, statsAggregationMode, leagueName } = await getAppContext();
  return <StatistikOverviewServer ctx={ctx} mode={statsAggregationMode} leagueName={leagueName} />;
}
