import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { 
  leaveRequests,
  collaborativeLeaveSettingsEnhanced,
  leaveTaskAssigneesEnhanced,
  leaveClosureReportsEnhanced
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

// Helper function to handle comp-off to leave transfer
async function handleCompOffTransfer(compOffRequest: any, orgId: number) {
  try {
    console.log(`Processing comp-off transfer: ${compOffRequest.transferAmount} days to leave type ${compOffRequest.leaveTypeId}`);
    
    // Get current leave balance for the user and leave type
    const existingBalance = await storage.getEmployeeLeaveBalances(compOffRequest.userId, new Date().getFullYear(), orgId);
    const leaveTypeBalance = existingBalance.find(b => b.leaveVariantId.toString() === compOffRequest.leaveTypeId);
    
    if (leaveTypeBalance) {
      // Update existing balance by adding transferred days (convert to half-day units)
      const transferHalfDays = compOffRequest.transferAmount * 2;
      await storage.updateEmployeeLeaveBalance(leaveTypeBalance.id, {
        currentBalance: leaveTypeBalance.currentBalance + transferHalfDays,
        updatedAt: new Date()
      });
    } else {
      // Create new balance entry if none exists
      const transferHalfDays = compOffRequest.transferAmount * 2;
      await storage.createEmployeeLeaveBalance({
        userId: compOffRequest.userId,
        leaveVariantId: parseInt(compOffRequest.leaveTypeId),
        year: new Date().getFullYear(),
        currentBalance: transferHalfDays,
        openingBalance: 0,
        earnedThisYear: 0,
        availedThisYear: 0,
        encashedThisYear: 0,
        lapsedThisYear: 0,
        carryForwardFromPrevious: 0,
        orgId
      });
    }

    // Create transaction record for audit trail
    await storage.createLeaveBalanceTransaction({
      userId: compOffRequest.userId,
      leaveVariantId: parseInt(compOffRequest.leaveTypeId),
      transactionType: 'credit',
      amount: compOffRequest.transferAmount * 2, // Convert to half-day units
      description: `Comp-off transfer: ${compOffRequest.transferAmount} days`,
      transactionDate: new Date(),
      orgId
    });

    console.log(`Successfully transferred ${compOffRequest.transferAmount} days from comp-off to leave balance`);
  } catch (error) {
    console.error('Error processing comp-off transfer:', error);
  }
}
import multer from "multer";
import * as XLSX from "xlsx";
import { 
  insertCompanySchema,
  insertLeaveTypeSchema,
  insertRoleSchema,
  insertWorkflowSchema,
  insertCompOffConfigSchema,
  insertPTOConfigSchema,
  insertLeaveRequestSchema,
  insertCompOffRequestSchema,
  insertPTORequestSchema,
  insertCompOffVariantSchema,
  insertPTOVariantSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes with first-login balance calculation
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // In development mode, return mock user data
      if (process.env.NODE_ENV === 'development') {
        const mockUser = {
          id: '12080',
          email: 'rahul.sharma@company.com',
          firstName: 'Rahul',
          lastName: 'Sharma',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return res.json(mockUser);
      }

      const userId = req.user.claims.sub;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const user = await storage.getUser(userId);
      
      // First-login balance calculation trigger
      await calculateBalancesOnFirstLogin(userId, orgId, req);
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // First-login balance calculation function
  async function calculateBalancesOnFirstLogin(userId: string, orgId: number, req: any) {
    try {
      const currentYear = new Date().getFullYear();
      const existingBalances = await storage.getEmployeeLeaveBalances(userId, currentYear, orgId);
      const assignments = await storage.getEmployeeAssignments(orgId);
      const userAssignments = assignments.filter((a: any) => a.userId === userId && a.assignmentType === 'leave_variant');
      
      // Only calculate if user has assignments but no balances (first login scenario)
      if (userAssignments.length > 0 && existingBalances.length === 0) {
        console.log(`[FirstLogin] Auto-calculating balances for user ${userId}`);
        
        // Get employee data for accurate pro-rata calculation
        let employeeData = null;
        try {
          const jwtToken = req.headers.authorization?.replace('Bearer ', '') || 
                         req.headers['x-jwt-token'] || 
                         req.query.token;
                         
          if (jwtToken) {
            const response = await fetch('https://qa-api.resolveindia.com/worker-master-leave', {
              headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            
            if (response.ok) {
              const data = await response.json();
              employeeData = data.data?.find((emp: any) => emp.user_id?.toString() === userId?.toString());
              console.log(`[FirstLogin] Found employee data for ${userId}: joining date ${employeeData?.date_of_joining}`);
            }
          }
        } catch (apiError) {
          console.log('[FirstLogin] External API not available, using full allocation');
        }

        const leaveVariants = await storage.getLeaveVariants(orgId);
        
        for (const assignment of userAssignments) {
          const variant = leaveVariants.find(v => v.id === assignment.leaveVariantId);
          if (!variant || !variant.paidDaysInYear) continue;

          let calculatedBalance = 0;
          const entitlement = variant.paidDaysInYear * 2; // Convert to half-days

          if (employeeData?.date_of_joining && variant.grantLeaves === 'after_earning') {
            // Pro-rata calculation for "after earning" policies
            const joiningDate = new Date(employeeData.date_of_joining);
            const currentDate = new Date();
            
            // Calculate months worked from joining date
            const monthsDiff = (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 + 
                              (currentDate.getMonth() - joiningDate.getMonth());
            const monthsWorked = Math.max(0, monthsDiff);
            
            const monthlyAllocation = entitlement / 12;
            calculatedBalance = Math.floor(monthsWorked * monthlyAllocation);
            
            console.log(`[FirstLogin] Pro-rata calculation: ${monthsWorked} months worked = ${calculatedBalance/2} days`);
          } else {
            // Full entitlement for "in advance" or when no joining date
            calculatedBalance = entitlement;
            console.log(`[FirstLogin] Full allocation: ${calculatedBalance/2} days`);
          }

          // Create balance record
          await storage.createEmployeeLeaveBalance({
            userId,
            leaveVariantId: variant.id,
            year: currentYear,
            totalEntitlement: entitlement,
            currentBalance: calculatedBalance,
            usedBalance: 0,
            carryForward: 0,
            orgId
          });

          // Create transaction record
          await storage.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: variant.id,
            year: currentYear,
            transactionType: 'credit',
            amount: calculatedBalance,
            balanceAfter: calculatedBalance,
            description: `First login auto-calculation for ${variant.leaveTypeName} (${calculatedBalance/2} days)`,
            orgId
          });

          console.log(`[FirstLogin] Created ${variant.leaveTypeName} balance: ${calculatedBalance/2} days`);
        }
      }
    } catch (balanceError) {
      console.error('[FirstLogin] Error in balance calculation:', balanceError);
      // Don't fail the login if balance calculation fails
    }
  }

  // Users routes for admin
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers['x-org-id'] as string;
      const orgId = parseInt(orgIdHeader) || 60;
      console.log(`[Server] Received X-Org-Id header: "${orgIdHeader}" -> parsed as: ${orgId}`);
      
      // For org_id 60, return the existing employee data
      if (orgId === 60) {
        const employees = [
          { id: '7246', firstName: 'Anjali', lastName: 'Kumari', email: 'anjali.kumari@company.com' },
          { id: '12080', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@company.com' },
          { id: '43038987', firstName: 'Admin', lastName: 'User', email: 'admin@company.com' }
        ];
        res.json(employees);
      } else {
        // For other org_ids, return empty array to ensure data isolation
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Company routes
  app.get('/api/company', isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers['x-org-id'] as string;
      const orgId = parseInt(orgIdHeader) || 60;
      console.log(`[Server] /api/company received X-Org-Id header: "${orgIdHeader}" -> parsed as: ${orgId}`);
      const company = await storage.getCompany(orgId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/company', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertCompanySchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });

  app.patch('/api/company/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertCompanySchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const company = await storage.updateCompany(id, validatedData);
      
      // If setup is being completed, create default roles
      if (validatedData.setupStatus === "completed") {
        console.log(`[Company Update] Setup completed for org_id: ${orgId}, creating default roles`);
        try {
          await storage.createDefaultRoles(parseInt(orgId as string));
          console.log(`[Company Update] Default roles created successfully for org_id: ${orgId}`);
        } catch (roleError) {
          console.error(`[Company Update] Error creating default roles for org_id: ${orgId}:`, roleError);
          // Don't fail the company update if role creation fails
        }
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ message: "Failed to update company" });
    }
  });

  // Leave types routes
  app.get('/api/leave-types', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const leaveTypes = await storage.getLeaveTypes(parseInt(orgId as string));
      res.json(leaveTypes);
    } catch (error) {
      console.error("Error fetching leave types:", error);
      res.status(500).json({ message: "Failed to fetch leave types" });
    }
  });

  app.post('/api/leave-types', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60'; // Default to 60
      const parsedOrgId = parseInt(orgId as string);
      
      // Check for duplicate leave type names
      const existingLeaveTypes = await storage.getLeaveTypes(parsedOrgId);
      const requestedName = req.body.name?.trim();
      
      if (requestedName && existingLeaveTypes.some(lt => lt.name.toLowerCase() === requestedName.toLowerCase())) {
        return res.status(400).json({ 
          message: `A leave type with the name "${requestedName}" already exists. Please choose a different name.` 
        });
      }
      
      const validatedData = insertLeaveTypeSchema.parse({ ...req.body, orgId: parsedOrgId });
      const leaveType = await storage.createLeaveType(validatedData);
      res.json(leaveType);
    } catch (error) {
      console.error("Error creating leave type:", error);
      res.status(400).json({ message: "Failed to create leave type" });
    }
  });

  app.patch('/api/leave-types/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertLeaveTypeSchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const leaveType = await storage.updateLeaveType(id, validatedData);
      res.json(leaveType);
    } catch (error) {
      console.error("Error updating leave type:", error);
      res.status(400).json({ message: "Failed to update leave type" });
    }
  });

  app.delete('/api/leave-types/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLeaveType(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting leave type:", error);
      res.status(500).json({ message: "Failed to delete leave type" });
    }
  });

  // Roles routes
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const roles = await storage.getRoles(orgId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertRoleSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      const role = await storage.createRole(validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(400).json({ message: "Failed to create role" });
    }
  });

  app.patch('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertRoleSchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const role = await storage.updateRole(id, validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(400).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRole(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(400).json({ message: "Failed to delete role" });
    }
  });

  // User role assignment routes
  app.get("/api/users/:userId/roles", isAuthenticated, async (req, res) => {
    try {
      const userRoles = await storage.getUserRoles(req.params.userId);
      res.json(userRoles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  app.post("/api/users/:userId/roles", isAuthenticated, async (req, res) => {
    try {
      const { roleId } = req.body;
      const userRole = await storage.assignUserRole(req.params.userId, roleId);
      res.json(userRole);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ message: "Failed to assign user role" });
    }
  });

  app.delete("/api/users/:userId/roles/:roleId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const roleId = parseInt(req.params.roleId);
      await storage.removeUserRole(userId, roleId);
      res.json({ message: "User role removed successfully" });
    } catch (error) {
      console.error("Error removing user role:", error);
      res.status(500).json({ message: "Failed to remove user role" });
    }
  });

  // User permissions route
  app.get("/api/users/:userId/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.params.userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Employee assignment routes
  app.get("/api/employee-assignments/:variantId", isAuthenticated, async (req, res) => {
    try {
      const leaveVariantId = parseInt(req.params.variantId);
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const assignments = await storage.getEmployeeAssignments(orgId, leaveVariantId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching employee assignments:", error);
      res.status(500).json({ message: "Failed to fetch employee assignments" });
    }
  });

  // Get PTO variant assignments
  app.get("/api/employee-assignments/pto/:variantId", isAuthenticated, async (req, res) => {
    try {
      const ptoVariantId = parseInt(req.params.variantId);
      const assignments = await storage.getPTOEmployeeAssignments(ptoVariantId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching PTO employee assignments:", error);
      res.status(500).json({ message: "Failed to fetch PTO employee assignments" });
    }
  });

  // Get comp-off variant assignments
  app.get("/api/employee-assignments/comp-off-variant/:variantId", isAuthenticated, async (req, res) => {
    try {
      const variantId = parseInt(req.params.variantId);
      const assignments = await storage.getCompOffEmployeeAssignments(variantId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching comp-off employee assignments:", error);
      res.status(500).json({ message: "Failed to fetch comp-off employee assignments" });
    }
  });

  app.get("/api/employee-assignments", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const assignments = await storage.getEmployeeAssignments(parseInt(orgId as string));
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching employee assignments:", error);
      res.status(500).json({ message: "Failed to fetch employee assignments" });
    }
  });

  app.post("/api/employee-assignments/bulk", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      let assignments;
      
      // Handle both request formats
      if (req.body.assignments) {
        // New format: { assignments: [...] }
        assignments = req.body.assignments.map((assignment: any) => ({
          ...assignment,
          orgId
        }));
      } else {
        // Legacy format: { leaveVariantId, assignmentType, userIds }
        const { leaveVariantId, assignmentType, userIds } = req.body;
        assignments = userIds.map((userId: string) => ({
          userId,
          leaveVariantId,
          assignmentType,
          orgId
        }));
      }
      
      // Filter out assignments with null or undefined userId
      const validAssignments = assignments.filter((assignment: any) => assignment.userId && assignment.userId !== null);
      console.log(`Filtered ${assignments.length - validAssignments.length} assignments with null userId`);
      console.log("Valid assignments to create:", validAssignments);
      
      if (validAssignments.length === 0) {
        console.log("No valid assignments to create - all had null userId");
        return res.json([]);
      }
      
      // Delete existing assignments for this variant
      if (validAssignments.length > 0) {
        await storage.deleteEmployeeAssignments(validAssignments[0].leaveVariantId, validAssignments[0].assignmentType);
      }
      
      const created = await storage.bulkCreateEmployeeAssignments(validAssignments);
      res.json(created);
    } catch (error) {
      console.error("Error creating employee assignments:", error);
      res.status(500).json({ message: "Failed to create employee assignments" });
    }
  });

  // Get all employee leave balances for HR reports (must come before the parameterized route)
  app.get("/api/employee-leave-balances/all", isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers['x-org-id'] as string;
      const orgId = parseInt(orgIdHeader) || 60;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      console.log(`[API Route] /api/employee-leave-balances/all called with orgId: ${orgId}, year: ${year}`);
      
      // Trigger bulk sync for all employees with pending requests to ensure accurate AVAILED calculations
      console.log(`🔄 [API Route] Triggering bulk sync for pending deductions before HR report`);
      await storage.bulkSyncPendingDeductionsForOrg(orgId);
      console.log(`✅ [API Route] Bulk sync completed, now fetching balances`);
      
      const balances = await storage.getAllEmployeeLeaveBalances(year, orgId);
      
      console.log(`[API Route] getAllEmployeeLeaveBalances returned ${balances.length} records`);
      
      res.json(balances);
    } catch (error) {
      console.error("Error fetching all employee leave balances:", error);
      res.status(500).json({ message: "Failed to fetch all employee leave balances" });
    }
  });

  // Employee leave balance routes
  app.get("/api/employee-leave-balances/:userId", isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers['x-org-id'] as string;
      const orgId = parseInt(orgIdHeader) || 60;
      
      const userId = req.params.userId;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      console.log(`📊 [API] Getting balances for user ${userId}`);
      
      const balances = await storage.getEmployeeLeaveBalances(userId, year, orgId);
      
      console.log(`📊 [API] Returning ${balances.length} balances for user ${userId}`);
      if (balances.length > 0) {
        console.log(`📊 [API] Sample balance: userId=${balances[0].userId}, currentBalance=${balances[0].currentBalance}`);
      }
      
      res.json(balances);
    } catch (error) {
      console.error("Error fetching employee leave balances:", error);
      res.status(500).json({ message: "Failed to fetch employee leave balances" });
    }
  });

  // Get all leave balance transactions for HR reports (must come before the parameterized route)
  app.get("/api/leave-balance-transactions/all", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      console.log(`[API Route] /api/leave-balance-transactions/all called with orgId: ${orgId}`);
      
      const transactions = await storage.getAllLeaveBalanceTransactions(null, orgId);
      
      console.log(`[API Route] getAllLeaveBalanceTransactions returned ${transactions.length} records`);
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching all leave balance transactions:", error);
      res.status(500).json({ message: "Failed to fetch all leave balance transactions" });
    }
  });

  // Get leave balance transactions for a user
  app.get("/api/leave-balance-transactions/:userId", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const userId = req.params.userId;
      
      const transactions = await storage.getAllLeaveBalanceTransactions(userId, orgId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching leave balance transactions:", error);
      res.status(500).json({ message: "Failed to fetch leave balance transactions" });
    }
  });

  // Compute initial leave balances (finish setup)
  app.post("/api/compute-leave-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      console.log("Starting leave balance computation for org_id:", orgId);
      await storage.computeInitialLeaveBalances(orgId);
      res.json({ message: "Leave balances computed successfully" });
    } catch (error) {
      console.error("Error computing leave balances:", error);
      res.status(500).json({ message: "Failed to compute leave balances" });
    }
  });

  // Recalculate pro-rata balances with external employee data
  app.post("/api/recalculate-prorata-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { externalEmployeeData } = req.body;
      
      console.log(`[ProRata API] Starting automatic pro-rata system for org_id: ${orgId}`);
      console.log(`[ProRata API] External employee data:`, externalEmployeeData?.length || 0, 'employees');
      console.log(`[ProRata API] External employee data payload:`, externalEmployeeData);
      
      // **AUTOMATIC SYSTEM**: Create assignments and run pro-rata calculations for mid-year joiners
      console.log(`[ProRata API] About to call autoProRataCalculationForMidYearJoiners...`);
      const result = await storage.autoProRataCalculationForMidYearJoiners(orgId, externalEmployeeData);
      console.log(`[ProRata API] autoProRataCalculationForMidYearJoiners returned:`, result);
      
      console.log(`[ProRata API] Automatic pro-rata system completed successfully`);
      
      res.json({ 
        message: "Automatic pro-rata calculations completed for mid-year joiners",
        processedEmployees: result.processedEmployees || 0,
        createdAssignments: result.createdAssignments || 0,
        result: result
      });
    } catch (error) {
      console.error("[ProRata API] Error in automatic pro-rata system:", error);
      console.error("[ProRata API] Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to run automatic pro-rata calculations", 
        error: error.message,
        stack: error.stack 
      });
    }
  });

  // Fix missing leave balances for users with approved requests but no balances
  app.post("/api/fix-missing-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      console.log(`[FixBalances] Starting balance fix for org ${orgId}`);
      
      const leaveRequests = await storage.getLeaveRequests(orgId);
      const leaveVariants = await storage.getLeaveVariants(orgId);
      const assignments = await storage.getEmployeeAssignments(orgId);
      
      let fixedUsers = 0;
      
      // Find approved requests where user has no balance
      const approvedRequests = leaveRequests.filter((req: any) => req.status === 'approved');
      
      for (const request of approvedRequests) {
        const existingBalances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
        
        if (existingBalances.length === 0) {
          console.log(`[FixBalances] User ${request.userId} has approved request but no balances - creating...`);
          
          // Get user's assignments
          const userAssignments = assignments.filter((a: any) => a.userId === request.userId);
          
          for (const assignment of userAssignments) {
            const variant = leaveVariants.find(v => v.id === assignment.leaveVariantId);
            if (!variant || !variant.paidDaysInYear) continue;
            
            const currentYear = new Date().getFullYear();
            const entitlementInHalfDays = variant.paidDaysInYear * 2;
            
            // Calculate total used for this variant
            const variantRequests = approvedRequests.filter((req: any) => 
              req.userId === request.userId && 
              leaveVariants.find(v => v.id === assignment.leaveVariantId && v.leaveTypeId === req.leaveTypeId)
            );
            
            const totalUsedDays = variantRequests.reduce((sum: number, req: any) => {
              const workingDays = typeof req.workingDays === 'string' ? parseFloat(req.workingDays) : req.workingDays;
              return sum + (workingDays || 0);
            }, 0);
            
            const usedInHalfDays = Math.round(totalUsedDays * 2);
            const currentBalanceInHalfDays = entitlementInHalfDays - usedInHalfDays;
            
            // Create balance
            await storage.createEmployeeLeaveBalance({
              userId: request.userId,
              leaveVariantId: variant.id,
              year: currentYear,
              totalEntitlement: entitlementInHalfDays,
              currentBalance: currentBalanceInHalfDays,
              usedBalance: usedInHalfDays,
              carryForward: 0,
              orgId
            });
            
            // Create opening transaction
            await storage.createLeaveBalanceTransaction({
              userId: request.userId,
              leaveVariantId: variant.id,
              year: currentYear,
              transactionType: "credit",
              amount: entitlementInHalfDays,
              balanceAfter: entitlementInHalfDays,
              description: `Annual allocation for ${variant.leaveTypeName} (${variant.paidDaysInYear} days)`,
              orgId,
            });
            
            // Create deduction transactions for each request
            for (const req of variantRequests) {
              const workingDays = typeof req.workingDays === 'string' ? parseFloat(req.workingDays) : req.workingDays;
              const deductionInHalfDays = Math.round(workingDays * 2);
              
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: variant.id,
                year: currentYear,
                transactionType: "deduction",
                amount: deductionInHalfDays,
                balanceAfter: entitlementInHalfDays - deductionInHalfDays,
                description: `Leave deduction for approved application #${req.id} (${workingDays} days)`,
                orgId,
              });
            }
            
            console.log(`[FixBalances] Created balance for user ${request.userId}, variant ${variant.leaveTypeName}: ${variant.paidDaysInYear} total, ${totalUsedDays} used, ${(currentBalanceInHalfDays/2)} remaining`);
          }
          
          fixedUsers++;
        }
      }
      
      console.log(`[FixBalances] Fixed balances for ${fixedUsers} users`);
      res.json({ message: `Fixed missing balances for ${fixedUsers} users`, fixedUsers });
    } catch (error) {
      console.error('Error fixing missing balances:', error);
      res.status(500).json({ message: 'Failed to fix missing balances' });
    }
  });

  // Recalculate leave balances based on "After Earning" logic
  app.post("/api/recalculate-leave-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      console.log("Recalculating leave balances with After Earning logic for org_id:", orgId);
      await storage.computeInitialLeaveBalances(orgId);
      res.json({ 
        message: "Leave balances recalculated successfully based on After Earning logic",
        success: true 
      });
    } catch (error) {
      console.error("Error recalculating leave balances:", error);
      res.status(500).json({ message: "Failed to recalculate leave balances" });
    }
  });

  // Fix pro-rata calculations based on actual joining dates
  app.post('/api/fix-prorata-balances', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { userId, joiningDate, employeeJoiningDates } = req.body;
      
      console.log(`[FixProRata] Starting pro-rata balance fix for org ${orgId}`);
      
      if (userId && joiningDate) {
        // Fix for specific user
        const result = await storage.fixProRataBalancesForUser(userId, orgId, joiningDate);
        console.log(`[FixProRata] Fixed balances for user ${userId}:`, result);
        res.json({ 
          message: `Pro-rata balances fixed for user ${userId}`,
          result,
          success: true 
        });
      } else if (employeeJoiningDates) {
        // Fix for all users in organization using provided joining dates
        const joiningDatesMap = new Map(Object.entries(employeeJoiningDates));
        const result = await storage.fixProRataBalancesForOrg(orgId, joiningDatesMap);
        console.log(`[FixProRata] Fixed balances for ${result.processedUsers} users in org ${orgId}`);
        res.json({ 
          message: `Pro-rata balances fixed for ${result.processedUsers} users`,
          result,
          success: true 
        });
      } else {
        res.status(400).json({ 
          message: "Either userId+joiningDate or employeeJoiningDates map must be provided" 
        });
      }
    } catch (error) {
      console.error("Error fixing pro-rata balances:", error);
      res.status(500).json({ message: "Failed to fix pro-rata balances" });
    }
  });

  // Force create "After Earning" transaction for specific user/variant
  app.post("/api/force-after-earning-transaction", isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { userId, leaveVariantId } = req.body;
      
      // Get variant details
      const variant = await storage.getLeaveVariant(leaveVariantId);
      if (!variant) {
        return res.status(404).json({ message: "Leave variant not found" });
      }
      
      // Get company effective date
      const company = await storage.getCompany(orgId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const effectiveDate = new Date(company.effectiveDate);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate After Earning amount
      if (variant.grantLeaves === 'after_earning' && variant.grantFrequency === 'per_month') {
        const monthsElapsed = (currentDate.getFullYear() - effectiveDate.getFullYear()) * 12 + 
                             (currentDate.getMonth() - effectiveDate.getMonth());
        
        // For pro-rata calculation, only count completed months
        // If we're not at the last day of the current month, exclude current month from count
        const isLastDayOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
        
        console.log(`[After Earning Debug] Current date: ${currentDate.toISOString().split('T')[0]}, Is last day of month: ${isLastDayOfMonth}, Months elapsed: ${monthsElapsed}, Completed months: ${completedMonths}`);
        
        const monthlyAccrual = variant.paidDaysInYear / 12;
        const earnedAmount = completedMonths * monthlyAccrual;
        
        // Create the transaction
        const transactionDescription = `After earning calculation: ${completedMonths} completed months × ${monthlyAccrual} days/month = ${earnedAmount} days earned since ${effectiveDate.toISOString().split('T')[0]}`;
        
        await storage.createLeaveBalanceTransaction({
          userId,
          leaveVariantId,
          transactionType: 'grant',
          amount: earnedAmount,
          balanceAfter: earnedAmount,
          description: transactionDescription,
          year: currentYear,
          orgId
        });
        
        console.log(`Forced "After Earning" transaction created for user ${userId}, variant ${leaveVariantId}: ${earnedAmount} days`);
        res.json({ 
          message: "After earning transaction created successfully",
          earnedAmount,
          description: transactionDescription
        });
      } else {
        res.status(400).json({ message: "Variant is not configured for After Earning" });
      }
    } catch (error) {
      console.error("Error creating forced After Earning transaction:", error);
      res.status(500).json({ message: "Failed to create After Earning transaction" });
    }
  });

  // Workflows routes
  app.get('/api/workflows', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const workflows = await storage.getWorkflows(orgId);
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  app.post('/api/workflows', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      console.log("Creating workflow with data:", req.body);
      const validatedData = insertWorkflowSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      console.log("Validated workflow data:", validatedData);
      const workflow = await storage.createWorkflow(validatedData);
      res.json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ message: "Failed to create workflow" });
    }
  });

  app.patch('/api/workflows/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertWorkflowSchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const workflow = await storage.updateWorkflow(id, validatedData);
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(400).json({ message: "Failed to update workflow" });
    }
  });

  app.delete('/api/workflows/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      await storage.deleteWorkflow(id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(400).json({ message: "Failed to delete workflow" });
    }
  });

  // Comp off configuration routes
  app.get('/api/comp-off-config', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const config = await storage.getCompOffConfig(orgId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching comp off config:", error);
      res.status(500).json({ message: "Failed to fetch comp off config" });
    }
  });

  app.post('/api/comp-off-config', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertCompOffConfigSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      const config = await storage.upsertCompOffConfig(validatedData);
      res.json(config);
    } catch (error) {
      console.error("Error saving comp off config:", error);
      res.status(400).json({ message: "Failed to save comp off config" });
    }
  });

  // Comp-off variants routes
  app.get('/api/comp-off-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const variants = await storage.getCompOffVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching comp-off variants:", error);
      res.status(500).json({ message: "Failed to fetch comp-off variants" });
    }
  });

  app.post('/api/comp-off-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      console.log("=== COMP-OFF VARIANT CREATION DEBUG ===");
      console.log("Request body:", req.body);
      console.log("OrgId:", orgId);
      
      const validatedData = insertCompOffVariantSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      console.log("Validated data:", validatedData);
      
      const variant = await storage.createCompOffVariant(validatedData);
      res.json(variant);
    } catch (error) {
      console.error("Error creating comp-off variant:", error);
      console.error("Validation error details:", error.issues || error.errors);
      res.status(400).json({ message: "Failed to create comp-off variant", error: error.message });
    }
  });

  app.patch('/api/comp-off-variants/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const variant = await storage.updateCompOffVariant(id, { ...req.body, orgId: parseInt(orgId as string) });
      res.json(variant);
    } catch (error) {
      console.error("Error updating comp-off variant:", error);
      res.status(400).json({ message: "Failed to update comp-off variant" });
    }
  });

  app.delete('/api/comp-off-variants/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompOffVariant(id);
      res.json({ message: "Comp-off variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting comp-off variant:", error);
      res.status(400).json({ message: "Failed to delete comp-off variant" });
    }
  });

  // PTO variants routes
  app.get('/api/pto-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const variants = await storage.getPTOVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching PTO variants:", error);
      res.status(500).json({ message: "Failed to fetch PTO variants" });
    }
  });

  app.post('/api/pto-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertPTOVariantSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      const variant = await storage.createPTOVariant(validatedData);
      res.json(variant);
    } catch (error) {
      console.error("Error creating PTO variant:", error);
      res.status(400).json({ message: "Failed to create PTO variant" });
    }
  });

  app.patch('/api/pto-variants/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const variant = await storage.updatePTOVariant(id, { ...req.body, orgId: parseInt(orgId as string) });
      res.json(variant);
    } catch (error) {
      console.error("Error updating PTO variant:", error);
      res.status(400).json({ message: "Failed to update PTO variant" });
    }
  });

  app.delete('/api/pto-variants/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePTOVariant(id);
      res.json({ message: "PTO variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting PTO variant:", error);
      res.status(400).json({ message: "Failed to delete PTO variant" });
    }
  });

  // PTO configuration routes
  app.get('/api/pto-config', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const config = await storage.getPTOConfig(orgId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching PTO config:", error);
      res.status(500).json({ message: "Failed to fetch PTO config" });
    }
  });

  // PTO request routes
  app.get('/api/pto-requests', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const userId = req.query.userId as string;
      const requests = await storage.getPTORequests(orgId, userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching PTO requests:", error);
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });

  app.post('/api/pto-requests', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      console.log("Routes - Received PTO request data:", req.body);
      
      // Check for applicable workflow
      const workflow = await findApplicableWorkflow('pto', 'apply-pto', orgId);
      console.log("Found PTO workflow:", workflow ? `ID: ${workflow.id}, Name: ${workflow.name}` : 'None');
      
      if (workflow && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
        // Create request in pending status for workflow processing
        const workflowData = {
          ...req.body,
          orgId,
          userId: req.body.userId || req.body.user_id,
          status: 'pending'
        };
        
        console.log("Routes - Creating PTO request for workflow processing:", workflowData);
        
        const validatedData = insertPTORequestSchema.parse(workflowData);
        let request = await storage.createPTORequest(validatedData);
        
        // Start workflow process
        console.log("Starting workflow for PTO request");
        request = await startPTOWorkflow(request.id, workflow, request.userId);
        
        res.json({ 
          ...request, 
          workflowId: workflow.id, 
          message: "PTO request submitted for approval" 
        });
      } else {
        // Auto-approve if no workflow is configured
        const autoApproveData = {
          ...req.body,
          orgId,
          userId: req.body.userId || req.body.user_id,
          status: 'approved',
          approvedBy: 'system-auto-approval',
          approvedAt: new Date()
        };
        
        console.log("Routes - Auto-approving PTO request (no workflow):", autoApproveData);
        
        const validatedData = insertPTORequestSchema.parse(autoApproveData);
        const request = await storage.createPTORequest(validatedData);
        res.json(request);
      }
    } catch (error) {
      console.error("Error creating PTO request:", error);
      res.status(400).json({ message: "Failed to create PTO request" });
    }
  });

  app.patch('/api/pto-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.updatePTORequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating PTO request:", error);
      res.status(400).json({ message: "Failed to update PTO request" });
    }
  });

  app.delete('/api/pto-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePTORequest(id);
      res.json({ message: "PTO request deleted successfully" });
    } catch (error) {
      console.error("Error deleting PTO request:", error);
      res.status(400).json({ message: "Failed to delete PTO request" });
    }
  });

  app.post('/api/pto-config', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertPTOConfigSchema.parse({ ...req.body, orgId: parseInt(orgId as string) });
      const config = await storage.upsertPTOConfig(validatedData);
      res.json(config);
    } catch (error) {
      console.error("Error saving PTO config:", error);
      res.status(400).json({ message: "Failed to save PTO config" });
    }
  });

  // Leave requests routes
  app.get('/api/leave-requests', isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      console.log('🔍 [Server] Leave requests query:', { userId, orgId });
      
      const requests = await storage.getLeaveRequests(userId, orgId);
      
      console.log('📊 [Server] Leave requests result:', {
        totalCount: requests.length,
        userIds: requests.map(r => r.userId),
        requestedUserId: userId
      });
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post('/api/leave-requests', isAuthenticated, async (req, res) => {
    try {
      console.log("Raw request body:", req.body);
      
      const userId = (req.user as any)?.claims?.sub;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Get workflow for leave applications
      const workflow = await storage.getWorkflowForLeaveType(req.body.leaveTypeId, orgId);
      
      let finalStatus = "pending";
      let approvedBy = null;
      let approvedAt = null;
      let workflowId = null;
      let currentStep = 0;
      let workflowStatus = "bypassed";
      
      if (workflow) {
        workflowId = workflow.id;
        workflowStatus = "in_progress";
        currentStep = 1; // Start at first review step
        
        try {
          const steps = workflow.steps as any[];
          const firstStep = Array.isArray(steps) && steps.length > 0 ? steps[0] : null;
          
          // Check if first step has auto-approval
          if (firstStep?.autoApproval === true) {
            // Process auto-approval chain
            console.log("Auto-approval detected - processing workflow");
            // We'll handle auto-approval after creating the request
          } else {
            console.log("Manual approval required - request will be pending");
          }
        } catch (parseError) {
          console.error("Error parsing workflow steps:", parseError);
          workflowStatus = "bypassed";
          currentStep = 0;
        }
      } else {
        console.log("No workflow found - request will be auto-approved");
        finalStatus = "approved";
        approvedBy = userId;
        approvedAt = new Date();
      }
      
      // Transform dates manually before validation
      const transformedData = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: finalStatus,
        approvedBy,
        approvedAt,
        workflowId,
        currentStep,
        workflowStatus,
        approvalHistory: [],
        documents: req.body.documents || [], // Ensure documents are included
        orgId,
      };
      
      console.log("Transformed data:", transformedData);
      
      let request = await storage.createLeaveRequest(transformedData);
      
      // Process auto-approval workflow if needed
      if (workflow && workflowStatus === "in_progress") {
        try {
          const steps = workflow.steps as any[];
          const firstStep = steps[0];
          
          if (firstStep?.autoApproval === true) {
            // Process the auto-approval workflow
            request = await storage.processWorkflowApproval(request.id, "system", orgId);
            console.log("Auto-approval workflow processed");
          }
        } catch (workflowError) {
          console.error("Error processing auto-approval workflow:", workflowError);
        }
      }
      
      // Check if we need to deduct balance (either auto-approved OR deduct-before-workflow is enabled)
      const shouldDeductBalance = finalStatus === "approved";
      
      // Also check if pending request should have balance deducted (deduct before workflow setting)
      let deductForPending = false;
      if (finalStatus === "pending") {
        try {
          console.log("DEBUG: Checking deduct-before-workflow for pending request...");
          const leaveVariants = await storage.getLeaveVariants(orgId);
          console.log("DEBUG: Found", leaveVariants.length, "leave variants");
          const appliedVariant = leaveVariants.find(v => v.leaveTypeId === request.leaveTypeId);
          console.log("DEBUG: Applied variant:", appliedVariant ? {
            id: appliedVariant.id,
            leaveTypeId: appliedVariant.leaveTypeId,
            leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
          } : "NOT FOUND");
          
          if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
            deductForPending = true;
            console.log("DEBUG: Leave variant configured for balance deduction before workflow - deducting for pending request");
          } else if (appliedVariant) {
            console.log("DEBUG: Leave variant found but leaveBalanceDeductionBefore is:", appliedVariant.leaveBalanceDeductionBefore);
          }
        } catch (error) {
          console.error("Error checking leave variant deduction settings:", error);
        }
      }
      
      if (shouldDeductBalance || deductForPending) {
        try {
          // Find the leave variant that was applied for with org filtering
          const leaveVariants = await storage.getLeaveVariants(orgId);
          const appliedVariant = leaveVariants.find(v => v.leaveTypeId === request.leaveTypeId);
          
          if (appliedVariant) {
            // Get employee leave balance for the specific variant first
            const balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
            const relevantBalance = balances.find(b => b.leaveVariantId === appliedVariant.id);
            
            if (relevantBalance) {
              // Convert decimal days to half-day units for storage (2.5 days = 5 half-days)
              const workingDaysNum = parseFloat(request.workingDays.toString());
              const workingDaysInHalfDays = Math.round(workingDaysNum * 2);
              const currentBalanceNum = parseFloat(relevantBalance.currentBalance.toString());
              const newBalance = currentBalanceNum - workingDaysInHalfDays;
              
              // Create transaction record with appropriate description
              const deductionReason = finalStatus === "approved" ? 
                `Leave deduction for approved application #${request.id} (${workingDaysNum} days)` :
                `Leave balance deducted for pending application #${request.id} (${workingDaysNum} days) - Deduct before workflow`;
              
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: appliedVariant.id,
                year: new Date().getFullYear(),
                transactionType: "deduction",
                amount: workingDaysInHalfDays,
                balanceAfter: newBalance,
                description: deductionReason,
                leaveRequestId: request.id,
                orgId,
              });
              
              // Update employee leave balance
              const usedBalanceNum = parseFloat(relevantBalance.usedBalance.toString());
              await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                currentBalance: newBalance,
                usedBalance: usedBalanceNum + workingDaysInHalfDays,
              });
              
              const status = finalStatus === "approved" ? "approved" : "pending";
              console.log(`Deducted ${request.workingDays} days from user ${request.userId} balance for ${status} application (variant ${appliedVariant.leaveVariantName}). New balance: ${newBalance}`);
            } else {
              console.log(`No balance found for user ${request.userId} and variant ${appliedVariant.id}`);
            }
          } else {
            console.log(`No leave variant found for leaveTypeId ${request.leaveTypeId}`);
          }
        } catch (balanceError) {
          console.error("Error updating leave balance:", balanceError);
          // Continue anyway - leave request is created but balance not updated
        }
      } else {
        console.log("DEBUG: No balance deduction - shouldDeductBalance:", shouldDeductBalance, "deductForPending:", deductForPending);
        console.log("Request is pending approval - balance will be deducted upon approval");
      }
      
      // Handle collaborative tasks if provided
      let collaborativeTasks = [];
      if (req.body.collaborativeTasks && Array.isArray(req.body.collaborativeTasks) && req.body.collaborativeTasks.length > 0) {
        console.log("Processing collaborative tasks:", req.body.collaborativeTasks);
        
        try {
          for (const task of req.body.collaborativeTasks) {
            console.log("Processing individual task:", task);
            console.log("Task validation - assigneeUserId:", task.assigneeUserId, "taskDescription:", task.taskDescription);
            if (task.assigneeUserId && task.taskDescription) {
              console.log("✅ Task validation passed - creating collaborative task...");
              const collaborativeTask = await storage.createCollaborativeTask({
                leaveRequestId: request.id,
                assigneeName: task.assigneeName || `Employee ${task.assigneeUserId}`,
                assigneeUserId: task.assigneeUserId,
                assigneeEmail: task.assigneeEmail || '',
                assigneePhone: task.assigneePhone || '',
                taskDescription: task.taskDescription,
                expectedSupportDateFrom: new Date(task.expectedSupportDateFrom),
                expectedSupportDateTo: new Date(task.expectedSupportDateTo),
                additionalNotes: task.additionalNotes || '',
                notificationMethod: 'email',
                status: 'pending',
                orgId
              });
              console.log("✅ Collaborative task created successfully:", collaborativeTask);
              collaborativeTasks.push(collaborativeTask);
            } else {
              console.log("❌ Task validation failed - skipping task creation");
            }
          }
          console.log("Collaborative tasks created:", collaborativeTasks.length);
        } catch (taskError) {
          console.error("Error creating collaborative tasks:", taskError);
          // Don't fail the entire request if tasks fail
        }
      }
      
      res.json({
        ...request,
        collaborativeTasks
      });
    } catch (error) {
      console.error("Error creating leave request:", error);
      res.status(400).json({ message: "Failed to create leave request" });
    }
  });

  app.put('/api/leave-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Only allow editing pending requests
      const allRequests = await storage.getLeaveRequests(undefined, orgId);
      const existingRequest = allRequests.find(r => r.id === id);
      
      if (!existingRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (existingRequest.status !== 'pending') {
        return res.status(400).json({ message: "Can only edit pending leave requests" });
      }
      
      // Transform data to match schema expectations
      const transformedData = {
        ...req.body,
        totalDays: String(req.body.totalDays),
        workingDays: String(req.body.workingDays),
        startDate: typeof req.body.startDate === 'string' ? req.body.startDate : req.body.startDate.toISOString().split('T')[0],
        endDate: typeof req.body.endDate === 'string' ? req.body.endDate : req.body.endDate.toISOString().split('T')[0],
        orgId,
        status: 'pending' // Ensure status remains pending after edit
      };
      
      const validatedData = insertLeaveRequestSchema.partial().parse(transformedData);
      
      const request = await storage.updateLeaveRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(400).json({ message: "Failed to update leave request" });
    }
  });

  app.patch('/api/leave-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertLeaveRequestSchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const request = await storage.updateLeaveRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(400).json({ message: "Failed to update leave request" });
    }
  });

  app.delete('/api/leave-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Get the leave request before deleting to check if balance needs restoration
      const allRequests = await storage.getLeaveRequests(undefined, orgId);
      const request = allRequests.find(r => r.id === id);
      
      if (request) {
        console.log(`DEBUG: Canceling request ${id} with status: ${request.status}`);
        
        // Check if this was a pending request that had balance deducted
        if (request.status === 'pending') {
          try {
            // Find the leave variant to check deduction settings
            const leaveVariants = await storage.getLeaveVariants(orgId);
            const appliedVariant = leaveVariants.find(v => v.leaveTypeId === request.leaveTypeId);
            
            console.log(`DEBUG: Found variant for cancellation:`, appliedVariant ? {
              id: appliedVariant.id,
              leaveTypeId: appliedVariant.leaveTypeId,
              leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
            } : "NOT FOUND");
            
            if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
              console.log("DEBUG: Variant had balance deduction before workflow - restoring balance for canceled request");
              
              // Get employee leave balance for the specific variant
              const balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
              const relevantBalance = balances.find(b => b.leaveVariantId === appliedVariant.id);
              
              if (relevantBalance) {
                // Convert decimal days to half-day units and restore balance
                const workingDaysNum = parseFloat(request.workingDays.toString());
                const halfDayUnits = Math.round(workingDaysNum * 2);
                const currentBalanceNum = parseFloat(relevantBalance.currentBalance.toString());
                const usedBalanceNum = parseFloat(relevantBalance.usedBalance.toString());
                const newBalance = currentBalanceNum + halfDayUnits;
                const newUsedBalance = Math.max(0, usedBalanceNum - halfDayUnits);
                
                // Update employee leave balance
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: newUsedBalance,
                });
                
                // Create transaction record for cancellation credit
                await storage.createLeaveBalanceTransaction({
                  userId: request.userId,
                  leaveVariantId: appliedVariant.id,
                  year: new Date().getFullYear(),
                  transactionType: 'credit',
                  amount: halfDayUnits,
                  balanceAfter: newBalance,
                  description: `Balance restored for canceled pending request #${request.id} (${workingDaysNum} days)`,
                  leaveRequestId: request.id,
                  orgId
                });
                
                console.log(`DEBUG: Restored ${workingDaysNum} days to user ${request.userId} balance. New balance: ${newBalance}`);
              } else {
                console.log(`DEBUG: No balance found for user ${request.userId} and variant ${appliedVariant.id}`);
              }
            } else if (appliedVariant) {
              console.log("DEBUG: Variant does not use balance deduction before workflow - no restoration needed");
            }
          } catch (balanceError) {
            console.error("Error restoring balance during cancellation:", balanceError);
            // Continue with deletion anyway
          }
        } else {
          console.log(`DEBUG: Request status is ${request.status} - no balance restoration needed`);
        }
      }
      
      // Delete the request
      await storage.deleteLeaveRequest(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      res.status(400).json({ message: "Failed to delete leave request" });
    }
  });

  // Withdraw approved leave request
  app.post('/api/leave-requests/:id/withdraw', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { reason } = req.body; // Withdrawal reason from frontend
      
      // Get the leave request with org filtering
      const allRequests = await storage.getLeaveRequests(undefined, orgId);
      const request = allRequests.find(r => r.id === id);
      
      if (!request) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (request.status !== 'approved') {
        return res.status(400).json({ message: "Can only withdraw approved leave requests" });
      }
      
      // Check if there's a workflow for withdraw-leave subprocess
      const workflows = await storage.getWorkflows(orgId);
      const withdrawWorkflow = workflows.find(w => 
        w.process === 'application' && w.subProcesses && w.subProcesses.includes('withdraw-leave')
      );
      
      if (withdrawWorkflow && Array.isArray(withdrawWorkflow.steps) && withdrawWorkflow.steps.length > 0) {
        // Workflow exists - start workflow process
        const approvalHistory = [{
          stepNumber: 0,
          action: 'submitted',
          userId: request.userId,
          timestamp: new Date().toISOString(),
          comment: reason || 'Withdrawal request submitted'
        }];
        
        // Update request with workflow tracking
        const updatedRequest = await storage.updateLeaveRequest(id, { 
          status: 'withdrawal_pending',
          workflowId: withdrawWorkflow.id,
          currentStep: 1,
          workflowStatus: 'in_progress',
          approvalHistory: JSON.stringify(approvalHistory)
        });
        
        res.json(updatedRequest);
      } else {
        // No workflow - proceed with immediate withdrawal
        await processImmediateWithdrawal(id, request, orgId);
        
        const updatedRequest = await storage.updateLeaveRequest(id, { 
          status: 'withdrawn'
        });
        
        res.json(updatedRequest);
      }
    } catch (error) {
      console.error("Error withdrawing leave request:", error);
      res.status(400).json({ message: "Failed to withdraw leave request" });
    }
  });
  
  // Helper function for immediate withdrawal (when no workflow)
  async function processImmediateWithdrawal(requestId: number, request: any, orgId: number) {
    // Find the leave variant to restore balance
    const leaveVariants = await storage.getLeaveVariants(orgId);
    const appliedVariant = leaveVariants.find(v => v.leaveTypeId === request.leaveTypeId);
    
    if (appliedVariant) {
      // Get employee leave balance for the specific variant
      const balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
      const relevantBalance = balances.find(b => b.leaveVariantId === appliedVariant.id);
      
      if (relevantBalance) {
        // Convert decimal days to half-day units and restore balance
        const workingDaysNum = parseFloat(request.workingDays.toString());
        const halfDayUnits = Math.round(workingDaysNum * 2);
        
        const updatedBalance = await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
          currentBalance: relevantBalance.currentBalance + halfDayUnits,
          usedBalance: Math.max(0, relevantBalance.usedBalance - halfDayUnits)
        });
        
        // Create transaction record for withdrawal
        await storage.createLeaveBalanceTransaction({
          userId: request.userId,
          leaveVariantId: appliedVariant.id,
          year: new Date().getFullYear(),
          transactionType: 'credit',
          amount: halfDayUnits,
          balanceAfter: relevantBalance.currentBalance + halfDayUnits,
          description: `Withdrawal of leave request #${request.id}`,
          orgId
        });
        
        console.log(`Restored ${workingDaysNum} days (${halfDayUnits} half-day units) to user ${request.userId} balance`);
      }
    }
  }

  // Approve leave request or withdrawal request
  app.post('/api/leave-requests/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any)?.claims?.sub;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Get the leave request first with org_id filtering
      const allRequests = await storage.getLeaveRequests(undefined, orgId);
      const request = allRequests.find(r => r.id === id);
      
      if (!request) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (!['pending', 'withdrawal_pending'].includes(request.status ?? '')) {
        return res.status(400).json({ message: "Request is not in a valid status for approval" });
      }
      
      // Handle withdrawal request approval differently
      if (request.status === 'withdrawal_pending') {
        const updatedRequest = await storage.processWorkflowApproval(id, userId ?? '', orgId);
        
        // If final approval for withdrawal, process the actual withdrawal
        if (updatedRequest.status === 'approved' && updatedRequest.workflowStatus === 'completed') {
          await processImmediateWithdrawal(id, request, orgId);
          const finalRequest = await storage.updateLeaveRequest(id, { 
            status: 'withdrawn'
          });
          return res.json(finalRequest);
        }
        
        return res.json(updatedRequest);
      }
      
      // Process regular leave application workflow approval
      const updatedRequest = await storage.processWorkflowApproval(id, userId || '', orgId);
      
      // Only deduct balance if this is workflow completion (not duplicate approval)
      if (updatedRequest.workflowStatus === 'completed') {
        try {
          const leaveVariants = await storage.getLeaveVariants(orgId);
          let balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
          
          // Create missing balances for user based on their assignments
          const assignments = await storage.getEmployeeAssignments(orgId);
          const userAssignments = assignments.filter((a: any) => a.userId === request.userId);
          let createdAnyBalances = false;
          
          for (const assignment of userAssignments) {
            const variant = leaveVariants.find(v => v.id === assignment.leaveVariantId);
            if (variant && variant.paidDaysInYear) {
              // Check if balance already exists for this variant
              const existingBalance = balances.find(b => b.leaveVariantId === variant.id);
              
              if (!existingBalance) {
                console.log(`[Approval] Creating missing balance for user ${request.userId}, variant ${variant.leaveTypeName}...`);
                
                // Create initial balance based on annual allowance
                const currentYear = new Date().getFullYear();
                const entitlementInHalfDays = variant.paidDaysInYear * 2; // Convert days to half-day units
                
                const newBalance = await storage.createEmployeeLeaveBalance({
                  userId: request.userId,
                  leaveVariantId: variant.id,
                  year: currentYear,
                  totalEntitlement: entitlementInHalfDays,
                  currentBalance: entitlementInHalfDays,
                  usedBalance: 0,
                  carryForward: 0,
                  orgId
                });
                
                // Create opening balance transaction
                await storage.createLeaveBalanceTransaction({
                  userId: request.userId,
                  leaveVariantId: variant.id,
                  year: currentYear,
                  transactionType: "credit",
                  amount: entitlementInHalfDays,
                  balanceAfter: entitlementInHalfDays,
                  description: `Annual allocation for ${variant.leaveTypeName} (${variant.paidDaysInYear} days)`,
                  orgId,
                });
                
                console.log(`[Approval] Created initial balance for user ${request.userId}, variant ${variant.leaveTypeName}: ${variant.paidDaysInYear} days`);
                createdAnyBalances = true;
              }
            }
          }
          
          // Refresh balances if any were created
          if (createdAnyBalances) {
            balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
          }
          
          console.log(`[Approval] Available leave variants for leaveTypeId ${request.leaveTypeId}:`, leaveVariants.filter(v => v.leaveTypeId === request.leaveTypeId));
          console.log(`[Approval] User ${request.userId} balances:`, balances);
          
          // Find the balance record that matches the leave type being applied for
          let relevantBalance = null;
          let appliedVariant = null;
          
          for (const balance of balances) {
            const variant = leaveVariants.find(v => v.id === balance.leaveVariantId);
            if (variant && variant.leaveTypeId === request.leaveTypeId) {
              relevantBalance = balance;
              appliedVariant = variant;
              break;
            }
          }
          
          console.log(`[Approval] Found matching variant:`, appliedVariant);
          console.log(`[Approval] Found matching balance:`, relevantBalance);
          
          if (relevantBalance && appliedVariant) {
            // Check if balance was already deducted for this request (including pending deductions)
            const existingTransaction = await storage.getLeaveBalanceTransactions(request.userId, appliedVariant.id, orgId);
            const alreadyDeducted = existingTransaction.some(t => 
              t.description.includes(`application #${request.id}`) && 
              (t.transactionType === 'deduction' || t.transactionType === 'pending_deduction')
            );
            
            if (!alreadyDeducted) {
              // Convert decimal days to half-day units for storage (2.5 days = 5 half-days)
              const workingDaysNum = typeof request.workingDays === 'string' ? parseFloat(request.workingDays) : request.workingDays;
              const workingDaysInHalfDays = Math.round(workingDaysNum * 2);
              const newBalance = relevantBalance.currentBalance - workingDaysInHalfDays;
              
              // Create transaction record with negative amount for deduction
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: appliedVariant.id,
                year: new Date().getFullYear(),
                transactionType: "deduction",
                amount: -workingDaysInHalfDays, // Negative amount for deduction
                balanceAfter: newBalance,
                description: `Leave deduction for approved application #${request.id} (${request.workingDays} days)`,
                orgId,
              });
              
              // Update employee leave balance
              await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                currentBalance: newBalance,
                usedBalance: relevantBalance.usedBalance + workingDaysInHalfDays,
              });
              
              console.log(`[Approval] Successfully deducted ${request.workingDays} days from user ${request.userId}. New balance: ${newBalance}`);
            } else {
              console.log(`[Approval] Balance already deducted for request #${request.id}, skipping duplicate deduction`);
            }
          } else {
            console.log(`[Approval] No matching balance found for user ${request.userId} and leave type ${request.leaveTypeId}`);
          }
        } catch (balanceError) {
          console.error("Error updating leave balance after approval:", balanceError);
          // Continue anyway - request is approved but balance not updated
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error approving leave request:", error);
      res.status(400).json({ message: "Failed to approve leave request" });
    }
  });

  // Workflow-based leave request rejection
  app.post('/api/leave-requests/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Handle both development and production authentication
      const userId = (req.user as any)?.claims?.sub || (process.env.NODE_ENV === 'development' ? '12080' : null);
      const { reason } = req.body;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // Get the leave request before rejecting to check if balance needs restoration
      const allRequests = await storage.getLeaveRequests(undefined, orgId);
      const request = allRequests.find(r => r.id === id);
      
      if (request && request.status === 'pending') {
        console.log(`DEBUG: Rejecting request ${id} - checking for balance restoration`);
        
        try {
          // Find the leave variant to check deduction settings
          const leaveVariants = await storage.getLeaveVariants(orgId);
          const appliedVariant = leaveVariants.find(v => v.leaveTypeId === request.leaveTypeId);
          
          console.log(`DEBUG: Found variant for rejection:`, appliedVariant ? {
            id: appliedVariant.id,
            leaveTypeId: appliedVariant.leaveTypeId,
            leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
          } : "NOT FOUND");
          
          if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
            console.log("DEBUG: Variant had balance deduction before workflow - restoring balance for rejected request");
            
            // Get employee leave balance for the specific variant
            const balances = await storage.getEmployeeLeaveBalances(request.userId, new Date().getFullYear(), orgId);
            const relevantBalance = balances.find(b => b.leaveVariantId === appliedVariant.id);
            
            if (relevantBalance) {
              // Convert decimal days to half-day units and restore balance
              const workingDaysNum = parseFloat(request.workingDays.toString());
              const halfDayUnits = Math.round(workingDaysNum * 2);
              const currentBalanceNum = parseFloat(relevantBalance.currentBalance.toString());
              const usedBalanceNum = parseFloat(relevantBalance.usedBalance.toString());
              const newBalance = currentBalanceNum + halfDayUnits;
              const newUsedBalance = Math.max(0, usedBalanceNum - halfDayUnits);
              
              // Update employee leave balance
              await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                currentBalance: newBalance,
                usedBalance: newUsedBalance,
              });
              
              // Create transaction record for rejection credit
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: appliedVariant.id,
                year: new Date().getFullYear(),
                transactionType: 'credit',
                amount: halfDayUnits,
                balanceAfter: newBalance,
                description: `Balance restored for rejected request #${request.id} (${workingDaysNum} days) - Reason: ${reason}`,
                leaveRequestId: request.id,
                orgId
              });
              
              console.log(`DEBUG: Restored ${workingDaysNum} days to user ${request.userId} balance after rejection. New balance: ${newBalance}`);
            } else {
              console.log(`DEBUG: No balance found for user ${request.userId} and variant ${appliedVariant.id}`);
            }
          } else if (appliedVariant) {
            console.log("DEBUG: Variant does not use balance deduction before workflow - no restoration needed for rejection");
          }
        } catch (balanceError) {
          console.error("Error restoring balance during rejection:", balanceError);
          // Continue with rejection anyway
        }
      }

      // Process workflow rejection
      const updatedRequest = await storage.rejectWorkflowRequest(id, userId, reason, orgId);
      res.json(updatedRequest);
    } catch (error: unknown) {
      console.error("Error rejecting leave request:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to reject leave request";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Leave variants routes
  app.get('/api/leave-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const variants = await storage.getLeaveVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching leave variants:", error);
      res.status(500).json({ message: "Failed to fetch leave variants" });
    }
  });

  app.post('/api/leave-variants', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      console.log('Leave variant creation request body:', req.body);
      console.log('leaveTypeId in request:', req.body.leaveTypeId);
      
      if (!req.body.leaveTypeId) {
        return res.status(400).json({ message: "leaveTypeId is required" });
      }
      
      const variant = await storage.createLeaveVariant({ ...req.body, orgId: parseInt(orgId as string) });
      res.json(variant);
    } catch (error) {
      console.error("Error creating leave variant:", error);
      res.status(400).json({ message: "Failed to create leave variant" });
    }
  });

  app.patch('/api/leave-variants/:id', isAuthenticated, async (req, res) => {
    try {
      console.log("=== PATCH LEAVE VARIANT DEBUG ===");
      console.log("Variant ID from params:", req.params.id);
      console.log("Request body received:", req.body);
      console.log("OnboardingSlabs in body:", req.body.onboardingSlabs);
      console.log("ExitSlabs in body:", req.body.exitSlabs);
      
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      
      console.log("Parsed ID:", id);
      console.log("Org ID:", orgId);
      
      const updateData = { ...req.body, orgId: parseInt(orgId as string) };
      console.log("Final update data being sent to storage:", updateData);
      
      const variant = await storage.updateLeaveVariant(id, updateData);
      console.log("Update successful, returning variant:", variant);
      res.json(variant);
    } catch (error) {
      console.error("Error updating leave variant:", error);
      res.status(400).json({ message: "Failed to update leave variant" });
    }
  });

  app.delete('/api/leave-variants/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLeaveVariant(id);
      res.json({ message: "Leave variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave variant:", error);
      res.status(400).json({ message: "Failed to delete leave variant" });
    }
  });

  // Holiday routes
  app.get('/api/holidays', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const holidays = await storage.getHolidays(orgId);
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post('/api/holidays', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || '60';
      const holiday = await storage.createHoliday({ ...req.body, orgId: parseInt(orgId as string) });
      res.json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });

  // Comp off requests routes
  app.get('/api/comp-off-requests', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const userId = req.query.userId as string;
      
      if (userId) {
        // Filter by specific user ID when provided
        const requests = await storage.getCompOffRequests(userId, orgId);
        res.json(requests);
      } else {
        // Return all requests for organization (for admin use)
        const requests = await storage.getCompOffRequestsByOrg(orgId);
        res.json(requests);
      }
    } catch (error) {
      console.error("Error fetching comp off requests:", error);
      res.status(500).json({ message: "Failed to fetch comp off requests" });
    }
  });

  app.post('/api/comp-off-requests', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from authenticated session or fallback to localStorage value stored in frontend
      const userId = req.user?.claims?.sub || req.body.userId || '1';
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Transform dates to proper format
      const requestData = {
        ...req.body,
        userId,
        orgId,
        workedDate: req.body.workedDate ? new Date(req.body.workedDate) : new Date(),
        compensateWith: req.body.compensateWith ? new Date(req.body.compensateWith) : null,
        leaveTypeId: req.body.leaveTypeId ? parseInt(req.body.leaveTypeId) : null,
        transferAmount: req.body.transferDays || null,
      };
      
      console.log("Creating comp-off request with data:", requestData);
      
      const validatedData = insertCompOffRequestSchema.parse(requestData);
      let request = await storage.createCompOffRequest(validatedData);
      
      // Check for applicable workflow based on comp-off action type
      let workflowSubProcess = '';
      switch (request.type) {
        case 'bank':
          workflowSubProcess = 'bank-comp-off';
          break;
        case 'avail':
          workflowSubProcess = 'avail-comp-off';
          break;
        case 'transfer':
          workflowSubProcess = 'transfer-comp-off';
          break;
        case 'en_cash':
          workflowSubProcess = 'encash-comp-off';
          break;
        default:
          workflowSubProcess = 'bank-comp-off';
      }
      
      const workflow = await findApplicableWorkflow('comp-off', workflowSubProcess, orgId);
      
      if (workflow && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
        // Start workflow process
        console.log(`Starting workflow for comp-off ${request.type} request`);
        request = await startCompOffWorkflow(request.id, workflow, request.userId, request.type);
        res.json({ ...request, workflowId: workflow.id, message: `Comp-off ${request.type} request submitted for approval` });
      } else {
        // Auto-approve if no workflow is configured
        console.log("Auto-approving comp-off request (no workflow configured)");
        request = await storage.approveCompOffRequest(request.id, 'system-auto-approval');

        // If this is a transfer request, handle the leave balance transfer
        if (request.type === 'transfer' && request.status === 'approved') {
          await handleCompOffTransfer(request, orgId);
        }
        
        res.json(request);
      }
    } catch (error) {
      console.error("Error creating comp off request:", error);
      console.error("Request body:", req.body);
      res.status(400).json({ message: "Failed to create comp off request", error: error.message });
    }
  });

  // Duplicate route removed - using the first GET route above

  // Helper function to find applicable workflow
  const findApplicableWorkflow = async (process: string, subProcess: string, orgId: number) => {
    const workflows = await storage.getWorkflows(orgId);
    return workflows.find(w => w.process === process && w.subProcesses && w.subProcesses.includes(subProcess));
  };

  // Helper function to start workflow for PTO request
  const startPTOWorkflow = async (requestId: number, workflow: any, userId: string) => {
    const approvalHistory = [{
      stepNumber: 0,
      action: 'submitted',
      userId: userId,
      timestamp: new Date().toISOString(),
      comment: 'PTO request submitted for approval'
    }];

    console.log(`Starting PTO workflow: request ID ${requestId}, workflow ID ${workflow.id}`);
    
    return await storage.updatePTORequest(requestId, {
      workflowId: workflow.id,
      currentStep: 1,
      workflowStatus: 'in_progress',
      approvalHistory: JSON.stringify(approvalHistory)
    });
  };

  // Helper function to start workflow for comp-off request
  const startCompOffWorkflow = async (requestId: number, workflow: any, userId: string, actionType: string) => {
    const approvalHistory = [{
      stepNumber: 0,
      action: 'submitted',
      userId: userId,
      timestamp: new Date().toISOString(),
      comment: `${actionType} comp-off request submitted for approval`
    }];

    return await storage.updateCompOffRequest(requestId, {
      workflowId: workflow.id,
      currentStep: 1,
      workflowStatus: 'in_progress',
      approvalHistory: JSON.stringify(approvalHistory)
    });
  };

  // PTO requests routes
  app.get('/api/pto-requests', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const userId = req.query.userId as string;
      
      const requests = await storage.getPTORequests(orgId, userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching PTO requests:", error);
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });

  app.patch('/api/comp-off-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers['x-org-id'] || '60';
      const validatedData = insertCompOffRequestSchema.partial().parse({ ...req.body, orgId: parseInt(orgId as string) });
      const request = await storage.updateCompOffRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating comp off request:", error);
      res.status(400).json({ message: "Failed to update comp off request" });
    }
  });

  app.delete('/api/comp-off-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompOffRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comp off request:", error);
      res.status(400).json({ message: "Failed to delete comp off request" });
    }
  });

  app.post('/api/comp-off-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const approvedBy = req.user.claims.sub;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Check if request has workflow
      const requests = await storage.getCompOffRequests(undefined, orgId);
      const request = requests.find(r => r.id === id);
      
      if (request?.workflowId) {
        // Process workflow approval
        const updatedRequest = await storage.processCompOffWorkflowApproval(id, approvedBy, orgId);
        
        // If final approval and transfer request, handle the transfer
        if (updatedRequest.workflowStatus === 'completed' && updatedRequest.type === 'transfer') {
          await handleCompOffTransfer(updatedRequest, orgId);
        }
        
        res.json(updatedRequest);
      } else {
        // Direct approval for non-workflow requests
        const approvedRequest = await storage.approveCompOffRequest(id, approvedBy);
        res.json(approvedRequest);
      }
    } catch (error) {
      console.error("Error approving comp off request:", error);
      res.status(400).json({ message: "Failed to approve comp off request" });
    }
  });

  app.post('/api/comp-off-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rejectedBy = req.user?.claims?.sub || 'system';
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { rejectionReason } = req.body;
      
      console.log(`Rejecting comp-off request ${id} by ${rejectedBy} in org ${orgId}`);
      
      // Get the specific request
      const requests = await storage.getCompOffRequests(undefined, orgId);
      const request = requests.find(r => r.id === id);
      
      if (!request) {
        return res.status(404).json({ message: "Comp-off request not found" });
      }
      
      console.log(`Found comp-off request for rejection:`, request);
      
      if (request.workflowId) {
        // Process workflow rejection
        console.log("Processing workflow rejection for comp-off request");
        const rejectedRequest = await storage.rejectCompOffWorkflowRequest(id, rejectedBy, rejectionReason, orgId);
        res.json(rejectedRequest);
      } else {
        // Direct rejection for non-workflow requests
        console.log("Direct rejection for comp-off request");
        const rejectedRequest = await storage.rejectCompOffRequest(id, rejectionReason, rejectedBy);
        res.json(rejectedRequest);
      }
    } catch (error) {
      console.error("Error rejecting comp-off request:", error);
      console.error("Error stack:", error.stack);
      res.status(400).json({ message: "Failed to reject comp-off request", error: error.message });
    }
  });

  // PTO approval endpoints
  app.post('/api/pto-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const approvedBy = req.user?.claims?.sub || 'system';
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      console.log(`Approving PTO request ${id} by ${approvedBy} in org ${orgId}`);
      
      // Get the specific request
      const requests = await storage.getPTORequests(orgId);
      const request = requests.find(r => r.id === id);
      
      if (!request) {
        return res.status(404).json({ message: "PTO request not found" });
      }
      
      console.log(`Found PTO request:`, request);
      
      if (request.workflowId) {
        // Process workflow approval
        console.log("Processing workflow approval for PTO request");
        const updatedRequest = await storage.processPTOWorkflowApproval(id, approvedBy, orgId);
        res.json(updatedRequest);
      } else {
        // Direct approval for non-workflow requests
        console.log("Direct approval for PTO request");
        const approvedRequest = await storage.updatePTORequest(id, {
          status: 'approved',
          approvedBy: approvedBy,
          approvedAt: new Date()
        });
        res.json(approvedRequest);
      }
    } catch (error) {
      console.error("Error approving PTO request:", error);
      console.error("Error stack:", error.stack);
      res.status(400).json({ message: "Failed to approve PTO request", error: error.message });
    }
  });

  app.post('/api/pto-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rejectedBy = req.user.claims.sub;
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { rejectionReason } = req.body;
      
      // Check if request has workflow
      const requests = await storage.getPTORequests(orgId);
      const request = requests.find(r => r.id === id);
      
      if (request?.workflowId) {
        // Process workflow rejection
        const rejectedRequest = await storage.rejectPTOWorkflowRequest(id, rejectedBy, rejectionReason, orgId);
        res.json(rejectedRequest);
      } else {
        // Direct rejection for non-workflow requests
        const rejectedRequest = await storage.updatePTORequest(id, {
          status: 'rejected',
          rejectionReason: rejectionReason
        });
        res.json(rejectedRequest);
      }
    } catch (error) {
      console.error("Error rejecting PTO request:", error);
      res.status(400).json({ message: "Failed to reject PTO request" });
    }
  });

  // File serving endpoint for document viewing
  app.get('/uploads/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const document = uploadedDocuments.get(fileId);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalname}"`);
    res.send(document.buffer);
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'text/csv',
        'application/csv',
        'text/comma-separated-values',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
      ];
      
      // Also check file extension as fallback
      const allowedExtensions = ['.csv', '.xls', '.xlsx'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        console.log('Rejected file:', file.originalname, 'MIME type:', file.mimetype);
        cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
      }
    }
  });

  // Configure multer for document uploads (supporting documents)
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, images, and Word documents are allowed.'));
      }
    }
  });

  // In-memory storage for uploaded documents (in production, use cloud storage)
  const uploadedDocuments = new Map<string, { buffer: Buffer; mimetype: string; originalname: string }>();

  // Document upload endpoint
  app.post('/api/upload-documents', isAuthenticated, documentUpload.array('documents', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = files.map(file => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
        uploadedDocuments.set(fileId, {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        });
        return {
          id: fileId,
          originalName: file.originalname,
          url: `/uploads/${fileId}`
        };
      });

      res.json({ documents: uploadedFiles });
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  // Helper function to validate date format (dd-MM-YYYY)
  function isValidDate(dateString: string): boolean {
    try {
      // Check format: dd-MM-YYYY
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(dateString)) {
        return false;
      }
      
      // Parse dd-MM-YYYY format
      const [day, month, year] = dateString.split('-').map(num => parseInt(num, 10));
      const date = new Date(year, month - 1, day); // month is 0-indexed
      
      // Verify the date is valid and matches input (handles invalid dates like 31-02-2023)
      return date.getFullYear() === year && 
             date.getMonth() === month - 1 && 
             date.getDate() === day;
    } catch {
      return false;
    }
  }

  // Helper function to convert dd-MM-YYYY to Date object
  function parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
  }

  // Import leave data validation endpoint
  app.post('/api/import-leave-data/validate', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get import type from request body (user selection)
      const importType = req.body.importType || 'balances';
      
      console.log(`[ExcelValidation] *** USER SELECTED ${importType.toUpperCase()} TEMPLATE *** Processing file: ${file.originalname}, size: ${file.size} bytes, org_id: ${orgId}`);
      console.log(`[ExcelValidation] Authorization header present:`, !!req.headers.authorization);
      console.log(`[ExcelValidation] Authorization header value:`, req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'null');

      // Helper function to get employee mapping from external API (same as execution)
      async function getEmployeeMapping(): Promise<Map<string, string>> {
        try {
          const authHeader = req.headers.authorization;
          console.log('[ExcelValidation] Authorization header:', authHeader ? 'present' : 'missing');
          console.log('[ExcelValidation] Authorization header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
          
          let jwtToken = '';
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            jwtToken = authHeader.substring(7);
            console.log('[ExcelValidation] Extracted JWT token, length:', jwtToken.length);
          } else {
            console.log('[ExcelValidation] Authorization header does not start with Bearer or is missing');
          }

          if (!jwtToken) {
            console.error('[ExcelValidation] No JWT token available for external API');
            console.error('[ExcelValidation] Authorization header present:', !!authHeader);
            console.error('[ExcelValidation] Authorization header format:', authHeader);
            return new Map();
          }
          
          console.log('[ExcelValidation] Making API call to external API...');
          const payload = {
            userBlocks: [1, 3, 4],
            userWise: 0,
            workerType: 0,
            attribute: 0,
            subAttributeId: 0
          };
          console.log('[ExcelValidation] API Payload:', payload);
          
          const response = await fetch('https://qa-api.resolveindia.com/reports/worker-master-leave', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          console.log('[ExcelValidation] External API response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[ExcelValidation] External API error:', response.status, response.statusText);
            console.error('[ExcelValidation] External API error body:', errorText);
            return new Map();
          }

          const data = await response.json();
          console.log('[ExcelValidation] External API response data keys:', Object.keys(data));
          console.log('[ExcelValidation] External API data.data.data length:', data.data?.data ? data.data.data.length : 'null');
          
          const employeeMap = new Map<string, string>();
          
          // The API response structure is data.data.data (nested data property)
          if (data.data?.data && Array.isArray(data.data.data)) {
            data.data.data.forEach((employee: any, index: number) => {
              if (employee.employee_number && employee.user_id) {
                employeeMap.set(employee.employee_number.toString(), employee.user_id.toString());
                if (index < 5) {
                  console.log(`[ExcelValidation] Sample mapping: ${employee.employee_number} -> ${employee.user_id}`);
                }
              }
            });
            console.log(`[ExcelValidation] Loaded ${employeeMap.size} employee mappings from external API`);
            
            // Debug: show first few mappings
            const firstFewMappings = Array.from(employeeMap.entries()).slice(0, 5);
            console.log('[ExcelValidation] First few employee mappings:', firstFewMappings);
          } else {
            console.log('[ExcelValidation] External API response structure:', JSON.stringify(data, null, 2));
          }
          
          return employeeMap;
        } catch (error) {
          console.error('[ExcelValidation] Error fetching employee mapping:', error);
          return new Map();
        }
      }

      // Get employee mapping for validation
      console.log('[ExcelValidation] *** CALLING getEmployeeMapping() NOW ***');
      const employeeMapping = await getEmployeeMapping();
      console.log('[ExcelValidation] Employee mapping result size:', employeeMapping.size);
      console.log('[ExcelValidation] Employee mapping retrieved, size:', employeeMapping.size);

      // Helper function to convert Excel serial dates to proper date strings
      function excelDateToJSDate(serial: number): Date {
        // Excel serial date epoch starts at 1900-01-01, but treats 1900 as a leap year
        const epochDiff = 25569; // Days between 1900-01-01 and 1970-01-01
        const msPerDay = 86400000; // Milliseconds per day
        
        // Handle Excel's leap year bug (1900 is not a leap year)
        const adjustedSerial = serial > 59 ? serial - 1 : serial;
        
        return new Date((adjustedSerial - epochDiff) * msPerDay);
      }

      // Helper function to format date to dd-MM-YYYY
      function formatDateToDDMMYYYY(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }

      // Helper function to handle Excel date values
      function processExcelDate(value: any): string {
        if (typeof value === 'number') {
          // It's an Excel serial date number
          const jsDate = excelDateToJSDate(value);
          return formatDateToDDMMYYYY(jsDate);
        } else if (typeof value === 'string') {
          // It's already a string, return as-is
          return value;
        } else {
          // Unknown format, convert to string
          return String(value);
        }
      }

      // Parse Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log(`[ExcelValidation] Sheet name: ${sheetName}`);
      
      // Convert to JSON and filter out header rows
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Use first row as header
        defval: '' // Default value for empty cells
      });
      
      console.log(`[ExcelValidation] Raw data rows: ${rawData.length}`);
      console.log(`[ExcelValidation] First 10 raw rows:`, rawData.slice(0, 10));
      
      // Debug each row in detail
      rawData.forEach((row: any, index: number) => {
        if (index < 10) {
          console.log(`[ExcelValidation] Row ${index}:`, row);
          console.log(`[ExcelValidation] Row ${index} [0]:`, row[0], typeof row[0]);
          console.log(`[ExcelValidation] Row ${index} [1]:`, row[1], typeof row[1]);
          console.log(`[ExcelValidation] Row ${index} [2]:`, row[2], typeof row[2]);
          console.log(`[ExcelValidation] Row ${index} [3]:`, row[3], typeof row[3]);
        }
      });
      
      // Filter out rows that are clearly headers or empty
      const jsonData = rawData
        .filter((row: any, index: number) => {
          // Skip first 3 rows entirely (they're always headers in the template)
          if (index < 3) {
            console.log(`[ExcelValidation] Skipping row ${index} - header rows`);
            return false;
          }
          
          // Skip if row is completely empty
          if (!row[0] && !row[1] && !row[2]) {
            return false;
          }
          
          // Skip if first column is empty
          if (!row[0]) {
            return false;
          }
          
          const empNumber = row[0].toString().trim();
          
          // Skip if empty after trim
          if (empNumber === '') {
            return false;
          }
          
          // Skip any long descriptive text (> 25 chars is definitely not an employee ID)
          if (empNumber.length > 25) {
            console.log(`[ExcelValidation] Skipping long text row: "${empNumber.substring(0, 30)}..."`);
            return false;
          }
          
          // Skip any text containing "leave" or "details"
          if (empNumber.toLowerCase().includes('leave') || 
              empNumber.toLowerCase().includes('details') ||
              empNumber.toLowerCase().includes('emp') ||
              empNumber.toLowerCase().includes('name') ||
              empNumber.toLowerCase().includes('type') ||
              empNumber.toLowerCase().includes('start') ||
              empNumber.toLowerCase().includes('end') ||
              empNumber.toLowerCase().includes('total') ||
              empNumber.toLowerCase().includes('status')) {
            console.log(`[ExcelValidation] Skipping header-like text: "${empNumber}"`);
            return false;
          }
          
          console.log(`[ExcelValidation] ✓ Valid employee row: "${empNumber}"`);
          return true;
        })
        .map((row: any) => {
          if (importType === 'balances') {
            return {
              EmpNumber: row[0],
              EmpName: row[1], 
              LeaveType: row[2],
              LeaveOpeningBalance: row[3] || 0,
              LeaveAvailed: row[4] || 0,
              LeaveEncashed: row[5] || 0,
              LeaveLapsed: row[6] || 0
            };
          } else {
            // Log raw values first
            console.log(`[ExcelValidation] Raw row data for ${row[0]}: row[3]=${row[3]} (${typeof row[3]}), row[4]=${row[4]} (${typeof row[4]}), row[5]=${row[5]} (${typeof row[5]})`);
            
            // Apply Excel date conversion for transaction dates
            const startDate = processExcelDate(row[3]);
            const endDate = processExcelDate(row[4]);
            
            console.log(`[ExcelValidation] Date conversion for ${row[0]}: startDate ${row[3]} -> ${startDate}, endDate ${row[4]} -> ${endDate}`);
            
            return {
              EmpNumber: row[0],
              EmpName: row[1], 
              LeaveType: row[2],
              LeaveTakenStartDate: startDate,
              'Is Start Date a Half Day': false,
              LeaveTakenEndDate: endDate, 
              'Is End Date a Half Day': false,
              TotalLeaveDays: parseFloat(row[5]) || 0,
              Status: row[6] || 'approved'
            };
          }
        });

      const validationErrors: string[] = [];
      const validData: any[] = [];

      // Get existing leave types for validation
      const leaveTypes = await storage.getLeaveTypes(orgId);
      const leaveTypeNames = leaveTypes.map(lt => lt.name.toLowerCase());
      
      console.log(`[ExcelValidation] Available leave types: ${leaveTypes.map(lt => lt.name).join(', ')}`);

      // Get existing employee leave balances to check for existing data
      const existingBalances = await storage.getAllEmployeeLeaveBalances(orgId);
      
      console.log(`[ExcelValidation] Existing balances count: ${existingBalances.length}`);
      
      // Validate each row
      for (let index = 0; index < (jsonData as any[]).length; index++) {
        const row = (jsonData as any[])[index];
        const rowNum = index + 5; // Adjust for header rows (title, empty, header, data starts at row 5)
        
        // Skip empty rows
        if (!row.EmpNumber && !row.EmpName) continue;
        
        // Skip header/description rows by checking for common header patterns
        if (typeof row.EmpNumber === 'string' && 
            row.EmpNumber.toLowerCase().includes('leave availed details')) {
          console.log(`[ExcelValidation] Skipping header/description row: ${row.EmpNumber.substring(0, 50)}...`);
          continue;
        }
        
        if (typeof row.EmpNumber === 'string' && (
          row.EmpNumber.toLowerCase().includes('empnumber') ||
          row.EmpNumber.toLowerCase().includes('employee number') ||
          row.EmpNumber.toLowerCase().includes('emp number')
        )) {
          console.log(`[ExcelValidation] Skipping header row: ${row.EmpNumber}`);
          continue;
        }
        
        // Skip rows with empty required fields
        if (!row.EmpName || !row.LeaveType || 
            (typeof row.EmpName === 'string' && row.EmpName.trim().length === 0) ||
            (typeof row.LeaveType === 'string' && row.LeaveType.trim().length === 0)) {
          console.log(`[ExcelValidation] Skipping row with empty fields: EmpName="${row.EmpName}" LeaveType="${row.LeaveType}"`);
          continue;
        }
        
        // Validate required fields
        if (!row.EmpNumber) {
          validationErrors.push(`Row ${rowNum}: Employee Number is required`);
        }
        if (!row.EmpName) {
          validationErrors.push(`Row ${rowNum}: Employee Name is required`);
        }
        if (!row.LeaveType) {
          validationErrors.push(`Row ${rowNum}: Leave Type is required`);
        }
        
        // Validate fields based on import type
        if (importType === 'balances') {
          // Parse balance fields
          const openingBalance = parseFloat(row.LeaveOpeningBalance || '0') || 0;
          const availed = parseFloat(row.LeaveAvailed || '0') || 0;
          const encashed = parseFloat(row.LeaveEncashed || '0') || 0;
          const lapsed = parseFloat(row.LeaveLapsed || '0') || 0;
          
          console.log(`[ExcelValidation] Processing employee ${row.EmpNumber} with opening balance: ${openingBalance}`);
          
          // Validate numeric fields for balances - allow empty cells, default to 0
          const numericFields = ['LeaveOpeningBalance', 'LeaveAvailed', 'LeaveEncashed', 'LeaveLapsed'];
          numericFields.forEach(field => {
            if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
              // Clean the value - remove spaces and handle common text values
              let cleanValue = row[field];
              if (typeof cleanValue === 'string') {
                cleanValue = cleanValue.trim();
                // Handle common text values that should be 0
                if (cleanValue === '-' || cleanValue === 'N/A' || cleanValue === 'null' || cleanValue === '' || cleanValue === 'true' || cleanValue === 'false') {
                  cleanValue = '0';
                }
              } else if (typeof cleanValue === 'boolean') {
                // Convert boolean to 0
                cleanValue = '0';
              }
              
              const value = parseFloat(cleanValue);
              if (isNaN(value) || value < 0) {
                validationErrors.push(`Row ${rowNum}: ${field} must be a valid number (0 or greater). Found: "${row[field]}"`);
              }
            }
          });
        } else {
          // Validate transaction fields with new column format
          if (!row.LeaveTakenStartDate) {
            validationErrors.push(`Row ${rowNum}: LeaveTakenStartDate is required`);
          }
          if (!row.LeaveTakenEndDate) {
            validationErrors.push(`Row ${rowNum}: LeaveTakenEndDate is required`);
          }
          if (!row.TotalLeaveDays || parseFloat(row.TotalLeaveDays) <= 0) {
            validationErrors.push(`Row ${rowNum}: TotalLeaveDays must be a positive number`);
          }
          
          // Validate status field
          const validStatuses = ['approved', 'pending', 'rejected', 'withdrawn', 'Approved', 'Pending', 'Rejected', 'Withdrawn'];
          if (row.Status) {
            const statusValue = row.Status.toString().trim();
            if (!validStatuses.includes(statusValue)) {
              console.log(`[ExcelValidation] Status validation failed for row ${rowNum}: "${statusValue}" (type: ${typeof row.Status}) not in valid statuses: ${validStatuses.join(', ')}`);
              validationErrors.push(`Row ${rowNum}: Status must be one of: Approved, Pending, Rejected, or Withdrawn`);
            }
          }
          
          // Validate date format
          if (row.LeaveTakenStartDate && !isValidDate(row.LeaveTakenStartDate)) {
            validationErrors.push(`Row ${rowNum}: LeaveTakenStartDate must be a valid date (dd-MM-YYYY format)`);
          }
          if (row.LeaveTakenEndDate && !isValidDate(row.LeaveTakenEndDate)) {
            validationErrors.push(`Row ${rowNum}: LeaveTakenEndDate must be a valid date (dd-MM-YYYY format)`);
          }
          
          // Validate half day fields (should be TRUE/FALSE or boolean)
          const validHalfDayValues = ['TRUE', 'FALSE', true, false, '', null, undefined];
          if (row['Is Start Date a Half Day'] !== undefined && row['Is Start Date a Half Day'] !== null && row['Is Start Date a Half Day'] !== '' && 
              !validHalfDayValues.includes(row['Is Start Date a Half Day'])) {
            validationErrors.push(`Row ${rowNum}: 'Is Start Date a Half Day' must be TRUE or FALSE`);
          }
          if (row['Is End Date a Half Day'] !== undefined && row['Is End Date a Half Day'] !== null && row['Is End Date a Half Day'] !== '' && 
              !validHalfDayValues.includes(row['Is End Date a Half Day'])) {
            validationErrors.push(`Row ${rowNum}: 'Is End Date a Half Day' must be TRUE or FALSE`);
          }
          
          console.log(`[ExcelValidation] Processing transaction for employee ${row.EmpNumber}: ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate}, ${row.TotalLeaveDays} days`);
        }

        // Map leave type codes to full names and handle common misspellings
        let mappedLeaveType = row.LeaveType;
        if (row.LeaveType === 'EL') mappedLeaveType = 'Earned Leave';
        else if (row.LeaveType === 'CL') mappedLeaveType = 'Casual Leave';
        else if (row.LeaveType === 'SL') mappedLeaveType = 'Sick Leave';
        else if (row.LeaveType === 'ML') mappedLeaveType = 'Maternity Leave';
        else if (row.LeaveType === 'PL') mappedLeaveType = 'Paternity Leave';
        else if (row.LeaveType === 'BL') mappedLeaveType = 'Bereavement Leave';
        else if (row.LeaveType === 'Privilege Leave') mappedLeaveType = 'Privilege Leave';
        else if (row.LeaveType === 'Privelege Leave') mappedLeaveType = 'Privilege Leave'; // Handle common misspelling
        
        console.log(`[ExcelValidation] Row ${rowNum}: LeaveType "${row.LeaveType}" mapped to "${mappedLeaveType}"`);

        // Validate leave type exists (case insensitive)
        if (mappedLeaveType && !leaveTypeNames.includes(mappedLeaveType.toLowerCase())) {
          validationErrors.push(`Row ${rowNum}: Leave Type "${row.LeaveType}" not found. Available types: ${leaveTypes.map(lt => lt.name).join(', ')}`);
        }

        // Validate employee exists in external API
        if (row.EmpNumber && !employeeMapping.has(row.EmpNumber.toString())) {
          validationErrors.push(`Row ${rowNum}: Employee Number "${row.EmpNumber}" not found in organization directory`);
        }

        if (validationErrors.length < 50) { // Limit error messages
          if (importType === 'balances') {
            // Parse balance fields for balance import
            const openingBalance = parseFloat(row.LeaveOpeningBalance || '0') || 0;
            const availed = parseFloat(row.LeaveAvailed || '0') || 0;
            const encashed = parseFloat(row.LeaveEncashed || '0') || 0;
            const lapsed = parseFloat(row.LeaveLapsed || '0') || 0;
            
            validData.push({
              ...row,
              LeaveType: mappedLeaveType,
              LeaveOpeningBalance: openingBalance,
              LeaveAvailed: availed,
              LeaveEncashed: encashed,
              LeaveLapsed: lapsed
            });
          } else {
            // Process Status field - handle both numeric and text values
            let statusValue = 'approved'; // default
            if (row.Status) {
              if (typeof row.Status === 'string') {
                statusValue = row.Status.toLowerCase();
              } else if (typeof row.Status === 'number') {
                // Convert numeric status to text
                switch(row.Status) {
                  case 1:
                    statusValue = 'approved';
                    break;
                  case 0:
                    statusValue = 'rejected';
                    break;
                  case 2:
                    statusValue = 'pending';
                    break;
                  case 3:
                    statusValue = 'withdrawn';
                    break;
                  default:
                    statusValue = 'approved';
                }
              }
            }
            
            validData.push({
              ...row,
              LeaveType: mappedLeaveType,
              LeaveTakenStartDate: row.LeaveTakenStartDate,
              LeaveTakenEndDate: row.LeaveTakenEndDate,
              TotalLeaveDays: parseFloat(row.TotalLeaveDays) || 0,
              'Is Start Date a Half Day': row['Is Start Date a Half Day'] === 'TRUE' || row['Is Start Date a Half Day'] === true,
              'Is End Date a Half Day': row['Is End Date a Half Day'] === 'TRUE' || row['Is End Date a Half Day'] === true,
              Status: statusValue
            });
          }
        }
      }

      console.log(`[ExcelValidation] Final result - Total rows: ${jsonData.length}, Valid rows: ${validData.length}, Errors: ${validationErrors.length}`);
      console.log(`[ExcelValidation] First valid data item:`, validData[0]);
      console.log(`[ExcelValidation] First error:`, validationErrors[0]);

      // Transform data to match frontend expectations (camelCase field names)
      const transformedData = validData.map(row => {
        if (importType === 'balances') {
          return {
            empNumber: row.EmpNumber,
            empName: row.EmpName,
            leaveType: row.LeaveType,
            openingBalance: row.LeaveOpeningBalance,
            availed: row.LeaveAvailed,
            encashed: row.LeaveEncashed,
            lapsed: row.LeaveLapsed,
            currentBalance: row.LeaveOpeningBalance - row.LeaveAvailed - row.LeaveEncashed - row.LeaveLapsed
          };
        } else {
          return {
            empNumber: row.EmpNumber,
            empName: row.EmpName,
            leaveType: row.LeaveType,
            startDate: row.LeaveTakenStartDate,
            endDate: row.LeaveTakenEndDate,
            days: row.TotalLeaveDays,
            isStartHalfDay: row['Is Start Date a Half Day'],
            isEndHalfDay: row['Is End Date a Half Day'],
            status: row.Status || 'approved'
          };
        }
      });

      console.log(`[ExcelValidation] Transformed first item:`, transformedData[0]);
      console.log(`[ExcelValidation] Transformed data length:`, transformedData.length);
      console.log(`[ExcelValidation] Sending preview with ${transformedData.slice(0, 10).length} items`);

      res.json({
        preview: transformedData.slice(0, 10), // Show first 10 rows
        errors: validationErrors.slice(0, 20), // Limit error messages
        totalRows: jsonData.length,
        validRows: validData.length
      });

    } catch (error) {
      console.error("Error validating import file:", error);
      res.status(500).json({ message: "Failed to validate file: " + (error as Error).message });
    }
  });

  // Import leave data execution endpoint
  app.post('/api/import-leave-data/execute', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const file = req.file;
      const importType = req.body.importType || 'balances';
      
      console.log(`[ExcelExecution] Processing ${importType} import for org_id: ${orgId}`);
      console.log(`[ExcelExecution] All request headers:`, Object.keys(req.headers));
      console.log(`[ExcelExecution] Authorization header present:`, !!req.headers.authorization);
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Helper function to get employee mapping from external API
      async function getEmployeeMapping(): Promise<Map<string, string>> {
        try {
          // Try to get JWT token from headers or use stored token
          const authHeader = req.headers.authorization;
          let jwtToken = '';
          
          console.log('[ExcelImport] Authorization header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            jwtToken = authHeader.substring(7);
            console.log('[ExcelImport] Extracted JWT token from Authorization header, length:', jwtToken.length);
          }

          if (!jwtToken) {
            console.error('[ExcelImport] No JWT token available for external API');
            console.error('[ExcelImport] Authorization header present:', !!authHeader);
            console.error('[ExcelImport] Authorization header value:', authHeader || 'null');
            return new Map();
          }
          
          console.log('[ExcelImport] Using JWT token for external API, length:', jwtToken.length);

          const payload = {
            userBlocks: [1, 3, 4],
            userWise: 0,
            workerType: 0,
            attribute: 0,
            subAttributeId: 0
          };
          console.log('[ExcelImport] API Payload:', payload);

          const response = await fetch('https://qa-api.resolveindia.com/reports/worker-master-leave', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            console.error('[ExcelImport] External API error:', response.status, response.statusText);
            return new Map();
          }

          const data = await response.json();
          const employeeMap = new Map<string, string>();
          
          // The API response structure is data.data.data (nested data property)
          if (data.data?.data && Array.isArray(data.data.data)) {
            data.data.data.forEach((employee: any) => {
              if (employee.employee_number && employee.user_id) {
                employeeMap.set(employee.employee_number.toString(), employee.user_id.toString());
              }
            });
            console.log(`[ExcelImport] Loaded ${employeeMap.size} employee mappings from external API`);
          }
          
          return employeeMap;
        } catch (error) {
          console.error('[ExcelImport] Error fetching employee mapping:', error);
          return new Map();
        }
      }

      // Get employee mapping from external API
      const employeeMapping = await getEmployeeMapping();
      console.log(`[ExcelImport] Employee mapping size: ${employeeMapping.size}`);
      if (employeeMapping.size > 0) {
        console.log(`[ExcelImport] Sample mappings:`, Array.from(employeeMapping.entries()).slice(0, 3));
      }

      // Helper function to convert Excel serial dates to proper date strings (same as validation)
      function excelDateToJSDate(serial: number): Date {
        const epochDiff = 25569;
        const msPerDay = 86400000;
        const adjustedSerial = serial > 59 ? serial - 1 : serial;
        return new Date((adjustedSerial - epochDiff) * msPerDay);
      }

      function formatDateToDDMMYYYY(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }

      function processExcelDate(value: any): string {
        if (typeof value === 'number') {
          const jsDate = excelDateToJSDate(value);
          return formatDateToDDMMYYYY(jsDate);
        } else if (typeof value === 'string') {
          return value;
        } else {
          return String(value);
        }
      }

      // Parse Excel file (same as validation)
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON and filter out header rows
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Use first row as header
        defval: '' // Default value for empty cells
      });
      
      // Filter out rows that are clearly headers or empty
      const jsonData = rawData
        .filter((row: any, index: number) => {
          // Skip first 3 rows entirely (they're always headers in the template)
          if (index < 3) {
            return false;
          }
          
          // Skip if row is completely empty
          if (!row[0] && !row[1] && !row[2]) {
            return false;
          }
          
          // Skip if first column is empty
          if (!row[0]) {
            return false;
          }
          
          const empNumber = row[0].toString().trim();
          
          // Skip if empty after trim
          if (empNumber === '') {
            return false;
          }
          
          // Skip any long descriptive text (> 25 chars is definitely not an employee ID)
          if (empNumber.length > 25) {
            return false;
          }
          
          // Skip any text containing header keywords
          if (empNumber.toLowerCase().includes('leave') || 
              empNumber.toLowerCase().includes('details') ||
              empNumber.toLowerCase().includes('emp') ||
              empNumber.toLowerCase().includes('name') ||
              empNumber.toLowerCase().includes('type') ||
              empNumber.toLowerCase().includes('start') ||
              empNumber.toLowerCase().includes('end') ||
              empNumber.toLowerCase().includes('total') ||
              empNumber.toLowerCase().includes('status')) {
            return false;
          }
          
          return true;
        })
        .map((row: any) => {
          if (importType === 'balances') {
            return {
              EmpNumber: row[0],
              EmpName: row[1], 
              LeaveType: row[2],
              LeaveOpeningBalance: row[3] || 0,
              LeaveAvailed: row[4] || 0,
              LeaveEncashed: row[5] || 0,
              LeaveLapsed: row[6] || 0
            };
          } else {
            // Log raw values first
            console.log(`[ExcelImport] Raw row data for ${row[0]}: row[3]=${row[3]} (${typeof row[3]}), row[4]=${row[4]} (${typeof row[4]}), row[5]=${row[5]} (${typeof row[5]})`);
            
            // Apply Excel date conversion for transaction dates
            const startDate = processExcelDate(row[3]);
            const endDate = processExcelDate(row[4]);
            
            console.log(`[ExcelImport] Date conversion for ${row[0]}: startDate ${row[3]} -> ${startDate}, endDate ${row[4]} -> ${endDate}`);
            
            return {
              EmpNumber: row[0],
              EmpName: row[1], 
              LeaveType: row[2],
              LeaveTakenStartDate: startDate,
              'Is Start Date a Half Day': false,
              LeaveTakenEndDate: endDate, 
              'Is End Date a Half Day': false,
              TotalLeaveDays: parseFloat(row[5]) || 0,
              Status: row[6] || 'approved'
            };
          }
        });

      const leaveTypes = await storage.getLeaveTypes(orgId);
      const currentYear = new Date().getFullYear();
      
      // Get existing employee leave balances to check for existing data
      const existingBalances = await storage.getAllEmployeeLeaveBalances(orgId);
      let importedCount = 0;

      console.log(`[ExcelImport] Starting import for ${jsonData.length} rows`);
      
      for (const row of jsonData as any[]) {
        if (importType === 'balances') {
          console.log(`[ExcelImport] Processing balance row:`, { EmpNumber: row.EmpNumber, EmpName: row.EmpName, LeaveType: row.LeaveType, OpeningBalance: row.LeaveOpeningBalance });
        } else {
          console.log(`[ExcelImport] Processing transaction row:`, { EmpNumber: row.EmpNumber, EmpName: row.EmpName, LeaveType: row.LeaveType, StartDate: row.StartDate, EndDate: row.EndDate, Days: row.Days });
        }
        
        if (!row.EmpNumber || !row.EmpName || !row.LeaveType) {
          console.log(`[ExcelImport] Skipping row due to missing fields`);
          continue;
        }
        
        // Skip header/description rows by checking for common header patterns
        if (typeof row.EmpNumber === 'string' && 
            row.EmpNumber.toLowerCase().includes('leave availed details')) {
          console.log(`[ExcelImport] Skipping header/description row: ${row.EmpNumber.substring(0, 50)}...`);
          continue;
        }
        
        if (typeof row.EmpNumber === 'string' && (
          row.EmpNumber.toLowerCase().includes('empnumber') ||
          row.EmpNumber.toLowerCase().includes('employee number') ||
          row.EmpNumber.toLowerCase().includes('emp number')
        )) {
          console.log(`[ExcelImport] Skipping header row: ${row.EmpNumber}`);
          continue;
        }
        
        // Skip rows with empty required fields
        if (!row.EmpName || !row.LeaveType || 
            (typeof row.EmpName === 'string' && row.EmpName.trim().length === 0) ||
            (typeof row.LeaveType === 'string' && row.LeaveType.trim().length === 0)) {
          console.log(`[ExcelImport] Skipping row with empty fields: EmpName="${row.EmpName}" LeaveType="${row.LeaveType}"`);
          continue;
        }

        if (importType === 'balances') {
          // Parse balance fields to check for zeros
          const openingBalance = parseFloat(row.LeaveOpeningBalance || '0') || 0;
          const availed = parseFloat(row.LeaveAvailed || '0') || 0;
        const encashed = parseFloat(row.LeaveEncashed || '0') || 0;
        const lapsed = parseFloat(row.LeaveLapsed || '0') || 0;
        
        console.log(`[ExcelImport] Parsed balances:`, { openingBalance, availed, encashed, lapsed });
        
        // Process ALL rows including zero balances - they still get configured entitlement
        console.log(`[ExcelImport] Processing employee ${row.EmpNumber} with opening balance: ${openingBalance}`);
        
        // Map employee number to user_id
        const userId = employeeMapping.get(row.EmpNumber.toString());
        if (!userId) {
          console.log(`[ExcelImport] No user_id found for employee number: ${row.EmpNumber}`);
          continue;
        }
        console.log(`[ExcelImport] Mapped employee ${row.EmpNumber} to user_id: ${userId}`);

        // Map leave type codes
        let mappedLeaveType = row.LeaveType;
        if (row.LeaveType === 'EL') mappedLeaveType = 'Earned Leave';
        else if (row.LeaveType === 'CL') mappedLeaveType = 'Casual Leave';
        else if (row.LeaveType === 'SL') mappedLeaveType = 'Sick Leave';
        else if (row.LeaveType === 'ML') mappedLeaveType = 'Maternity Leave';
        else if (row.LeaveType === 'PL') mappedLeaveType = 'Paternity Leave';
        else if (row.LeaveType === 'BL') mappedLeaveType = 'Bereavement Leave';

        // Find matching leave type
        console.log(`[ExcelImport] Looking for leave type:`, mappedLeaveType);
        console.log(`[ExcelImport] Available leave types:`, leaveTypes.map(lt => lt.name));
        const leaveType = leaveTypes.find(lt => lt.name.toLowerCase() === mappedLeaveType.toLowerCase());
        if (!leaveType) {
          console.log(`[ExcelImport] No leave type found for:`, mappedLeaveType);
          continue;
        }
        console.log(`[ExcelImport] Found leave type:`, leaveType);

        // Find leave variant for this leave type
        const leaveVariants = await storage.getLeaveVariants(orgId);
        console.log(`[ExcelImport] Available leave variants:`, leaveVariants.map(v => ({ id: v.id, leaveTypeId: v.leaveTypeId, name: v.leaveTypeName })));
        const variant = leaveVariants.find(v => v.leaveTypeId === leaveType.id);
        if (!variant) {
          console.log(`[ExcelImport] No leave variant found for leave type ID:`, leaveType.id);
          continue;
        }
        console.log(`[ExcelImport] Found leave variant:`, variant);

        try {
          // Use the already parsed balance values from above
          
          // Calculate total entitlement correctly
          const currentYear = new Date().getFullYear();
          // Add Excel opening balance to configured entitlement (total = config + imported)
          // This gives employees their configured entitlement PLUS additional balance from Excel
          const configuredEntitlement = variant.paidDaysInYear || 0;
          const importedEntitlement = openingBalance;
          const annualEntitlement = configuredEntitlement + importedEntitlement;
          
          // Calculate total used balance (what has been consumed)
          const totalUsed = availed + encashed + lapsed;
          
          // Calculate current available balance (what's left from total entitlement)
          const currentBalance = Math.max(0, annualEntitlement - totalUsed);
          
          console.log(`[ExcelImport] Entitlement calculation for ${row.EmpNumber}:`, {
            configuredEntitlement,
            importedEntitlement, 
            finalAnnualEntitlement: annualEntitlement
          });
          
          // Create or update leave balance (store in full-day units)
          await storage.upsertLeaveBalance({
            userId: userId,
            leaveVariantId: variant.id,
            totalEntitlement: annualEntitlement, // Annual entitlement in full days
            currentBalance: currentBalance, // Available balance in full days
            usedBalance: totalUsed, // Used balance in full days
            carryForward: 0, // Set to 0 for imported data
            year: currentYear,
            orgId
          });

          // Create transaction records for audit trail
          const transactions = [];
          
          // Create separate transactions for configured entitlement and imported opening balance
          if (configuredEntitlement > 0) {
            transactions.push({
              userId: userId,
              leaveVariantId: variant.id,
              transactionType: 'grant',
              amount: configuredEntitlement, // Configured entitlement in full days
              balanceAfter: configuredEntitlement,
              description: `Annual entitlement (${configuredEntitlement} days)`,
              transactionDate: new Date(),
              year: currentYear,
              orgId
            });
          }
          
          // Create separate transaction for imported opening balance
          if (importedEntitlement > 0) {
            transactions.push({
              userId: userId,
              leaveVariantId: variant.id,
              transactionType: 'grant',
              amount: importedEntitlement, // Imported balance in full days
              balanceAfter: annualEntitlement, // Total after both grants
              description: `Opening balance imported from Excel (${importedEntitlement} days)`,
              transactionDate: new Date(),
              year: currentYear,
              orgId
            });
          }
          
          if (availed > 0) {
            transactions.push({
              userId: userId,
              leaveVariantId: variant.id,
              transactionType: 'deduction',
              amount: -availed, // Negative for deduction in full days
              balanceAfter: annualEntitlement - availed,
              description: `Leave availed - imported from Excel (${availed} days)`,
              transactionDate: new Date(),
              year: currentYear,
              orgId
            });
          }
          
          if (encashed > 0) {
            transactions.push({
              userId: userId,
              leaveVariantId: variant.id,
              transactionType: 'deduction',
              amount: -encashed, // Negative for deduction in full days
              balanceAfter: annualEntitlement - availed - encashed,
              description: `Leave encashed - imported from Excel (${encashed} days)`,
              transactionDate: new Date(),
              year: currentYear,
              orgId
            });
          }
          
          if (lapsed > 0) {
            transactions.push({
              userId: userId,
              leaveVariantId: variant.id,
              transactionType: 'deduction',
              amount: -lapsed, // Negative for deduction in full days
              balanceAfter: currentBalance,
              description: `Leave lapsed - imported from Excel (${lapsed} days)`,
              transactionDate: new Date(),
              year: currentYear,
              orgId
            });
          }
          
          // Create all transaction records (only once with correct user ID)
          for (const transaction of transactions) {
            await storage.createLeaveBalanceTransaction(transaction);
          }

          importedCount++;
        } catch (error) {
          console.error(`Error importing row for ${row.EmpNumber}:`, error);
          // Continue with next row
        }
        } else {
          // Transaction import logic - using new column format
          try {
            // Map employee number to user_id
            const userId = employeeMapping.get(row.EmpNumber.toString());
            if (!userId) {
              console.log(`[TransactionImport] No user_id found for employee number: ${row.EmpNumber}`);
              continue;
            }
            console.log(`[TransactionImport] Mapped employee ${row.EmpNumber} to user_id: ${userId}`);

            // Map leave type codes
            let mappedLeaveType = row.LeaveType;
            if (row.LeaveType === 'EL') mappedLeaveType = 'Earned Leave';
            else if (row.LeaveType === 'CL') mappedLeaveType = 'Casual Leave';
            else if (row.LeaveType === 'SL') mappedLeaveType = 'Sick Leave';
            else if (row.LeaveType === 'ML') mappedLeaveType = 'Maternity Leave';
            else if (row.LeaveType === 'PL') mappedLeaveType = 'Paternity Leave';
            else if (row.LeaveType === 'BL') mappedLeaveType = 'Bereavement Leave';

            // Find matching leave type
            const leaveType = leaveTypes.find(lt => lt.name.toLowerCase() === mappedLeaveType.toLowerCase());
            if (!leaveType) {
              console.log(`[TransactionImport] No leave type found for:`, mappedLeaveType);
              continue;
            }

            // Parse new column format with dd-MM-YYYY dates
            const startDate = parseDate(row.LeaveTakenStartDate);
            const endDate = parseDate(row.LeaveTakenEndDate);
            const totalDays = parseFloat(row.TotalLeaveDays) || 0;
            const isStartHalfDay = row['Is Start Date a Half Day'] === 'TRUE' || row['Is Start Date a Half Day'] === true;
            const isEndHalfDay = row['Is End Date a Half Day'] === 'TRUE' || row['Is End Date a Half Day'] === true;
            // Process Status field - handle both numeric and text values
            let status = 'approved'; // default
            if (row.Status) {
              if (typeof row.Status === 'string') {
                status = row.Status.toLowerCase();
              } else if (typeof row.Status === 'number') {
                // Convert numeric status to text
                switch(row.Status) {
                  case 1:
                    status = 'approved';
                    break;
                  case 0:
                    status = 'rejected';
                    break;
                  case 2:
                    status = 'pending';
                    break;
                  case 3:
                    status = 'withdrawn';
                    break;
                  default:
                    status = 'approved';
                }
              }
            }

            // Convert to numeric format for database (store in half-day units)
            let totalDaysNumeric = totalDays;
            let workingDaysNumeric = totalDays; // Assume same for imported data

            console.log(`[TransactionImport] Processing: ${row.EmpName} ${mappedLeaveType} from ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate} (${totalDays} days) - Status: ${status}`);

            // Create leave request from transaction data
            const leaveRequest = {
              userId: userId,
              leaveTypeId: leaveType.id,
              startDate: startDate,
              endDate: endDate,
              totalDays: totalDaysNumeric,
              workingDays: workingDaysNumeric,
              isStartHalfDay: isStartHalfDay,
              isEndHalfDay: isEndHalfDay,
              reason: `Imported leave transaction for ${row.EmpName}`,
              status: status, // Use status from Excel file
              orgId,
              documents: [],
              workflowId: null,
              workflowStatus: status === 'approved' ? 'completed' : (status === 'rejected' ? 'rejected' : 'pending'),
              approvalHistory: JSON.stringify([{
                stepNumber: 0,
                action: 'imported',
                userId: 'system',
                timestamp: new Date().toISOString(),
                comment: `Leave transaction imported from Excel with status: ${status}`
              }]),
              appliedDate: startDate, // Use start date as applied date
              approvedBy: status === 'approved' ? 'system-import' : null,
              approvedAt: status === 'approved' ? new Date() : null
            };

            console.log(`[TransactionImport] Creating leave request:`, leaveRequest);
            const createdRequest = await storage.createLeaveRequest(leaveRequest);
            
            // Only create balance transactions for APPROVED imported leave
            // Pending leave should not affect balances until approved
            if (status === 'approved') {
              const leaveVariants = await storage.getLeaveVariants(orgId);
              const variant = leaveVariants.find(v => v.leaveTypeId === leaveType.id);
              
              if (variant) {
                // Get/create employee balance
                const balances = await storage.getEmployeeLeaveBalances(userId, currentYear, orgId);
                let relevantBalance = balances.find(b => b.leaveVariantId === variant.id);
                
                if (!relevantBalance) {
                  // Create balance if it doesn't exist
                  relevantBalance = await storage.createEmployeeLeaveBalance({
                    userId: userId,
                    leaveVariantId: variant.id,
                    totalEntitlement: 0,
                    currentBalance: 0,
                    year: currentYear,
                    orgId
                  });
                }
                  
                // Deduct in full-day units
                const newBalance = relevantBalance.currentBalance - totalDays;
                
                // Create transaction record
                await storage.createLeaveBalanceTransaction({
                  userId: userId,
                  leaveVariantId: variant.id,
                  year: currentYear,
                  transactionType: "deduction",
                  amount: -totalDays, // Negative for deduction
                  balanceAfter: newBalance,
                  description: `Imported leave transaction: ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate} (${totalDays} days) - Status: ${status}`,
                  orgId,
                });
                
                // Update balance
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: (relevantBalance.usedBalance || 0) + totalDays,
                });
              }
            }

            importedCount++;
          } catch (error) {
            console.error(`Error importing transaction for ${row.EmpNumber}:`, error);
            // Continue with next row
          }
        }
      }

      // Transform imported data for frontend display
      const importedData = (jsonData as any[])
        .filter((row: any) => {
          if (!row.EmpNumber || !row.EmpName || !row.LeaveType) return false;
          if (importType === 'balances') {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || '0') || 0;
            const availed = parseFloat(row.LeaveAvailed || '0') || 0;
            const encashed = parseFloat(row.LeaveEncashed || '0') || 0;
            const lapsed = parseFloat(row.LeaveLapsed || '0') || 0;
            return openingBalance > 0 || availed > 0 || encashed > 0 || lapsed > 0;
          } else {
            return parseFloat(row.TotalLeaveDays || '0') > 0;
          }
        })
        .map((row: any) => {
          if (importType === 'balances') {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || '0') || 0;
            const availed = parseFloat(row.LeaveAvailed || '0') || 0;
            const encashed = parseFloat(row.LeaveEncashed || '0') || 0;
            const lapsed = parseFloat(row.LeaveLapsed || '0') || 0;
            
            return {
              empNumber: row.EmpNumber,
              empName: row.EmpName,
              leaveType: row.LeaveType,
              openingBalance: openingBalance,
              availed: availed,
              encashed: encashed,
              lapsed: lapsed,
              currentBalance: openingBalance - availed - encashed - lapsed
            };
          } else {
            return {
              empNumber: row.EmpNumber,
              empName: row.EmpName,
              leaveType: row.LeaveType,
              startDate: row.LeaveTakenStartDate,
              endDate: row.LeaveTakenEndDate,
              days: parseFloat(row.TotalLeaveDays || '0'),
              isStartHalfDay: row['Is Start Date a Half Day'] === 'TRUE' || row['Is Start Date a Half Day'] === true,
              isEndHalfDay: row['Is End Date a Half Day'] === 'TRUE' || row['Is End Date a Half Day'] === true,
              status: 'approved'
            };
          }
        });

      const messageType = importType === 'balances' ? 'leave balance records' : 'leave transaction records';
      res.json({
        imported: importedCount,
        total: jsonData.length,
        message: `Successfully imported ${importedCount} ${messageType}`,
        importedData: importedData
      });

    } catch (error) {
      console.error("Error executing import:", error);
      res.status(500).json({ message: "Failed to import data: " + (error as Error).message });
    }
  });

  // Comprehensive balance calculation endpoint
  app.post('/api/calculate-all-balances', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const { calculationMethod = 'auto', effectiveDate } = req.body;
      
      // Get all employees from external API
      let allEmployees = [];
      try {
        const response = await fetch('https://qa-api.resolveindia.com/worker-master-leave', {
          headers: {
            'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '') || ''}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          allEmployees = data.data || [];
        }
      } catch (apiError) {
        console.log('[BalanceCalculation] External API not available, using assignment data');
      }

      // Get leave variants and assignments for this organization
      const leaveVariants = await storage.getLeaveVariants(orgId);
      const assignments = await storage.getEmployeeAssignments(orgId);
      const currentYear = new Date().getFullYear();
      
      let processedCount = 0;
      const results = [];

      // Process each employee with assignments
      const uniqueUserIds = [...new Set(assignments.map(a => a.userId))];
      
      for (const userId of uniqueUserIds) {
        if (!userId || userId === 'N/A') continue;
        
        const userAssignments = assignments.filter(a => a.userId === userId && a.assignmentType === 'leave_variant');
        const employee = allEmployees.find(emp => emp.user_id?.toString() === userId?.toString());
        
        for (const assignment of userAssignments) {
          const variant = leaveVariants.find(v => v.id === assignment.leaveVariantId);
          if (!variant || !variant.paidDaysInYear) continue;

          // Check if balance already exists
          const existingBalances = await storage.getEmployeeLeaveBalances(userId, currentYear, orgId);
          const existingBalance = existingBalances.find(b => b.leaveVariantId === variant.id);
          
          if (existingBalance && calculationMethod === 'auto') {
            // Skip if balance exists and we're doing automatic calculation
            continue;
          }

          let calculatedBalance = 0;
          let entitlement = variant.paidDaysInYear * 2; // Convert to half-days

          if (calculationMethod === 'auto' && employee?.date_of_joining) {
            // Pro-rata calculation based on joining date
            const joiningDate = new Date(employee.date_of_joining);
            const currentDate = effectiveDate ? new Date(effectiveDate) : new Date();
            
            if (variant.grantLeaves === 'in_advance') {
              // Full annual entitlement regardless of joining date
              calculatedBalance = entitlement;
            } else if (variant.grantLeaves === 'after_earning') {
              // Calculate based on months completed since joining
              const monthsWorked = Math.floor((currentDate.getTime() - joiningDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
              const monthlyAllocation = entitlement / 12;
              calculatedBalance = Math.floor(monthsWorked * monthlyAllocation);
            }
          } else {
            // Default: full annual entitlement
            calculatedBalance = entitlement;
          }

          // Create or update balance
          if (existingBalance) {
            await storage.updateEmployeeLeaveBalance(existingBalance.id, {
              totalEntitlement: entitlement,
              currentBalance: calculatedBalance,
              usedBalance: 0,
              carryForward: 0
            });
          } else {
            await storage.createEmployeeLeaveBalance({
              userId,
              leaveVariantId: variant.id,
              year: currentYear,
              totalEntitlement: entitlement,
              currentBalance: calculatedBalance,
              usedBalance: 0,
              carryForward: 0,
              orgId
            });
          }

          // Create transaction record
          await storage.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: variant.id,
            year: currentYear,
            transactionType: 'credit',
            amount: calculatedBalance,
            balanceAfter: calculatedBalance,
            description: `${calculationMethod === 'auto' ? 'Automatic' : 'Manual'} balance calculation for ${variant.leaveTypeName} (${calculatedBalance/2} days)`,
            orgId
          });

          results.push({
            userId,
            employeeName: employee?.user_name || `Employee ${userId}`,
            leaveType: variant.leaveTypeName,
            calculatedDays: calculatedBalance / 2,
            method: calculationMethod
          });
          
          processedCount++;
        }
      }

      res.json({
        success: true,
        message: `Successfully calculated balances for ${processedCount} employee-leave combinations`,
        method: calculationMethod,
        results: results.slice(0, 10), // Show first 10 for preview
        totalProcessed: processedCount
      });

    } catch (error) {
      console.error('Error calculating balances:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to calculate balances: ' + (error as Error).message 
      });
    }
  });

  // Time-based auto-approval processing endpoint
  app.post('/api/process-time-based-approvals', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      console.log(`[TimeBasedApproval] Processing time-based approvals for org_id: ${orgId}`);
      
      const result = await storage.processPendingTimeBasedApprovals(orgId);
      
      console.log(`[TimeBasedApproval] Processed ${result.processed} requests`);
      if (result.errors.length > 0) {
        console.log(`[TimeBasedApproval] Errors:`, result.errors);
      }
      
      res.json({
        success: true,
        processed: result.processed,
        errors: result.errors
      });
      
    } catch (error) {
      console.error('Error processing time-based approvals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process time-based approvals: ' + (error as Error).message 
      });
    }
  });

  // Get pending time-based approvals endpoint (for monitoring)
  app.get('/api/pending-time-based-approvals', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      // Get requests that have scheduled auto-approval time
      const pendingRequests = await storage.getLeaveRequests(orgId);
      const timeBasedPending = pendingRequests.filter(request => 
        request.status === 'pending' && 
        request.scheduledAutoApprovalAt &&
        new Date(request.scheduledAutoApprovalAt) > new Date()
      );
      
      res.json({
        success: true,
        pendingApprovals: timeBasedPending.map(request => ({
          id: request.id,
          userId: request.userId,
          leaveTypeId: request.leaveTypeId,
          scheduledAt: request.scheduledAutoApprovalAt,
          currentStep: request.currentStep,
          workflowId: request.workflowId
        }))
      });
      
    } catch (error) {
      console.error('Error fetching pending time-based approvals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch pending approvals: ' + (error as Error).message 
      });
    }
  });

  // Employee data migration endpoint
  app.post("/api/migrate-employee-data", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { migrateEmployeeData } = await import("./utils/employeeMapping");
      
      await migrateEmployeeData(orgId);
      
      res.json({ 
        success: true, 
        message: "Employee data migration completed successfully" 
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Migration failed", 
        error: error.message 
      });
    }
  });

  // ===============================
  // COLLABORATIVE LEAVE FEATURES
  // ===============================

  // Get collaborative leave settings for organization
  app.get('/api/collaborative-leave-settings', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      const result = await db.select()
        .from(collaborativeLeaveSettingsEnhanced)
        .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
        .limit(1);
      
      if (result.length === 0) {
        // Create default settings if none exist
        const [newSettings] = await db.insert(collaborativeLeaveSettingsEnhanced)
          .values({ 
            enabled: false, 
            maxTasksPerLeave: 5,
            requireManagerApproval: false,
            autoReminderDays: 1,
            defaultNotificationMethod: "email",
            enableWhatsApp: false,
            enableEmailNotifications: true,
            closureReportRequired: true,
            managerReviewRequired: true,
            orgId 
          })
          .returning();
        return res.json(newSettings);
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error fetching collaborative leave settings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch settings: ' + (error as Error).message 
      });
    }
  });

  // Update collaborative leave settings (PUT method for frontend compatibility)
  app.put('/api/collaborative-leave-settings', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const updateData = { ...req.body, updatedAt: new Date() };
      
      // First check if settings exist
      const existing = await db.select()
        .from(collaborativeLeaveSettingsEnhanced)
        .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
        .limit(1);
      
      if (existing.length === 0) {
        // Create new settings
        const [created] = await db.insert(collaborativeLeaveSettingsEnhanced)
          .values({ ...updateData, orgId })
          .returning();
        return res.json(created);
      } else {
        // Update existing settings
        const [updated] = await db.update(collaborativeLeaveSettingsEnhanced)
          .set(updateData)
          .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
          .returning();
        return res.json(updated);
      }
    } catch (error) {
      console.error('Error updating collaborative leave settings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update settings: ' + (error as Error).message 
      });
    }
  });

  // Keep PATCH for backward compatibility
  app.patch('/api/collaborative-leave-settings', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const updateData = { ...req.body, updatedAt: new Date() };
      
      const [updated] = await db.update(collaborativeLeaveSettingsEnhanced)
        .set(updateData)
        .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating collaborative leave settings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update settings: ' + (error as Error).message 
      });
    }
  });

  // Get tasks for a specific leave request
  app.get('/api/leave-requests/:leaveRequestId/tasks', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const leaveRequestId = parseInt(req.params.leaveRequestId);
      
      const tasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          eq(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequestId),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ));
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching leave tasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch tasks: ' + (error as Error).message 
      });
    }
  });

  // Get all collaborative tasks for admin reports
  app.get('/api/collaborative-tasks', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      
      const allTasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .leftJoin(leaveRequests, eq(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequests.id))
        .where(eq(leaveTaskAssigneesEnhanced.orgId, orgId))
        .orderBy(desc(leaveTaskAssigneesEnhanced.createdAt));

      // Transform the result to include leave requester information
      const transformedTasks = allTasks.map(row => ({
        ...row.leave_task_assignees_enhanced,
        leaveRequesterId: row.leave_requests?.userId || null,
        leaveRequesterName: row.leave_requests?.employeeName || null
      }));
      
      res.json(transformedTasks);
    } catch (error) {
      console.error('Error fetching all collaborative tasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch collaborative tasks: ' + (error as Error).message 
      });
    }
  });

  // Create tasks for a leave request
  app.post('/api/leave-requests/:leaveRequestId/tasks', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const leaveRequestId = parseInt(req.params.leaveRequestId);
      const { tasks } = req.body;
      
      // Generate unique tokens for each task and ensure uniqueLink is set
      const tasksWithTokens = tasks.map(task => ({
        ...task,
        leaveRequestId,
        orgId,
        acceptanceToken: generateUniqueToken(),
        uniqueLink: generateUniqueToken(),
        // Ensure backward compatibility for expected_support_date
        expectedSupportDate: task.expectedSupportDateFrom || new Date().toISOString().split('T')[0]
      }));
      
      const createdTasks = await db.insert(leaveTaskAssigneesEnhanced)
        .values(tasksWithTokens)
        .returning();
      
      // Send notifications to assignees
      for (const task of createdTasks) {
        await sendTaskNotification(task);
      }
      
      res.json(createdTasks);
    } catch (error) {
      console.error('Error creating leave tasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create tasks: ' + (error as Error).message 
      });
    }
  });

  // Public endpoint for task acceptance/rejection (no auth required)
  app.get('/api/public/task/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const [task] = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(eq(leaveTaskAssigneesEnhanced.acceptanceToken, token))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found or invalid token' 
        });
      }
      
      // Get leave request details
      const [leaveRequest] = await db.select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, task.leaveRequestId))
        .limit(1);
      
      res.json({
        task,
        leaveRequest: leaveRequest ? {
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          userId: leaveRequest.userId
        } : null
      });
    } catch (error) {
      console.error('Error fetching public task:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch task: ' + (error as Error).message 
      });
    }
  });

  // Public endpoint for task response (no auth required)
  app.post('/api/public/task/:token/respond', async (req, res) => {
    try {
      const { token } = req.params;
      const { action, comment } = req.body; // action: 'accept' or 'reject'
      const ipAddress = req.ip;
      
      const [task] = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(eq(leaveTaskAssigneesEnhanced.acceptanceToken, token))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found or invalid token' 
        });
      }
      
      const updateData = {
        status: action === 'accept' ? 'accepted' : 'rejected',
        updatedAt: new Date(),
        ...(action === 'accept' ? { acceptedAt: new Date() } : { 
          rejectedAt: new Date(), 
          rejectionComment: comment 
        })
      };
      
      await db.update(leaveTaskAssigneesEnhanced)
        .set(updateData)
        .where(eq(leaveTaskAssigneesEnhanced.id, task.id));
      
      // Log the status update
      await db.insert(taskStatusUpdates)
        .values({
          taskId: task.id,
          oldStatus: task.status,
          newStatus: updateData.status,
          updateComment: comment,
          ipAddress,
          orgId: task.orgId
        });
      
      res.json({ 
        success: true, 
        message: `Task ${action}ed successfully` 
      });
    } catch (error) {
      console.error('Error responding to task:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to respond to task: ' + (error as Error).message 
      });
    }
  });

  // Update task status (for internal users)
  app.patch('/api/tasks/:taskId/status', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const taskId = parseInt(req.params.taskId);
      const { status, comment } = req.body;
      const userId = req.user?.claims?.sub;
      
      const [task] = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          eq(leaveTaskAssigneesEnhanced.id, taskId),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }
      
      await db.update(leaveTaskAssigneesEnhanced)
        .set({
          status,
          statusUpdateComment: comment,
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveTaskAssigneesEnhanced.id, taskId));
      
      // Log the status update
      await db.insert(taskStatusUpdates)
        .values({
          taskId,
          oldStatus: task.status,
          newStatus: status,
          updateComment: comment,
          updatedBy: userId,
          orgId
        });
      
      res.json({ 
        success: true, 
        message: 'Task status updated successfully' 
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update task status: ' + (error as Error).message 
      });
    }
  });

  // Create leave closure report
  app.post('/api/leave-requests/:leaveRequestId/closure-report', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const leaveRequestId = parseInt(req.params.leaveRequestId);
      const { employeeComments, overallLeaveComments } = req.body;
      
      const [report] = await db.insert(leaveClosureReports)
        .values({
          leaveRequestId,
          employeeComments,
          overallLeaveComments,
          submittedAt: new Date(),
          orgId
        })
        .returning();
      
      res.json(report);
    } catch (error) {
      console.error('Error creating closure report:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create closure report: ' + (error as Error).message 
      });
    }
  });

  // Manager review of closure report
  app.patch('/api/closure-reports/:reportId/review', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const reportId = parseInt(req.params.reportId);
      const { managerRating, managerComments } = req.body;
      const managerId = req.user?.claims?.sub;
      
      const [updated] = await db.update(leaveClosureReports)
        .set({
          managerRating,
          managerComments,
          reviewedAt: new Date(),
          reviewedBy: managerId,
          updatedAt: new Date()
        })
        .where(and(
          eq(leaveClosureReports.id, reportId),
          eq(leaveClosureReports.orgId, orgId)
        ))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error reviewing closure report:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to review closure report: ' + (error as Error).message 
      });
    }
  });

  // Get my assigned tasks (for dashboard)
  app.get('/api/my-assigned-tasks', isAuthenticated, async (req, res) => {
    try {
      const orgId = parseInt(req.headers['x-org-id'] as string) || 60;
      const userId = req.user?.claims?.sub;
      
      // Get user's email to match with task assignments
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.json([]);
      }
      
      const tasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          eq(leaveTaskAssigneesEnhanced.assigneeEmail, user.email),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ))
        .orderBy(desc(leaveTaskAssignees.expectedSupportDate));
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch assigned tasks: ' + (error as Error).message 
      });
    }
  });

  // Helper functions
  function generateUniqueToken(): string {
    return randomBytes(32).toString('hex');
  }

  async function sendTaskNotification(task: any): Promise<void> {
    // TODO: Implement email/WhatsApp notifications
    console.log(`Notification would be sent to ${task.assigneeEmail} for task: ${task.taskDescription}`);
    
    // For now, just log the notification details
    console.log('Task notification details:', {
      assigneeName: task.assigneeName,
      assigneeEmail: task.assigneeEmail,
      taskDescription: task.taskDescription,
      expectedSupportDate: task.expectedSupportDate,
      acceptanceLink: `/api/public/task/${task.acceptanceToken}`
    });
  }

  // Collaborative Leave API endpoints
  
  // Get collaborative leave settings
  app.get("/api/collaborative-leave-settings", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      
      const settings = await db.select()
        .from(collaborativeLeaveSettingsEnhanced)
        .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
        .limit(1);
      
      if (settings.length === 0) {
        // Return default settings if none exist
        res.json({
          enabled: false,
          maxTasksPerLeave: 5,
          requireManagerApproval: false,
          autoReminderDays: 1,
          defaultNotificationMethod: "email",
          enableWhatsApp: false,
          enableEmailNotifications: true,
          closureReportRequired: true,
          managerReviewRequired: true
        });
      } else {
        res.json(settings[0]);
      }
    } catch (error) {
      console.error("Error fetching collaborative leave settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update collaborative leave settings
  app.put("/api/collaborative-leave-settings", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      const settingsData = req.body;
      
      // Check if settings already exist
      const existingSettings = await db.select()
        .from(collaborativeLeaveSettingsEnhanced)
        .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
        .limit(1);
      
      if (existingSettings.length === 0) {
        // Create new settings
        const newSettings = await db.insert(collaborativeLeaveSettingsEnhanced)
          .values({
            ...settingsData,
            orgId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        res.json(newSettings[0]);
      } else {
        // Update existing settings
        const updatedSettings = await db.update(collaborativeLeaveSettingsEnhanced)
          .set({
            ...settingsData,
            updatedAt: new Date()
          })
          .where(eq(collaborativeLeaveSettingsEnhanced.orgId, orgId))
          .returning();
        
        res.json(updatedSettings[0]);
      }
    } catch (error) {
      console.error("Error updating collaborative leave settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Get tasks for a leave request
  app.get("/api/leave-requests/:leaveRequestId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      const { leaveRequestId } = req.params;
      
      const tasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          eq(leaveTaskAssigneesEnhanced.leaveRequestId, parseInt(leaveRequestId)),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ));
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching leave tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create a new task assignment
  app.post("/api/leave-requests/:leaveRequestId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      const { leaveRequestId } = req.params;
      const { tasks } = req.body;
      
      console.log("🔶 Creating tasks with assigneeUserId data:", tasks.map(t => ({ 
        name: t.assigneeName, 
        userId: t.assigneeUserId,
        email: t.assigneeEmail 
      })));

      const createdTasks = [];
      for (const task of tasks) {
        const uniqueLink = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const [newTask] = await db.insert(leaveTaskAssigneesEnhanced)
          .values({
            leaveRequestId: parseInt(leaveRequestId),
            assigneeName: task.assigneeName,
            assigneeUserId: task.assigneeUserId, // Store user_id for task assignment
            assigneeEmail: task.assigneeEmail,
            assigneePhone: task.assigneePhone || null,
            taskDescription: task.taskDescription,
            expectedSupportDate: new Date(task.expectedSupportDateFrom),
            expectedSupportDateFrom: new Date(task.expectedSupportDateFrom),
            expectedSupportDateTo: new Date(task.expectedSupportDateTo),
            additionalNotes: task.additionalNotes || null,
            notificationMethod: task.notificationMethod || "email",
            status: "pending",
            uniqueLink,
            orgId,
          })
          .returning();
        
        createdTasks.push(newTask);
      }

      console.log("✅ Tasks created successfully with user IDs:", createdTasks.map(t => ({ 
        id: t.id, 
        assigneeUserId: t.assigneeUserId 
      })));
      res.json(createdTasks);
    } catch (error) {
      console.error("Error creating task assignment:", error);
      res.status(500).json({ message: "Failed to create tasks: " + (error as Error).message });
    }
  });

  // Get tasks assigned TO current user
  app.get("/api/tasks/assigned-to-me/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      
      const tasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          eq(leaveTaskAssigneesEnhanced.assigneeUserId, userId),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ))
        .orderBy(desc(leaveTaskAssigneesEnhanced.createdAt));
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks assigned to user:", error);
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });

  // Get tasks assigned BY current user (via leave requests they created)
  app.get("/api/tasks/assigned-by-me/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      
      // Get leave requests created by this user
      const userLeaveRequests = await db.select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, userId),
          eq(leaveRequests.orgId, orgId)
        ));
      
      if (userLeaveRequests.length === 0) {
        return res.json([]);
      }
      
      const leaveRequestIds = userLeaveRequests.map(lr => lr.id);
      
      // Get tasks for those leave requests
      const tasks = await db.select()
        .from(leaveTaskAssigneesEnhanced)
        .where(and(
          inArray(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequestIds),
          eq(leaveTaskAssigneesEnhanced.orgId, orgId)
        ))
        .orderBy(desc(leaveTaskAssigneesEnhanced.createdAt));
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks assigned by user:", error);
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });

  // Accept task
  app.patch("/api/tasks/:taskId/accept", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { acceptanceResponse } = req.body;
      
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced)
        .set({
          status: "accepted",
          acceptanceResponse: acceptanceResponse || "Task accepted",
          acceptedAt: new Date(),
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveTaskAssigneesEnhanced.id, parseInt(taskId)))
        .returning();
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error accepting task:", error);
      res.status(500).json({ message: "Failed to accept task" });
    }
  });

  // Reject task
  app.patch("/api/tasks/:taskId/reject", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { statusComments } = req.body;
      
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced)
        .set({
          status: "rejected",
          statusComments: statusComments,
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveTaskAssigneesEnhanced.id, parseInt(taskId)))
        .returning();
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error rejecting task:", error);
      res.status(500).json({ message: "Failed to reject task" });
    }
  });

  // Complete task (update completion status)
  app.patch("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      console.log(`[TaskCompletion] Updating task ${req.params.taskId} with:`, req.body);
      
      const { taskId } = req.params;
      const { status, statusComments } = req.body;
      
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced)
        .set({
          status: status, // 'done' or 'not_done'
          statusComments: statusComments,
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveTaskAssigneesEnhanced.id, parseInt(taskId)))
        .returning();
      
      console.log(`[TaskCompletion] Updated task result:`, updatedTask);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Update task status (for external assignees)
  app.post("/api/tasks/:uniqueLink/status", async (req, res) => {
    try {
      const { uniqueLink } = req.params;
      const { status, comments } = req.body;
      
      const updatedTask = await db.update(leaveTaskAssigneesEnhanced)
        .set({
          status,
          statusComments: comments,
          lastStatusUpdate: new Date(),
          ...(status === 'accepted' && { acceptedAt: new Date() })
        })
        .where(eq(leaveTaskAssigneesEnhanced.uniqueLink, uniqueLink))
        .returning();
      
      if (updatedTask.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask[0]);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Get closure report for a leave request
  app.get("/api/leave-requests/:leaveRequestId/closure-report", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      const { leaveRequestId } = req.params;
      
      const report = await db.select()
        .from(leaveClosureReportsEnhanced)
        .where(and(
          eq(leaveClosureReportsEnhanced.leaveRequestId, parseInt(leaveRequestId)),
          eq(leaveClosureReportsEnhanced.orgId, orgId)
        ))
        .limit(1);
      
      res.json(report.length > 0 ? report[0] : null);
    } catch (error) {
      console.error("Error fetching closure report:", error);
      res.status(500).json({ message: "Failed to fetch closure report" });
    }
  });

  // Create/update closure report
  app.post("/api/leave-requests/:leaveRequestId/closure-report", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.headers['x-org-id'] ? parseInt(req.headers['x-org-id']) : 60;
      const { leaveRequestId } = req.params;
      const reportData = req.body;
      
      // Check if report already exists
      const existingReport = await db.select()
        .from(leaveClosureReportsEnhanced)
        .where(and(
          eq(leaveClosureReportsEnhanced.leaveRequestId, parseInt(leaveRequestId)),
          eq(leaveClosureReportsEnhanced.orgId, orgId)
        ))
        .limit(1);
      
      if (existingReport.length === 0) {
        // Create new report
        const newReport = await db.insert(leaveClosureReportsEnhanced)
          .values({
            leaveRequestId: parseInt(leaveRequestId),
            employeeComments: reportData.employeeComments,
            taskReviews: reportData.taskReviews,
            orgId,
            submittedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        res.json(newReport[0]);
      } else {
        // Update existing report
        const updatedReport = await db.update(leaveClosureReportsEnhanced)
          .set({
            employeeComments: reportData.employeeComments,
            taskReviews: reportData.taskReviews,
            updatedAt: new Date()
          })
          .where(and(
            eq(leaveClosureReportsEnhanced.leaveRequestId, parseInt(leaveRequestId)),
            eq(leaveClosureReportsEnhanced.orgId, orgId)
          ))
          .returning();
        
        res.json(updatedReport[0]);
      }
    } catch (error) {
      console.error("Error saving closure report:", error);
      res.status(500).json({ message: "Failed to save closure report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
