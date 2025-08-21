import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
=======
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchEmployeeData, transformEmployeeData } from "@/lib/externalApi";
import EmployeeAssignment from "@/components/Setup/EmployeeAssignment";

interface BlackoutPeriod {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  reason: string;
  allowLeaves: boolean;
  allowedLeaveTypes: string[];
  assignedEmployees: number[];
  orgId: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlackoutPeriods() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
<<<<<<< HEAD
  const [editingPeriod, setEditingPeriod] = useState<BlackoutPeriod | null>(
    null,
  );
=======
  const [editingPeriod, setEditingPeriod] = useState<BlackoutPeriod | null>(null);
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    endDate: "",
    reason: "",
    allowLeaves: "not-allowed",
    allowedLeaveTypes: [] as string[],
<<<<<<< HEAD
    assignedEmployees: [] as number[],
=======
    assignedEmployees: [] as number[]
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  });

  // The EmployeeAssignment component handles its own employee data fetching
  // We just need a state to track selected employees for display purposes
  const [selectedEmployeeCount, setSelectedEmployeeCount] = useState(0);

  // Fetch real leave types from API
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch blackout periods
<<<<<<< HEAD
  const {
    data: blackoutPeriods = [],
    isLoading,
    error,
  } = useQuery<BlackoutPeriod[]>({
=======
  const { data: blackoutPeriods = [], isLoading, error } = useQuery<BlackoutPeriod[]>({
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    queryKey: ["/api/blackout-periods"],
    staleTime: 5 * 60 * 1000,
  });

  // Debug logging
<<<<<<< HEAD
  console.log("BlackoutPeriods Query State:", {
    isLoading,
    periodsCount: blackoutPeriods.length,
    error: error?.message,
=======
  console.log("BlackoutPeriods Query State:", { 
    isLoading, 
    periodsCount: blackoutPeriods.length,
    error: error?.message 
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  });

  // Create blackout period mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/blackout-periods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
<<<<<<< HEAD
          "X-Org-Id": localStorage.getItem("org_id") || "",
        },
        body: JSON.stringify(data),
      });

=======
          "X-Org-Id": localStorage.getItem('org_id') || "",
        },
        body: JSON.stringify(data),
      });
      
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      if (!response.ok) {
        throw new Error("Failed to create blackout period");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blackout-periods"] });
      toast({
        title: "Success",
        description: "Blackout period created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create blackout period",
        variant: "destructive",
      });
    },
  });

  // Update blackout period mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/blackout-periods/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
<<<<<<< HEAD
          "X-Org-Id": localStorage.getItem("org_id") || "",
        },
        body: JSON.stringify(data),
      });

=======
          "X-Org-Id": localStorage.getItem('org_id') || "",
        },
        body: JSON.stringify(data),
      });
      
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      if (!response.ok) {
        throw new Error("Failed to update blackout period");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blackout-periods"] });
      toast({
        title: "Success",
        description: "Blackout period updated successfully",
      });
      setEditingPeriod(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update blackout period",
        variant: "destructive",
      });
    },
  });

  // Delete blackout period mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/blackout-periods/${id}`, {
        method: "DELETE",
        headers: {
<<<<<<< HEAD
          "X-Org-Id": localStorage.getItem("org_id") || "",
        },
      });

