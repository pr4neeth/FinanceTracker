import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
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
};

// Create the auth context
export const AuthContext = createContext<AuthContextType>(defaultContext);

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch the user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/user");
        if (response.status === 401) {
          setUser(null);
          return;
        }
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          throw new Error("Failed to fetch user");
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Define login function
  const login = async (credentials: LoginData): Promise<SelectUser> => {
    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      setUser(userData);
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
      setUser(null);
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
      toast({
        title: "Registration successful",
        description: `Welcome, ${newUser.username}!`,
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