import React, { createContext, useContext, useState, useCallback } from 'react';
import { User } from '@/types/ticket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, employeeId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demo
const mockUsers: Record<string, User> = {
  'john.doe@company.com': {
    id: '1',
    email: 'john.doe@company.com',
    name: 'John Doe',
    employeeId: 'EMP001',
    team: 'Cloud Infrastructure',
    role: 'Senior Developer',
    avatar: undefined,
  },
  'jane.smith@company.com': {
    id: '2',
    email: 'jane.smith@company.com',
    name: 'Jane Smith',
    employeeId: 'EMP002',
    team: 'DevOps',
    role: 'Team Lead',
    avatar: undefined,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, employeeId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const normalizedEmail = email.toLowerCase();
    const mockUser = mockUsers[normalizedEmail];
    
    if (mockUser && mockUser.employeeId === employeeId) {
      setUser(mockUser);
    } else if (email && employeeId) {
      // Create a new user for demo purposes
      const newUser: User = {
        id: Date.now().toString(),
        email: normalizedEmail,
        name: email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' '),
        employeeId: employeeId,
        team: 'IT Cloud Team',
        role: 'Team Member',
      };
      setUser(newUser);
    } else {
      throw new Error('Invalid credentials');
    }
    
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
