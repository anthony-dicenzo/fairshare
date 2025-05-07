import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/apiRequest';

/**
 * Utility functions for handling balance cache synchronization
 */

/**
 * Force refresh the balances for a specific group and invalidate all related caches
 * Use this after any expense or payment modification to ensure data consistency
 */
export async function refreshGroupBalancesAndInvalidateCaches(groupId: number | string): Promise<void> {
  const groupIdStr = typeof groupId === 'number' ? groupId.toString() : groupId;
  
  try {
    // 1. Explicitly refresh the group balances via the API
    await apiRequest('POST', `/api/groups/${groupIdStr}/refresh-balances`);
    console.log(`Successfully refreshed balances for group ${groupIdStr}`);
    
    // 2. Invalidate all balance-related caches to ensure immediate UI updates
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    
    // 3. Invalidate related data that might be affected by balance changes
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] });
    
    // 4. Force immediate refetch of critical data
    queryClient.refetchQueries({ queryKey: ["/api/balances"] });
    queryClient.refetchQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    
    console.log(`Successfully invalidated and refreshed all balance-related caches`);
  } catch (error) {
    console.error(`Failed to refresh balances for group ${groupIdStr}:`, error);
  }
}

/**
 * Force refresh all balances for current user
 * Use this when navigating to the dashboard to ensure most up-to-date data
 */
export function refreshAllUserBalances(): void {
  try {
    // 1. Invalidate all balance-related caches
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    
    // 2. Force immediate refetch
    queryClient.refetchQueries({ queryKey: ["/api/balances"] });
    
    console.log('Successfully refreshed all user balance data');
  } catch (error) {
    console.error('Failed to refresh user balances:', error);
  }
}