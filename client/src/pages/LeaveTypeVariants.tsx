import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus,
  Heart, 
  Smile, 
  Umbrella, 
  Baby, 
  Users, 
  User, 
  Calendar, 
  Stethoscope
} from "lucide-react";
import LeaveConfigForm from "@/components/Setup/LeaveConfigForm";
import Layout from "@/components/Layout";

// Icon mapping function
const getIcon = (iconName: string) => {
  const icons = {
    heart: Heart,
    smile: Smile,
    umbrella: Umbrella,
    baby: Baby,
    users: Users,
    user: User,
    calendar: Calendar,
    stethoscope: Stethoscope
  };
  const IconComponent = icons[iconName as keyof typeof icons] || Calendar;
  return IconComponent;
};

// Setup Layout Wrapper Component
const SetupLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const steps = [
    { id: 1, name: "Effective Date", status: "completed" },
    { id: 2, name: "Leave Types", status: "current" },
    { id: 3, name: "Comp off", status: "upcoming" },
    { id: 4, name: "BTO", status: "upcoming" },
    { id: 5, name: "Import Leave Data", status: "upcoming" },
    { id: 6, name: "Roles", status: "upcoming" },
    { id: 7, name: "Workflow", status: "upcoming" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Setup Sidebar */}
      <div className="w-80 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">EziiLeave</span>
          </div>
        </div>

        {/* Setup Progress */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Setup</h2>
            <p className="text-sm text-gray-600">Configure your leave management system</p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.status === "completed" 
                    ? "bg-green-100 text-green-600" 
                    : step.status === "current"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {step.status === "completed" ? "✓" : step.id}
                </div>
                <span className={`text-sm font-medium ${
                  step.status === "current" ? "text-gray-900" : "text-gray-500"
                }`}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default function LeaveTypeVariants() {
  const [, params] = useRoute("/leave-types/:leaveTypeName");
  const [location] = useLocation();
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const { toast } = useToast();

  const leaveTypeName = params?.leaveTypeName || "";
  const decodedLeaveTypeName = decodeURIComponent(leaveTypeName);

  // Check if we're in setup mode
  const isSetupMode = location.includes('?setup=true');

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const leaveType = (leaveTypes as any[]).find((type: any) => type.name === decodedLeaveTypeName);
  const typeVariants = (variants as any[]).filter((variant: any) => variant.leaveTypeName === decodedLeaveTypeName);

  const deleteMutation = useMutation({
    mutationFn: async (variantId: number) => {
      return await apiRequest("DELETE", `/api/leave-variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      toast({
        title: "Success",
        description: "Variant deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Delete variant error:", error);
      toast({
        title: "Error",
        description: "Failed to delete variant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateVariant = () => {
    setSelectedVariant(null);
    setShowConfigForm(true);
  };

  const handleEditVariant = (variant: any) => {
    setSelectedVariant(variant);
    setShowConfigForm(true);
  };

  const handleDeleteVariant = (variantId: number) => {
    if (confirm("Are you sure you want to delete this variant?")) {
      deleteMutation.mutate(variantId);
    }
  };

  // Loading and error states with conditional layout
  const LoadingComponent = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading...</div>
    </div>
  );

  const ErrorComponent = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg text-red-600">Leave type not found</div>
    </div>
  );

  if (isLoading) {
    return isSetupMode ? (
      <SetupLayoutWrapper>
        <LoadingComponent />
      </SetupLayoutWrapper>
    ) : (
      <Layout>
        <LoadingComponent />
      </Layout>
    );
  }

  if (!leaveType) {
    return isSetupMode ? (
      <SetupLayoutWrapper>
        <ErrorComponent />
      </SetupLayoutWrapper>
    ) : (
      <Layout>
        <ErrorComponent />
      </Layout>
    );
  }

  // Main content component that can be used in both layouts
  const MainContent = () => (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${leaveType.color}20` }}
            >
              {(() => {
                const IconComponent = getIcon(leaveType.icon);
                return <IconComponent className="w-6 h-6" style={{ color: leaveType.color }} />;
              })()}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {decodedLeaveTypeName}
            </h1>
          </div>
        </div>
        {isSetupMode && (
          <div className="flex space-x-2">
            <Button variant="outline">Previous</Button>
            <Button>Next</Button>
          </div>
        )}
      </div>

      {/* Variants Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Variants</h2>

        {typeVariants.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              No variants created for this leave type
            </div>
            <Button
              onClick={handleCreateVariant}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Leave Variant
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {typeVariants.map((variant: any) => (
              <Card key={variant.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {variant.leaveVariantName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {variant.paidDaysInYear} days · Applied to {variant.applicableGenders?.join(", ") || "All"} Employees
                      </p>
                      {variant.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {variant.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteVariant(variant.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditVariant(variant)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create Another Variant Button */}
            <Button
              variant="outline"
              onClick={handleCreateVariant}
              className="w-full border-dashed border-2 h-16 text-green-600 border-green-300 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Leave Variant
            </Button>
          </div>
        )}
      </div>

      {/* Config Form Modal */}
      {showConfigForm && (
        <LeaveConfigForm
          variant={selectedVariant}
          leaveType={leaveType}
          onClose={() => {
            setShowConfigForm(false);
            setSelectedVariant(null);
          }}
        />
      )}
    </div>
  );

  // Return with conditional layout
  return isSetupMode ? (
    <SetupLayoutWrapper>
      <MainContent />
    </SetupLayoutWrapper>
  ) : (
    <Layout>
      <MainContent />
    </Layout>
  );
}