// Single source of truth for "which apps exist" and "who gets them by
// default" — used by:
//   - server/app-access.ts, to resolve each employee's effective app list
//     (defaults + any admin overrides stored in employee_app_access)
//   - client/src/pages/admin-app-access.tsx, to render the assignment UI
//
// This does NOT change client/src/pages/dashboard.tsx's own QUICK_LINKS /
// ALLOWED_*_EMPLOYEE_CODES arrays (left untouched on purpose), but the
// default lists below were copied from them so behavior stays identical
// until an admin explicitly overrides something.

export interface AppCatalogEntry {
    id: string;
    title: string;
    /**
     * "open"       — available to every employee by default.
     * "restricted" — only available to employees in defaultAllowedCodes by
     *                default.
     */
    defaultAccess: "open" | "restricted";
    defaultAllowedCodes?: string[];
}

export const APP_CATALOG: AppCatalogEntry[] = [
    { id: "timestrap", title: "TimeStrap", defaultAccess: "open" },
    { id: "lms", title: "Leave Management System (LMS)", defaultAccess: "open" },
    { id: "pms", title: "Project Management System (PMS)", defaultAccess: "open" },
    { id: "calendar", title: "PMS Calendar", defaultAccess: "open" },
    {
        id: "boq",
        title: "BOQ",
        defaultAccess: "restricted",
        defaultAllowedCodes: [
            "E0055",
            "E0046",
            "E0048",
            "E0050",
            "E0051",
            "E0042",
            "E0001",
            "E0009",
            "E0057",
            "E0041",
            "E0032",
            "E0060",
            "E0059",
        ],
    },
    {
        id: "payroll",
        title: "Payroll",
        defaultAccess: "restricted",
        defaultAllowedCodes: ["E0046", "E0048", "E0001", "E0049", "E0047", "E0061"],
    },
    {
        id: "crm",
        title: "CRM",
        defaultAccess: "restricted",
        defaultAllowedCodes: ["E0046", "E0048", "E0001", "E0009", "E0050", "E0041"],
    },
    {
        id: "timeguard",
        title: "Timeguard",
        defaultAccess: "restricted",
        defaultAllowedCodes: ["E0046", "E0048", "E0001", "E0049", "E0061"],
    },
    {
        id: "hrms",
        title: "HRMS",
        defaultAccess: "restricted",
        defaultAllowedCodes: ["E0048", "E0046", "E0049", "E0001", "E0047", "E0061"],
    },
    { id: "policy", title: "Company Policy", defaultAccess: "open" },
];

export function isAppAllowedByDefault(appId: string, employeeCode: string): boolean {
    const entry = APP_CATALOG.find((a) => a.id === appId);
    if (!entry) return true;
    if (entry.defaultAccess === "open") return true;
    return (entry.defaultAllowedCodes ?? []).includes(employeeCode);
}