import React, { useState } from "react";
import { Trophy, School, Globe, Crown, Medal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/shadcn";
import CourseLeaderboardTab from "../../components/admin-leaderboard/CourseLeaderboardTab";
import GlobalLeaderboardTab from "../../components/admin-leaderboard/GlobalLeaderboardTab";
import CourseComparisonTab from "../../components/admin-leaderboard/CourseComparisonTab";
import { PageHeader } from "../../components/ui";

const AdminLeaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("course");

  return (
    <div>
      <PageHeader
        icon={Crown}
        title="Bảng xếp hạng học tập"
        subtitle="Theo dõi kết quả, xếp hạng và sự tiến bộ của học viên trong từng khóa học và toàn hệ thống"
      />

      <div className="mira-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#F5F5F5] p-1 rounded-lg mb-6 inline-flex h-auto">
            <TabsTrigger
              value="course"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2"
            >
              <School size={16} strokeWidth={2} />
              Theo lớp học
            </TabsTrigger>
            <TabsTrigger
              value="global"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2"
            >
              <Globe size={16} strokeWidth={2} />
              Toàn hệ thống
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2"
            >
              <Trophy size={16} strokeWidth={2} />
              So sánh thủ khoa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="course" className="mt-0 focus-visible:outline-none">
            <CourseLeaderboardTab />
          </TabsContent>
          <TabsContent value="global" className="mt-0 focus-visible:outline-none">
            <GlobalLeaderboardTab />
          </TabsContent>
          <TabsContent value="compare" className="mt-0 focus-visible:outline-none">
            <CourseComparisonTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminLeaderboard;
