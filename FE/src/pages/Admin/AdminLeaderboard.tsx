import React, { useState } from "react";
import { Card, Tabs } from "antd";
import { Trophy, School, Globe, Crown } from "lucide-react";
import CourseLeaderboardTab from "../../components/admin-leaderboard/CourseLeaderboardTab";
import GlobalLeaderboardTab from "../../components/admin-leaderboard/GlobalLeaderboardTab";
import CourseComparisonTab from "../../components/admin-leaderboard/CourseComparisonTab";
import { PageHeader } from "../../components/ui";

const AdminLeaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("course");

  const tabItems = [
    {
      key: "course",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <School size={16} />
          Bảng xếp hạng lớp học
        </span>
      ),
      children: <CourseLeaderboardTab />,
    },
    {
      key: "global",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Globe size={16} />
          Bảng xếp hạng hệ thống
        </span>
      ),
      children: <GlobalLeaderboardTab />,
    },
    {
      key: "compare",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Trophy size={16} />
          So sánh thủ khoa
        </span>
      ),
      children: <CourseComparisonTab />,
    },
  ];

  return (
    <div>
      <PageHeader
        icon={Crown}
        title="Bảng xếp hạng học tập"
        subtitle="Theo dõi kết quả, xếp hạng và sự tiến bộ của học viên"
      />

      <Card
        style={{
          borderRadius: 12,
          border: "1px solid #E8E8E8",
        }}
        styles={{ body: { padding: "0 16px" } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{
            marginBottom: 0,
            fontWeight: 500,
          }}
        />
      </Card>
    </div>
  );
};

export default AdminLeaderboard;
