import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  History,
  CalendarCheck,
  Calendar,
  Layers,
  Scale,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ExternalLink,
  Clock,
  Lightbulb,
  DollarSign,
  Users,
  Shield,
  BookOpen,
  Briefcase,
  Gauge,
  Settings,
} from "lucide-react";

import logoUrl from "@assets/WhatsApp_Image_2026-01-17_at_10.38.06_1768626585689.jpeg";

interface User {
  username: string;
  employeeCode: string;
  email?: string;
  isAdmin?: boolean;
}

interface QuickLink {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  url: string;
  color: string;
  bgColor: string;
  iconColor: string;
  available: boolean;
  featured: boolean;
  internal?: boolean;
}

const BASE_IP = "147.93.28.144";

const QUICK_LINKS: QuickLink[] = [
  {
    id: "timestrap",
    title: "TimeStrap",
    description: "Track your work hours and manage timesheets",
    icon: History,
    url: "https://timestrap.space",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    available: true,
    featured: false,
  },
  {
    id: "lms",
    title: "Leave Management System (LMS)",
    description: "Apply and track your leaves effortlessly",
    icon: CalendarCheck,
    url: `http://${BASE_IP}:5001/`,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    available: true,
    featured: false,
  },
  {
    id: "pms",
    title: "Project Management System (PMS)",
    description: "Manage projects and track progress",
    icon: Layers,
    url: "https://effilynx.in/",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    available: true,
    featured: false,
  },
  {
    id: "calendar",
    title: "PMS Calendar",
    description: "Jump straight into the PMS calendar",
    icon: Calendar,
    url: "https://effilynx.in/calendar",
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
    available: true,
    featured: false,
  },
  {
    id: "boq",
    title: "BOQ",
    description: "Bill of Quantities management",
    icon: Scale,
    url: "http://82.25.109.136:5011/",
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-100",
    iconColor: "text-slate-600",
    available: true,
    featured: false,
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "View and manage your payroll information",
    icon: DollarSign,
    url: `http://${BASE_IP}:5009`,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
    available: true,
    featured: false,
  },
  {
    id: "crm",
    title: "CRM",
    description: "Manage customer relationships and interactions",
    icon: Users,
    url: `http://${BASE_IP}:5007`,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
    available: true,
    featured: false,
  },
  {
    id: "timeguard",
    title: "Timeguard",
    description: "Monitor and manage employee attendance in real-time",
    icon: Shield,
    url: "http://82.25.109.136:5000/",
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-50",
    iconColor: "text-rose-600",
    available: true,
    featured: false,
  },
  {
    id: "hrms",
    title: "HRMS",
    description: "Access the Human Resource Management System",
    icon: Briefcase,
    url: "http://147.93.28.144:3001/",
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-600",
    available: true,
    featured: false,
  },
  {
    id: "policy",
    title: "Company Policy",
    description: "Read and stay updated with CTI's official company policies",
    icon: BookOpen,
    url: "http://82.25.109.136:5005/",
    color: "from-amber-400 via-orange-500 to-rose-500",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    available: true,
    featured: true,
  },
];

const ALLOWED_BOQ_EMPLOYEE_CODES = [
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
];

const ALLOWED_PAYROLL_EMPLOYEE_CODES = [
  "E0046",
  "E0048",
  "E0001",
  "E0049",
  "E0047",
  "E0061",
];

const ALLOWED_CRM_EMPLOYEE_CODES = [
  "E0046",
  "E0048",
  "E0001",
  "E0009",
  "E0050",
  "E0041",
];

const ALLOWED_TIMEGUARD_EMPLOYEE_CODES = [
  "E0046",
  "E0048",
  "E0001",
  "E0049",
  "E0061",
];

const ALLOWED_HRMS_EMPLOYEE_CODES = [
  "E0048",
  "E0046",
  "E0049",
  "E0001",
  "E0047",
  "E0061",
];

