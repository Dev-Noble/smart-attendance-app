import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Attendance from './pages/Attendance/Attendance';
import Students from './pages/Students/Students';
import Settings from './pages/Settings/Settings';
import MarkAttendance from './pages/Attendance/MarkAttendance';
import Login from './pages/Login/Login';
import ForgotPassword from './pages/Login/ForgotPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './App.css';

import Sessions from './pages/Attendance/Sessions';
import StudentProfile from './pages/Students/StudentProfile';
import ManageCourses from './pages/Courses/ManageCourses';
import RegisterCourse from './pages/Courses/RegisterCourse';
import Biodata from './pages/Biodata/Biodata';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/mark/:sessionId" element={<MarkAttendance />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="biodata" element={<Biodata />} />
              <Route path="courses/manage" element={<ManageCourses />} />
              <Route path="courses/register" element={<RegisterCourse />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