=======
          "X-Org-Id": localStorage.getItem('org_id') || "",
        },
      });
      
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      if (!response.ok) {
        throw new Error("Failed to delete blackout period");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blackout-periods"] });
      toast({
        title: "Success",
        description: "Blackout period deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete blackout period",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      startDate: "",
      endDate: "",
      reason: "",
      allowLeaves: "not-allowed",
      allowedLeaveTypes: [],
<<<<<<< HEAD
      assignedEmployees: [],
=======
      assignedEmployees: []
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      allowLeaves: formData.allowLeaves === "allowed",
    };

    if (editingPeriod) {
      updateMutation.mutate({ id: editingPeriod.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (period: BlackoutPeriod) => {
    setEditingPeriod(period);
    setFormData({
      title: period.title,
      startDate: period.startDate,
      endDate: period.endDate,
      reason: period.reason,
      allowLeaves: period.allowLeaves ? "allowed" : "not-allowed",
      allowedLeaveTypes: period.allowedLeaveTypes || [],
<<<<<<< HEAD
      assignedEmployees: period.assignedEmployees || [],
=======
      assignedEmployees: period.assignedEmployees || []
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
<<<<<<< HEAD
    if (
      window.confirm("Are you sure you want to delete this blackout period?")
    ) {
=======
    if (window.confirm("Are you sure you want to delete this blackout period?")) {
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      deleteMutation.mutate(id);
    }
  };

  const handleLeaveTypeToggle = (leaveTypeId: string, checked: boolean) => {
    if (checked) {
<<<<<<< HEAD
      setFormData((prev) => ({
        ...prev,
        allowedLeaveTypes: [...prev.allowedLeaveTypes, leaveTypeId],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        allowedLeaveTypes: prev.allowedLeaveTypes.filter(
          (id) => id !== leaveTypeId,
        ),
=======
      setFormData(prev => ({
        ...prev,
        allowedLeaveTypes: [...prev.allowedLeaveTypes, leaveTypeId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        allowedLeaveTypes: prev.allowedLeaveTypes.filter(id => id !== leaveTypeId)
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      }));
    }
  };

  const formatDate = (dateString: string) => {
<<<<<<< HEAD
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
=======
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
<<<<<<< HEAD
    return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
=======
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
<<<<<<< HEAD
            <h1 className="text-3xl font-bold text-gray-900">
              Black Out Periods
            </h1>
            <p className="text-gray-600 mt-1">
              Manage periods when employees cannot take leave
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingPeriod(null);
                  resetForm();
                }}
              >
=======
            <h1 className="text-3xl font-bold text-gray-900">Black Out Periods</h1>
            <p className="text-gray-600 mt-1">Manage periods when employees cannot take leave</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPeriod(null);
                resetForm();
              }}>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                <Plus className="w-4 h-4 mr-2" />
                Set Block-out period
              </Button>
            </DialogTrigger>
<<<<<<< HEAD

            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod
                    ? "Edit Block-out period"
                    : "Set Block-out period"}
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Employees will not be advised against taking a leave during a
                  block-out period
                </p>
              </DialogHeader>

=======
            
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? "Edit Block-out period" : "Set Block-out period"}
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Employees will not be advised against taking a leave during a block-out period
                </p>
              </DialogHeader>
              
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
              <div className="space-y-4">
                {/* Block-out title */}
                <div>
                  <Label htmlFor="title">Block-out title</Label>
                  <Input
                    id="title"
                    value={formData.title}
<<<<<<< HEAD
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
=======
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    placeholder="e.g. Sprint 25"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
<<<<<<< HEAD
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
=======
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
<<<<<<< HEAD
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
=======
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    />
                  </div>
                </div>

                {/* Duration Info */}
                {formData.startDate && formData.endDate && (
                  <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
<<<<<<< HEAD
                    Block-out for a stretch of{" "}
                    {calculateDuration(formData.startDate, formData.endDate)}{" "}
                    (10 working, 2 non-working days)
=======
                    Block-out for a stretch of {calculateDuration(formData.startDate, formData.endDate)} (10 working, 2 non-working days)
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                  </div>
                )}

                {/* Reason */}
                <div>
                  <Label htmlFor="reason">Reason For Blackout</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
<<<<<<< HEAD
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
=======
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    placeholder="e.g. Migrate"
                    rows={3}
                  />
                </div>

                {/* Allow leaves toggle */}
                <div>
<<<<<<< HEAD
                  <Label>
                    Do you want to allow leaves during this block-out period
                  </Label>
                  <RadioGroup
                    value={formData.allowLeaves}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, allowLeaves: value }))
                    }
=======
                  <Label>Do you want to allow leaves during this block-out period</Label>
                  <RadioGroup
                    value={formData.allowLeaves}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, allowLeaves: value }))}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="allowed" id="allowed" />
