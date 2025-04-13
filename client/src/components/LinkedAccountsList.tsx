import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trash, CreditCard, DollarSign, PiggyBank, Bank, Building } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Account {
  _id: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  balance: number;
  currency: string;
  mask?: string;
  plaidItemId: string;
  isPlaidConnected: boolean;
}

interface LinkedAccountsListProps {
  showSyncButton?: boolean;
  includeActions?: boolean;
  titlePrefix?: string;
}

export const LinkedAccountsList: React.FC<LinkedAccountsListProps> = ({
  showSyncButton = true,
  includeActions = true,
  titlePrefix = '',
}) => {
  const { toast } = useToast();
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Query to get all linked accounts
  const { 
    data: accounts = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/plaid/accounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/plaid/accounts');
      return response.json();
    },
  });

  // Mutation to sync transactions for an account
  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setSyncingAccountId(accountId);
      const response = await apiRequest('POST', '/api/plaid/sync-transactions', { accountId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync successful',
        description: `${data.newTransactionsCount} new transactions synced.`,
      });
      // Invalidate transactions queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync transactions. Please try again.',
        variant: 'destructive',
      });
      console.error('Error syncing transactions:', error);
    },
    onSettled: () => {
      setSyncingAccountId(null);
    },
  });

  // Mutation to unlink an account
  const unlinkMutation = useMutation({
    mutationFn: async (plaidItemId: string) => {
      const response = await apiRequest('DELETE', `/api/plaid/items/${plaidItemId}`);
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: 'Account unlinked',
        description: 'The bank account has been successfully unlinked.',
      });
      refetch();
      // Invalidate transactions queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to unlink account',
        description: 'There was an error unlinking your account. Please try again.',
        variant: 'destructive',
      });
      console.error('Error unlinking account:', error);
    },
  });

  const getAccountIcon = (type: string, subtype?: string) => {
    switch (type.toLowerCase()) {
      case 'depository':
        return subtype?.toLowerCase() === 'checking' ? <Bank className="h-5 w-5" /> : <PiggyBank className="h-5 w-5" />;
      case 'credit':
        return <CreditCard className="h-5 w-5" />;
      case 'loan':
        return <Building className="h-5 w-5" />;
      case 'investment':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <Bank className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading linked accounts...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading accounts</AlertTitle>
        <AlertDescription>
          There was an error loading your linked accounts. Please refresh the page or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (accounts.length === 0) {
    return (
      <Alert>
        <AlertTitle>No linked accounts</AlertTitle>
        <AlertDescription>
          You haven't linked any bank accounts yet. Use the "Link Bank Account" button to connect your accounts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account: Account) => (
        <Card key={account._id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {getAccountIcon(account.type, account.subtype)}
                <div className="ml-2">
                  <CardTitle className="text-base">{titlePrefix} {account.name}</CardTitle>
                  <CardDescription>
                    {account.officialName && account.officialName !== account.name 
                      ? account.officialName 
                      : `${account.type}${account.subtype ? ` - ${account.subtype}` : ''}`}
                    {account.mask && <span className="ml-1">••{account.mask}</span>}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account.balance, account.currency)}
            </div>
          </CardContent>
          {includeActions && (
            <CardFooter className="pt-0 flex justify-between">
              {showSyncButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate(account._id)}
                  disabled={syncMutation.isPending && syncingAccountId === account._id}
                >
                  {syncMutation.isPending && syncingAccountId === account._id ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sync
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Are you sure you want to unlink this account? This will remove all transactions associated with this account.')) {
                    unlinkMutation.mutate(account.plaidItemId);
                  }
                }}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Unlinking...
                  </>
                ) : (
                  <>
                    <Trash className="mr-2 h-3 w-3" />
                    Unlink
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
};

export default LinkedAccountsList;