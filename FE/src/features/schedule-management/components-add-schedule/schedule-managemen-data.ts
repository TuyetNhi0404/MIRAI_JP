import type { User, Course, CourseMember, Session, CourseCalendar } from './data.type';


// Users
export const users: User[] = [
  {
    id: "user-001",
    name: "Nguyễn Văn Admin",
    email: "admin@school.edu.vn",
    password: "hashed_password_123",
    role: "admin",
    status: "active",
    createdAt: "2024-01-15T08:00:00Z"
  },
  {
    id: "user-002",
    name: "Trần Thị Mai",
    email: "mai.tran@school.edu.vn",
    password: "hashed_password_456",
    role: "teacher",
    status: "active",
    createdAt: "2024-01-20T09:30:00Z"
  },
  {
    id: "user-003",
    name: "Lê Văn Hùng",
    email: "hung.le@school.edu.vn",
    password: "hashed_password_789",
    role: "teacher",
    status: "active",
    createdAt: "2024-02-01T10:00:00Z"
  },
  {
    id: "user-004",
    name: "Phạm Minh Tuấn",
    email: "tuan.pham@student.edu.vn",
    password: "hashed_password_abc",
    role: "student",
    status: "active",
    createdAt: "2024-03-05T14:20:00Z"
  },
  {
    id: "user-005",
    name: "Hoàng Thu Hà",
    email: "ha.hoang@student.edu.vn",
    password: "hashed_password_def",
    role: "student",
    status: "active",
    createdAt: "2024-03-06T11:15:00Z"
  },
  {
    id: "user-006",
    name: "Vũ Đức Minh",
    email: "minh.vu@student.edu.vn",
    password: "hashed_password_ghi",
    role: "student",
    status: "pending",
    createdAt: "2024-10-28T16:45:00Z"
  },
  {
    id: "user-007",
    name: "Đỗ Thị Lan",
    email: "lan.do@student.edu.vn",
    password: "hashed_password_jkl",
    role: "student",
    status: "active",
    createdAt: "2024-03-10T08:30:00Z"
  }
];

// Courses
export const courses: Course[] = [
  {
    id: "course-001",
    courseName: "DNL_CPL_NodeJS_01",
    description: "Khóa học về HTML, CSS, JavaScript cơ bản",
    status: "active",
    createdBy: "user-002",
    createdAt: "2024-02-15T10:00:00Z"
  },
  {
    id: "course-002",
    courseName: "DNL_CPL_JavaScript_02",
    description: "Học về các cấu trúc dữ liệu và thuật toán phổ biến",
    status: "active",
    createdBy: "user-003",
    createdAt: "2024-02-20T14:30:00Z"
  },
  {
    id: "course-003",
    courseName: "DNL_CPL_Python_03",
    description: null,
    status: "active",
    createdBy: "user-002",
    createdAt: "2024-03-01T09:00:00Z"
  },
  {
    id: "course-004",
    courseName: "DNL_CPL_ReactJS_04",
    description: "SQL và quản trị cơ sở dữ liệu",
    status: "inactive",
    createdBy: "user-003",
    createdAt: "2024-01-10T11:20:00Z"
  }
];

// Course Members
export const courseMembers: CourseMember[] = [
  // Course 1 members
  {
    courseId: "course-001",
    userId: "user-004",
    enrolledAt: "2024-03-10T10:00:00Z"
  },
  {
    courseId: "course-001",
    userId: "user-005",
    enrolledAt: "2024-03-11T09:30:00Z"
  },
  {
    courseId: "course-001",
    userId: "user-007",
    enrolledAt: "2024-03-12T14:15:00Z"
  },
  // Course 2 members
  {
    courseId: "course-002",
    userId: "user-004",
    enrolledAt: "2024-03-15T11:00:00Z"
  },
  {
    courseId: "course-002",
    userId: "user-005",
    enrolledAt: "2024-03-15T11:05:00Z"
  },
  // Course 3 members
  {
    courseId: "course-003",
    userId: "user-005",
    enrolledAt: "2024-04-01T10:30:00Z"
  },
  {
    courseId: "course-003",
    userId: "user-007",
    enrolledAt: "2024-04-02T13:20:00Z"
  }
];

// Sessions
export const sessions: Session[] = [
  {
    id: "session-001",
    sessionName: "Buổi sáng",
    startTime: "07:00",
    endTime: "12:00"
  },
  {
    id: "session-002",
    sessionName: "Buổi chiều",
    startTime: "13:00",
    endTime: "17:00"
  }
];

// Course Calendar
// Course Calendar
export const courseCalendar: CourseCalendar[] = [
  {
    id: "cal-001",
    courseId: "course-001",
    date: "2025-10-28", 
    sessionId: "session-001",
    teacherId: "user-002",
    status: "completed"
  },
  {
    id: "cal-002",
    courseId: "course-001",
    date: "2025-10-30", 
    sessionId: "session-001",
    teacherId: "user-002",
    status: "scheduled"
  },
  {
    id: "cal-003",
    courseId: "course-001",
    date: "2025-11-01", 
    sessionId: "session-001",
    teacherId: "user-002",
    status: "scheduled"
  },
  {
    id: "cal-004",
    courseId: "course-001",
    date: "2025-11-04", 
    sessionId: "session-001",
    teacherId: "user-002",
    status: "scheduled"
  },
  {
    id: "cal-005",
    courseId: "course-002",
    date: "2025-10-29", 
    sessionId: "session-002",
    teacherId: "user-003",
    status: "completed"
  },
  {
    id: "cal-006",
    courseId: "course-002",
    date: "2025-10-31", 
    sessionId: "session-002",
    teacherId: "user-003",
    status: "scheduled"
  },
  {
    id: "cal-007",
    courseId: "course-002",
    date: "2025-11-02", 
    sessionId: "session-002",
    teacherId: "user-003",
    status: "scheduled"
  },
  {
    id: "cal-008",
    courseId: "course-003",
    date: "2025-11-02", 
    sessionId: "session-002",
    teacherId: "user-002",
    status: "scheduled"
  },
  {
    id: "cal-009",
    courseId: "course-003",
    date: "2025-11-09",
    sessionId: "session-002",
    teacherId: "user-002",
    status: "scheduled"
  },
  {
    id: "cal-010",
    courseId: "course-001",
    date: "2025-10-25", 
    sessionId: "session-001",
    teacherId: "user-002",
    status: "cancelled"
  }
];