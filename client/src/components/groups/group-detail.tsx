import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

type GroupDetailProps = {
  group: {
    id: number;
    name: string;
    createdAt: string;
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
  }[];
  expenses?: any[];
  payments?: any[];
};

export function GroupDetail({ group, members = [], balances = [], expenses = [], payments = [] }: GroupDetailProps) {
  const { user } = useAuth();

  if (!user || !group) return null;

  // Find current user's balance
  const userBalance = balances?.find(b => b?.userId === user.id)?.balance || 0;
  
  // Calculate totals
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0);
  const userExpenseAmount = expenses.filter(expense => expense.paidBy === user.id)
    .reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0);
  const paymentsMade = payments.filter(payment => payment.paidBy === user.id)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentsReceived = payments.filter(payment => payment.paidTo === user.id)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Group Summary */}
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                <span className="text-lg font-medium text-primary">
                  {group?.name ? group.name.charAt(0) : "G"}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{group?.name || "Group"}</h2>
                <p className="text-sm text-muted-foreground">
                  {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''} · Created {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'recently'}
                </p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Your Balance</h3>
              <p className={`text-2xl font-semibold ${
                userBalance > 0 
                  ? "text-emerald-500" 
                  : userBalance < 0 
                    ? "text-rose-500" 
                    : ""
              }`}>
                {userBalance > 0 ? "+" : ""}${Math.abs(Number(userBalance)).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {userBalance > 0 
                  ? "You are owed money" 
                  : userBalance < 0 
                    ? "You owe money" 
                    : "All settled up"}
              </p>
            </div>
          </div>
          
          {/* Members List */}
          <div className="flex-1">
            <h3 className="text-sm font-medium mb-3">Group Members</h3>
            <div className="space-y-3">
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
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="text-xs">
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
        
        <Separator className="my-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-1">Total Expenses</h3>
            <p className="text-xl font-semibold">${totalExpenseAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-1">Your Expenses</h3>
            <p className="text-xl font-semibold">${userExpenseAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-1">Payments Made</h3>
            <p className="text-xl font-semibold">${paymentsMade.toFixed(2)}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-1">Payments Received</h3>
            <p className="text-xl font-semibold">${paymentsReceived.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
