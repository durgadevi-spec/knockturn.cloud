import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
  isFuture,
  addMonths,
  subMonths,
} from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarCheck2,
  CalendarX2,
  Layers,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";

interface User {
  username: string;
  employeeCode: string;
  email?: string;
}

/* ---------------------------------------------------------------------- */
/* Shared                                                                  */
/* ---------------------------------------------------------------------- */

function useUser() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("knocxtirn_user");
    if (!stored) {
      setLocation("/");
      return;
    }
    setUser(JSON.parse(stored));
  }, [setLocation]);

  return user;
}

function MonthSwitcher({
  month,
  onChange,
}: {
  month: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-[10px] border-[#d9d9ea] bg-white text-[#4f5368] shadow-none hover:border-[#7f77dd] hover:text-[#3c3489]"
        onClick={() => onChange(subMonths(month, 1))}
        data-testid="button-prev-month"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="w-[120px] text-center text-[14px] font-bold text-[#2d2b41]">
        {format(month, "MMMM yyyy")}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-[10px] border-[#d9d9ea] bg-white text-[#4f5368] shadow-none hover:border-[#7f77dd] hover:text-[#3c3489] disabled:opacity-40"
        disabled={isFuture(startOfMonth(addMonths(month, 1)))}
        onClick={() => onChange(addMonths(month, 1))}
        data-testid="button-next-month"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab 1 — Punch Data                                                      */
/* ---------------------------------------------------------------------- */

// Fixed-date Indian national holidays (same date every year). Keyed by "MM-dd".
const FIXED_NATIONAL_HOLIDAYS: Record<string, string> = {
  "01-26": "Republic Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
};

function PunchDataTab({ employeeCode }: { employeeCode: string }) {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [`/api/insights/punches?employeeCode=${employeeCode}&year=${year}&month=${monthNum}`],
  });

  const { data: holidayData } = useQuery({
    queryKey: [`/api/insights/holidays?year=${year}&month=${monthNum}`],
  });

  // Same endpoint/query key the Timesheet Compliance tab uses for leaveRanges,
  // so both tabs show identical leave days and share the query cache.
  const { data: timesheetData } = useQuery({
    queryKey: [`/api/insights/timesheet-status?employeeCode=${employeeCode}&year=${year}&month=${monthNum}`],
  });

  const punches: Array<{ work_date: string; punch_in: string | null; punch_out: string | null }> =
    (data as any)?.punches ?? [];

  const holidays: Array<{ date: string; name: string }> = (holidayData as any)?.holidays ?? [];

  const leaveRanges: Array<{ start_date: string; end_date: string }> =
    (timesheetData as any)?.leaveRanges ?? [];

  const punchMap = useMemo(
    () => new Map(punches.map((p) => [format(new Date(p.work_date), "yyyy-MM-dd"), p])),
    [punches]
  );

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month]
  );

  const isOnLeave = (d: Date) => {
    const t = d.getTime();
    return leaveRanges.some(
      (r) => t >= new Date(r.start_date).getTime() && t <= new Date(r.end_date).getTime()
    );
  };

  // Fixed-date Indian national holidays, used as a fallback so these always
  // show correctly even if the backend /api/insights/holidays route has no
  // data yet. Any date the API does return for will override these.
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    monthDays.forEach((day) => {
      const name = FIXED_NATIONAL_HOLIDAYS[format(day, "MM-dd")];
      if (name) map.set(format(day, "yyyy-MM-dd"), name);
    });
    holidays.forEach((h) => {
      map.set(format(new Date(h.date), "yyyy-MM-dd"), h.name);
    });
    return map;
  }, [holidays, monthDays]);

  const rows = monthDays.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const punch = punchMap.get(key);
    const isWeekendDay = isWeekend(day);
    const isFutureDay = isFuture(day);
    const holidayName = holidayMap.get(key);
    const isHolidayDay = !isFutureDay && !!holidayName;
    const isLeaveDay = !isFutureDay && !isHolidayDay && isOnLeave(day);
    const isMissingDay = !isFutureDay && !isHolidayDay && !isWeekendDay && !isLeaveDay && !punch;
    const outHours =
      punch && punch.punch_in && punch.punch_out
        ? ((new Date(punch.punch_out).getTime() - new Date(punch.punch_in).getTime()) / 3_600_000).toFixed(1)
        : "—";

    return {
      date: day,
      key,
      punch,
      isWeekendDay,
      isLeaveDay,
      isMissingDay,
      isHolidayDay,
      holidayName,
      isFutureDay,
      hours: outHours,
    };
  });

  return (
    <Card className="overflow-hidden border border-[#e6e4f2] bg-white shadow-[0_1px_2px_rgba(38,33,92,0.04),0_8px_24px_rgba(38,33,92,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#edf1f8] bg-[#fdfdff] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3ff] text-[#4f73d5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1a1c2a]">Punch In / Out History</div>
            <div className="text-[12px] font-medium text-[#8d8da6]">Daily attendance from TimeStrap</div>
          </div>
        </div>

        <MonthSwitcher month={month} onChange={setMonth} />
      </div>
      <CardContent className="p-0">
        {isLoading && (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load punch data"
            description={(error as Error)?.message || "The TimeStrap database isn't reachable right now."}
          />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={Clock}
            title="No punch records"
            description="No punch-in / punch-out entries found for this month."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead className="pl-3">Punch In</TableHead>
                  <TableHead className="pl-3">Punch Out</TableHead>
                  <TableHead className="pr-4 text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(
                  ({ key, date, punch, isWeekendDay, isLeaveDay, isMissingDay, isHolidayDay, holidayName, isFutureDay, hours }) => {
                    const statusColor = isHolidayDay
                      ? "bg-[#a26df0]"
                      : isLeaveDay
                        ? "bg-[#f4b740]"
                        : isMissingDay
                          ? "bg-[#e2685c]"
                          : isWeekendDay
                            ? "bg-[#9ea8c1]"
                            : isFutureDay
                              ? "bg-[#edf1f8]"
                              : "bg-[#20b286]";

                    return (
                      <TableRow key={key} data-testid={`row-punch-${key}`}>
                        <TableCell className="pl-4 font-semibold text-[#2d2b41]">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                            <span>{format(date, "EEE, dd MMM")}</span>
                            {isHolidayDay || isWeekendDay || isLeaveDay || isMissingDay ? (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7e849d]">
                                {isHolidayDay
                                  ? holidayName || "Holiday"
                                  : isLeaveDay
                                    ? "Leave"
                                    : isMissingDay
                                      ? "Missing"
                                      : isWeekendDay
                                        ? format(date, "EEE").toUpperCase()
                                        : ""}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="pl-3">
                          <span className="inline-flex items-center gap-2 font-medium text-[#3b4259]">
                            <span className={`h-2.5 w-2.5 rounded-full ${punch?.punch_in ? "bg-[#20b286]" : "bg-[#dfe3ee]"}`} />
                            {punch?.punch_in ? format(new Date(punch.punch_in), "hh:mm a") : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="pl-3">
                          <span className="inline-flex items-center gap-2 font-medium text-[#3b4259]">
                            <span className={`h-2.5 w-2.5 rounded-full ${punch?.punch_out ? "bg-[#d8573f]" : "bg-[#dfe3ee]"}`} />
                            {punch?.punch_out ? format(new Date(punch.punch_out), "hh:mm a") : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 text-right font-bold text-[#2d2b41]">{hours}</TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab 2 — Timesheet Compliance                                            */
/* ---------------------------------------------------------------------- */

function TimesheetComplianceTab({ employeeCode }: { employeeCode: string }) {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      `/api/insights/timesheet-status?employeeCode=${employeeCode}&year=${year}&month=${monthNum}`,
    ],
  });

  const submittedDates = useMemo(
    () =>
      new Set(
        ((data as any)?.submittedDates ?? []).map((d: string) => d.slice(0, 10))
      ),
    [data]
  );

  const leaveRanges: Array<{ start_date: string; end_date: string }> =
    (data as any)?.leaveRanges ?? [];

  const isOnLeave = (d: Date) => {
    const t = d.getTime();
    return leaveRanges.some(
      (r) => t >= new Date(r.start_date).getTime() && t <= new Date(r.end_date).getTime()
    );
  };

  const allDaysInMonth = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month]
  );

  const workingDays = allDaysInMonth.filter((d) => !isWeekend(d) && !isFuture(d));
  const leaveDays = workingDays.filter((d) => isOnLeave(d));
  const trackedDays = workingDays.filter((d) => !isOnLeave(d));
  const submittedCount = trackedDays.filter((d) =>
    submittedDates.has(format(d, "yyyy-MM-dd"))
  ).length;
  const missingDays = trackedDays.filter((d) => !submittedDates.has(format(d, "yyyy-MM-dd")));
  const complianceRate = trackedDays.length
    ? Math.round((submittedCount / trackedDays.length) * 100)
    : 0;

  const dayStatus = (d: Date): "submitted" | "missing" | "leave" | "none" => {
    if (isWeekend(d) || isFuture(d)) return "none";
    if (isOnLeave(d)) return "leave";
    return submittedDates.has(format(d, "yyyy-MM-dd")) ? "submitted" : "missing";
  };

  const DOT_COLOR: Record<string, string> = {
    submitted: "bg-emerald-500",
    missing: "bg-red-500",
    leave: "bg-amber-500",
    none: "",
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CalendarCheck2 className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">Timesheet Compliance</CardTitle>
            <p className="text-xs text-muted-foreground">Submitted vs. missing days</p>
          </div>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="grid sm:grid-cols-[300px_1fr] gap-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load timesheet status"
            description={(error as Error)?.message || "The HRMS database isn't reachable right now."}
          />
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 pt-2 w-full">
            {/* Compact calendar */}
            <div className="w-full lg:w-[300px] shrink-0">
              <div className="grid grid-cols-7 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                {Array.from({ length: allDaysInMonth[0].getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-9 border-r border-b border-gray-200 bg-muted/20" />
                ))}
                {allDaysInMonth.map((d, idx) => {
                  const key = format(d, "yyyy-MM-dd");
                  const status = dayStatus(d);
                  const today = isSameDay(d, new Date());
                  const isLastInRow = (idx + allDaysInMonth[0].getDay() + 1) % 7 === 0;
                  const isLastRow = idx >= allDaysInMonth.length - 7;
                  return (
                    <div
                      key={key}
                      data-testid={`day-${key}`}
                      className={`h-9 rounded-none flex flex-col items-center justify-center text-xs transition-colors border-r border-b border-gray-200 ${isLastInRow ? "border-r-0" : ""
                        } ${isLastRow ? "border-b-0" : ""
                        } ${today
                          ? "bg-primary text-primary-foreground font-semibold"
                          : status === "none"
                            ? "text-muted-foreground/40 bg-muted/10"
                            : "text-foreground hover:bg-muted"
                        }`}
                    >
                      <span>{format(d, "d")}</span>
                      {status !== "none" && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${today ? "bg-primary-foreground" : DOT_COLOR[status]
                          }`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Submitted
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Missing
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Leave
                </span>
              </div>
            </div>

            {/* Stats + missing list */}
            <div className="space-y-4 w-full lg:w-[350px] shrink-0">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Compliance</p>
                  <p className="text-lg font-bold text-foreground">{complianceRate}%</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Submitted</p>
                  <p className="text-lg font-bold text-emerald-600">{submittedCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Leave days</p>
                  <p className="text-lg font-bold text-amber-600">{leaveDays.length}</p>
                </div>
              </div>
              <Progress value={complianceRate} className="h-1.5" />

              <div className="rounded-lg border border-red-200 bg-red-50/50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-200 bg-red-50">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <CalendarX2 className="w-4 h-4" /> Missing Submissions
                  </p>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px]">
                    {missingDays.length} {missingDays.length === 1 ? "Day" : "Days"}
                  </Badge>
                </div>
                {missingDays.length === 0 ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-1.5 px-4 py-4">
                    <CheckCircle2 className="w-4 h-4" /> All caught up
                  </p>
                ) : (
                  <div className="divide-y divide-red-100 max-h-52 overflow-auto">
                    {missingDays.map((d) => (
                      <div
                        key={d.toISOString()}
                        className="flex items-center justify-between px-4 py-2 text-sm"
                      >
                        <span className="text-foreground">{format(d, "MMM dd, yyyy")}</span>
                        <span className="text-muted-foreground text-xs">{format(d, "EEE")}</span>
                        <span className="text-red-600 text-xs font-medium">Not Submitted</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:flex items-start justify-end w-full lg:w-[380px] shrink-0 h-full">
              <img
                src="/illustration.jpg"
                alt="Timesheet Compliance Illustration"
                className="w-full max-w-[380px] object-contain mix-blend-multiply opacity-95 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab 3 — Projects (PMS)                                                   */
/* ---------------------------------------------------------------------- */

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-slate-50 text-slate-700 border-slate-200",
  Planned: "bg-slate-50 text-slate-700 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "on_hold": "bg-amber-50 text-amber-700 border-amber-200",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  review: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

const PROJECT_STATUS_TABS = [
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type ProjectStatusFilter = (typeof PROJECT_STATUS_TABS)[number]["id"];

function classifyProjectStatus(status: string): ProjectStatusFilter {
  const t = (status || "").toLowerCase().replace(/[-_]/g, " ");
  if (t.includes("cancel")) return "cancelled";
  if (t.includes("complete") || t.includes("done") || t.includes("closed")) return "completed";
  return "in_progress";
}

function ProjectsTab({ employeeCode }: { employeeCode: string }) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("in_progress");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [`/api/insights/projects?employeeCode=${employeeCode}`],
  });

  const allProjects: Array<{
    id: string;
    title: string;
    project_code: string;
    client_name: string | null;
    status: string;
    start_date: string;
    end_date: string;
    progress: number;
  }> = (data as any)?.projects ?? [];

  const projects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      const matchesStatus = classifyProjectStatus(p.status) === statusFilter;
      const matchesSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.project_code?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allProjects, statusFilter, search]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
          <Layers className="w-4.5 h-4.5 text-purple-600" />
        </div>
        <div>
          <CardTitle className="text-base">Projects</CardTitle>
          <p className="text-xs text-muted-foreground">Live from the Project Management System</p>
        </div>
      </CardHeader>

      <div className="px-6 pb-3 flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[#e6e4f2] bg-[#fafaff] p-1">
          {PROJECT_STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusFilter(t.id)}
              data-testid={`filter-project-status-${t.id}`}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${statusFilter === t.id
                ? "bg-gradient-to-br from-[#7f77dd] to-[#3c3489] text-white shadow-[0_4px_10px_rgba(83,74,183,0.3)]"
                : "text-[#65637e] hover:bg-[#eeedfe] hover:text-[#3c3489]"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project, code, or client…"
            className="pl-9 h-9"
            data-testid="input-search-projects"
          />
        </div>
      </div>

      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load projects"
            description={(error as Error)?.message || "The PMS database isn't reachable right now."}
          />
        )}

        {!isLoading && !isError && projects.length === 0 && (
          <EmptyState
            icon={Layers}
            title={search ? "No matching projects" : "Nothing here"}
            description={
              search
                ? `No ${PROJECT_STATUS_TABS.find((t) => t.id === statusFilter)?.label.toLowerCase()} projects match "${search}".`
                : statusFilter === "completed"
                  ? "You have no completed projects yet."
                  : statusFilter === "cancelled"
                    ? "You have no cancelled projects."
                    : "You have no in-progress projects assigned right now."
            }
          />
        )}

        {!isLoading && !isError && projects.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} data-testid={`row-project-${p.id}`}>
                  <TableCell className="font-medium text-foreground">
                    <div>{p.title}</div>
                    <div className="text-[11px] text-muted-foreground font-normal">{p.project_code}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.client_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.start_date ? format(new Date(p.start_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.end_date ? format(new Date(p.end_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    {typeof p.progress === "number" ? (
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5 w-24" />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{p.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${STATUS_STYLES[p.status] || "bg-muted"}`}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab 4 — Leaves & Permissions (LMS)                                       */
/* ---------------------------------------------------------------------- */

const LEAVE_STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const LEAVE_TYPE_TABS = [
  { id: "leave", label: "Leave" },
  { id: "od", label: "OD" },
  { id: "permission", label: "Permission" },
] as const;

type LeaveTypeFilter = (typeof LEAVE_TYPE_TABS)[number]["id"];

function classifyLeaveType(type: string): LeaveTypeFilter {
  const t = (type || "").toLowerCase();
  if (t.includes("od") || t.includes("on duty") || t.includes("on-duty")) return "od";
  if (t.includes("permission")) return "permission";
  return "leave";
}

function LeavesTab({ employeeCode }: { employeeCode: string }) {
  const [month, setMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>("leave");
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [`/api/insights/leaves?employeeCode=${employeeCode}&year=${year}&month=${monthNum}`],
  });

  const allLeaves: Array<{
    id: string | number;
    type: string;
    from_date: string;
    to_date: string;
    status: string;
    reason: string | null;
  }> = (data as any)?.leaves ?? [];

  const monthLeaves = useMemo(
    () =>
      allLeaves.filter((l) => {
        const from = new Date(l.from_date);
        return from.getFullYear() === year && from.getMonth() + 1 === monthNum;
      }),
    [allLeaves, year, monthNum]
  );

  const leaves = useMemo(
    () => monthLeaves.filter((l) => classifyLeaveType(l.type) === typeFilter),
    [monthLeaves, typeFilter]
  );

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
            <CalendarCheck2 className="w-4.5 h-4.5 text-rose-600" />
          </div>
          <div>
            <CardTitle className="text-base">Leaves & Permissions</CardTitle>
            <p className="text-xs text-muted-foreground">History from the Leave Management System</p>
          </div>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </CardHeader>

      <div className="px-6 pb-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[#e6e4f2] bg-[#fafaff] p-1">
          {LEAVE_TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              data-testid={`filter-leave-type-${t.id}`}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${typeFilter === t.id
                ? "bg-gradient-to-br from-[#7f77dd] to-[#3c3489] text-white shadow-[0_4px_10px_rgba(83,74,183,0.3)]"
                : "text-[#65637e] hover:bg-[#eeedfe] hover:text-[#3c3489]"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load leave history"
            description={(error as Error)?.message || "The LMS database isn't reachable right now."}
          />
        )}

        {!isLoading && !isError && leaves.length === 0 && (
          <EmptyState
            icon={CalendarCheck2}
            title="No records"
            description={`No ${LEAVE_TYPE_TABS.find((t) => t.id === typeFilter)?.label.toLowerCase()} records logged for ${format(
              month,
              "MMMM yyyy"
            )}.`}
          />
        )}

        {!isLoading && !isError && leaves.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id} data-testid={`row-leave-${l.id}`}>
                  <TableCell className="font-medium capitalize">{l.type}</TableCell>
                  <TableCell>{format(new Date(l.from_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{format(new Date(l.to_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">
                    {l.reason || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${LEAVE_STATUS_STYLES[l.status] || "bg-muted"}`}
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared empty state                                                      */
/* ---------------------------------------------------------------------- */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Page                                                                     */
/* ---------------------------------------------------------------------- */

const TABS = [
  { id: "punches", label: "Punch Data", icon: Clock },
  { id: "timesheet", label: "Timesheet Compliance", icon: CalendarCheck2 },
  { id: "projects", label: "Projects", icon: Layers },
  { id: "leaves", label: "Leaves & Permissions", icon: CalendarClock },
];

export default function Insights() {
  const [, setLocation] = useLocation();
  const user = useUser();

  if (!user) return null;

  return (
    <div className="app-shell min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#e6e4f2] bg-white/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back-dashboard"
              className="h-[38px] w-[38px] rounded-xl border border-[#e6e4f2] bg-white shadow-[0_1px_2px_rgba(38,33,92,0.04)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-[#1c1b2e] leading-tight">
                My workspace
              </h1>
              <p className="text-[12px] text-[#9997ae] font-medium">
                {user.username} • {user.employeeCode}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 rounded-full border border-[#e6e4f2] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(38,33,92,0.04)]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-[#7f77dd] to-[#3c3489] text-[11px] font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              {user.username.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left leading-tight pr-1">
              <div className="text-[13px] font-bold text-[#1c1b2e]">{user.username}</div>
              <div className="text-[10px] font-semibold tracking-[0.02em] text-[#9997ae]">{user.employeeCode}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Tabs defaultValue="punches" className="w-full">
            <TabsList className="mb-6 grid h-auto grid-cols-2 gap-2 rounded-[16px] border border-[#e6e4f2] bg-white p-1.5 shadow-[0_1px_2px_rgba(38,33,92,0.04),0_8px_24px_rgba(38,33,92,0.06)] sm:grid-cols-4">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-3 text-[13px] font-bold text-[#65637e] transition-all hover:bg-[#eeedfe] hover:text-[#3c3489] data-[state=active]:border-[#534ab7] data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7f77dd] data-[state=active]:to-[#3c3489] data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_rgba(83,74,183,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
                  data-testid={`tab-${t.id}`}
                >
                  <t.icon className="h-[17px] w-[17px]" />
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="punches">
                <PunchDataTab employeeCode={user.employeeCode} />
              </TabsContent>
              <TabsContent value="timesheet">
                <TimesheetComplianceTab employeeCode={user.employeeCode} />
              </TabsContent>
              <TabsContent value="projects">
                <ProjectsTab employeeCode={user.employeeCode} />
              </TabsContent>
              <TabsContent value="leaves">
                <LeavesTab employeeCode={user.employeeCode} />
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}