import React, { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Link } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PlaidLinkComponentProps {
  onSuccess?: (data: any) => void;
  buttonText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  buttonText = 'Link Bank Account',
  variant = 'default',
  className = '',
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to load the Plaid Link script
  const loadPlaidLink = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      
      script.onload = () => {
        try {
          // Create the handler with all required callbacks
          const handler = (window as any).Plaid.create({
            token,
            env: 'sandbox',
            product: ['transactions'],
            language: 'en',
            onSuccess: async (public_token: string, metadata: any) => {
              try {
                // Step 4: Send public token to the server to exchange it for an access token
                const exchangeResponse = await apiRequest('POST', '/api/plaid/set-access-token', {
                  publicToken: public_token,
                  institutionId: metadata.institution?.institution_id || '',
                  institutionName: metadata.institution?.name || 'Unknown Institution',
                });

                const data = await exchangeResponse.json();

                // Step 5: Notify about success
                toast({
                  title: 'Account connected!',
                  description: 'Your bank account has been successfully linked.',
                });

                if (onSuccess) {
                  onSuccess(data);
                }
                
                window.location.reload();
              } catch (error) {
                console.error('Error exchanging public token:', error);
                toast({
                  title: 'Connection failed',
                  description: 'There was an error connecting your bank account. Please try again.',
                  variant: 'destructive',
                });
                setIsLoading(false);
              }
            },
            onExit: () => {
              setIsLoading(false);
            },
            onLoad: () => {
              // Optional callback when the Link instance has finished loading
            },
            onEvent: (eventName: string) => {
              // Optional callback for Link flow events
              console.log('Plaid event:', eventName);
            }
          });
          resolve(handler);
        } catch (error) {
          reject(error);
        }
      };
      
      script.onerror = (error) => {
        reject(error);
      };
      
      document.body.appendChild(script);
    });
  };
  
  const openPlaidLink = useCallback(async () => {
    setIsLoading(true);

    try {
      // Step 1: Get a link token from our server
      const response = await apiRequest('POST', '/api/plaid/create-link-token');
      const { link_token } = await response.json();

      if (!link_token) {
        throw new Error('Failed to get link token');
      }

      // Step 2: Load Plaid Link and open it
      const handler = await loadPlaidLink(link_token);
      handler.open();
      
    } catch (error) {
      console.error('Error loading Plaid Link:', error);
      toast({
        title: 'Connection failed',
        description: 'There was an error connecting to Plaid. Please try again later.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [onSuccess, toast]);

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
        <>
          <Link className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default PlaidLinkComponent;