const MOTIVATIONAL_QUOTES = [
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-900",
    authorColor: "text-blue-700",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-900",
    authorColor: "text-indigo-700",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-900",
    authorColor: "text-purple-700",
  },
  {
    text: "Your work is going to fill a large part of your life. Do it with excellence.",
    author: "Steve Jobs",
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-900",
    authorColor: "text-pink-700",
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-900",
    authorColor: "text-emerald-700",
  },
  {
    text: "Quality is not an act, it is a habit.",
    author: "Aristotle",
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-900",
    authorColor: "text-teal-700",
  },
  {
    text: "Excellence is not a skill, it's an attitude.",
    author: "Ralph Marston",
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-900",
    authorColor: "text-cyan-700",
  },
  {
    text: "Hard work is a prison sentence only if it does not have meaning.",
    author: "Malcolm Gladwell",
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-900",
    authorColor: "text-amber-700",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-900",
    authorColor: "text-orange-700",
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill",
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-900",
    authorColor: "text-red-700",
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-900",
    authorColor: "text-rose-700",
  },
  {
    text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
    author: "Ralph Waldo Emerson",
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    textColor: "text-violet-900",
    authorColor: "text-violet-700",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-900",
    authorColor: "text-green-700",
  },
  {
    text: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
    color: "from-sky-500 to-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-900",
    authorColor: "text-sky-700",
  },
  {
    text: "Whether you think you can, or you think you can't – you're right.",
    author: "Henry Ford",
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
    textColor: "text-slate-900",
    authorColor: "text-slate-700",
  },
  {
    text: "The key to success is to focus on goals, not obstacles.",
    author: "Stephen Richards",
    color: "from-lime-500 to-lime-600",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
    textColor: "text-lime-900",
    authorColor: "text-lime-700",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
    color: "from-fuchsia-500 to-fuchsia-600",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-200",
    textColor: "text-fuchsia-900",
    authorColor: "text-fuchsia-700",
  },
  {
    text: "Great things never came from comfort zones.",
    author: "Unknown",
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-900",
    authorColor: "text-yellow-700",
  },
  {
    text: "Work hard in silence, let success make the noise.",
    author: "Frank Ocean",
    color: "from-gray-600 to-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-900",
    authorColor: "text-gray-800",
  },
  {
    text: "The only limit to our realization of tomorrow is our doubts of today.",
    author: "Franklin D. Roosevelt",
    color: "from-blue-600 to-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    textColor: "text-blue-950",
    authorColor: "text-blue-800",
  },
  {
    text: "Opportunities don't happen. You create them.",
    author: "Chris Grosser",
    color: "from-purple-600 to-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
    textColor: "text-purple-950",
    authorColor: "text-purple-800",
  },
  {
    text: "Success is not how high you have climbed, but how you make those around you feel when standing next to you.",
    author: "Unknown",
    color: "from-emerald-600 to-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-950",
    authorColor: "text-emerald-800",
  },
];

