import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lightbulb, PiggyBank, BellRing } from "lucide-react";
import { format } from "date-fns";

interface AiInsight {
  id: number;
  type: string;
  title: string;
  description: string;
  userId: number;
  createdAt: string;
  isRead: boolean;
  severity: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface AiInsightsProps {
  insights: AiInsight[];
  isLoading: boolean;
}

export default function AiInsights({ insights, isLoading }: AiInsightsProps) {
  const [_, navigate] = useNavigate();

  // Mark insight as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/insights/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    }
  });

  // Function to get appropriate icon for insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "spending_pattern":
        return <Lightbulb className="text-primary" />;
      case "saving_opportunity":
        return <PiggyBank className="text-green-500" />;
      case "alert":
        return <BellRing className="text-amber-500" />;
      default:
        return <Lightbulb className="text-primary" />;
    }
  };

  // Function to get appropriate background color based on severity
  const getInsightBackground = (severity: string) => {
    switch (severity) {
      case "danger":
        return "bg-red-50";
      case "warning":
        return "bg-amber-50";
      case "info":
      default:
        return "bg-primary/5";
    }
  };

  // Sort insights by createdAt (newest first) and prioritize unread
  const sortedInsights = [...(insights || [])].sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1; // Unread first
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newest first
  });

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <CardTitle className="text-base font-semibold flex items-center">
          <Lightbulb className="h-5 w-5 text-primary mr-2" /> AI Insights
        </CardTitle>
        <span className="text-xs bg-neutral-100 px-2 py-1 rounded-full">
          Updated {format(new Date(), "MMM d")}
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="bg-neutral-50 p-3 rounded-lg">
                <div className="flex">
                  <Skeleton className="h-10 w-10 rounded-full mr-3" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedInsights && sortedInsights.length > 0 ? (
          <div className="space-y-4">
            {sortedInsights.slice(0, 3).map((insight) => (
              <div 
                key={insight.id} 
                className={`${getInsightBackground(insight.severity)} p-3 rounded-lg ${insight.isRead ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start">
                  <div className={`bg-white rounded-full p-2 text-primary mr-3 shadow-sm`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <h4 className="font-medium text-neutral-900 text-sm">
                        {insight.title}
                      </h4>
                      {!insight.isRead && (
                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full ml-2">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">
                      {insight.description}
                    </p>
                    {insight.actionLabel && (
                      <Button 
                        variant="link" 
                        className="text-primary text-sm p-0 mt-1 h-auto"
                        onClick={() => {
                          if (!insight.isRead) {
                            markAsReadMutation.mutate(insight.id);
                          }
                          // In a real app, navigate to action URL or handle action
                          // For now, just mark as read
                        }}
                      >
                        {insight.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="link" 
              className="text-primary text-sm flex items-center justify-center w-full"
              onClick={() => navigate("/insights")}
            >
              View All Insights <span className="ml-1">→</span>
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Lightbulb className="h-10 w-10 text-primary/50 mx-auto mb-2" />
            <p className="text-neutral-500 mb-2">No insights yet</p>
            <p className="text-xs text-neutral-400">
              As you use the app more, our AI will generate personalized insights.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
