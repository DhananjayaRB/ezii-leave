import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Calendar, FileText, Users, TrendingUp, CheckCircle } from "lucide-react";
import BTOApplicationForm from "@/components/PTO/PTOApplicationForm";

export default function Landing() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [showBTOForm, setShowBTOForm] = useState(false);

  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem('user_id') || '225';

  // Fetch user's data for quick actions
  const { data: ptoRequests = [] } = useQuery({
    queryKey: ['/api/pto-requests', currentUserId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/pto-requests?userId=${currentUserId}`, {
          credentials: 'include',
          headers: {
            'X-Org-Id': localStorage.getItem('org_id') || '60'
          }
        });
        return response.ok ? response.json() : [];
      } catch (error) {
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  // Fetch available BTO variants for quick check
  const { data: ptoVariants = [] } = useQuery({
    queryKey: ['/api/pto-variants/available'],
    queryFn: async () => {
      try {
        const variants = await fetch('/api/pto-variants', {
          credentials: 'include',
          headers: {
            'X-Org-Id': localStorage.getItem('org_id') || '60'
          }
        }).then(res => res.json());

        // Check which variants user has access to
        const userVariants = [];
        for (const variant of variants) {
          try {
            const assignmentsResponse = await fetch(`/api/employee-assignments/pto/${variant.id}`, {
              credentials: 'include',
              headers: {
                'X-Org-Id': localStorage.getItem('org_id') || '60'
              }
            });
            if (assignmentsResponse.ok) {
              const assignments = await assignmentsResponse.json();
              const isAssigned = assignments.some((assignment: any) => 
                assignment.userId === currentUserId || assignment.userId === currentUserId.toString()
              );
              if (isAssigned) {
                userVariants.push(variant);
              }
            }
          } catch (error) {
            console.error(`Error checking assignments for variant ${variant.id}:`, error);
          }
        }
        return userVariants;
      } catch (error) {
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ez</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">eziileave</h1>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-gray-600 text-center">
                Loading your workspace...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ez</span>
              </div>
              <span className="font-semibold text-lg text-gray-900">eziileave</span>
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to eziileave</h1>
              <p className="text-gray-600">
                Your comprehensive leave management solution
              </p>
            </div>

            <div className="w-full space-y-4">
              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Sign In with Replit
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Streamline your leave management process with automated workflows, 
                real-time approvals, and comprehensive reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
