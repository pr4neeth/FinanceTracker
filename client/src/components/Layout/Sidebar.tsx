import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  FileText, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  MessageSquare, 
  Building, 
  Settings, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  activePage?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activePage, isMobile = false, onClose }: SidebarProps) {
  const [_, navigate] = useLocation();
  const { logoutMutation } = useAuth();

  // Navigation items structure
  const navigationItems = [
    {
      heading: "Main",
      items: [
        { name: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5 mr-2" />, path: "/" },
        { name: "transactions", label: "Transactions", icon: <ArrowRightLeft className="w-5 h-5 mr-2" />, path: "/transactions" },
        { name: "budgets", label: "Budgets", icon: <Wallet className="w-5 h-5 mr-2" />, path: "/budgets" },
        { name: "bills", label: "Bills & Subscriptions", icon: <FileText className="w-5 h-5 mr-2" />, path: "/bills" },
        { name: "goals", label: "Financial Goals", icon: <Target className="w-5 h-5 mr-2" />, path: "/goals" },
      ]
    },
    {
      heading: "AI Tools",
      items: [
        { name: "insights", label: "AI Insights", icon: <Lightbulb className="w-5 h-5 mr-2" />, path: "/insights" },
        { name: "predictions", label: "Expense Predictions", icon: <TrendingUp className="w-5 h-5 mr-2" />, path: "/predictions" },
        { name: "advice", label: "Financial Advice", icon: <MessageSquare className="w-5 h-5 mr-2" />, path: "/advice" },
      ]
    },
    {
      heading: "Settings",
      items: [
        { name: "accounts", label: "Bank Accounts", icon: <Building className="w-5 h-5 mr-2" />, path: "/accounts" },
        { name: "profile", label: "Profile Settings", icon: <Settings className="w-5 h-5 mr-2" />, path: "/profile" },
      ]
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn(
      "bg-white w-64 flex flex-col h-full", 
      isMobile ? "p-0" : "border-r border-neutral-200 overflow-y-auto hidden md:flex"
    )}>
      {isMobile && (
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5 text-neutral-500" />
          </Button>
        </div>
      )}
      
      <nav className="mt-4 px-4 flex-1">
        {navigationItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              {section.heading}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg w-full text-left",
                      activePage === item.name 
                        ? "text-primary bg-primary/10" 
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      
      {isMobile && (
        <div className="px-4 py-3 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg w-full"
            disabled={logoutMutation.isPending}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {logoutMutation.isPending ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
      
      <div className="px-4 mt-auto mb-4">
        <div className="bg-primary/10 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Need Help?</h3>
          <p className="text-sm text-neutral-600 mb-2">Have questions or need assistance with your finances?</p>
          <Button variant="link" className="text-sm text-primary font-medium p-0 h-auto">
            Contact Support
          </Button>
        </div>
      </div>
    </aside>
  );
}
