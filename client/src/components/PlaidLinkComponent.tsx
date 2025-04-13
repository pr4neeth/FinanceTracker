import React, { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

// Function to load the Plaid Link script dynamically
const loadPlaidLinkScript = () => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link script'));
    document.body.appendChild(script);
  });
};

interface PlaidLinkComponentProps {
  onSuccess?: (data: any) => void;
  buttonText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  buttonText = 'Connect a bank account',
  variant = 'default',
  className = '',
}) => {
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const queryClient = useQueryClient();

  // Mutation to create a link token
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/plaid/create-link-token');
      return await res.json();
    },
  });

  // Mutation to exchange the public token
  const exchangePublicTokenMutation = useMutation({
    mutationFn: async ({ publicToken, metadata }: { publicToken: string; metadata: any }) => {
      const res = await apiRequest('POST', '/api/plaid/exchange-public-token', {
        publicToken,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate accounts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
  });

  // Open Plaid Link
  const openPlaidLink = useCallback(async () => {
    try {
      setIsScriptLoading(true);
      
      // Load Plaid Link script
      await loadPlaidLinkScript();
      
      // Create a link token
      const { linkToken } = await createLinkTokenMutation.mutateAsync();
      
      // @ts-ignore - Plaid Link is loaded from CDN
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string, metadata: any) => {
          // Exchange the public token for an access token
          await exchangePublicTokenMutation.mutateAsync({ publicToken, metadata });
        },
        onExit: (err: any) => {
          if (err) {
            console.error('Plaid Link error:', err);
          }
        },
        onLoad: () => {
          setIsScriptLoading(false);
        },
      });
      
      // Open Plaid Link
      handler.open();
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
      setIsScriptLoading(false);
    }
  }, [createLinkTokenMutation, exchangePublicTokenMutation, onSuccess]);

  const isLoading = isScriptLoading || 
                   createLinkTokenMutation.isPending || 
                   exchangePublicTokenMutation.isPending;

  return (
    <Button
      onClick={openPlaidLink}
      disabled={isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
};

export default PlaidLinkComponent;