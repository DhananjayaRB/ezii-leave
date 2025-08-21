import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  pgEnum,
  date,
  unique,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "employee", "hr"]);

// Setup status enum
export const setupStatusEnum = pgEnum("setup_status", ["pending", "in_progress", "completed"]);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("employee").notNull(),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company setup table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  industry: varchar("industry"),
  workingDaysPerWeek: integer("working_days_per_week").default(5),
  leaveYearStart: varchar("leave_year_start").default("January 1st"),
  effectiveDate: timestamp("effective_date"),
  setupStatus: setupStatusEnum("setup_status").default("pending"),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave types table
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxDays: integer("max_days"),
  color: text("color"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  icon: text("icon"),
  annualAllowance: integer("annual_allowance"),
  carryForward: boolean("carry_forward").default(false),
  negativeLeaveBalance: integer("negative_leave_balance").default(0),
  orgId: integer("org_id").default(60),
});

// Roles table with detailed permissions
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default('{}'),
  isActive: boolean("is_active").default(true),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles assignment table
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Workflows table
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  process: varchar("process"),
  subProcesses: text("sub_processes").array(),
  effectiveDate: date("effective_date"),
  steps: jsonb("steps"),
  isActive: boolean("is_active").default(true),
  autoApprovalDays: integer("auto_approval_days").default(0),
  autoApprovalHours: integer("auto_approval_hours").default(0),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comp off configuration