<<<<<<< HEAD
                      <Label htmlFor="allowed" className="text-sm font-normal">
                        Allowed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not-allowed" id="not-allowed" />
                      <Label
                        htmlFor="not-allowed"
                        className="text-sm font-normal"
                      >
                        Not Allowed
                      </Label>
=======
                      <Label htmlFor="allowed" className="text-sm font-normal">Allowed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not-allowed" id="not-allowed" />
                      <Label htmlFor="not-allowed" className="text-sm font-normal">Not Allowed</Label>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                    </div>
                  </RadioGroup>
                </div>

                {/* Leave types exceptions */}
                {formData.allowLeaves === "allowed" && (
                  <div>
                    <Label>Leave types that are allowed as exceptions</Label>
                    <div className="mt-2 space-y-2">
                      {leaveTypes.map((type) => (
<<<<<<< HEAD
                        <div
                          key={type.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={type.id.toString()}
                            checked={formData.allowedLeaveTypes.includes(
                              type.id.toString(),
                            )}
                            onCheckedChange={(checked) =>
                              handleLeaveTypeToggle(
                                type.id.toString(),
                                !!checked,
                              )
                            }
                          />
                          <Label
                            htmlFor={type.id.toString()}
                            className="text-sm font-normal"
                          >
=======
                        <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={type.id.toString()}
                            checked={formData.allowedLeaveTypes.includes(type.id.toString())}
                            onCheckedChange={(checked) => handleLeaveTypeToggle(type.id.toString(), !!checked)}
                          />
                          <Label htmlFor={type.id.toString()} className="text-sm font-normal">
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                            {type.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assign to Employees */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Assign to Employees</Label>
<<<<<<< HEAD
                    <Button
                      variant="outline"
=======
                    <Button 
                      variant="outline" 
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                      size="sm"
                      onClick={() => setShowEmployeeSelection(true)}
                    >
                      Assign Employees
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
<<<<<<< HEAD
                    {formData.assignedEmployees.length > 0
                      ? `${formData.assignedEmployees.length} employee${formData.assignedEmployees.length !== 1 ? "s" : ""} assigned`
                      : "Click to assign employees"}
=======
                    {formData.assignedEmployees.length > 0 
                      ? `${formData.assignedEmployees.length} employee${formData.assignedEmployees.length !== 1 ? 's' : ''} assigned`
                      : "Click to assign employees"
                    }
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingPeriod(null);
                    resetForm();
                  }}
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSubmit}
<<<<<<< HEAD
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingPeriod
                    ? "Update Block-out period"
                    : "Set Block-out period"}
=======
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingPeriod ? "Update Block-out period" : "Set Block-out period"}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                </Button>
              </div>
            </DialogContent>
          </Dialog>

<<<<<<< HEAD
          {/* Employee Selection Dialog - needs to be outside the main form dialog for proper z-index */}
          <Dialog
            open={showEmployeeSelection}
            onOpenChange={setShowEmployeeSelection}
          >
            <DialogContent className="max-w-6xl max-h-[90vh] z-[60] flex flex-col">
              <DialogHeader>
                <DialogTitle>Assign Employees to Blackout Period</DialogTitle>
              </DialogHeader>
              <EmployeeAssignment
                onClose={() => setShowEmployeeSelection(false)}
                onAssign={(selectedEmployees) => {
                  // Map the selected employees to employee IDs
                  const employeeIds = selectedEmployees.map((emp) =>
                    parseInt(emp.user_id || emp.id),
                  );
                  setFormData((prev) => ({
                    ...prev,
                    assignedEmployees: employeeIds,
                  }));
                  setShowEmployeeSelection(false);
                }}
                preSelectedEmployees={formData.assignedEmployees
                  .filter((id) => id != null)
                  .map((id) => ({ user_id: id.toString() }))}
                applicableGenders={[]}
              />
            </DialogContent>
          </Dialog>
=======
        {/* Employee Selection Dialog - needs to be outside the main form dialog for proper z-index */}
        <Dialog open={showEmployeeSelection} onOpenChange={setShowEmployeeSelection}>
          <DialogContent className="max-w-6xl max-h-[90vh] z-[60] flex flex-col">
            <DialogHeader>
              <DialogTitle>Assign Employees to Blackout Period</DialogTitle>
            </DialogHeader>
            <EmployeeAssignment
              onClose={() => setShowEmployeeSelection(false)}
              onAssign={(selectedEmployees) => {
                // Map the selected employees to employee IDs
                const employeeIds = selectedEmployees.map(emp => parseInt(emp.user_id || emp.id));
                setFormData(prev => ({
                  ...prev,
                  assignedEmployees: employeeIds
                }));
                setShowEmployeeSelection(false);
              }}
              preSelectedEmployees={formData.assignedEmployees.filter(id => id != null).map(id => ({ user_id: id.toString() }))}
              applicableGenders={[]}
            />
          </DialogContent>
        </Dialog>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
        </div>

        {/* Blackout Periods List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
<<<<<<< HEAD
                <p className="text-center text-gray-500">
                  Loading blackout periods...
                </p>
=======
                <p className="text-center text-gray-500">Loading blackout periods...</p>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
              </CardContent>
            </Card>
          ) : blackoutPeriods.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
<<<<<<< HEAD
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No blackout periods set
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create your first blackout period to restrict leave
                    applications during specific periods.
=======
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No blackout periods set</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first blackout period to restrict leave applications during specific periods.
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Set Block-out period
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            blackoutPeriods.map((period) => (
              <Card key={period.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{period.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(period.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
<<<<<<< HEAD
                      <p className="text-sm font-medium text-gray-500">
                        Duration
                      </p>
                      <p className="text-sm">
                        {formatDate(period.startDate)} -{" "}
                        {formatDate(period.endDate)}
=======
                      <p className="text-sm font-medium text-gray-500">Duration</p>
                      <p className="text-sm">
                        {formatDate(period.startDate)} - {formatDate(period.endDate)}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                      </p>
                      <p className="text-xs text-gray-500">
                        {calculateDuration(period.startDate, period.endDate)}
                      </p>
                    </div>
<<<<<<< HEAD

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Leave Policy
                      </p>
                      <p className="text-sm">
                        {period.allowLeaves ? (
                          <span className="text-green-600">
                            Allowed with exceptions
                          </span>
=======
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Leave Policy</p>
                      <p className="text-sm">
                        {period.allowLeaves ? (
                          <span className="text-green-600">Allowed with exceptions</span>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                        ) : (
                          <span className="text-red-600">Not allowed</span>
                        )}
                      </p>
<<<<<<< HEAD
                      {period.allowLeaves &&
                        period.allowedLeaveTypes &&
                        period.allowedLeaveTypes.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {period.allowedLeaveTypes.length} exception
                            {period.allowedLeaveTypes.length !== 1 ? "s" : ""}
                          </p>
                        )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Assigned Employees
                      </p>
                      <p className="text-sm">
                        {period.assignedEmployees &&
                        period.assignedEmployees.length > 0
                          ? `${period.assignedEmployees.length} employee${period.assignedEmployees.length !== 1 ? "s" : ""}`
                          : "Not assigned"}
                      </p>
                    </div>
                  </div>

                  {period.reason && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-500">
                        Reason
                      </p>
=======
                      {period.allowLeaves && period.allowedLeaveTypes && period.allowedLeaveTypes.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {period.allowedLeaveTypes.length} exception{period.allowedLeaveTypes.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assigned Employees</p>
                      <p className="text-sm">
                        {period.assignedEmployees && period.assignedEmployees.length > 0 
                          ? `${period.assignedEmployees.length} employee${period.assignedEmployees.length !== 1 ? 's' : ''}`
                          : "Not assigned"
                        }
                      </p>
                    </div>
                  </div>
                  
                  {period.reason && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-500">Reason</p>
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
                      <p className="text-sm text-gray-700">{period.reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
