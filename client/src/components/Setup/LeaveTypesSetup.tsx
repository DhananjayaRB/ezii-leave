import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getIconComponent } from "@/lib/iconUtils";
import LeaveConfigForm from "./LeaveConfigForm";
import CustomLeaveTypeForm from "./CustomLeaveTypeForm";
import LeaveVariantsManagement from "./LeaveVariantsManagement";
import {
  Stethoscope,
  Smile,
  Umbrella,
  Baby,
  Briefcase,
  Heart,
  GraduationCap,
  Church,
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";

interface LeaveTypesSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
  company?: any;
  showNavigation?: boolean; // Add prop to control navigation buttons visibility
}

const defaultLeaveTypes = [
  {
    name: "Sick Leave",
    icon: "stethoscope",
    color: "#f59e0b",
    variants: "1 variants",
    isDefault: true
  },
  {
    name: "Earned Leave",
    icon: "smile",
    color: "#3b82f6",
    variants: "",
    isDefault: true
  },
  {
    name: "Casual Leave",
    icon: "umbrella",
    color: "#10b981",
    variants: "",
    isDefault: true
  },
  {
    name: "Maternity Leave",
    icon: "baby",
    color: "#ec4899",
    variants: "",
    isDefault: true
  },
  {
    name: "Paternity Leave",
    icon: "briefcase",
    color: "#8b5cf6",
    variants: "",
    isDefault: true
  },
  {
    name: "Marriage Leave",
    icon: "heart",
    color: "#ef4444",
    variants: "",
    isDefault: true
  },
  {
    name: "Study Leave",
    icon: "graduation-cap",
    color: "#06b6d4",
    variants: "",
    isDefault: true
  },
  {
    name: "Religious Leave",
    icon: "church",
    color: "#f97316",
    variants: "",
    isDefault: true
  },
  {
    name: "Community Service",
    icon: "users",
    color: "#84cc16",
    variants: "",
    isDefault: true
  },
  {
    name: "Bereavement Leave",
    icon: "user-x",
    color: "#6b7280",
    variants: "",
    isDefault: true
  }
];

