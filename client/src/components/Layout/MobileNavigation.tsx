import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  Lightbulb, 
  MoreHorizontal,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobileNavigationProps {
  activePage?: string;
}

export default function MobileNavigation({ activePage }: MobileNavigationProps) {
  const [_, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items for the mobile bottom bar
  const navItems = [
    { name: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="text-lg" />, path: "/" },
    { name: "transactions", label: "Transactions", icon: <ArrowRightLeft className="text-lg" />, path: "/transactions" },
    { name: "budgets", label: "Budgets", icon: <Wallet className="text-lg" />, path: "/budgets" },
    { name: "insights", label: "AI Insights", icon: <Lightbulb className="text-lg" />, path: "/ai-insights" },
    { name: "profile", label: "Profile", icon: <User className="text-lg" />, path: "/profile" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="md:hidden bg-white border-t border-neutral-200 flex items-center justify-around py-2 fixed bottom-0 left-0 right-0 z-10">
      {navItems.map((item, index) => (
        <button
          key={index}
          onClick={() => handleNavigation(item.path)}
          className={cn(
            "flex flex-col items-center p-2",
            activePage === item.name ? "text-primary" : "text-neutral-500"
          )}
          aria-label={item.label}
        >
          {item.icon}
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
      <button 
        onClick={toggleMobileMenu}
        className="flex flex-col items-center p-2 text-neutral-500"
        aria-label="More options"
      >
        <MoreHorizontal className="text-lg" />
        <span className="text-xs mt-1">More</span>
      </button>
    </div>
  );
}
