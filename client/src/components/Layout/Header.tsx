import { useState } from "react";
import { useAuth } from "@/hooks/use-simple-auth";
import { 
  ChartLine, 
  Bell, 
  User, 
  ChevronDown, 
  LogOut, 
  Settings, 
  HelpCircle, 
  Menu 
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface HeaderProps {
  toggleMobileMenu: () => void;
  username: string;
}

export default function Header({ toggleMobileMenu, username }: HeaderProps) {
  const { logout } = useAuth();
  const [_, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Get initial display name (first letter of each word up to 2 letters)
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // For demo purposes, always show 3 notifications
  const notificationCount = 3;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden text-neutral-500 mr-2 focus:outline-none"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-neutral-900 flex items-center">
          <ChartLine className="h-6 w-6 text-primary mr-2" />
          FinSmart<span className="text-primary">AI</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-neutral-500 hover:text-neutral-700"
            aria-label={`${notificationCount} unread notifications`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white border-0" 
                variant="destructive"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 flex items-center space-x-2 focus:ring-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-neutral-200 text-neutral-700">
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-neutral-700 hidden md:block">
                {username}
              </span>
              <ChevronDown className="h-4 w-4 text-neutral-500 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help Center</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
