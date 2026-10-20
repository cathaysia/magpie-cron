import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { CronScreen } from "./client/cron-screen";

function CronSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Clock"
      label="Magie Cron"
      active={currentScreen?.screenId === "magie-cron"}
      onPress={() => openScreen({ screenId: "magie-cron" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({
    id: "magie-cron",
    title: "Magie Cron - Model Schedules",
    Component: CronScreen,
  });

  client.addSidebarHeaderItem({
    id: "magie-cron",
    title: "Magie Cron",
    Component: CronSidebarItem,
  });

  client.addCommandCenterItem({
    id: "magie-cron.open",
    title: "Open Magie Cron Schedule Manager",
    icon: "Clock",
    context: "global",
    onSelect(context) {
      context.openScreen({ screenId: "magie-cron" });
    },
  });

  return () => {};
}
