import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  effectiveDate: z.date({
    required_error: "Please select an effective date",
  }),
});

interface EffectiveDateSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
  company?: any;
}

export default function EffectiveDateSetup({ onNext, onPrevious, isLast, isLoading, company }: EffectiveDateSetupProps) {
  const { toast } = useToast();

  // Helper function to parse leave year from localStorage
  function getLeaveYearRange() {
    const leaveYear = localStorage.getItem('leave_year');
    if (!leaveYear) {
      return { startDate: null, endDate: null };
    }
    
    // Parse "January-2025-December 2025" format
    const parts = leaveYear.split('-');
    if (parts.length !== 3) {
      return { startDate: null, endDate: null };
    }
    
    const startMonth = parts[0];
    const year = parts[1];
    const endMonth = parts[2].split(' ')[0]; // Remove year from end month
    const endYear = parts[2].split(' ')[1];
    
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const startDate = new Date(parseInt(year), monthMap[startMonth], 1);
    const endDate = new Date(parseInt(endYear), monthMap[endMonth] + 1, 0); // Last day of end month
    
    return { startDate, endDate };
  }

  const { startDate, endDate } = getLeaveYearRange();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      effectiveDate: company?.effectiveDate ? new Date(company.effectiveDate) : new Date(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Validate effective date against leave year before submission
      if (startDate && endDate) {
        if (data.effectiveDate < startDate || data.effectiveDate > endDate) {
          throw new Error(`Effective date must be between ${format(startDate, "MMMM d, yyyy")} and ${format(endDate, "MMMM d, yyyy")} based on your leave year`);
        }
      }
      const payload = {
        effectiveDate: data.effectiveDate.toISOString(),
        setupStatus: "in_progress",
        name: company?.name || "Company",
        workingDaysPerWeek: 5,
        industry: "technology",
        leaveYearStart: "January 1st"
      };

      // First, create or update the company
      let companyResult;
      if (company?.id) {
        companyResult = await apiRequest("PATCH", `/api/company/${company.id}`, payload);
      } else {
        companyResult = await apiRequest("POST", "/api/company", payload);
      }

      // Then create default roles if this is a new setup (no existing roles)
      try {
        const rolesResponse = await apiRequest("GET", "/api/roles");
        const existingRoles = await rolesResponse.json() as any[];
        if (!existingRoles || existingRoles.length === 0) {
          console.log("No existing roles found, creating default roles...");
          
          const defaultRoles = [
            {
              name: "Admin",
              description: "",
              permissions: {
                employeeOverview: { view: true, modify: true },
                leaveApplications: { view: true, modify: true },
                holidays: { view: true, modify: true },
                compensatoryOff: { view: true, modify: true },
                bto: { view: true, modify: true },
                adminOverview: { view: true, modify: true },
                approvals: { view: true, modify: true },
                employees: { view: true, modify: true },
                workflows: { view: true, modify: true },
                roles: { view: true, modify: true },
                importLeaveData: { view: true, modify: true },
                adminLeaveTypes: { view: true, modify: true },
                adminCompOff: { view: true, modify: true },
                adminBTO: { view: true, modify: true },
                allowOnBehalf: { bto: true, leave: true, compOff: true }
              }
            },
            {
              name: "Reporting Manager",
              description: "",
              permissions: {
                employeeOverview: { view: true, modify: false },
                leaveApplications: { view: true, modify: true },
                holidays: { view: true, modify: false },
                compensatoryOff: { view: true, modify: true },
                bto: { view: true, modify: true },
                adminOverview: { view: true, modify: false },
                approvals: { view: true, modify: true },
                employees: { view: true, modify: false },
                workflows: { view: false, modify: false },
                roles: { view: false, modify: false },
                importLeaveData: { view: false, modify: false },
                adminLeaveTypes: { view: false, modify: false },
                adminCompOff: { view: false, modify: false },
                adminBTO: { view: false, modify: false },
                allowOnBehalf: { bto: true, leave: true, compOff: true }
              }
            },
            {
              name: "Employee",
              description: "",
              permissions: {
                employeeOverview: { view: true, modify: false },
                leaveApplications: { view: true, modify: true },
                holidays: { view: true, modify: false },
                compensatoryOff: { view: true, modify: true },
                bto: { view: true, modify: true },
                adminOverview: { view: false, modify: false },
                approvals: { view: false, modify: false },
                employees: { view: false, modify: false },
                workflows: { view: false, modify: false },
                roles: { view: false, modify: false },
                importLeaveData: { view: false, modify: false },
                adminLeaveTypes: { view: false, modify: false },
                adminCompOff: { view: false, modify: false },
                adminBTO: { view: false, modify: false },
                allowOnBehalf: { bto: false, leave: false, compOff: false }
              }
            }
          ];

          // Create each default role
          for (const role of defaultRoles) {
            await apiRequest("POST", "/api/roles", role);
          }
          console.log("Default roles created successfully");
        } else {
          console.log("Existing roles found, skipping default role creation");
        }
      } catch (error) {
        console.error("Error creating default roles:", error);
        // Don't fail the entire setup if role creation fails
      }

      return companyResult;
    },
    onSuccess: () => {
      console.log("Effective date and default roles setup completed successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Module enabled successfully with default roles created.",
      });
      // Add a small delay to ensure state updates are processed
      setTimeout(() => {
        console.log("About to call onNext() after timeout");
        onNext();
      }, 100);
    },
    onError: (error) => {
      console.error("Effective date error:", error);
      toast({
        title: "Error",
        description: "Failed to save effective date. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Set Effective Date</CardTitle>
          <CardDescription>
            Choose when your leave management system should become effective. This date will be used as the starting point for all leave calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            // Disable dates outside the leave year range
                            if (startDate && endDate) {
                              return date < startDate || date > endDate;
                            }
                            // Fallback: disable very old dates
                            return date < new Date("1900-01-01");
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                    {startDate && endDate && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Please select a date between {format(startDate, "MMMM d, yyyy")} and {format(endDate, "MMMM d, yyyy")} based on your leave year ({localStorage.getItem('leave_year')}).
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onPrevious}
                  disabled={mutation.isPending}
                >
                  Previous
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || isLoading}
                >
                  {mutation.isPending ? "Saving..." : isLast ? "Complete Setup" : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}