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
import { Users } from "lucide-react";
import { useLocation } from "wouter";

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
  const [, navigate] = useLocation();
  // No longer need invite-related state

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
    onSuccess: async (newGroup) => {
      toast({
        title: "Group created",
        description: `${newGroup.name} has been created successfully.`,
      });
      
      // Create a default invite link for the group
      try {
        await apiRequest("POST", `/api/groups/${newGroup.id}/invite`, {});
      } catch (error) {
        console.error("Failed to create default invite link", error);
      }
      
      // Navigate to the newly created group with a flag to show the invite notification
      navigate(`/group/${newGroup.id}?from=newGroup`);
      
      onOpenChange(false);
      form.reset();
      
      // Invalidate all groups-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      // Force refetch any groups with balances queries
      queryClient.invalidateQueries({ queryKey: ["/api/groups", "with-balances"] });
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

  // Removed invite-related functions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#32846b]" />
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

            <div className="text-sm text-muted-foreground pt-2">
              <p>After creating your group, you will be able to invite members using the invite button.</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#32846b] hover:bg-[#276b55]"
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
