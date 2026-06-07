import React, { useState } from "react";
import {
  Button,
  Drawer,
  List,
  Space,
  Typography,
  Grid,
} from "antd";
import { Plus, CalendarDays, List as ListIcon, Menu as MenuIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/shadcn";
import ScheduleCreatorCalendar from "./add-ui-schedule";
import ManageScheduleCalendar from "../components/index";
import { PageHeader } from "../../../components/ui";
import { brandColors } from "../../../theme/theme";

const { useBreakpoint } = Grid;

const tabs = [
  { label: "Lịch thêm", icon: CalendarDays, key: "add" },
  { label: "Xem lịch học", icon: ListIcon, key: "view" },
];

export default function AddSchedule() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activeTab, setActiveTab] = useState("add");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMobileTabSelect = (key: string) => {
    setActiveTab(key);
    setMobileDrawerOpen(false);
  };

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Quản lý lịch học"
        subtitle="Tạo và quản lý lịch học cho các khóa học trong hệ thống"
        extra={
          !isMobile && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => setActiveTab("add")}
            >
              Thêm lịch học
            </Button>
          )
        }
      />

      <div className="mira-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isMobile && (
            <TabsList className="bg-[#F5F5F5] p-1 rounded-lg mb-5 inline-flex h-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2"
                  >
                    <Icon size={16} strokeWidth={2} />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          )}

          {isMobile && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: brandColors.redSoft,
                borderRadius: 10,
                marginBottom: 16,
                border: `1px solid #FFD6D6`,
              }}
            >
              <Space>
                {(() => {
                  const Icon = tabs.find((t) => t.key === activeTab)?.icon;
                  return Icon ? <Icon size={16} /> : null;
                })()}
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {tabs.find((t) => t.key === activeTab)?.label}
                </Typography.Text>
              </Space>
              <Button
                type="text"
                icon={<MenuIcon size={18} />}
                onClick={() => setMobileDrawerOpen(true)}
              />
            </div>
          )}

          <Drawer
            title="Chọn phần"
            placement="bottom"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
          >
            <List
              dataSource={tabs}
              renderItem={(item) => {
                const Icon = item.icon;
                return (
                  <List.Item
                    onClick={() => handleMobileTabSelect(item.key)}
                    style={{
                      cursor: "pointer",
                      background:
                        activeTab === item.key ? brandColors.redSoft : "transparent",
                      borderRadius: 8,
                      padding: "12px 16px",
                    }}
                  >
                    <Space>
                      <Icon size={16} />
                      <Typography.Text
                        strong={activeTab === item.key}
                        style={{
                          color:
                            activeTab === item.key ? brandColors.red : undefined,
                        }}
                      >
                        {item.label}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Drawer>

          <TabsContent value="add" className="mt-0 focus-visible:outline-none">
            <div
              style={{
                background: brandColors.paper,
                border: `1px solid ${brandColors.border}`,
                borderRadius: 12,
                padding: isMobile ? 14 : 22,
              }}
            >
              <Typography.Title level={5} style={{ marginBottom: 4, fontSize: 16, fontWeight: 600 }}>
                Lịch thêm lịch học
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Nhấp vào một ca học trên lịch dưới đây để tạo lịch học
              </Typography.Text>
              <div style={{ marginTop: 16 }}>
                <ScheduleCreatorCalendar />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="view" className="mt-0 focus-visible:outline-none">
            <ManageScheduleCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
