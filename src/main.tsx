
import ReactDOM from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import './index.css'
import { Suspense, lazy } from "react";

import NotFound from "./screens/notFound";
import Loader from './components/loader/loader.tsx';
import App from './screens/admin/App.tsx';

// ── New eFAS System ───────────────────────────────────────────────────────────
import LoginPage from "./screens/auth/LoginPage";
import AppLayout from "./screens/dashboard/AppLayout";
import Dashboard from "./screens/dashboard/Dashboard";
import SubARO from "./screens/dashboard/SubARO";
import { DisbursementPage, AuditTrailPage } from "./screens/dashboard/StubPages";
import RaodMainContainer from './screens/saro/RaodMainContainer';
import ReceivedSaroMainContainer from './screens/received_saro/ReceivedSaroMainContainer';
import EfasSettingsContainer from "./screens/settings/EfasSettingsContainer";
import NTCAMainContainer from "./screens/ntca_records/NTCAMainContainer";
// ─────────────────────────────────────────────────────────────────────────────


const Menu = lazy(() =>
  wait(1300).then(() => import("./screens/admin/menu/MenuContainer.tsx"))
);

const Settings = lazy(() =>
  wait(1300).then(() => import("./screens/admin/settings/SettingsContainer.tsx"))
);




const Records2 = lazy(() =>
  wait(1300).then(() => import("./screens/admin/records/Records2.tsx"))
);

const MainPortalContainer = lazy(() =>
  wait(1300).then(() => import("./screens/portal_selection/MainPortalContainer.tsx"))
);

const NTCABalanceMainContainer = lazy(() =>
  wait(1300).then(() => import("./screens/ntca_balance/NTCABalanceMainContainer.tsx"))
);

const NTCARequestMainContainer = lazy(() =>
  wait(1300).then(() => import("./screens/ntca_request/NTCARequestMainContainer.tsx"))
);

// const Login = lazy(() =>
//   wait(1300).then(() => import("./screens/auth/Login.tsx"))
// );
const ResetPassword = lazy(() =>
  wait(1300).then(() => import("./screens/auth/ResetPassword.tsx"))
);
const ForgotPassword = lazy(() =>
  wait(1300).then(() => import("./screens/auth/forgotPass.tsx"))
);

const AddRecord = lazy(() =>
  wait(1300).then(() => import("./screens/add_record/AddRecordContainer.tsx"))
);

const router = createBrowserRouter([
  // ── eFAS System Routes ──────────────────────────────────────────────────────
  {
    path: "/efas-v1/login",
    element: <LoginPage />,
  },
  {
    path: "/efas-v1/",
    element: <Navigate to="/efas-v1/login" />,
  },
  {
    path: "/efas-v1/dashboard",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
    ],
  },
  {
    path: "/efas-v1/received-saro",
    element: <AppLayout />,
    children: [{ index: true, element: <ReceivedSaroMainContainer /> }],
  },
  {
    path: "/efas-v1/saro",
    element: <AppLayout />,
    children: [{ index: true, element: <RaodMainContainer /> }],
  },
  {
    path: "/efas-v1/sub-aro",
    element: <AppLayout />,
    children: [{ index: true, element: <SubARO /> }],
  },
  {
    path: "/efas-v1/ntca",
    element: <AppLayout />,
    children: [{ index: true, element: <NTCAMainContainer /> }],
  },
  {
    path: "/efas-v1/disbursement",
    element: <AppLayout />,
    children: [{ index: true, element: <DisbursementPage /> }],
  },
  {
    path: "/efas-v1/settings",
    element: <AppLayout />,
    children: [{ index: true, element: <EfasSettingsContainer /> }],
  },
  {
    path: "/efas-v1/audit-trail",
    element: <AppLayout />,
    children: [{ index: true, element: <AuditTrailPage /> }],
  },
  // ── Legacy Routes ────────────────────────────────────────────────────────────
  {
    path: "/efas-v1/portal",
    element: <>
      <Suspense fallback={<Loader />}>
        <MainPortalContainer />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/ntca-balance",
    element: <>
      <Suspense fallback={<Loader />}>
        <NTCABalanceMainContainer />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/ntca-request",
    element: <>
      <Suspense fallback={<Loader />}>
        <NTCARequestMainContainer />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/records",
    element: <>
      <Suspense fallback={<Loader />}>
        <Records2 />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/forgot-password",
    element: <>
      <Suspense fallback={<Loader />}>
        <ForgotPassword />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/reset-password/:uid/:token",
    element: <>
      <Suspense fallback={<Loader />}>
        <ResetPassword />
      </Suspense>
    </>,
  },
  {
    path: "/efas-v1/admin/",
    element: <App />,

    children: [
      {
        path: "/efas-v1/admin/",
        element: <Navigate to="/efas-v1/admin/menu" />,
      },
      {
        path: "/efas-v1/admin/add-record",
        element: <>
          <Suspense fallback={<Loader />}>
            <AddRecord />
          </Suspense>
        </>,
      },
      {
        path: "/efas-v1/admin/menu",
        element: <>
          <Suspense fallback={<Loader />}>
            <Menu />
          </Suspense>
        </>,
      },
      {
        path: "/efas-v1/admin/settings",
        element: <>
          <Suspense fallback={<Loader />}>
            <Settings />
          </Suspense>
        </>,
      },




      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

function wait(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(

  <RouterProvider router={router} />

)