export default function LeaveTypesSetup({ onNext, onPrevious, isLast, isLoading, showNavigation = true }: LeaveTypesSetupProps) {
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showCustomLeaveTypeForm, setShowCustomLeaveTypeForm] = useState(false);
  const [showVariantsManagement, setShowVariantsManagement] = useState(false);
  const [variantsLeaveType, setVariantsLeaveType] = useState<any>(null);
  const [expandedLeaveTypes, setExpandedLeaveTypes] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveTypes, isLoading: isLoadingLeaveTypes } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: leaveVariants, isLoading: isLoadingVariants } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  const createLeaveTypesMutation = useMutation({
    mutationFn: async () => {
      const promises = defaultLeaveTypes.map(leaveType =>
        apiRequest("POST", "/api/leave-types", {
          name: leaveType.name,
          icon: leaveType.icon,
          color: leaveType.color,
          annualAllowance: 12,
          carryForward: false,
          isActive: true
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({
        title: "Success",
        description: "All leave types have been created successfully.",
      });
      onNext();
    },
    onError: (error) => {
      console.error("Error creating leave types:", error);
      toast({
        title: "Error",
        description: "Failed to create leave types. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leave-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      toast({
        title: "Success",
        description: "Leave type has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting leave type:", error);
      toast({
        title: "Error",
        description: "Failed to delete leave type. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (showConfigForm && selectedLeaveType) {
    return (
      <LeaveConfigForm
        leaveType={selectedLeaveType}
        variant={selectedVariant}
        onClose={() => {
          setShowConfigForm(false);
          setSelectedLeaveType(null);
          setSelectedVariant(null);
          queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
        }}
      />
    );
  }

  if (showCustomLeaveTypeForm) {
    return (
      <CustomLeaveTypeForm
        onClose={() => {
          setShowCustomLeaveTypeForm(false);
          queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
        }}
      />
    );
  }

  const handleCreateVariant = (leaveType: any) => {
    // Find the actual leave type from database by name
    const actualLeaveType = Array.isArray(leaveTypes) ? leaveTypes.find((lt: any) => lt.name === leaveType.name) : null;
    const leaveTypeWithId = {
      ...leaveType,
      id: actualLeaveType?.id
    };
    setSelectedLeaveType(leaveTypeWithId);
    setShowConfigForm(true);
  };

  const handleNavigateToLeaveType = (leaveType: any) => {
    // Find the actual leave type from database by name
    const actualLeaveType = Array.isArray(leaveTypes) ? leaveTypes.find((lt: any) => lt.name === leaveType.name) : null;
    const leaveTypeWithId = {
      ...leaveType,
      id: actualLeaveType?.id
    };
    setVariantsLeaveType(leaveTypeWithId);
    setShowVariantsManagement(true);
  };

  const toggleExpandLeaveType = (leaveTypeName: string) => {
    setExpandedLeaveTypes(prev => ({
      ...prev,
      [leaveTypeName]: !prev[leaveTypeName]
    }));
  };

  const handleDiscard = (leaveType: any) => {
    if (leaveType.id) {
      deleteLeaveTypeMutation.mutate(leaveType.id);
    } else {
      toast({
        title: "Cannot Discard",
        description: "This leave type hasn't been created yet.",
        variant: "destructive",
      });
    }
  };

  const getVariantsForLeaveType = (leaveTypeName: string) => {
    if (!leaveVariants || !Array.isArray(leaveVariants)) return [];
    return leaveVariants.filter((variant: any) => variant.leaveTypeName === leaveTypeName) || [];
  };

  const handleNext = () => {
    if (leaveTypes && Array.isArray(leaveTypes) && leaveTypes.length > 0) {
      onNext();
    } else {
      createLeaveTypesMutation.mutate();
    }
  };

  const handleConfigureLeaveType = (leaveType: any) => {
    setSelectedLeaveType(leaveType);
    setSelectedVariant(null);
    setShowConfigForm(true);
  };

  const toggleExpanded = (leaveTypeName: string) => {
    setExpandedLeaveTypes(prev => ({
      ...prev,
      [leaveTypeName]: !prev[leaveTypeName]
    }));
  };


  if (showVariantsManagement && variantsLeaveType) {
    return (
      <LeaveVariantsManagement
        leaveType={variantsLeaveType}
        onBack={() => {
          setShowVariantsManagement(false);
          setVariantsLeaveType(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Configure Leave Types</h2>
        <Button
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50"
          onClick={() => setShowCustomLeaveTypeForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Leave
        </Button>
      </div>

      <div className="space-y-3">
        {/* Show all database leave types first */}
        {Array.isArray(leaveTypes) && leaveTypes.map((leaveType: any) => {
          const IconComponent = getIconComponent(leaveType.icon);
          const variants = getVariantsForLeaveType(leaveType.name);
          const isExpanded = expandedLeaveTypes[leaveType.name];
          const hasVariants = variants.length > 0;
          
          return (
            <Card key={leaveType.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${leaveType.color}20` }}
                    >
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: leaveType.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{leaveType.name}</h3>
                      {hasVariants ? (
                        <p className="text-sm text-gray-500">{variants.length} variant{variants.length > 1 ? 's' : ''}</p>
                      ) : (
                        <p className="text-sm text-gray-400">No variants created</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasVariants ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigateToLeaveType(leaveType)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Manage Variants
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDiscard(leaveType)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          disabled={deleteLeaveTypeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCreateVariant(leaveType)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Create Leave
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </>
                    )}
                    
                    {hasVariants && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(leaveType.name)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && hasVariants && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="space-y-2">
                      {variants.map((variant: any) => (
                        <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{variant.leaveVariantName}</h4>
                            <p className="text-sm text-gray-500">
                              {variant.leavesGrantedOn === "compliance" 
                                ? `${variant.complianceGrantDays || 1} day for every ${variant.complianceForEveryDays || 20} days worked`
                                : `${variant.paidDaysInYear} days`
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {/* Show default template leave types that aren't in database yet */}
        {defaultLeaveTypes.filter((defaultType: any) => 
          !Array.isArray(leaveTypes) || !leaveTypes.find((lt: any) => lt.name === defaultType.name)
        ).map((defaultLeaveType: any, index: number) => {
          const leaveType = defaultLeaveType;
          const IconComponent = getIconComponent(leaveType.icon);
          const variants = getVariantsForLeaveType(leaveType.name);
          const isExpanded = expandedLeaveTypes[leaveType.name];
          const hasVariants = variants.length > 0;
          
          return (
            <Card key={leaveType.id || index} className="border border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${leaveType.color}20` }}
                    >
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: leaveType.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{leaveType.name}</h3>
                      {hasVariants ? (
                        <p className="text-sm text-gray-500">{variants.length} variant{variants.length > 1 ? 's' : ''}</p>
                      ) : (
                        <p className="text-sm text-gray-400">No variants created</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasVariants ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigateToLeaveType(leaveType)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 p-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDiscard(leaveType)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          disabled={deleteLeaveTypeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCreateVariant(leaveType)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Create Leave
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && hasVariants && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      {variants.map((variant: any, variantIndex: number) => (
                        <div key={variantIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-800">{variant.leaveVariantName}</h4>
                            <p className="text-sm text-gray-600">
                              {variant.leavesGrantedOn === "compliance" 
                                ? `${variant.complianceGrantDays || 1} day for every ${variant.complianceForEveryDays || 20} days worked`
                                : `${variant.paidDaysInYear} days`
                              }
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVariant(variant);
                                setSelectedLeaveType(leaveType);
                                setShowConfigForm(true);
                              }}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToLeaveType(leaveType)}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showNavigation && (
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={onPrevious}
            disabled={isLoading}
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={isLoading || createLeaveTypesMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createLeaveTypesMutation.isPending ? "Creating..." : isLast ? "Finish Setup" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}