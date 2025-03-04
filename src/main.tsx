
import ReactDOM from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import './index.css'
import { Suspense, lazy } from "react";

import NotFound from "./screens/notFound";
import Loader from './components/loader/loader.tsx';
import App from './screens/admin/App.tsx';


const Menu = lazy(() =>
  wait(1300).then(() => import("./screens/admin/menu/MenuContainer.tsx"))
);

const Settings = lazy(() =>
  wait(1300).then(() => import("./screens/admin/settings/SettingsContainer.tsx"))
);



const Records = lazy(() =>
  wait(1300).then(() => import("./screens/admin/records/Records.tsx"))
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
  {

    path: "/efas-v1/",
    element: <Navigate to="/efas-v1/records" />,
  },
  {
    path: "/efas-v1/records",
    element: <>
      <Suspense fallback={<Loader />}>
        <Records/>
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
        path: "/efas-v1/admin/records",
        element: <>
          <Suspense fallback={<Loader />}>
            <Records />
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
