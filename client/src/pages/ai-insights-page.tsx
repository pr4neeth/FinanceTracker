import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import { useAuth } from "@/hooks/use-simple-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AIDisabledAlert from "@/components/UI/AIDisabledAlert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Lightbulb,
  Brain,
  ChartLine,
  PiggyBank,
  CreditCard,
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Clock
} from "lucide-react";

const adviceFormSchema = z.object({
  topic: z.string().min(1, { message: "Please select a topic" }),
  question: z.string().optional()
});

export default function AiInsightsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Set up form for financial advice
  const adviceForm = useForm({
    resolver: zodResolver(adviceFormSchema),
    defaultValues: {
      topic: "budgeting",
      question: ""
    }
  });

  // Fetch AI insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/insights"],
    queryFn: async () => {
      const response = await fetch("/api/insights");
      if (!response.ok) throw new Error("Failed to fetch insights");
      return await response.json();
    }
  });

  // Fetch expense predictions
  const { data: predictions, isLoading: predictionsLoading, error: predictionsError } = useQuery({
    queryKey: ["/api/predict-expenses"],
    queryFn: async () => {
      const response = await fetch("/api/predict-expenses");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402 && errorData.error === "QUOTA_EXCEEDED") {
          setAiPredictionsDisabled(true);
          throw new Error("OpenAI API quota exceeded");
        }
        throw new Error("Failed to fetch expense predictions");
      }
      return await response.json();
    }
  });

  // Fetch saving suggestions
  const { data: savingSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/saving-suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/saving-suggestions");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402 && errorData.error === "QUOTA_EXCEEDED") {
          setAiSavingsDisabled(true);
          throw new Error("OpenAI API quota exceeded");
        }
        throw new Error("Failed to fetch saving suggestions");
      }
      return await response.json();
    }
  });

  // Mark insight as read mutation
  const markInsightAsReadMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest("POST", `/api/insights/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    }
  });

  // State for AI disabled status
  const [aiAdviceDisabled, setAiAdviceDisabled] = useState(false);
  const [aiPredictionsDisabled, setAiPredictionsDisabled] = useState(false);
  const [aiSavingsDisabled, setAiSavingsDisabled] = useState(false);
  
  // Get financial advice mutation
  const getAdviceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/financial-advice", data);
      return await response.json();
    },
    onError: (error) => {
      // Check if error is related to OpenAI API quota
      if (error.message && error.message.includes("OpenAI API quota exceeded")) {
        setAiAdviceDisabled(true);
      }
    }
  });

  const onAdviceSubmit = (data) => {
    getAdviceMutation.mutate(data);
  };

  // Helper function to get icon for insight type
  const getInsightIcon = (type, severity) => {
    const color = severity === "danger" ? "text-red-500" : 
                  severity === "warning" ? "text-amber-500" : 
                  "text-primary";
    
    switch (type) {
      case "spending_pattern":
        return <ChartLine className={`h-5 w-5 ${color}`} />;
      case "saving_opportunity":
        return <PiggyBank className={`h-5 w-5 ${color}`} />;
      case "alert":
        return <AlertCircle className={`h-5 w-5 ${color}`} />;
      case "prediction":
        return <Brain className={`h-5 w-5 ${color}`} />;
      default:
        return <Lightbulb className={`h-5 w-5 ${color}`} />;
    }
  };

  // Helper function to get background color based on severity
  const getInsightBackground = (severity) => {
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

  // Helper function to get prediction trend icon
  const getPredictionTrendIcon = (predictedAmount, currentAmount) => {
    if (predictedAmount > currentAmount * 1.1) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (predictedAmount < currentAmount * 0.9) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Search className="h-4 w-4 text-blue-500" />;
  };

  // Helper function to get savings suggestion difficulty icon
  const getDifficultyIcon = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "medium":
        return <Info className="h-4 w-4 text-amber-500" />;
      case "hard":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header 
        toggleMobileMenu={toggleMobileMenu} 
        username={user?.fullName || user?.username || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="ai-insights" />
        
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">AI Financial Intelligence</h1>
            <p className="text-neutral-600">
              AI-powered insights, predictions, and advice to improve your finances
            </p>
          </div>
          
          <Tabs defaultValue="insights" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Insights
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center gap-2">
                <Brain className="h-4 w-4" /> Expense Predictions
              </TabsTrigger>
              <TabsTrigger value="savings" className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" /> Saving Opportunities
              </TabsTrigger>
              <TabsTrigger value="advice" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Financial Advice
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="insights">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">
                  <Lightbulb className="h-5 w-5 inline mr-2 text-primary" />
                  AI-Generated Financial Insights
                </h2>
                
                {insightsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : insights && insights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map(insight => (
                      <Card 
                        key={insight.id} 
                        className={`${insight.isRead ? "opacity-75" : ""} ${getInsightBackground(insight.severity)}`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getInsightIcon(insight.type, insight.severity)}
                            {insight.title}
                          </CardTitle>
                          <CardDescription className="flex items-center justify-between">
                            <span>{format(new Date(insight.createdAt), "MMM dd, yyyy")}</span>
                            {!insight.isRead && (
                              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                New
                              </span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-neutral-700 mb-3">
                            {insight.description}
                          </p>
                          {insight.actionUrl && insight.actionLabel && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-primary"
                              onClick={() => {
                                // Mark as read when action taken
                                if (!insight.isRead) {
                                  markInsightAsReadMutation.mutate(insight.id);
                                }
                                // In real app, navigate to action URL
                              }}
                            >
                              {insight.actionLabel}
                            </Button>
                          )}
                        </CardContent>
                        {!insight.isRead && (
                          <CardFooter className="bg-white/50 text-xs text-neutral-500 pt-1 pb-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-neutral-500 h-auto p-0 hover:text-primary hover:bg-transparent"
                              onClick={() => markInsightAsReadMutation.mutate(insight.id)}
                            >
                              Mark as read
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center p-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Lightbulb className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No insights yet</h3>
                    <p className="text-neutral-500 mb-4">
                      As you use the app more, our AI will generate personalized financial insights for you.
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="predictions">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">
                  <Brain className="h-5 w-5 inline mr-2 text-primary" />
                  AI Expense Predictions
                </h2>
                <p className="text-neutral-600">
                  Based on your spending patterns, here's what our AI predicts you'll spend in each category next month.
                </p>
                
                {aiPredictionsDisabled && (
                  <AIDisabledAlert feature="Expense predictions" />
                )}
                
                {predictionsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : predictions && predictions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Expense Predictions</CardTitle>
                      <CardDescription>
                        Next month's predicted expenses by category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-neutral-200">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Current Monthly Avg
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Predicted Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Trend
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Confidence
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {predictions.map((prediction, index) => {
                              // For demo, using a random current amount
                              const currentAmount = (prediction.predictedAmount * (0.8 + Math.random() * 0.4)).toFixed(2);
                              
                              return (
                                <tr key={index} className="hover:bg-neutral-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-neutral-900">
                                      {prediction.category}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-neutral-500">
                                      ${currentAmount}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-neutral-900">
                                      ${prediction.predictedAmount.toFixed(2)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      {getPredictionTrendIcon(prediction.predictedAmount, parseFloat(currentAmount))}
                                      <span className="text-sm ml-1">
                                        {prediction.predictedAmount > parseFloat(currentAmount) * 1.1
                                          ? `+${(((prediction.predictedAmount / parseFloat(currentAmount)) - 1) * 100).toFixed(0)}%`
                                          : prediction.predictedAmount < parseFloat(currentAmount) * 0.9
                                          ? `-${(((parseFloat(currentAmount) / prediction.predictedAmount) - 1) * 100).toFixed(0)}%`
                                          : "Stable"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="w-full bg-neutral-200 rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full" 
                                        style={{ width: `${prediction.confidence * 100}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-1">
                                      {(prediction.confidence * 100).toFixed(0)}% confident
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                    <CardFooter className="text-sm text-neutral-500">
                      <Calendar className="h-4 w-4 mr-1" /> Updated on {format(new Date(), "MMMM d, yyyy")}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card className="text-center p-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Not enough data yet</h3>
                    <p className="text-neutral-500 mb-4">
                      We need at least 3 months of transaction data to generate accurate expense predictions.
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="savings">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">
                  <PiggyBank className="h-5 w-5 inline mr-2 text-primary" />
                  AI Saving Opportunities
                </h2>
                <p className="text-neutral-600">
                  Our AI has analyzed your spending patterns to identify potential ways to save money.
                </p>
                
                {aiSavingsDisabled && (
                  <AIDisabledAlert feature="Savings opportunities" />
                )}
                
                {suggestionsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : savingSuggestions && savingSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savingSuggestions.map((suggestion, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            Potential Savings: ${suggestion.estimatedSaving.toFixed(2)}/month
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            {getDifficultyIcon(suggestion.difficulty)}
                            <span className="capitalize">{suggestion.difficulty} to implement</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-neutral-700">
                            {suggestion.suggestion}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center p-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <PiggyBank className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No savings opportunities yet</h3>
                    <p className="text-neutral-500 mb-4">
                      Add more transactions and spending data so our AI can identify ways for you to save money.
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="advice">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Get Personalized Advice</CardTitle>
                    <CardDescription>
                      Ask our AI for financial advice on specific topics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...adviceForm}>
                      <form onSubmit={adviceForm.handleSubmit(onAdviceSubmit)} className="space-y-4">
                        <FormField
                          control={adviceForm.control}
                          name="topic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Topic</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a topic" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="budgeting">Budgeting</SelectItem>
                                  <SelectItem value="saving">Saving Money</SelectItem>
                                  <SelectItem value="investing">Investing</SelectItem>
                                  <SelectItem value="debt">Debt Management</SelectItem>
                                  <SelectItem value="creditScore">Credit Score</SelectItem>
                                  <SelectItem value="general">General Financial Advice</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={adviceForm.control}
                          name="question"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Question (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="What would you like to know about this topic?"
                                  className="min-h-24"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={getAdviceMutation.isPending}
                        >
                          {getAdviceMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating advice...
                            </>
                          ) : (
                            "Get Advice"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Financial Advice
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Updated {format(new Date(), "MMMM d, yyyy")}</span>
                    </CardDescription>
                  </CardHeader>
                  {aiAdviceDisabled && (
                    <CardContent className="pt-0">
                      <AIDisabledAlert feature="Financial advice" />
                    </CardContent>
                  )}
                  <CardContent>
                    {getAdviceMutation.data ? (
                      <div className="prose prose-sm max-w-none">
                        {getAdviceMutation.data.advice.split('\n\n').map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    ) : getAdviceMutation.isPending ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-neutral-500">
                          Our AI is thinking about your financial situation...
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-neutral-500 mb-4">
                          Select a topic and ask a question to get personalized financial advice based on your situation.
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                          <div className="bg-primary/5 p-3 rounded-lg text-center">
                            <CreditCard className="h-6 w-6 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium">Debt Management</p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-lg text-center">
                            <PiggyBank className="h-6 w-6 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium">Saving Strategies</p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-lg text-center">
                            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium">Investment Tips</p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-lg text-center">
                            <ChartLine className="h-6 w-6 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium">Budgeting Help</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      <MobileNavigation activePage="insights" />
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}>
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="insights" />
          </div>
        </div>
      )}
    </div>
  );
}