export const compOffConfig = pgTable("comp_off_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false),
  maxBalance: integer("max_balance").default(10),
  expiryDays: integer("expiry_days").default(90),
  minWorkingHours: integer("min_working_hours").default(8),
  weekendsEarn: boolean("weekends_earn").default(true),
  holidaysEarn: boolean("holidays_earn").default(true),
  overtimeEarn: boolean("overtime_earn").default(false),
  advanceNoticeRequired: boolean("advance_notice_required").default(true),
  advanceNoticeDays: integer("advance_notice_days").default(1),
  minimumLeaveUnit: jsonb("minimum_leave_unit").default('["Full Day"]'),
  compensationOptions: jsonb("compensation_options").default('["En-cashment", "Convert to leaves"]'),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PTO configuration
export const ptoConfig = pgTable("pto_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false),
  annualAllowance: integer("annual_allowance").default(25),
  accrualMethod: varchar("accrual_method").default("monthly"),
  maxCarryover: integer("max_carryover").default(5),
  allowNegativeBalance: boolean("allow_negative_balance").default(false),
  proRateNewHires: boolean("pro_rate_new_hires").default(true),
  payoutOnTermination: boolean("payout_on_termination").default(false),
  accrualRules: jsonb("accrual_rules"),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave requests table
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  leaveTypeId: integer("leave_type_id"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: numeric("total_days", { precision: 4, scale: 1 }).notNull(),
  workingDays: numeric("working_days", { precision: 4, scale: 1 }).notNull(),
  reason: text("reason"),
  status: varchar("status").default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  documents: jsonb("documents"), // Array of document URLs/paths
  // Workflow tracking fields
  workflowId: integer("workflow_id"),
  currentStep: integer("current_step").default(0), // 0 = start, 1 = first review step, etc.
  workflowStatus: varchar("workflow_status").default("in_progress"), // in_progress, completed, bypassed
  approvalHistory: jsonb("approval_history").default([]), // Array of approval records
  scheduledAutoApprovalAt: timestamp("scheduled_auto_approval_at"), // For time-based auto-approval
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Holidays table
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  isRecurring: boolean("is_recurring").default(false),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave variants table for multiple variants per leave type
export const leaveVariants = pgTable("leave_variants", {
  id: serial("id").primaryKey(),
  leaveTypeId: integer("leave_type_id").notNull().references(() => leaveTypes.id),
  leaveTypeName: varchar("leave_type_name").notNull(),
  leaveVariantName: varchar("leave_variant_name").notNull(),
  description: text("description"),
  // Configuration fields from the form
  minimumLeaveUnit: varchar("minimum_leave_unit").notNull().default("full_day"),
  leavesGrantedOn: varchar("leaves_granted_on").notNull().default("calendar_days"),
  paidDaysInYear: integer("paid_days_in_year").notNull().default(0),
  grantLeaves: varchar("grant_leaves").notNull().default("in_advance"),
  grantFrequency: varchar("grant_frequency").notNull().default("per_year"),
  proRataCalculation: varchar("pro_rata_calculation").notNull().default("full_month"),
  slabs: jsonb("slabs"),
  onboardingSlabs: jsonb("onboarding_slabs"),
  exitSlabs: jsonb("exit_slabs"),
  fractionalLeaves: varchar("fractional_leaves").default("normal_rounding"),
  applicableGenders: jsonb("applicable_genders").notNull(),
  applicableAfter: integer("applicable_after").notNull().default(0),
  applicableAfterType: varchar("applicable_after_type").notNull().default("days"), // "days", "probation_end", "date_of_joining"
  mustBePlannedInAdvance: integer("must_be_planned_in_advance").notNull().default(0),
  maxDaysInStretch: integer("max_days_in_stretch").notNull().default(0),
  minDaysRequired: integer("min_days_required").notNull().default(0),
  maxInstances: integer("max_instances").notNull().default(0),
  maxInstancesPeriod: varchar("max_instances_period").notNull().default("year"),
  allowLeavesBeforeWeekend: boolean("allow_leaves_before_weekend").default(false),
  allowLeavesBeforeHoliday: boolean("allow_leaves_before_holiday").default(false),
  allowClubbing: boolean("allow_clubbing").default(false),
  supportingDocuments: boolean("supporting_documents").default(false),
  supportingDocumentsText: text("supporting_documents_text"),
  allowDuringNotice: boolean("allow_during_notice").default(false),
  requiresWorkflow: boolean("requires_workflow").default(true),
  leaveBalanceDeductionBefore: boolean("leave_balance_deduction_before").default(false),
  leaveBalanceDeductionAfter: boolean("leave_balance_deduction_after").default(false),
  leaveBalanceDeductionNotAllowed: boolean("leave_balance_deduction_not_allowed").default(false),
  gracePeriod: integer("grace_period").notNull().default(0),
  allowWithdrawalBeforeApproval: boolean("allow_withdrawal_before_approval").default(false),
  allowWithdrawalAfterApproval: boolean("allow_withdrawal_after_approval").default(false),
  allowWithdrawalNotAllowed: boolean("allow_withdrawal_not_allowed").default(true),
  negativeLeaveBalance: integer("negative_leave_balance").notNull().default(0),
  carryForwardLimit: integer("carry_forward_limit").notNull().default(0),
  carryForwardPeriod: varchar("carry_forward_period").notNull().default("year"),
  encashment: boolean("encashment").default(false),
  encashmentCalculation: varchar("encashment_calculation"),
  maxEncashmentDays: integer("max_encashment_days"),
  encashmentTiming: varchar("encashment_timing"),
  allowApplicationsOnBehalf: boolean("allow_applications_on_behalf").default(false),
  showAvailedLeaves: boolean("show_availed_leaves").default(false),
  showBalanceLeaves: boolean("show_balance_leaves").default(false),
  maximumBalance: integer("maximum_balance").notNull().default(0),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comp off variants table
export const compOffVariants = pgTable("comp_off_variants", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true),
  
  // Comp-off units configuration
  allowFullDay: boolean("allow_full_day").default(false),
  fullDayHours: numeric("full_day_hours", { precision: 4, scale: 2 }).default("0"),
  allowHalfDay: boolean("allow_half_day").default(false),
  halfDayHours: numeric("half_day_hours", { precision: 4, scale: 2 }).default("0"),
  allowQuarterDay: boolean("allow_quarter_day").default(false),
  quarterDayHours: numeric("quarter_day_hours", { precision: 4, scale: 2 }).default("0"),
  
  // Eligibility criteria
  maxApplications: integer("max_applications").default(1),
  maxApplicationsPeriod: varchar("max_applications_period").default("Month"),
  
  // Workflow settings
  workflowRequired: boolean("workflow_required").default(false),
  documentsRequired: boolean("documents_required").default(false),
  applicableAfter: integer("applicable_after").default(0), // days
  approvalDays: integer("approval_days").default(0),
  expiryDays: integer("expiry_days").default(365),
  
  // Working days
  allowNonWorkingDays: boolean("allow_non_working_days").default(false),
  
  // Withdrawal settings
  withdrawalBeforeApproval: boolean("withdrawal_before_approval").default(false),
  withdrawalAfterApproval: boolean("withdrawal_after_approval").default(false),
  withdrawalNotAllowed: boolean("withdrawal_not_allowed").default(true),
  
  // Notice period
  allowedDuringNotice: boolean("allowed_during_notice").default(true),
  
  // Carry Forward and Lapse
  enableCarryForward: boolean("enable_carry_forward").default(false),
  carryForwardDays: integer("carry_forward_days").default(0),
  enableLapse: boolean("enable_lapse").default(false),
  lapsePeriod: integer("lapse_period").default(0),
  lapsePeriodUnit: varchar("lapse_period_unit").default("Month"),
  
  // Compensation settings
  enableCompensation: boolean("enable_compensation").default(false),
  encashmentOption: boolean("encashment_option").default(false),
  convertToLeavesOption: boolean("convert_to_leaves_option").default(false),
  encashmentBasedOn: varchar("encashment_based_on"), // "basic_pay", "basic_plus_dearness_allowance", "gross_pay"
  maxEncashmentDays: integer("max_encashment_days").default(0),
  maxEncashmentHours: numeric("max_encashment_hours", { precision: 4, scale: 2 }).default("0"),
  convertibleLeaveTypes: jsonb("convertible_leave_types"), // Array of leave type IDs
  
  // Legacy fields for backward compatibility
  maxBalance: integer("max_balance").default(0),
  
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PTO variants table  
export const ptoVariants = pgTable("pto_variants", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true),
  halfDay: boolean("half_day").default(false),
  quarterDay: boolean("quarter_day").default(false),
  hours: boolean("hours").default(false),
  workflowRequired: boolean("workflow_required").default(false),
  noticePeriodAllowed: boolean("notice_period_allowed").default(true),
  documentsRequired: boolean("documents_required").default(false),
  applicableAfterType: varchar("applicable_after_type").default("date_of_joining"),
  applicableAfter: integer("applicable_after").default(0), // days
  approvalDays: integer("approval_days").default(0),
  minimumHours: integer("minimum_hours").default(0),
  maxHours: integer("max_hours").default(0),
  maxInstances: integer("max_instances").default(0),
  maxInstancesPeriod: varchar("max_instances_period").default("Month"),
  grantingPeriod: varchar("granting_period").default("Yearly"),
  // Deduct pay settings
  lossOfPay: boolean("loss_of_pay").default(true),
  deductHalfDay: boolean("deduct_half_day").default(false),
  deductQuarterDay: boolean("deduct_quarter_day").default(false),
  deductHours: boolean("deduct_hours").default(false),
  // Withdrawal settings
  withdrawalBeforeApproval: boolean("withdrawal_before_approval").default(true),
  withdrawalAfterApproval: boolean("withdrawal_after_approval").default(false),
  withdrawalNotAllowed: boolean("withdrawal_not_allowed").default(false),
  // Leave deduction settings
  deductibleLeaveTypes: text("deductible_leave_types").array(),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PTO requests table
export const ptoRequests = pgTable("pto_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  ptoVariantId: integer("pto_variant_id").references(() => ptoVariants.id).notNull(),
  requestDate: date("request_date").notNull(),
  timeType: varchar("time_type").notNull(), // "full_day", "half_day", "quarter_day", "hours"
  startTime: varchar("start_time"), // For hour-based PTO
  endTime: varchar("end_time"), // For hour-based PTO
  totalHours: numeric("total_hours", { precision: 4, scale: 2 }), // For hour-based PTO
  reason: text("reason").notNull(),
  documentUrl: varchar("document_url"),
  status: varchar("status").default("pending").notNull(), // "pending", "approved", "rejected", "cancelled"
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  workflowId: integer("workflow_id"),
  currentStep: integer("current_step").default(1),
  workflowStatus: varchar("workflow_status").default("pending"), // "pending", "in_progress", "completed", "rejected"
  approvalHistory: jsonb("approval_history").default("[]"),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comp off requests table
export const compOffRequests = pgTable("comp_off_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  reason: varchar("reason").notNull(),
  workedDate: date("worked_date").notNull(),
  compensateWith: date("compensate_with"),
  lapseOn: date("lapse_on"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, expired, banked, availed
  type: varchar("type").notNull().default("avail"), // avail, bank, transfer_to_leave, en_cash
  dayType: varchar("day_type").notNull().default("full"), // full, half
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by"),
  notes: text("notes"),
  attachments: jsonb("attachments"),
  // Additional fields for transfer to leave and en-cash
  transferAmount: numeric("transfer_amount", { precision: 10, scale: 2 }),
  enCashAmount: numeric("en_cash_amount", { precision: 10, scale: 2 }),
  paymentDetails: text("payment_details"),
  // Workflow fields
  workflowId: integer("workflow_id"),
  currentStep: integer("current_step").default(1),
  workflowStatus: varchar("workflow_status").default("pending"), // "pending", "in_progress", "completed", "rejected"
  approvalHistory: jsonb("approval_history").default("[]"),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee assignments for leave variants, comp off variants, and PTO variants
export const employeeAssignments = pgTable("employee_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  leaveVariantId: integer("leave_variant_id").notNull(), // This will store the variant ID regardless of type
  assignmentType: varchar("assignment_type").notNull(), // "leave_variant", "comp_off_variant", or "pto_variant"
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// Original collaborative leave tables removed - enhanced versions defined later

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  effectiveDate: z.string().transform((str) => new Date(str)).optional(),
});

// Old collaborative leave schemas removed - enhanced versions at bottom

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompOffConfigSchema = createInsertSchema(compOffConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPTOConfigSchema = createInsertSchema(ptoConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveVariantSchema = createInsertSchema(leaveVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompOffVariantSchema = createInsertSchema(compOffVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fullDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
  halfDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
  quarterDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
  maxEncashmentHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
});

export const insertPTOVariantSchema = createInsertSchema(ptoVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPTORequestSchema = createInsertSchema(ptoRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  status: true,
  currentStep: true,
  workflowStatus: true,
  approvalHistory: true,
});

export const insertCompOffRequestSchema = createInsertSchema(compOffRequests).omit({
  id: true,
  appliedAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  workedDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  compensateWith: z.union([z.date(), z.string().transform((str) => new Date(str)), z.null()]).optional(),
});

export const insertEmployeeAssignmentSchema = createInsertSchema(employeeAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertCompOffConfig = z.infer<typeof insertCompOffConfigSchema>;
export type CompOffConfig = typeof compOffConfig.$inferSelect;
export type InsertPTOConfig = z.infer<typeof insertPTOConfigSchema>;
export type PTOConfig = typeof ptoConfig.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertLeaveVariant = z.infer<typeof insertLeaveVariantSchema>;
export type LeaveVariant = typeof leaveVariants.$inferSelect;
export type InsertCompOffVariant = z.infer<typeof insertCompOffVariantSchema>;
export type CompOffVariant = typeof compOffVariants.$inferSelect;
export type InsertPTOVariant = z.infer<typeof insertPTOVariantSchema>;
export type PTOVariant = typeof ptoVariants.$inferSelect;

export type InsertPTORequest = z.infer<typeof insertPTORequestSchema>;
export type PTORequest = typeof ptoRequests.$inferSelect;
export type InsertCompOffRequest = z.infer<typeof insertCompOffRequestSchema>;
export type CompOffRequest = typeof compOffRequests.$inferSelect;
// Note: CompOffTransfer and CompOffEnCash schemas are defined above with compOffRequests
export type InsertEmployeeAssignment = z.infer<typeof insertEmployeeAssignmentSchema>;
export type EmployeeAssignment = typeof employeeAssignments.$inferSelect;

// Employee Leave Balance table - tracks current leave balances for each employee and leave type
export const employeeLeaveBalances = pgTable("employee_leave_balances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  leaveVariantId: integer("leave_variant_id").notNull(),
  totalEntitlement: numeric("total_entitlement", { precision: 10, scale: 2 }).notNull(), // Annual entitlement in days (supports decimals)
  currentBalance: numeric("current_balance", { precision: 10, scale: 2 }).notNull(), // Current available balance in days (supports decimals)
  usedBalance: numeric("used_balance", { precision: 10, scale: 2 }).default("0").notNull(), // Used balance in days (supports decimals)
  carryForward: numeric("carry_forward", { precision: 10, scale: 2 }).default("0").notNull(), // Carried forward from previous period
  year: integer("year").notNull(), // Calendar year this balance is for
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.leaveVariantId, table.year, table.orgId)
]);

// Leave Balance Transactions table - tracks all balance changes (grants, deductions, etc.)
export const leaveBalanceTransactions = pgTable("leave_balance_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  leaveVariantId: integer("leave_variant_id").notNull(),
  transactionType: varchar("transaction_type").notNull(), // 'grant', 'deduction', 'carry_forward', 'adjustment'
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Amount in days (positive for credits, negative for debits, supports decimals)
  balanceAfter: numeric("balance_after", { precision: 10, scale: 2 }).notNull(), // Balance after this transaction (supports decimals)
  description: text("description"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  leaveRequestId: integer("leave_request_id"), // If related to a leave request
  year: integer("year").notNull(),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for leave balance tables
export const insertEmployeeLeaveBalanceSchema = createInsertSchema(employeeLeaveBalances);
export const insertLeaveBalanceTransactionSchema = createInsertSchema(leaveBalanceTransactions);

export type InsertEmployeeLeaveBalance = z.infer<typeof insertEmployeeLeaveBalanceSchema>;
export type EmployeeLeaveBalance = typeof employeeLeaveBalances.$inferSelect;
export type InsertLeaveBalanceTransaction = z.infer<typeof insertLeaveBalanceTransactionSchema>;
export type LeaveBalanceTransaction = typeof leaveBalanceTransactions.$inferSelect;

// Blackout Periods table - blocks leave applications during specific periods
export const blackoutPeriods = pgTable("blackout_periods", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  allowLeaves: boolean("allow_leaves").default(false).notNull(),
  allowedLeaveTypes: text("allowed_leave_types").array().default([]), // Array of leave type IDs that are allowed as exceptions
  assignedEmployees: text("assigned_employees").array().default([]), // Array of user IDs this applies to (empty = all)
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlackoutPeriodSchema = createInsertSchema(blackoutPeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlackoutPeriod = z.infer<typeof insertBlackoutPeriodSchema>;
export type BlackoutPeriod = typeof blackoutPeriods.$inferSelect;

// Enhanced Collaborative Leave Tables - following design requirements

// Enhanced Collaborative Leave Settings table
export const collaborativeLeaveSettingsEnhanced = pgTable("collaborative_leave_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  maxTasksPerLeave: integer("max_tasks_per_leave").default(5),
  requireManagerApproval: boolean("require_manager_approval").default(false),
  autoReminderDays: integer("auto_reminder_days").default(1), // Days before expected support date to send reminder
  defaultNotificationMethod: varchar("default_notification_method").default("email"),
  enableWhatsApp: boolean("enable_whatsapp").default(false),
  enableEmailNotifications: boolean("enable_email_notifications").default(true),
  closureReportRequired: boolean("closure_report_required").default(true),
  managerReviewRequired: boolean("manager_review_required").default(true),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.orgId)
]);

// Leave Task Assignees table - stores task assignments during leave
export const leaveTaskAssigneesEnhanced = pgTable("leave_task_assignees", {
  id: serial("id").primaryKey(),
  leaveRequestId: integer("leave_request_id").notNull(),
  assigneeName: varchar("assignee_name").notNull(),
  assigneeUserId: varchar("assignee_user_id"), // Store the selected employee's user ID
  assigneeEmail: varchar("assignee_email").notNull(),
  assigneePhone: varchar("assignee_phone"), // Optional for WhatsApp
  taskDescription: text("task_description").notNull(),
  expectedSupportDate: date("expected_support_date"), // Keep for backward compatibility
  expectedSupportDateFrom: date("expected_support_date_from"),
  expectedSupportDateTo: date("expected_support_date_to"), 
  additionalNotes: text("additional_notes"), // New field for additional notes
  notificationMethod: varchar("notification_method").notNull(), // 'email', 'whatsapp', 'both'
  status: varchar("status").default("pending").notNull(), // 'pending', 'accepted', 'rejected', 'done', 'wip', 'not_done', 'abandoned'
  acceptanceResponse: text("acceptance_response"), // Comments on acceptance/rejection
  statusComments: text("status_comments"), // Comments during status updates
  notificationSent: boolean("notification_sent").default(false),
  acceptedAt: timestamp("accepted_at"),
  lastStatusUpdate: timestamp("last_status_update").defaultNow(),
  uniqueLink: varchar("unique_link").notNull(), // For external access
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave Closure Reports table - stores employee's review after leave ends
export const leaveClosureReportsEnhanced = pgTable("leave_closure_reports", {
  id: serial("id").primaryKey(),
  leaveRequestId: integer("leave_request_id").notNull(),
  employeeComments: text("employee_comments"), // Employee's overall comments
  taskReviews: jsonb("task_reviews"), // JSON array of task-specific reviews
  managerRating: varchar("manager_rating"), // 'responsible', 'ok', 'needs_improvement'
  managerComments: text("manager_comments"),
  managerReviewedAt: timestamp("manager_reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.leaveRequestId, table.orgId)
]);

// Performance Records table - tracks employee performance ratings
export const performanceRecordsEnhanced = pgTable("performance_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  leaveRequestId: integer("leave_request_id"), // If related to leave management
  ratingType: varchar("rating_type").notNull(), // 'leave_management', 'annual_review', etc.
  rating: varchar("rating").notNull(), // 'responsible', 'ok', 'needs_improvement', etc.
  comments: text("comments"),
  ratedBy: varchar("rated_by").notNull(), // Manager's user ID
  ratingDate: timestamp("rating_date").defaultNow(),
  year: integer("year").notNull(),
  orgId: integer("org_id").default(60),
  createdAt: timestamp("created_at").defaultNow(),
});

// Collaborative Leave Audit Log - comprehensive audit trail
export const collaborativeLeaveAuditLogEnhanced = pgTable("collaborative_leave_audit_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Who performed the action
  actionType: varchar("action_type").notNull(), // 'task_created', 'notification_sent', 'task_accepted', 'status_updated', etc.
  relatedEntityType: varchar("related_entity_type").notNull(), // 'leave_request', 'task_assignment', 'closure_report'
  relatedEntityId: integer("related_entity_id").notNull(),
  oldValue: text("old_value"), // Previous value (JSON)
  newValue: text("new_value"), // New value (JSON)
  details: text("details"), // Additional context
  timestamp: timestamp("timestamp").defaultNow(),
  orgId: integer("org_id").default(60),
});

// Insert schemas for collaborative leave tables
export const insertLeaveTaskAssigneeEnhancedSchema = createInsertSchema(leaveTaskAssigneesEnhanced);
export const insertLeaveClosureReportEnhancedSchema = createInsertSchema(leaveClosureReportsEnhanced);
export const insertPerformanceRecordEnhancedSchema = createInsertSchema(performanceRecordsEnhanced);
export const insertCollaborativeLeaveAuditLogEnhancedSchema = createInsertSchema(collaborativeLeaveAuditLogEnhanced);
export const insertCollaborativeLeaveSettingsEnhancedSchema = createInsertSchema(collaborativeLeaveSettingsEnhanced);

// Type exports for collaborative leave
export type InsertLeaveTaskAssigneeEnhanced = z.infer<typeof insertLeaveTaskAssigneeEnhancedSchema>;
export type LeaveTaskAssigneeEnhanced = typeof leaveTaskAssigneesEnhanced.$inferSelect;
export type InsertLeaveClosureReportEnhanced = z.infer<typeof insertLeaveClosureReportEnhancedSchema>;
export type LeaveClosureReportEnhanced = typeof leaveClosureReportsEnhanced.$inferSelect;
export type InsertPerformanceRecordEnhanced = z.infer<typeof insertPerformanceRecordEnhancedSchema>;
export type PerformanceRecordEnhanced = typeof performanceRecordsEnhanced.$inferSelect;
export type InsertCollaborativeLeaveAuditLogEnhanced = z.infer<typeof insertCollaborativeLeaveAuditLogEnhancedSchema>;
export type CollaborativeLeaveAuditLogEnhanced = typeof collaborativeLeaveAuditLogEnhanced.$inferSelect;
export type InsertCollaborativeLeaveSettingsEnhanced = z.infer<typeof insertCollaborativeLeaveSettingsEnhancedSchema>;
export type CollaborativeLeaveSettingsEnhanced = typeof collaborativeLeaveSettingsEnhanced.$inferSelect;
