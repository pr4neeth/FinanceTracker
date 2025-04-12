import React from 'react';
import { useAuth } from '@/hooks/use-simple-auth';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function SimpleHomePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Welcome, {user?.username || 'User'}
          </span>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Welcome to FinSmartAI</h2>
        <p className="text-gray-700 mb-4">
          Your AI-powered personal finance assistant is ready to help you manage your finances.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-primary/5 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-2">Track Expenses</h3>
            <p className="text-sm text-gray-600">
              Monitor your spending habits and categorize transactions.
            </p>
          </div>
          <div className="bg-primary/5 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-2">Budget Planning</h3>
            <p className="text-sm text-gray-600">
              Set budgets and get alerts when you're close to limits.
            </p>
          </div>
          <div className="bg-primary/5 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-2">AI Insights</h3>
            <p className="text-sm text-gray-600">
              Get personalized financial advice and spending patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}