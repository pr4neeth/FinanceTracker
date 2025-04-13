import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  titlePrefix = 'Linked',
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch linked accounts
  const { data: accounts, isLoading, error } = useQuery<Account[]>({
    queryKey: ['/api/plaid/accounts'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/plaid/accounts');
        return await res.json();
      } catch (error) {
        console.error('Error fetching linked accounts:', error);
        return [];
      }
    }
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (plaidItemId: string) => {
      const res = await apiRequest('POST', '/api/plaid/sync-transactions', { plaidItemId });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Transactions synced',
        description: `Added ${data.transactionsAdded} new transactions.`,
      });
      // Invalidate transactions and accounts queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error syncing transactions',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (plaidItemId: string) => {
      const res = await apiRequest('DELETE', `/api/plaid/items/${plaidItemId}`);
      return res.status === 204;
    },
    onSuccess: () => {
      toast({
        title: 'Account unlinked',
        description: 'Bank account has been successfully unlinked',
      });
      // Invalidate accounts query
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error unlinking account',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Group accounts by institution (plaidItemId)
  const accountsByInstitution: Record<string, Account[]> = {};
  
  accounts?.forEach(account => {
    if (!accountsByInstitution[account.plaidItemId]) {
      accountsByInstitution[account.plaidItemId] = [];
    }
    accountsByInstitution[account.plaidItemId].push(account);
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        Error loading accounts: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No bank accounts linked. Use the Connect button to link your accounts.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(accountsByInstitution).map(([plaidItemId, institutionAccounts]) => {
        // Find the first account to get institution information
        const firstAccount = institutionAccounts[0];
        const institutionName = firstAccount.officialName || firstAccount.name.split(' - ')[0];
        
        return (
          <Card key={plaidItemId} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle>{titlePrefix} {institutionName}</CardTitle>
              <CardDescription>
                {institutionAccounts.length} {institutionAccounts.length === 1 ? 'account' : 'accounts'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {institutionAccounts.map(account => (
                  <div key={account._id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.type} {account.subtype ? `· ${account.subtype}` : ''}
                        {account.mask ? ` · ••••${account.mask}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">Current balance</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            {includeActions && (
              <CardFooter className="bg-muted/30 flex justify-between p-3">
                {showSyncButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => syncTransactionsMutation.mutate(plaidItemId)}
                    disabled={syncTransactionsMutation.isPending}
                  >
                    {syncTransactionsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Transactions
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to unlink this account? This will remove all associated accounts.')) {
                      deleteAccountMutation.mutate(plaidItemId);
                    }
                  }}
                  disabled={deleteAccountMutation.isPending}
                >
                  {deleteAccountMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Unlink
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default LinkedAccountsList;