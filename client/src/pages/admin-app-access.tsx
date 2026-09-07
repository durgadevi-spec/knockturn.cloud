import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Eye, EyeOff, Search, ShieldCheck, Settings, Trash2, UserPlus } from "lucide-react";

interface AdminUser {
    username: string;
    employeeCode: string;
    isAdmin?: boolean;
}

interface AppCatalogEntry {
    id: string;
    title: string;
}

interface EmployeeWithAccess {
    id: string;
    username: string;
    employeeCode: string;
    isAdmin: boolean;
    appAccess: Record<string, boolean>;
}

function useAdminUser() {
    const [, setLocation] = useLocation();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("knocxtirn_user");
        if (!storedUser) {
            setLocation("/");
            return;
        }
        const parsed = JSON.parse(storedUser) as AdminUser;
        if (!parsed.isAdmin) {
            // Not an admin — send them back to the dashboard rather than
            // showing this page.
            setLocation("/dashboard");
            return;
        }
        setUser(parsed);
        setChecked(true);
    }, [setLocation]);

    return { user, checked };
}

export default function AdminAppAccess() {
    const [, setLocation] = useLocation();
    const { user, checked } = useAdminUser();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [showNewEmployeePassword, setShowNewEmployeePassword] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: "",
        employeeCode: "",
        password: "",
        email: "",
        department: "",
        role: "employee",
    });

    const authHeaders = user
        ? { "x-employee-code": user.employeeCode, "Content-Type": "application/json" }
        : undefined;

    const { data: apps, isLoading: appsLoading } = useQuery<AppCatalogEntry[]>({
        queryKey: ["/api/admin/apps"],
        queryFn: async () => {
            const res = await fetch("/api/admin/apps", { headers: authHeaders });
            if (!res.ok) throw new Error("Failed to load apps");
            return res.json();
        },
        enabled: !!user,
    });

    const {
        data: employees,
        isLoading: employeesLoading,
    } = useQuery<EmployeeWithAccess[]>({
        queryKey: ["/api/admin/employees"],
        queryFn: async () => {
            const res = await fetch("/api/admin/employees", { headers: authHeaders });
            if (!res.ok) throw new Error("Failed to load employees");
            return res.json();
        },
        enabled: !!user,
    });

    const toggleAccess = useMutation({
        mutationFn: async (vars: {
            employeeId: string;
            appId: string;
            granted: boolean;
        }) => {
            const res = await fetch("/api/admin/app-access", {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify(vars),
            });
            if (!res.ok) throw new Error("Failed to update access");
            return res.json();
        },
        // Optimistically flip the switch so the UI feels instant, and roll
        // back if the request fails.
        onMutate: async (vars) => {
            await queryClient.cancelQueries({ queryKey: ["/api/admin/employees"] });
            const previous = queryClient.getQueryData<EmployeeWithAccess[]>([
                "/api/admin/employees",
            ]);

            queryClient.setQueryData<EmployeeWithAccess[]>(
                ["/api/admin/employees"],
                (old) =>
                    old?.map((emp) =>
                        emp.id === vars.employeeId
                            ? {
                                ...emp,
                                appAccess: { ...emp.appAccess, [vars.appId]: vars.granted },
                            }
                            : emp
                    )
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(["/api/admin/employees"], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
        },
    });

    const addEmployee = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/admin/employees", {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(newEmployee),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to add employee");
            return body;
        },
        onSuccess: () => {
            setNewEmployee({ name: "", employeeCode: "", password: "", email: "", department: "", role: "employee" });
            setIsAddDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
        },
        onError: (error) => window.alert(error.message),
    });

    const deleteEmployee = useMutation({
        mutationFn: async (employeeCode: string) => {
            const res = await fetch(`/api/admin/employees/${encodeURIComponent(employeeCode)}`, {
                method: "DELETE",
                headers: authHeaders,
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to delete employee");
            return body;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] }),
        onError: (error) => window.alert(error.message),
    });

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (emp) =>
                emp.username.toLowerCase().includes(q) ||
                emp.employeeCode.toLowerCase().includes(q)
        );
    }, [employees, search]);

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    if (!checked || !user) return null;

    return (
        <div className="app-shell min-h-screen">
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation("/dashboard")}
                                data-testid="button-back-to-dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                <h1 className="font-display text-lg font-semibold text-foreground">
                                    App Access
                                </h1>
                            </div>
                        </div>
                        <Badge variant="secondary" className="gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 grid gap-6 md:grid-cols-[150px_minmax(0,1fr)_220px] md:items-end">
                    <div className="flex justify-center md:justify-start">
                        <img
                            src="/admin.jpg"
                            alt="Admin workspace"
                            className="h-36 w-auto object-contain mix-blend-multiply"
                        />
                    </div>
                    <div className="flex-1 max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mb-6"
                        >
                            <h2 className="font-display text-xl font-bold text-foreground mb-1">
                                Assign apps to employees
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Choose which Quick Access apps each employee can see on their
                                dashboard. Changes save automatically.
                            </p>
                        </motion.div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employees by name or code..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11"
                                    data-testid="input-search-employees"
                                />
                            </div>
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-11 shrink-0">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add employee
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[560px]">
                                    <DialogHeader>
                                        <DialogTitle>Add employee</DialogTitle>
                                        <DialogDescription>
                                            Enter the employee details and role. The account will be created in the connected systems.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            addEmployee.mutate();
                                        }}
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="new-employee-name">Full name</Label>
                                            <Input id="new-employee-name" required placeholder="e.g. DurgaDevi E" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-employee-code">Employee code</Label>
                                            <Input id="new-employee-code" required placeholder="e.g. E0048" value={newEmployee.employeeCode} onChange={(e) => setNewEmployee({ ...newEmployee, employeeCode: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-employee-password">Initial password</Label>
                                            <div className="relative">
                                                <Input id="new-employee-password" required type={showNewEmployeePassword ? "text" : "password"} placeholder="Initial password" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} className="pr-10" />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowNewEmployeePassword((visible) => !visible)}
                                                    aria-label={showNewEmployeePassword ? "Hide password" : "Show password"}
                                                >
                                                    {showNewEmployeePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Role</Label>
                                            <Select value={newEmployee.role} onValueChange={(role) => setNewEmployee({ ...newEmployee, role })}>
                                                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="employee">Employee</SelectItem>
                                                    <SelectItem value="hr">HR</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-employee-email">Email</Label>
                                            <Input id="new-employee-email" type="email" placeholder="Email (optional)" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-employee-department">Department</Label>
                                            <Input id="new-employee-department" placeholder="Department (optional)" value={newEmployee.department} onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })} />
                                        </div>
                                        <DialogFooter className="sm:col-span-2">
                                            <Button type="submit" disabled={addEmployee.isPending}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                {addEmployee.isPending ? "Adding..." : "Create employee"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="flex justify-center md:justify-end">
                        <img
                            src="/office-worker-animation.svg"
                            alt="Office worker animation"
                            className="h-36 w-auto object-contain"
                        />
                    </div>
                </div>

                {(appsLoading || employeesLoading) && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                )}

                {!appsLoading && !employeesLoading && filteredEmployees.length === 0 && (
                    <Card className="p-8 text-center text-sm text-muted-foreground">
                        No employees match "{search}".
                    </Card>
                )}

                {!appsLoading && !employeesLoading && filteredEmployees.length > 0 && (
                    <Card className="border border-slate-200/60 shadow-sm">
                        <CardContent className="p-0">
                            <Accordion type="single" collapsible className="w-full">
                                {filteredEmployees.map((emp) => {
                                    const grantedCount = apps
                                        ? apps.filter((a) => emp.appAccess[a.id]).length
                                        : 0;
                                    return (
                                        <AccordionItem
                                            key={emp.id || emp.employeeCode}
                                            value={emp.id || emp.employeeCode}
                                            className="relative px-4 sm:px-6 last:border-b-0"
                                        >
                                            <AccordionTrigger
                                                data-testid={`accordion-employee-${emp.employeeCode}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <Avatar className="w-9 h-9 border border-primary/20">
                                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                                            {getInitials(emp.username)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                                            {emp.username}
                                                            {emp.isAdmin && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] px-1.5 py-0"
                                                                >
                                                                    Admin
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {emp.employeeCode} • {grantedCount}/
                                                            {apps?.length ?? 0} apps enabled
                                                        </p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-10 top-2 text-destructive hover:text-destructive"
                                                aria-label={`Delete ${emp.username}`}
                                                onClick={() => {
                                                    if (window.confirm(`Delete ${emp.username} from every system? This cannot be undone.`)) {
                                                        deleteEmployee.mutate(emp.employeeCode);
                                                    }
                                                }}
                                                disabled={deleteEmployee.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <AccordionContent>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pb-2">
                                                    {apps?.map((app) => (
                                                        <div
                                                            key={app.id}
                                                            className="flex items-center justify-between gap-3 py-1"
                                                        >
                                                            <Label
                                                                htmlFor={`switch-${emp.id}-${app.id}`}
                                                                className="text-sm font-normal text-foreground cursor-pointer"
                                                            >
                                                                {app.title}
                                                            </Label>
                                                            <Switch
                                                                id={`switch-${emp.id}-${app.id}`}
                                                                checked={!!emp.appAccess[app.id]}
                                                                onCheckedChange={(checked) =>
                                                                    toggleAccess.mutate({
                                                                        employeeId: emp.id,
                                                                        appId: app.id,
                                                                        granted: checked,
                                                                    })
                                                                }
                                                                data-testid={`switch-access-${emp.employeeCode}-${app.id}`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
