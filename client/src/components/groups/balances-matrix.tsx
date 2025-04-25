import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";

type BalancesMatrixProps = {
  balances: {
    userId: number;
    user: {
      id: number;
      name: string;
    };
    balance: number;
  }[];
  members: {
    user: {
      id: number;
      name: string;
    };
  }[];
};

export function BalancesMatrix({ balances, members }: BalancesMatrixProps) {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Find users who owe money
  const debtors = balances.filter(b => b.balance < 0);
  
  // Find users who are owed money
  const creditors = balances.filter(b => b.balance > 0);
  
  // If everything is settled
  if (debtors.length === 0 && creditors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Balances</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-2">
            All balances are settled in this group!
          </p>
          <p className="text-sm">Everyone has paid their fair share.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Balances</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {debtors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Who owes money</h3>
              <div className="space-y-2">
                {debtors.map(debtor => {
                  const isCurrentUser = debtor.userId === user.id;
                  // Find who this person owes money to
                  const owesTo = creditors.filter(c => c.balance > 0);
                  
                  return (
                    <div key={debtor.userId} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="text-xs">
                            {debtor.user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {isCurrentUser ? "You" : debtor.user.name}
                        </span>
                        <span className="ml-auto text-rose-500 font-medium">
                          ${Math.abs(debtor.balance).toFixed(2)}
                        </span>
                      </div>
                      
                      {owesTo.length > 0 && (
                        <div className="space-y-2 pl-10">
                          {owesTo.map(creditor => (
                            <div key={`${debtor.userId}-${creditor.userId}`} className="flex items-center text-sm">
                              <span>
                                {isCurrentUser ? "You" : "They"} should pay
                              </span>
                              <Avatar className="h-6 w-6 mx-2">
                                <AvatarFallback className="text-xs">
                                  {creditor.user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {creditor.userId === user.id ? "You" : creditor.user.name}
                              </span>
                              <ArrowRight className="h-3 w-3 mx-2" />
                              <span className="text-rose-500 font-medium">
                                ${(Math.abs(debtor.balance) * (creditor.balance / creditors.reduce((acc, c) => acc + c.balance, 0))).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {creditors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Who is owed money</h3>
              <div className="space-y-2">
                {creditors.map(creditor => {
                  const isCurrentUser = creditor.userId === user.id;
                  
                  return (
                    <div key={creditor.userId} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="text-xs">
                            {creditor.user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {isCurrentUser ? "You" : creditor.user.name}
                        </span>
                        <span className="ml-auto text-emerald-500 font-medium">
                          +${creditor.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
