import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { 
  Heart, 
  Smile, 
  Umbrella, 
  Baby, 
  Users, 
  User, 
  Calendar, 
  Stethoscope,
  Briefcase,
  Clock,
  Star,
  Gift
} from "lucide-react";

const customLeaveTypeSchema = z.object({
  name: z.string().min(1, "Leave type name is required"),
  description: z.string().optional(),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  isActive: z.boolean().default(true)
});

type CustomLeaveTypeFormData = z.infer<typeof customLeaveTypeSchema>;

interface CustomLeaveTypeFormProps {
  onClose: () => void;
}

const iconOptions = [
  { value: "stethoscope", label: "Medical", icon: Stethoscope },
  { value: "smile", label: "General", icon: Smile },
  { value: "umbrella", label: "Casual", icon: Umbrella },
  { value: "baby", label: "Family", icon: Baby },
  { value: "heart", label: "Personal", icon: Heart },
  { value: "users", label: "Team", icon: Users },
  { value: "user", label: "Individual", icon: User },
  { value: "calendar", label: "Scheduled", icon: Calendar },
  { value: "briefcase", label: "Professional", icon: Briefcase },
  { value: "clock", label: "Time-off", icon: Clock },
  { value: "star", label: "Special", icon: Star },
  { value: "gift", label: "Benefit", icon: Gift }
];

const colorOptions = [
  { value: "#f59e0b", label: "Orange", color: "#f59e0b" },
  { value: "#3b82f6", label: "Blue", color: "#3b82f6" },
  { value: "#10b981", label: "Green", color: "#10b981" },
  { value: "#ec4899", label: "Pink", color: "#ec4899" },
  { value: "#8b5cf6", label: "Purple", color: "#8b5cf6" },
  { value: "#6366f1", label: "Indigo", color: "#6366f1" },
  { value: "#ef4444", label: "Red", color: "#ef4444" },
  { value: "#06b6d4", label: "Cyan", color: "#06b6d4" },
  { value: "#84cc16", label: "Lime", color: "#84cc16" },
  { value: "#f97316", label: "Orange-Red", color: "#f97316" }
];

export default function CustomLeaveTypeForm({ onClose }: CustomLeaveTypeFormProps) {
  const { toast } = useToast();
  const [selectedIcon, setSelectedIcon] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // Get existing leave types for validation
  const { data: existingLeaveTypes } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  // Get default leave types to check against
  const defaultLeaveTypes = [
    "Sick Leave", "Earned Leave", "Casual Leave", "Maternity Leave", 
    "Paternity Leave", "Marriage Leave", "Study Leave", "Religious Leave", 
    "Community Service", "Bereavement Leave", "Emergency Leave"
  ];

  const form = useForm<CustomLeaveTypeFormData>({
    resolver: zodResolver(customLeaveTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "",
      isActive: true
    }
  });

  const createCustomLeaveTypeMutation = useMutation({
    mutationFn: async (data: CustomLeaveTypeFormData) => {
      // Check for duplicate names before submission
      const trimmedName = data.name.trim();
      
      // Check against existing database leave types
      const existingNames = Array.isArray(existingLeaveTypes) 
        ? existingLeaveTypes.map((lt: any) => lt.name.toLowerCase()) 
        : [];
      
      // Check against default leave types
      const allExistingNames = [
        ...existingNames,
        ...defaultLeaveTypes.map(name => name.toLowerCase())
      ];
      
      if (allExistingNames.includes(trimmedName.toLowerCase())) {
        throw new Error(`A leave type with the name "${trimmedName}" already exists. Please choose a different name.`);
      }
      
      return apiRequest("POST", "/api/leave-types", {
        ...data,
        name: trimmedName,
        annualAllowance: 12, // Default value for leave types
        carryForward: false
      });
    },
    onSuccess: () => {
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      
      // Force refetch of leave types data
      queryClient.refetchQueries({ queryKey: ["/api/leave-types"] });
      
      toast({
        title: "Success",
        description: "Custom leave type created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Create custom leave type error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create custom leave type. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomLeaveTypeFormData) => {
    createCustomLeaveTypeMutation.mutate(data);
  };

  const getIconComponent = (iconValue: string) => {
    const iconOption = iconOptions.find(option => option.value === iconValue);
    return iconOption?.icon || Calendar;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create Custom Leave Type</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter leave type name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter description (optional)" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedIcon(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon">
                              {field.value && (
                                <div className="flex items-center">
                                  {(() => {
                                    const IconComponent = getIconComponent(field.value);
                                    return <IconComponent className="w-4 h-4 mr-2" />;
                                  })()}
                                  {iconOptions.find(opt => opt.value === field.value)?.label}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((option) => {
                            const IconComponent = option.icon;
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center">
                                  <IconComponent className="w-4 h-4 mr-2" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedColor(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color">
                              {field.value && (
                                <div className="flex items-center">
                                  <div 
                                    className="w-4 h-4 rounded mr-2" 
                                    style={{ backgroundColor: field.value }}
                                  ></div>
                                  {colorOptions.find(opt => opt.value === field.value)?.label}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <div 
                                  className="w-4 h-4 rounded mr-2" 
                                  style={{ backgroundColor: option.color }}
                                ></div>
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview */}
              {selectedIcon && selectedColor && (
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Preview</Label>
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedColor}20` }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(selectedIcon);
                        return <IconComponent 
                          className="w-5 h-5" 
                          style={{ color: selectedColor }}
                        />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{form.watch("name") || "Leave Type Name"}</h3>
                      <p className="text-sm text-gray-500">Custom leave type</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={createCustomLeaveTypeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomLeaveTypeMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createCustomLeaveTypeMutation.isPending ? "Creating..." : "Create Leave Type"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}