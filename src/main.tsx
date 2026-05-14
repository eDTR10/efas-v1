
import ReactDOM from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import './index.css'

import NotFound from "./screens/notFound";
import LoginPage from "./screens/auth/LoginPage";
import AppLayout from "./screens/dashboard/AppLayout";
import {
  ReportsPage,
} from "./screens/dashboard/StubPages";
import UserManagementContainer from './screens/user_management/UserManagementContainer';
import AuditTrailContainer from './screens/audit_trail/AuditTrailContainer';
import RAODMainContainer from './screens/raod/RAODMainContainer';
import ReceivedSaroMainContainer from "./screens/received_saro/ReceivedSaroMainContainer";
import EfasSettingsContainer from './screens/settings/EfasSettingsContainer';
import Dashboard from './screens/dashboard/Dashboard';


const router = createBrowserRouter([
  {
    path: "/efas-v1/",
    element: <Navigate to="/efas-v1/login" replace />,
  },
  {
    path: "/efas-v1/login",
    element: <LoginPage />,
  },
  {
    path: "/efas-v1",
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "raod", element: <RAODMainContainer /> },
      { path: "received-saro", element: <ReceivedSaroMainContainer /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <EfasSettingsContainer /> },
      { path: "audit-trail", element: <AuditTrailContainer /> },
      { path: "user-management", element: <UserManagementContainer /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
