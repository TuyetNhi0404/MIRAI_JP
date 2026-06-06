import React, { useState } from "react";
import {
  Button,
  Card,
  Drawer,
  List,
  Space,
  Tabs,
  Typography,
  Grid,
} from "antd";
import { Plus, CalendarDays, List as ListIcon, Menu as MenuIcon } from "lucide-react";
import ScheduleCreatorCalendar from "./add-ui-schedule";
import ManageScheduleCalendar from "../components/index";
import { PageHeader } from "../../../components/ui";
import { brandColors } from "../../../theme/theme";

const { useBreakpoint } = Grid;

const tabs = [
  { label: "Lịch học", icon: <CalendarDays size={16} />, key: "add" },
  { label: "Xem lịch học", icon: <ListIcon size={16} />, key: "view" },
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

  const tabItems = tabs.map((t) => ({
    key: t.key,
    label: (
      <Space size={6}>
        {t.icon}
        {t.label}
      </Space>
    ),
  }));

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

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
        }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        {!isMobile ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            style={{ fontWeight: 500 }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: brandColors.redSoft,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Space>
              {tabs.find((t) => t.key === activeTab)?.icon}
              <Typography.Text strong>
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
            renderItem={(item) => (
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
                  {item.icon}
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
            )}
          />
        </Drawer>

        <div className="mira-fade-in" key={activeTab}>
          {activeTab === "add" && (
            <div>
              <Typography.Title level={5} style={{ marginBottom: 4 }}>
                Lịch thêm lịch học
              </Typography.Title>
              <Typography.Text type="secondary">
                Nhấp vào một ca học trên lịch dưới đây để tạo lịch học
              </Typography.Text>
              <div style={{ marginTop: 16 }}>
                <ScheduleCreatorCalendar />
              </div>
            </div>
          )}
          {activeTab === "view" && <ManageScheduleCalendar />}
        </div>
      </Card>
    </div>
  );
}
