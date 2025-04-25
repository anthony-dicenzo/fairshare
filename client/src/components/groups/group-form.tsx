import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type GroupFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Schema for the group form
const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

// Email validation schema
const emailSchema = z.string().email("Invalid email address");

export function GroupForm({ open, onOpenChange }: GroupFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [emailError, setEmailError] = useState("");

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return res.json();
    },
    onSuccess: (newGroup) => {
      toast({
        title: "Group created",
        description: `${newGroup.name} has been created successfully.`,
      });
      
      // If there are invitees, invite them
      if (invitees.length > 0) {
        invitees.forEach(async (inviteeEmail) => {
          try {
            await apiRequest("POST", `/api/groups/${newGroup.id}/invite`, {
              email: inviteeEmail,
            });
          } catch (error) {
            toast({
              title: "Failed to invite user",
              description: `Could not invite ${inviteeEmail}. They may need to register first.`,
              variant: "destructive",
            });
          }
        });
      }
      
      onOpenChange(false);
      form.reset();
      setInvitees([]);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createGroupMutation.mutate({
      name: values.name,
    });
  });

  const handleAddInvitee = () => {
    try {
      emailSchema.parse(email);
      if (!invitees.includes(email)) {
        setInvitees([...invitees, email]);
        setEmail("");
        setEmailError("");
      } else {
        setEmailError("Email already added");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  const handleRemoveInvitee = (emailToRemove: string) => {
    setInvitees(invitees.filter((e) => e !== emailToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create a New Group
          </DialogTitle>
          <DialogDescription>
            Create a group to start tracking expenses with friends or colleagues.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Roommates, Trip to Italy, etc." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Invite Members</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  className={emailError ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddInvitee}
                  disabled={!email}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {emailError && (
                <p className="text-sm font-medium text-destructive">{emailError}</p>
              )}

              {invitees.length > 0 && (
                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="text-sm text-muted-foreground mb-2">Invitees:</p>
                  <div className="flex flex-wrap gap-2">
                    {invitees.map((inviteeEmail) => (
                      <Badge
                        key={inviteeEmail}
                        variant="secondary"
                        className="px-3 py-1 bg-primary/10 text-primary"
                      >
                        {inviteeEmail}
                        <button
                          type="button"
                          className="ml-1 text-primary hover:text-primary/60"
                          onClick={() => handleRemoveInvitee(inviteeEmail)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                  setInvitees([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
