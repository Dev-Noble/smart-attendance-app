import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard/Dashboard';
import Attendance from './pages/Attendance/Attendance';
import MyAttendance from './pages/Attendance/MyAttendance';
import Students from './pages/Students/Students';
import Settings from './pages/Settings/Settings';
import MarkAttendance from './pages/Attendance/MarkAttendance';
import Login from './pages/Login/Login';
import ForgotPassword from './pages/Login/ForgotPassword';
import NotFound from './pages/NotFound/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './App.css';

import Sessions from './pages/Attendance/Sessions';
import StudentProfile from './pages/Students/StudentProfile';
import ManageCourses from './pages/Courses/ManageCourses';
import RegisterCourse from './pages/Courses/RegisterCourse';
import Biodata from './pages/Biodata/Biodata';
import AdminPanel from './pages/Admin/AdminPanel';
import PendingApproval from './pages/Login/PendingApproval';


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/mark/:sessionId" element={<MarkAttendance />} />

            {/* Pending Approval Redirect Route */}
            <Route element={<ProtectedRoute allowedRoles={['pending_lecturer']} />}>
              <Route path="/pending-approval" element={<PendingApproval />} />
            </Route>

            {/* Protected Routes - Approved Roster Roles */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'lecturer', 'student']} />}>
              <Route path="/" element={<Layout />}>
                {/* Universal Auth Routes */}
                <Route index element={<Dashboard />} />
                <Route path="settings" element={<Settings />} />

                {/* Student-Only Access Guard */}
                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                  <Route path="biodata" element={<Biodata />} />
                  <Route path="courses/register" element={<RegisterCourse />} />
                  <Route path="my-attendance" element={<MyAttendance />} />
                  <Route path="attendance" element={<Attendance />} />
                </Route>

                {/* Faculty/Admin Shared Access Guard */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'lecturer']} />}>
                  <Route path="attendance-manage" element={<Attendance />} />
                  <Route path="sessions" element={<Sessions />} />
                  <Route path="students" element={<Students />} />
                  <Route path="students/:id" element={<StudentProfile />} />
                  <Route path="courses/manage" element={<ManageCourses />} />
                </Route>

                {/* Admin-Only Access Guard */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="admin" element={<AdminPanel />} />
                </Route>
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
