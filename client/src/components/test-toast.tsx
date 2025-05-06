import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ToastTester() {
  const { toast } = useToast();

  const showDefaultToast = () => {
    toast({
      title: "Default Toast",
      description: "This is a default toast notification",
    });
  };

  const showSuccessToast = () => {
    toast({
      title: "Success!",
      description: "Operation completed successfully",
      variant: "success",
    });
  };

  const showDestructiveToast = () => {
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "destructive",
    });
  };

  const showActionToast = () => {
    toast({
      title: "Notification with Action",
      description: "This toast has an action button",
      action: (
        <Button onClick={() => console.log("Action clicked")}>
          Action
        </Button>
      ),
    });
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <Button onClick={showDefaultToast} className="bg-[#32846b] hover:bg-[#276b55] text-white rounded-md">
        Show Default Toast
      </Button>
      <Button onClick={showSuccessToast} className="bg-green-600 hover:bg-green-700 text-white rounded-md">
        Show Success Toast
      </Button>
      <Button onClick={showDestructiveToast} className="bg-red-600 hover:bg-red-700 text-white rounded-md">
        Show Error Toast
      </Button>
      <Button onClick={showActionToast} className="bg-[#32846b] hover:bg-[#276b55] text-white rounded-md">
        Show Toast with Action
      </Button>
    </div>
  );
}