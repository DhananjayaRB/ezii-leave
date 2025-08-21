import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PTOVariantForm from "./PTOVariantForm";

interface PTOSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
  showNavigation?: boolean; // Add prop to control navigation buttons visibility
}

export default function PTOSetup({ onNext, onPrevious, isLast, isLoading, showNavigation = true }: PTOSetupProps) {
  const { toast } = useToast();
  const [ptoEnabled, setPtoEnabled] = useState(true);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const { data: config } = useQuery({
    queryKey: ["/api/pto-config"],
  });

  // Query for PTO variants using dedicated API
  const { data: ptoVariants = [] } = useQuery({
    queryKey: ["/api/pto-variants"],
  });

  // Set initial state from config
  useEffect(() => {
    if (config && typeof config === 'object' && 'enabled' in config) {
      setPtoEnabled(config.enabled !== false);
    }
  }, [config]);

  const togglePTOMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("POST", "/api/pto-config", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-config"] });
      toast({
        title: "Success",
        description: ptoEnabled ? "BTO enabled successfully." : "BTO disabled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update BTO configuration.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting PTO variants
  const deleteMutation = useMutation({
    mutationFn: async (variantId: number) => {
      return await apiRequest("DELETE", `/api/pto-variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      toast({
        title: "Success",
        description: "BTO variant deleted successfully.",
      });
    },
  });

  const handleToggleChange = (checked: boolean) => {
    setPtoEnabled(checked);
    togglePTOMutation.mutate(checked);
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setShowVariantForm(true);
  };

  const handleEditVariant = (variant: any) => {
    setEditingVariant(variant);
    setShowVariantForm(true);
  };

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
        {/* Header with BTO toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">BTO (Break Time Off)</h2>
            <Switch
              checked={ptoEnabled}
              onCheckedChange={handleToggleChange}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>

        {/* Variants Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Variants</h3>
          
          {/* Display real BTO variants */}
          {Array.isArray(ptoVariants) && ptoVariants.map((variant: any) => (
            <Card key={variant.id} className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{variant.name}</h4>
                    <p className="text-sm text-gray-500">BTO Variant</p>
                  </div>
                  <div className="flex items-center gap-2">
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
          {(!Array.isArray(ptoVariants) || ptoVariants.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No BTO variants created yet.</p>
              <p className="text-sm">Click "Create BTO variant" to get started.</p>
            </div>
          )}

          {/* Create BTO variant button */}
          <Button
            variant="outline"
            onClick={handleCreateVariant}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create BTO variant
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

      {/* BTO Variant Form Overlay */}
      {showVariantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PTOVariantForm
            variant={editingVariant}
            onClose={() => setShowVariantForm(false)}
          />
        </div>
      )}
    </>
  );
}