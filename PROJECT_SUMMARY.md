# MIRAI JP Project Summary

## Project Overview
MIRAI JP is a full-stack educational platform designed for Japanese language learning and comprehensive course management. It serves as a learning management system (LMS) with integrated AI features for speech practice and interview simulation.

## Technology Stack

### Frontend (FE)
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux + Redux Toolkit
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Key Libraries**: 
  - React Router for navigation
  - React Toastify for notifications
  - Recharts for data visualization
  - Lucide React for icons
  - Browser-image-compression for image handling

### Backend (BE)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Scheduling**: Node-cron
- **AI Integration**: Google Generative AI, ElevenLabs speech API
- **Document Processing**: PDF-Parse, Mammoth (for Word docs)
- **Utilities**: Bcrypt for password hashing, Axios for HTTP requests

## Core Features

### User Management
- Multi-role authentication (Student, Teacher, Admin)
- User profiles with profile pictures
- Account management and locking capabilities
- Google OAuth integration

### Course & Learning Content
- Course creation and management
- Chapters and lessons organization
- Question bank with Excel import support
- Lesson materials with file uploads

### Assessment & Testing
- Quiz creation and management
- Question types support
- Auto-grading capabilities
- Assignment submission and tracking
- Anti-cheat monitoring system
- Quiz statistics and performance tracking

### Japanese Language Learning
- Kana (Japanese syllabary) practice and writing exercises
- Listening comprehension exercises
- Different exercise types (fill-in-blank, dictation)
- Audio player integration

### AI Features
- AI interview practice simulation
- Speech recognition and analysis
- AI-powered audit and feedback

### Gamification & Engagement
- Leaderboards (global, course-based, admin view)
- Attendance tracking
- Progress statistics
- Notifications and announcements

### Forum & Community
- Discussion threads and posts
- Comments and replies
- Reaction system (like, dislike, etc.)
- Forum moderation (ban system)

### Administrative Features
- Admin dashboard with metrics
- Course member management
- Enrollment request management
- Attendance management
- Schedule management for teachers
- Request/leave management

### Schedule Management
- Teacher schedule creation and management
- Student schedule viewing
- Request schedule (leave/modifications)
- Calendar integration

### Additional Features
- Email notifications
- Session tracking
- Audit logs for admin
- Real-time notifications dropdown
- Enrollment system with request approval
- Forum banning system
- Course-based and global statistics

## Project Structure

### Backend (BE)
```
src/
├── ai/              - AI client configurations
├── config/          - Configuration files (Cloudinary, etc.)
├── controller/      - Route handlers for all features
├── data/            - Data processing/handling
├── enum/            - TypeScript enums
├── error/           - Error handling configurations
├── middleware/      - Express middlewares
├── model/           - MongoDB schemas and models
├── routes/          - API route definitions
├── service/         - Business logic layer
├── types/           - TypeScript definitions
├── app.ts           - Express application setup
└── index.ts         - Application entry point
```

### Frontend (FE)
```
src/
├── api/             - API client instances and interceptors
├── components/      - Reusable UI components
├── features/        - Feature modules (listening, schedule, assignment, etc.)
├── hooks/           - Custom React hooks
├── layout/          - Layout components (Header, Sidebar, Footer)
├── mock/            - Mock data and services
├── pages/           - Page components for different roles
├── redux/           - State management (store, slices)
├── services/        - API service functions
├── types/           - TypeScript definitions
├── App.tsx          - Main application file
└── AppRouter.tsx    - Application routing configuration
```

## Current Development
- **Branch**: feat/BE_Listening
- **Recent Work**: Backend listening feature implementation, API fixes for video upload
- **Git User**: NguyenHung197

## Key Development Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled application
- `npm test` - Run test suite
- `npm run format` - Format code with Prettier

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build optimized production bundle
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Database Models
- User
- Course, Chapter, Lesson
- Quiz, Question, QuizQuestion, UserAnswer
- Assignment, Submission
- Enrollment, CourseMember
- Session, Attendance
- Forum (ForumPost, ForumReply, ForumComment, ForumBan)
- Listening (ListeningContent, ListeningExercise, ListeningResult)
- Notification
- Calendar, RequestSchedule
- Score
- Feedback

## APIs & Integrations
- Google Authentication API
- Google Generative AI API
- ElevenLabs Speech API
- Cloudinary for image storage
- Nodemailer for email services

## Development Notes
- Uses environment variables via dotenv
- Includes pre-commit hooks with Husky
- Code formatting with Prettier and lint-staged
- Testing with Jest
- CORS enabled for cross-origin requests
- Cookie-based session management

## Recent Updates (2026-05-23)

### Listening Feature - Admin Publish Control
**Status**: ✅ Completed

**Problem**: Admin could upload listening content but students couldn't see it because all content was unpublished by default (`isPublished = false`), and there was no UI for admin to control publish status.

**Solution Implemented**:

**Backend Changes**:
- Updated `ListeningContent` model: Changed `isPublished` default from `false` → `true`
- Added role-based filtering in `getAllContents` controller: Only non-admin users see `isPublished = true` content
- Added permission check in `getContentById`: Non-admin users get 403 error on unpublished content

**Frontend Changes**:
1. **ListeningManagePage** (Admin management page):
   - Added "Published" column with Switch toggle
   - Admin can click toggle to publish/unpublish content in real-time

2. **ListeningFormPage** (Create/Edit form):
   - Added "Publish" switch field
   - Admin can set publish status while creating or editing content

3. **Type Updates**:
   - Added `isPublished?: boolean` to `ListeningContent` interface
   - Added `isPublished?: boolean` to `ListeningContentPayload` interface

**Current Behavior**:
- New listening content: Auto-published (`isPublished = true` by default)
- Admin can toggle publish/unpublish status from management page or form
- Students only see published content
- Teachers can also see published content (after adding listening to teacher sidebar)

**Files Modified**:
- `BE/src/model/listeningContent.model.ts` - Default value change
- `BE/src/controller/listeningContent.controller.ts` - Role-based filtering (already present)
- `FE/src/features/listening/admin/ListeningManagePage.tsx` - Added toggle UI
- `FE/src/features/listening/admin/ListeningFormPage.tsx` - Added publish field
- `FE/src/features/listening/types.ts` - Added type property
- `FE/src/services/listeningService.ts` - Updated payload type
