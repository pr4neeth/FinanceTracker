import { createContext, ReactNode, useContext, useState, useEffect, useCallback } from "react";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the auth context type
type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginData) => Promise<SelectUser>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<SelectUser>;
  refreshUser: () => Promise<SelectUser | null>; // Add refresh function
};

type LoginData = {
  username: string;
  password: string;
};

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    fullName: z.string().min(3, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof registerSchema>;

// Create a default value for the context
const defaultContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  login: async () => {
    throw new Error("AuthContext not initialized");
  },
  logout: async () => {
    throw new Error("AuthContext not initialized");
  },
  register: async () => {
    throw new Error("AuthContext not initialized");
  },
  refreshUser: async () => {
    throw new Error("AuthContext not initialized");
  },
};

// Create the auth context
export const AuthContext = createContext<AuthContextType>(defaultContext);

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Function to completely reset user state and clear all caches
  const resetUserState = useCallback(() => {
    setUser(null);
    queryClient.clear(); // Completely clear all query caches
  }, []);

  // Create a reusable fetchUser function 
  const refreshUser = useCallback(async (): Promise<SelectUser | null> => {
    try {
      setIsLoading(true);
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.status === 401) {
          setUser(null);
          return null;
        }
        
        const userData = await res.json();
        setUser(userData);
        return userData;
      } catch (fetchError) {
        // If it's a 401 error, apiRequest will throw an error
        if (fetchError instanceof Error && fetchError.message.includes("401")) {
          setUser(null);
          return null;
        }
        throw fetchError;
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch the user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Define login function
  const login = async (credentials: LoginData): Promise<SelectUser> => {
    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      setUser(userData);
      
      // Clear all query caches to ensure fresh data for the new user
      queryClient.removeQueries();
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      return userData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Define logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/logout");
      
      // Use the reset function to fully clear all state
      resetUserState();
      
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: "Logout failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Define register function
  const register = async (data: RegisterData): Promise<SelectUser> => {
    try {
      setIsLoading(true);
      const { confirmPassword, ...userData } = data;
      const res = await apiRequest("POST", "/api/register", userData);
      const newUser = await res.json();
      setUser(newUser);
      
      // Clear all query caches to ensure fresh data for the new user
      queryClient.removeQueries();
      
      toast({
        title: "Registration successful",
        description: `Login, ${newUser.username}!`,
      });
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Return the provider
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        register,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Create the useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

// Form helpers
export const useLoginForm = () => {
  return {
    resolver: zodResolver(
      z.object({
        username: z.string().min(3, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    ),
    defaultValues: {
      username: "",
      password: "",
    },
  };
};

export const useRegisterForm = () => {
  return {
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  };
};