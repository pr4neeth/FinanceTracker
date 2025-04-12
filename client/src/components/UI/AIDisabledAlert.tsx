import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface AIDisabledAlertProps {
  feature: string;
  className?: string;
}

export default function AIDisabledAlert({ feature, className = "" }: AIDisabledAlertProps) {
  return (
    <Alert variant="destructive" className={`mb-4 ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>AI Feature Unavailable</AlertTitle>
      <AlertDescription>
        {feature} is currently unavailable due to API quota limitations. Please try again later or contact the administrator for assistance.
      </AlertDescription>
    </Alert>
  );
}