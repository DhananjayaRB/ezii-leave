import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import EffectiveDateSetup from "./EffectiveDateSetup";
import LeaveTypesSetup from "./LeaveTypesSetup";
import RolesSetup from "./RolesSetup";
import WorkflowsSetup from "./WorkflowsSetup";
import CompOffSetup from "./CompOffSetup";
import PTOSetup from "./PTOSetup";
import ImportLeaveDataSetup from "./ImportLeaveDataSetup";

interface SetupWizardProps {
  company?: any;
}

export default function SetupWizard({ company }: SetupWizardProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(() => {
    // For new organizations (no company data), always start from step 0
    if (!company) {
      localStorage.removeItem('setupWizardStep');
      return 0;
    }
    
    const saved = localStorage.getItem('setupWizardStep');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [setupCompleted, setSetupCompleted] = useState(false);

  // Clear setup step for new organizations
  useEffect(() => {
    if (!company) {
      localStorage.removeItem('setupWizardStep');
      setCurrentStep(0);
    }
  }, [company]);

  // Persist step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('setupWizardStep', currentStep.toString());
  }, [currentStep]);

  const steps = [
    { name: "Effective Date", component: EffectiveDateSetup },
    { name: "Leave Types", component: LeaveTypesSetup },
    { name: "Comp off", component: CompOffSetup },
    { name: "BTO", component: PTOSetup },
    { name: "Import Leave Data", component: ImportLeaveDataSetup },
    { name: "Roles", component: RolesSetup },
    { name: "Workflow", component: WorkflowsSetup },
  ];

  const startSetup = () => {
    console.log("Start setup clicked, setting currentStep to 1");
    console.log("Current step before:", currentStep);
    setCurrentStep(1);
    console.log("Current step after setState call:", currentStep);
  };

  const nextStep = () => {
    console.log("nextStep called, currentStep:", currentStep, "steps.length:", steps.length);
    const newStep = currentStep + 1;
    console.log("Setting currentStep to:", newStep);
    
    if (newStep <= steps.length) {
      setCurrentStep(newStep);
    } else {
      setSetupCompleted(true);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = useMutation({
    mutationFn: async () => {
      // Get company from cache since it's already queried in Home component
      const company = queryClient.getQueryData(["/api/company"]);
      const orgId = localStorage.getItem('org_id');
      
      if (company && (company as any).id) {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        // Add org_id header for multi-tenancy
        if (orgId) {
          headers["X-Org-Id"] = orgId;
        }
        
        const response = await fetch(`/api/company/${(company as any).id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ setupStatus: "completed" }),
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to complete setup");
        return response.json();
      }
      throw new Error("No company found");
    },
    onSuccess: (data) => {
      console.log("Setup completion successful:", data);
      // Clear the setup wizard step from localStorage
      localStorage.removeItem('setupWizardStep');
      // Invalidate and refetch company data
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      // Navigate to admin overview instead of reloading
      setTimeout(() => {
        console.log("Navigating to admin overview");
        setLocation("/overview");
      }, 100);
    },
    onError: (error) => {
      console.error("Setup completion failed:", error);
    },
  });



  // Setup completed
  if (setupCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Setup Complete!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your leave management system is now ready to use. You can start managing 
            leave requests and configure additional settings as needed.
          </p>
          <Button onClick={() => window.location.href = "/"} className="bg-primary hover:bg-primary/90">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1]?.component;
  
  console.log("SetupWizard render - currentStep:", currentStep);
  console.log("CurrentStepComponent:", CurrentStepComponent);
  console.log("steps array:", steps);

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <div className="flex items-center mb-8">
            <img 
              src="/eziileave-logo.png" 
              alt="EziiLeave" 
              className="h-6 w-auto"
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-white mb-4">
              <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                <span className="text-gray-900 font-bold text-xs">□</span>
              </div>
              <span className="font-medium text-sm">Setup</span>
            </div>
            <div className="text-xs text-gray-400 ml-7">Leave</div>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                  currentStep === index + 1 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                  currentStep === index + 1 
                    ? 'border-white bg-white text-gray-900' 
                    : currentStep > index + 1 
                      ? 'border-green-400 bg-green-400 text-white'
                      : 'border-gray-500 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Leave Management</h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {currentStep === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">This module has not been enabled for this organisation</h2>
                  <Button 
                    onClick={startSetup}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    Enable Module →
                  </Button>
                </div>
              </div>
            ) : CurrentStepComponent ? (
              <CurrentStepComponent 
                onNext={nextStep}
                onPrevious={previousStep}
                onComplete={currentStep === steps.length ? () => completeSetup.mutate() : undefined}
                isLast={currentStep === steps.length}
                isLoading={completeSetup.isPending}
                company={company}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
