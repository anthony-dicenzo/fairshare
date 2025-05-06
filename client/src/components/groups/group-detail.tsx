import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

type GroupDetailProps = {
  group: {
    id: number;
    name: string;
    createdAt: string | Date;
    createdBy?: number;
  };
  members: {
    user: {
      id: number;
      name: string;
    };
  }[];
  balances: {
    userId: number;
    balance: number;
    user?: {
      id: number;
      name: string;
    };
  }[];
  expenses?: any[];
  payments?: any[];
};

export function GroupDetail({ group, members = [], balances = [], expenses = [], payments = [] }: GroupDetailProps) {
  const { user } = useAuth();

  if (!user || !group) return null;

  // Get the user's balance from the API data
  const apiUserBalance = balances?.find(b => b?.userId === user.id)?.balance || 0;
  
  // Calculate totals
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0);
  const userExpenseAmount = expenses.filter(expense => expense.paidBy === user.id)
    .reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0);
    
  // Calculate the user's fair share of expenses
  const membersCount = members.length || 1;
  const fairSharePerUser = totalExpenseAmount / membersCount;
  
  // Always use the cached balance from the API for consistency across the app
  // This ensures the same balance is shown everywhere
  const userBalance = apiUserBalance;
  
  return (
    <Card className="border-fairshare-primary/10">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Group Summary */}
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-fairshare-primary/10 flex items-center justify-center mr-3">
                <span className="text-lg font-medium text-fairshare-primary">
                  {group?.name ? group.name.charAt(0) : "G"}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''} · Created {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'recently'}
                </p>
              </div>
            </div>
            
            <div className="bg-fairshare-primary/5 rounded-lg p-3">
              <h3 className="text-xs font-medium mb-2 text-fairshare-dark/70">
                {userBalance > 0 
                  ? "You Are Owed" 
                  : userBalance < 0 
                    ? "You Owe" 
                    : "Your Balance"}
              </h3>
              <p className={`text-xl font-semibold ${
                userBalance > 0 
                  ? "text-emerald-500" 
                  : userBalance < 0 
                    ? "text-rose-500" 
                    : "text-fairshare-primary"
              }`}>
                {userBalance > 0 ? "+" : userBalance < 0 ? "-" : ""}${Math.abs(Number(userBalance)).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.abs(Number(userBalance)) < 0.01 ? "All settled up" : "Total balance"}
              </p>
            </div>
          </div>
          
          {/* Members List */}
          <div className="flex-1">
            <h3 className="text-xs font-medium mb-2 text-fairshare-dark/70">Group Members</h3>
            <div className="bg-fairshare-primary/5 rounded-lg p-3">
              <div className="space-y-2">
                {members?.map((member) => {
                  if (!member?.user?.id) return null;
                  
                  const memberBalance = balances?.find(b => b?.userId === member?.user?.id)?.balance || 0;
                  const initials = member?.user?.name 
                    ? member.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2)
                    : "U";
                    
                  return (
                    <div key={member.user.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-7 w-7 mr-2">
                          <AvatarFallback className="text-xs bg-fairshare-primary/10 text-fairshare-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member?.user && user && member.user.id === user.id ? "You" : member?.user?.name || "User"}
                        </span>
                      </div>
                      {member?.user && user && member.user.id !== user.id && (
                        <span className={`text-sm font-medium ${
                          memberBalance > 0 
                            ? "text-emerald-500" 
                            : memberBalance < 0 
                              ? "text-rose-500" 
                              : ""
                        }`}>
                          {memberBalance > 0 ? "+" : ""}${Math.abs(Number(memberBalance)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-fairshare-primary/5 rounded-lg p-3">
            <h3 className="text-xs font-medium mb-1 text-fairshare-dark/70">Total Expenses</h3>
            <p className="text-lg font-semibold text-fairshare-dark">${totalExpenseAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-fairshare-primary/5 rounded-lg p-3">
            <h3 className="text-xs font-medium mb-1 text-fairshare-dark/70">Your Expenses</h3>
            <p className="text-lg font-semibold text-fairshare-dark">${userExpenseAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-fairshare-primary/5 rounded-lg p-3">
            <h3 className="text-xs font-medium mb-1 text-fairshare-dark/70">You Owe</h3>
            <p className="text-lg font-semibold text-rose-500">
              ${Math.abs(Math.min(0, userBalance)).toFixed(2)}
            </p>
          </div>
          
          <div className="bg-fairshare-primary/5 rounded-lg p-3">
            <h3 className="text-xs font-medium mb-1 text-fairshare-dark/70">You Are Owed</h3>
            <p className="text-lg font-semibold text-emerald-500">
              ${Math.max(0, userBalance).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
