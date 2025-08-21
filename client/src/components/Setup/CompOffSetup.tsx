import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CompOffVariantForm from "./CompOffVariantForm";
import { DancingLoader } from "@/components/ui/dancing-loader";
import EmployeeAssignment from "./EmployeeAssignment";
import { fetchEmployeeData, transformEmployeeData } from "@/lib/externalApi";

interface CompOffSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
  showNavigation?: boolean; // Add prop to control navigation buttons visibility
}



export default function CompOffSetup({ onNext, onPrevious, isLast, isLoading, showNavigation = true }: CompOffSetupProps) {
  const { toast } = useToast();
  const [compOffEnabled, setCompOffEnabled] = useState(true);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [variantAssignments, setVariantAssignments] = useState<Record<string, any[]>>({});
  const [currentVariantForAssignment, setCurrentVariantForAssignment] = useState<any>(null);

  // Fetch existing comp off variants using dedicated API
  const { data: variants = [] } = useQuery({
    queryKey: ["/api/comp-off-variants"],
  });

  // Use all variants from the dedicated comp-off API (no filtering needed)
  const compOffVariants = variants as any[];

  // Employee data will be fetched from external API
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Load employee data from external API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeeData = await fetchEmployeeData();
        const transformedEmployees = employeeData.map(transformEmployeeData);
        console.log("CompOffSetup: External API loaded employees:", transformedEmployees.length);
        setAllEmployees(transformedEmployees);
      } catch (error) {
        console.error('CompOffSetup: Error loading employees from external API:', error);
        // If external API fails, we'll handle employee display in the variant assignment loading
        setAllEmployees([]);
      }
    };

    loadEmployees();
  }, []);

  // Load existing employee assignments for all comp off variants
  useEffect(() => {
    if (compOffVariants && compOffVariants.length > 0) {
      const loadAssignments = async () => {
        const assignments: Record<string, any[]> = {};
        
        for (const variant of compOffVariants) {
          try {
            const response = await fetch(`/api/employee-assignments/comp-off-variant/${variant.id}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const variantAssignments = await response.json();
              console.log(`CompOff assignments for variant ${variant.id}:`, variantAssignments);
              if (Array.isArray(variantAssignments) && variantAssignments.length > 0) {
                const assignedUserIds = variantAssignments.map((assignment: any) => assignment.userId);
                console.log(`CompOff assigned user IDs for variant ${variant.id}:`, assignedUserIds);
                
                // Match external employee data with assigned user IDs
                const assignedEmployeeData = allEmployees.filter(emp => {
                  const empId = emp.user_id || emp.id;
                  const isAssigned = assignedUserIds.includes(empId) || assignedUserIds.includes(empId?.toString());
                  if (isAssigned) {
                    console.log(`CompOff employee matched: ${emp.user_name || emp.name} (ID: ${empId})`);
                  }
                  return isAssigned;
                });
                
                assignments[variant.id] = assignedEmployeeData;
                console.log(`CompOff final assignments for variant ${variant.id}:`, assignedEmployeeData);
              }
            }
          } catch (error) {
            console.error(`Error loading assignments for variant ${variant.id}:`, error);
          }
        }
        
        setVariantAssignments(assignments);
      };

      loadAssignments();
    }
  }, [compOffVariants.length, allEmployees.length]); // Depend on both variants and employees being loaded

  const { data: config } = useQuery({
    queryKey: ["/api/comp-off-config"],
  });

  // Set initial state from config
  useEffect(() => {
    if (config && typeof config === 'object' && 'enabled' in config) {
      setCompOffEnabled(config.enabled !== false);
    }
  }, [config]);

  const toggleCompOffMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("POST", "/api/comp-off-config", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-config"] });
      toast({
        title: "Success",
        description: compOffEnabled ? "Comp off enabled successfully." : "Comp off disabled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update comp off configuration.",
        variant: "destructive",
      });
    },
  });

  const handleToggleChange = (checked: boolean) => {
    setCompOffEnabled(checked);
    toggleCompOffMutation.mutate(checked);
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setShowVariantForm(true);
  };

  const handleEditVariant = (variant: any) => {
    setEditingVariant(variant);
    setShowVariantForm(true);
  };

  const handleAssignEmployees = (variant: any) => {
    setCurrentVariantForAssignment(variant);
    setShowEmployeeAssignment(true);
  };

  const handleEmployeeAssignment = async (selectedEmployees: any[]) => {
    if (currentVariantForAssignment) {
      try {
        // Save employee assignments to database with user_id
        const assignments = selectedEmployees.map(emp => ({
          userId: emp.user_id || emp.id, // Support both user_id and id fields
          leaveVariantId: currentVariantForAssignment.id, // Use leaveVariantId (generic field name for all assignment types)
          assignmentType: "comp_off_variant"
        }));
        console.log("CompOff Assignment payload:", assignments);
        await apiRequest("POST", "/api/employee-assignments/bulk", { assignments });

        setVariantAssignments(prev => ({
          ...prev,
          [currentVariantForAssignment.id]: selectedEmployees
        }));
        
        toast({
          title: "Success",
          description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} assigned to ${currentVariantForAssignment.leaveVariantName}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save employee assignments.",
          variant: "destructive",
        });
      }
    }
    setShowEmployeeAssignment(false);
    setCurrentVariantForAssignment(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (variantId: number) => {
      return await apiRequest("DELETE", `/api/comp-off-variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-variants"] });
      toast({
        title: "Success",
        description: "Comp-off variant deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete variant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteVariant = (variant: any) => {
    if (variant && variant.id) {
      if (confirm("Are you sure you want to delete this variant?")) {
        deleteMutation.mutate(variant.id);
      }
    }
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <>
      <div className="w-full">
        {/* Header with Comp off toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">Comp off</h2>
            <Switch
              checked={compOffEnabled}
              onCheckedChange={handleToggleChange}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>

        {/* Variants Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Variants</h3>
          
          {/* Render actual comp off variants */}
          {compOffVariants.map((variant: any) => (
            <Card key={variant.id} className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{variant.name || variant.leaveVariantName}</h4>
                    <p className="text-sm text-gray-500">
                      Applied to {variantAssignments[variant.id]?.length || 0} Employee{(variantAssignments[variant.id]?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleAssignEmployees(variant)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Assign Employees
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => handleDeleteVariant(variant)}
                    >
                      Delete
                      <Trash2 className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      onClick={() => handleEditVariant(variant)}
                    >
                      Edit
                      <Edit className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show message when no variants exist */}
          {compOffVariants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No comp off variants created yet.</p>
              <p className="text-sm">Click "Create Comp-off variant" to get started.</p>
            </div>
          )}

          {/* Create Comp-off variant button */}
          <Button
            variant="outline"
            onClick={handleCreateVariant}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Comp-off variant
          </Button>
        </div>

        {/* Navigation buttons */}
        {showNavigation && (
          <div className="flex justify-between pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLast ? "Complete Setup" : "Next"}
            </Button>
          </div>
        )}
      </div>

      {/* Comp Off Variant Form Overlay */}
      {showVariantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CompOffVariantForm 
            variant={editingVariant}
            onClose={() => setShowVariantForm(false)}
          />
        </div>
      )}

      {/* Employee Assignment Modal */}
      {showEmployeeAssignment && (
        <EmployeeAssignment
          onClose={() => setShowEmployeeAssignment(false)}
          onAssign={handleEmployeeAssignment}
          applicableGenders={[]}
        />
      )}
    </>
  );
}