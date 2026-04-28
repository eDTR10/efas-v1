# eFAS — Electronic Financial Accountability System

A web-based financial management system built for **DICT Regional Office 10**, designed to digitize and streamline the tracking of allotments, obligations, and disbursements across programs and projects.

---

## Overview

eFAS replaces manual spreadsheet-based financial tracking with a centralized, real-time dashboard. It provides finance officers and program managers with an accurate view of budget utilization — from SARO issuance down to disbursement — across all PAPs (Programs, Activities, and Projects).

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Recharts · Django REST Framework (backend)

---

## Subsystems

### 1. RAOD — Record of Allotments, Obligations, and Disbursements

The RAOD module is the core financial ledger of eFAS. It manages the full lifecycle of a SARO (Special Allotment Release Order) from receipt through obligation and disbursement.

**Key features:**

- Add, view, edit, and delete SARO records linked to specific PAPs
- Group records by SARO number with per-group obligation and unobligated balance
- Track obligation details: ORS number, claimant, particulars, and obligated amount
- Track disbursements: cash, non-TRA, and ADA/check breakdowns
- Filter and search records by PAP, SARO number, fund source, and class type
- Export records to PDF or Excel
- Dashboard integration — RAOD records feed the financial summary charts and indicators

---

### 2. Received SARO

The Received SARO module serves as the official registry of SAROs received by DICT Regional Office 10 from the central office. It acts as the reference list for all allotments that the office is authorized to obligate.

**Key features:**

- Register and manage received SAROs with date, amount, fund source, and particulars
- Archive inactive or superseded SARO entries without deletion
- Search and filter by SARO number, fund source, or particulars
- Serves as the master reference for RAOD grouping and NTCA linkage

---

### 3. NTCA — Notice of Transfer of Cash Allocation

The NTCA module tracks cash allocation transfers received by the regional office and monitors how they are disbursed across quarters and programs.

**Key features:**

#### NTCA Records

Manages individual NTCA entries linked to specific SARO numbers. Tracks the NTCA number, NCA number, amount, fund source, class type, and PAP code. Supports archiving and full search/filter capabilities.

#### NTCA Balance

Tracks NTCA received vs. disbursements per PAP per quarter, computing the running NTCA balance. Supports both **Regular** and **Special** budget categories, filterable by year (2025 / 2026) and quarter (Q1–Q4).

#### NTCA Request

Manages monthly NTCA request submissions per PAP. Tracks obligated amounts and the requested NTCA per month, with Google Sheets integration for data entry and reporting. Supports year-level filtering and export.

---

### 4. Disbursement (Cashier)

The Disbursement module is the cashier-facing view of eFAS. It tracks the actual release of funds against obligated amounts, providing a real-time picture of cash utilization for each SARO.

**Key features:**

- Record and monitor cash disbursements (cash, non-TRA, and ADA/check) per obligation entry
- View per-SARO disbursement summaries and running balances
- Role-restricted access — only users with the **Cashier** role can record and manage disbursement entries
- Dashboard integration — disbursement figures feed the utilization indicators on the financial overview

---

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (Django REST Framework — see `BE/dtms-efas-server`)

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3001` by default.

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000/api/
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### Build for Production

```bash
npm run build
```

---

## Project Structure

```
src/
├── components/        # Shared UI components (nav, inputs, loaders, etc.)
├── plugin/            # Axios instances and API helpers
├── screens/
│   ├── auth/          # Login, forgot password, reset password
│   ├── dashboard/     # Financial overview dashboard, app layout, detail panels
│   ├── saro/          # RAOD module
│   ├── received_saro/ # Received SARO registry
│   ├── ntca_records/  # NTCA records management
│   ├── ntca_balance/  # NTCA Balance module
│   ├── ntca_request/  # NTCA Request module
│   ├── settings/      # System settings (PAPs, fund sources, class types, etc.)
│   ├── user_management/ # User management (admin only)
│   └── admin/         # Admin panel
└── lib/               # Utility functions
```

---

## License

For internal use by DICT Regional Office 10. All rights reserved.

1. show hidden folder
2. delete the .git folder
3. create a repo in github
4. push everything on github
5. In the vite.config.js file add this line before plugins: [react()],
   base: "/YOUR_REPOSITORY_NAME", main.tsx paths to "/YOUR_REPOSITORY_NAME", notFound Link to "/YOUR_REPOSITORY_NAME"
6. In terminal type " npm run deploy"