const getQuoteOfTheDay = () => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  useEffect(() => {
    const storedUser = localStorage.getItem("knocxtirn_user");
    if (!storedUser) {
      setLocation("/");
      return;
    }
    setUser(JSON.parse(storedUser));
    setQuote(getQuoteOfTheDay());

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("knocxtirn_user");
    setLocation("/");
  };

  const handleLinkClick = (link: QuickLink) => {
    if (!link.available || link.url === "#") return;
    if (link.internal) {
      setLocation(link.url);
      return;
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Resolved app access (defaults + any admin overrides) for this
  // employee. Falls back to the hardcoded lists below while loading or if
  // the request fails, so existing behavior is never interrupted.
  const { data: resolvedAppAccess } = useQuery<Record<string, boolean>>({
    queryKey: [`/api/app-access/${user?.employeeCode}`],
    enabled: !!user?.employeeCode,
  });

  if (!user) return null;

  const filteredLinks = QUICK_LINKS.filter((link) => {
    if (resolvedAppAccess && link.id in resolvedAppAccess) {
      return resolvedAppAccess[link.id];
    }
    if (link.id === "boq") {
      return ALLOWED_BOQ_EMPLOYEE_CODES.includes(user.employeeCode);
    }
    if (link.id === "payroll") {
      return ALLOWED_PAYROLL_EMPLOYEE_CODES.includes(user.employeeCode);
    }
    if (link.id === "crm") {
      return ALLOWED_CRM_EMPLOYEE_CODES.includes(user.employeeCode);
    }
    if (link.id === "timeguard") {
      return ALLOWED_TIMEGUARD_EMPLOYEE_CODES.includes(user.employeeCode);
    }
    if (link.id === "hrms") {
      return ALLOWED_HRMS_EMPLOYEE_CODES.includes(user.employeeCode);
    }
    return true;
  });

  return (
    <div className="app-shell min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Knockturn Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {user.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.employeeCode}
                </p>
              </div>
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            <Card className="h-full border border-slate-200/60 shadow-sm flex items-center p-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 text-center sm:text-left w-full">
                <div className="w-24 h-24 shrink-0 lg:w-28 lg:h-28">
                  <img
                    src="/illustration1.jpg?v=1"
                    alt="Welcome"
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Welcome back,
                  </p>
                  <h2 className="font-display text-xl lg:text-2xl font-bold text-foreground mb-1 line-clamp-2">
                    {user.username}
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {formatDate(currentTime)}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Motivational Quote Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 h-full"
          >
            <Card
              className={`h-full ${quote.bgColor} ${quote.borderColor} border shadow-sm overflow-hidden relative flex flex-col justify-center`}
            >
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white rounded-full blur-3xl" />
              </div>
              <CardContent className="relative p-4 sm:p-5 h-full flex items-center">
                <div className="flex items-center gap-4 sm:gap-5 w-full">
                  <div className="flex-shrink-0 hidden sm:block">
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${quote.color}`}
                    >
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p
                      className={`${quote.textColor} text-base sm:text-lg font-semibold leading-snug mb-1`}
                    >
                      "{quote.text}"
                    </p>
                    <p
                      className={`${quote.authorColor} text-xs sm:text-sm font-medium italic`}
                    >
                      — {quote.author}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold text-foreground">
                Quick Access
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {user.isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/admin/app-access")}
                  className="gap-2"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              )}
              <Button
                onClick={() => setLocation("/insights")}
                className="gap-2 shadow-md shadow-primary/20"
                data-testid="button-dashboard"
              >
                <Gauge className="w-4 h-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredLinks.map((link, index) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
            >
              {link.featured ? (
                /* Featured Policy Card */
                <Card
                  className="premium-card group relative overflow-hidden cursor-pointer border border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-[0_24px_50px_-30px_rgba(251,146,60,0.5)] hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(234,88,12,0.45)] transition-all duration-300"
                  onClick={() => handleLinkClick(link)}
                  data-testid={`card-link-${link.id}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100" />
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-amber-300 to-orange-400 rounded-full opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-orange-300 to-rose-400 rounded-full opacity-20 group-hover:opacity-30 transition-opacity" />
                  <CardHeader className="relative pb-3">
                    <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 overflow-hidden shadow-md shadow-amber-200 transition-all duration-300 ease-out group-hover:scale-125 group-hover:shadow-lg">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-lg bg-gradient-to-b from-white/80 to-white/0" />
                      <div className="pointer-events-none absolute -inset-y-4 -left-8 w-3 rotate-12 bg-white/60 blur-sm opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-12" />
                      <BookOpen className="relative w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                      {link.title}
                      <ExternalLink className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-1 rounded-full shadow-sm">
                      All Access
                    </span>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {link.description}
                    </p>
                    <div className="flex items-center gap-1 text-amber-600 text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Card>
              ) : (
                /* Regular Cards */
                <Card
                  className={`premium-card group relative overflow-hidden transition-all duration-300 ${link.available
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_50px_-30px_rgba(59,130,246,0.4)] hover:border-blue-200/80"
                    : "opacity-60 cursor-not-allowed"
                    }`}
                  onClick={() => handleLinkClick(link)}
                  data-testid={`card-link-${link.id}`}
                >
                  {!link.available && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div
                      className={`relative w-8 h-8 rounded-lg ${link.bgColor} flex items-center justify-center mb-3 overflow-hidden shadow-sm ring-1 ring-black/10 transition-all duration-300 ease-out group-hover:scale-125 group-hover:shadow-lg`}
                    >
                      {/* glossy highlight */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-lg bg-gradient-to-b from-white/80 to-white/0" />
                      {/* shine sweep on hover */}
                      <div className="pointer-events-none absolute -inset-y-4 -left-8 w-3 rotate-12 bg-white/60 blur-sm opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-12" />
                      <link.icon className={`relative w-4 h-4 ${link.iconColor}`} />
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      {link.title}
                      {link.available && !link.internal && (
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {link.available && link.internal && (
                        <ChevronRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {link.description}
                    </p>
                    {link.available && (
                      <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Open</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </CardContent>
                  {link.available && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${link.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}
                    />
                  )}
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            © 2026 Knockturn Technologies • knockturn.tech
          </p>
        </motion.div>
      </main>
    </div>
  );
}