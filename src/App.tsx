import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { GoalCreation } from './pages/GoalCreation';
import { MyGoals } from './pages/MyGoals';
import { AchievementInput } from './pages/AchievementInput';
import { TeamGoalReview } from './pages/TeamGoalReview';
import { ManagerCheckin } from './pages/ManagerCheckin';
import { UserManagement } from './pages/UserManagement';
import { CycleManagement } from './pages/CycleManagement';
import { GoalUnlock } from './pages/GoalUnlock';
import { CompletionDashboard } from './pages/CompletionDashboard';
import { AchievementReport } from './pages/AchievementReport';
import { AuditLogViewer } from './pages/AuditLogViewer';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Employee Routes */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/goals/create"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <GoalCreation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/goals"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <MyGoals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/achievements"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <AchievementInput />
              </ProtectedRoute>
            }
          />
          
          {/* Manager Routes */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/team-review"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <TeamGoalReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/checkin"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerCheckin />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cycles"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CycleManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/unlock"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <GoalUnlock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/completion"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CompletionDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AchievementReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogViewer />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
