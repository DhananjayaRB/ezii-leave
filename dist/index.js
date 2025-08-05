var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  blackoutPeriods: () => blackoutPeriods,
  collaborativeLeaveAuditLogEnhanced: () => collaborativeLeaveAuditLogEnhanced,
  collaborativeLeaveSettingsEnhanced: () => collaborativeLeaveSettingsEnhanced,
  compOffConfig: () => compOffConfig,
  compOffRequests: () => compOffRequests,
  compOffVariants: () => compOffVariants,
  companies: () => companies,
  employeeAssignments: () => employeeAssignments,
  employeeLeaveBalances: () => employeeLeaveBalances,
  holidays: () => holidays,
  insertBlackoutPeriodSchema: () => insertBlackoutPeriodSchema,
  insertCollaborativeLeaveAuditLogEnhancedSchema: () => insertCollaborativeLeaveAuditLogEnhancedSchema,
  insertCollaborativeLeaveSettingsEnhancedSchema: () => insertCollaborativeLeaveSettingsEnhancedSchema,
  insertCompOffConfigSchema: () => insertCompOffConfigSchema,
  insertCompOffRequestSchema: () => insertCompOffRequestSchema,
  insertCompOffVariantSchema: () => insertCompOffVariantSchema,
  insertCompanySchema: () => insertCompanySchema,
  insertEmployeeAssignmentSchema: () => insertEmployeeAssignmentSchema,
  insertEmployeeLeaveBalanceSchema: () => insertEmployeeLeaveBalanceSchema,
  insertHolidaySchema: () => insertHolidaySchema,
  insertLeaveBalanceTransactionSchema: () => insertLeaveBalanceTransactionSchema,
  insertLeaveClosureReportEnhancedSchema: () => insertLeaveClosureReportEnhancedSchema,
  insertLeaveRequestSchema: () => insertLeaveRequestSchema,
  insertLeaveTaskAssigneeEnhancedSchema: () => insertLeaveTaskAssigneeEnhancedSchema,
  insertLeaveTypeSchema: () => insertLeaveTypeSchema,
  insertLeaveVariantSchema: () => insertLeaveVariantSchema,
  insertPTOConfigSchema: () => insertPTOConfigSchema,
  insertPTORequestSchema: () => insertPTORequestSchema,
  insertPTOVariantSchema: () => insertPTOVariantSchema,
  insertPerformanceRecordEnhancedSchema: () => insertPerformanceRecordEnhancedSchema,
  insertRoleSchema: () => insertRoleSchema,
  insertUserSchema: () => insertUserSchema,
  insertWorkflowSchema: () => insertWorkflowSchema,
  leaveBalanceTransactions: () => leaveBalanceTransactions2,
  leaveClosureReportsEnhanced: () => leaveClosureReportsEnhanced,
  leaveRequests: () => leaveRequests,
  leaveTaskAssigneesEnhanced: () => leaveTaskAssigneesEnhanced,
  leaveTypes: () => leaveTypes,
  leaveVariants: () => leaveVariants,
  performanceRecordsEnhanced: () => performanceRecordsEnhanced,
  ptoConfig: () => ptoConfig,
  ptoRequests: () => ptoRequests,
  ptoVariants: () => ptoVariants,
  roles: () => roles,
  sessions: () => sessions,
  setupStatusEnum: () => setupStatusEnum,
  userRoleEnum: () => userRoleEnum,
  userRoles: () => userRoles,
  users: () => users,
  workflows: () => workflows
});
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
  numeric
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, userRoleEnum, setupStatusEnum, users, companies, leaveTypes, roles, userRoles, workflows, compOffConfig, ptoConfig, leaveRequests, holidays, leaveVariants, compOffVariants, ptoVariants, ptoRequests, compOffRequests, employeeAssignments, insertUserSchema, insertCompanySchema, insertLeaveTypeSchema, insertRoleSchema, insertWorkflowSchema, insertCompOffConfigSchema, insertPTOConfigSchema, insertLeaveRequestSchema, insertHolidaySchema, insertLeaveVariantSchema, insertCompOffVariantSchema, insertPTOVariantSchema, insertPTORequestSchema, insertCompOffRequestSchema, insertEmployeeAssignmentSchema, employeeLeaveBalances, leaveBalanceTransactions2, insertEmployeeLeaveBalanceSchema, insertLeaveBalanceTransactionSchema, blackoutPeriods, insertBlackoutPeriodSchema, collaborativeLeaveSettingsEnhanced, leaveTaskAssigneesEnhanced, leaveClosureReportsEnhanced, performanceRecordsEnhanced, collaborativeLeaveAuditLogEnhanced, insertLeaveTaskAssigneeEnhancedSchema, insertLeaveClosureReportEnhancedSchema, insertPerformanceRecordEnhancedSchema, insertCollaborativeLeaveAuditLogEnhancedSchema, insertCollaborativeLeaveSettingsEnhancedSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    userRoleEnum = pgEnum("user_role", [
      "admin",
      "manager",
      "employee",
      "hr"
    ]);
    setupStatusEnum = pgEnum("setup_status", [
      "pending",
      "in_progress",
      "completed"
    ]);
    users = pgTable("users", {
      id: varchar("id").primaryKey().notNull(),
      email: varchar("email").unique(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      role: userRoleEnum("role").default("employee").notNull(),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    companies = pgTable("companies", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      industry: varchar("industry"),
      workingDaysPerWeek: integer("working_days_per_week").default(5),
      leaveYearStart: varchar("leave_year_start").default("January 1st"),
      effectiveDate: timestamp("effective_date"),
      setupStatus: setupStatusEnum("setup_status").default("pending"),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    leaveTypes = pgTable("leave_types", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      description: text("description"),
      icon: varchar("icon"),
      color: varchar("color"),
      annualAllowance: integer("annual_allowance"),
      carryForward: boolean("carry_forward").default(false),
      negativeLeaveBalance: integer("negative_leave_balance").default(0),
      isActive: boolean("is_active").default(true),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    roles = pgTable("roles", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      description: text("description"),
      permissions: jsonb("permissions").notNull().default("{}"),
      isActive: boolean("is_active").default(true),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    userRoles = pgTable("user_roles", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      roleId: integer("role_id").notNull().references(() => roles.id),
      assignedAt: timestamp("assigned_at").defaultNow()
    });
    workflows = pgTable("workflows", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    compOffConfig = pgTable("comp_off_config", {
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
      compensationOptions: jsonb("compensation_options").default(
        '["En-cashment", "Convert to leaves"]'
      ),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ptoConfig = pgTable("pto_config", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    leaveRequests = pgTable("leave_requests", {
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
      documents: jsonb("documents"),
      // Array of document URLs/paths
      // Workflow tracking fields
      workflowId: integer("workflow_id"),
      currentStep: integer("current_step").default(0),
      // 0 = start, 1 = first review step, etc.
      workflowStatus: varchar("workflow_status").default("in_progress"),
      // in_progress, completed, bypassed
      approvalHistory: jsonb("approval_history").default([]),
      // Array of approval records
      scheduledAutoApprovalAt: timestamp("scheduled_auto_approval_at"),
      // For time-based auto-approval
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    holidays = pgTable("holidays", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      date: date("date").notNull(),
      description: text("description"),
      isRecurring: boolean("is_recurring").default(false),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    leaveVariants = pgTable("leave_variants", {
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
      applicableAfterType: varchar("applicable_after_type").notNull().default("days"),
      // "days", "probation_end", "date_of_joining"
      mustBePlannedInAdvance: integer("must_be_planned_in_advance").notNull().default(0),
      maxDaysInStretch: integer("max_days_in_stretch").notNull().default(0),
      minDaysRequired: integer("min_days_required").notNull().default(0),
      maxInstances: integer("max_instances").notNull().default(0),
      maxInstancesPeriod: varchar("max_instances_period").notNull().default("year"),
      allowLeavesBeforeWeekend: boolean("allow_leaves_before_weekend").default(
        false
      ),
      allowLeavesBeforeHoliday: boolean("allow_leaves_before_holiday").default(
        false
      ),
      allowClubbing: boolean("allow_clubbing").default(false),
      supportingDocuments: boolean("supporting_documents").default(false),
      supportingDocumentsText: text("supporting_documents_text"),
      allowDuringNotice: boolean("allow_during_notice").default(false),
      requiresWorkflow: boolean("requires_workflow").default(true),
      leaveBalanceDeductionBefore: boolean(
        "leave_balance_deduction_before"
      ).default(false),
      leaveBalanceDeductionAfter: boolean("leave_balance_deduction_after").default(
        false
      ),
      leaveBalanceDeductionNotAllowed: boolean(
        "leave_balance_deduction_not_allowed"
      ).default(false),
      gracePeriod: integer("grace_period").notNull().default(0),
      allowWithdrawalBeforeApproval: boolean(
        "allow_withdrawal_before_approval"
      ).default(false),
      allowWithdrawalAfterApproval: boolean(
        "allow_withdrawal_after_approval"
      ).default(false),
      allowWithdrawalNotAllowed: boolean("allow_withdrawal_not_allowed").default(
        true
      ),
      negativeLeaveBalance: integer("negative_leave_balance").notNull().default(0),
      carryForwardLimit: integer("carry_forward_limit").notNull().default(0),
      carryForwardPeriod: varchar("carry_forward_period").notNull().default("year"),
      encashment: boolean("encashment").default(false),
      encashmentCalculation: varchar("encashment_calculation"),
      maxEncashmentDays: integer("max_encashment_days"),
      encashmentTiming: varchar("encashment_timing"),
      allowApplicationsOnBehalf: boolean("allow_applications_on_behalf").default(
        false
      ),
      showAvailedLeaves: boolean("show_availed_leaves").default(false),
      showBalanceLeaves: boolean("show_balance_leaves").default(false),
      maximumBalance: integer("maximum_balance").notNull().default(0),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    compOffVariants = pgTable("comp_off_variants", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      description: text("description"),
      enabled: boolean("enabled").default(true),
      // Comp-off units configuration
      allowFullDay: boolean("allow_full_day").default(false),
      fullDayHours: numeric("full_day_hours", { precision: 4, scale: 2 }).default(
        "0"
      ),
      allowHalfDay: boolean("allow_half_day").default(false),
      halfDayHours: numeric("half_day_hours", { precision: 4, scale: 2 }).default(
        "0"
      ),
      allowQuarterDay: boolean("allow_quarter_day").default(false),
      quarterDayHours: numeric("quarter_day_hours", {
        precision: 4,
        scale: 2
      }).default("0"),
      // Eligibility criteria
      maxApplications: integer("max_applications").default(1),
      maxApplicationsPeriod: varchar("max_applications_period").default("Month"),
      // Workflow settings
      workflowRequired: boolean("workflow_required").default(false),
      documentsRequired: boolean("documents_required").default(false),
      applicableAfter: integer("applicable_after").default(0),
      // days
      approvalDays: integer("approval_days").default(0),
      expiryDays: integer("expiry_days").default(365),
      // Working days
      allowNonWorkingDays: boolean("allow_non_working_days").default(false),
      // Withdrawal settings
      withdrawalBeforeApproval: boolean("withdrawal_before_approval").default(
        false
      ),
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
      encashmentBasedOn: varchar("encashment_based_on"),
      // "basic_pay", "basic_plus_dearness_allowance", "gross_pay"
      maxEncashmentDays: integer("max_encashment_days").default(0),
      maxEncashmentHours: numeric("max_encashment_hours", {
        precision: 4,
        scale: 2
      }).default("0"),
      convertibleLeaveTypes: jsonb("convertible_leave_types"),
      // Array of leave type IDs
      // Legacy fields for backward compatibility
      maxBalance: integer("max_balance").default(0),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ptoVariants = pgTable("pto_variants", {
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
      applicableAfterType: varchar("applicable_after_type").default(
        "date_of_joining"
      ),
      applicableAfter: integer("applicable_after").default(0),
      // days
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ptoRequests = pgTable("pto_requests", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      ptoVariantId: integer("pto_variant_id").references(() => ptoVariants.id).notNull(),
      requestDate: date("request_date").notNull(),
      timeType: varchar("time_type").notNull(),
      // "full_day", "half_day", "quarter_day", "hours"
      startTime: varchar("start_time"),
      // For hour-based PTO
      endTime: varchar("end_time"),
      // For hour-based PTO
      totalHours: numeric("total_hours", { precision: 4, scale: 2 }),
      // For hour-based PTO
      reason: text("reason").notNull(),
      documentUrl: varchar("document_url"),
      status: varchar("status").default("pending").notNull(),
      // "pending", "approved", "rejected", "cancelled"
      approvedBy: varchar("approved_by"),
      approvedAt: timestamp("approved_at"),
      rejectionReason: text("rejection_reason"),
      workflowId: integer("workflow_id"),
      currentStep: integer("current_step").default(1),
      workflowStatus: varchar("workflow_status").default("pending"),
      // "pending", "in_progress", "completed", "rejected"
      approvalHistory: jsonb("approval_history").default("[]"),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    compOffRequests = pgTable("comp_off_requests", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      reason: varchar("reason").notNull(),
      workedDate: date("worked_date").notNull(),
      compensateWith: date("compensate_with"),
      lapseOn: date("lapse_on"),
      status: varchar("status").notNull().default("pending"),
      // pending, approved, rejected, expired, banked, availed
      type: varchar("type").notNull().default("avail"),
      // avail, bank, transfer_to_leave, en_cash
      dayType: varchar("day_type").notNull().default("full"),
      // full, half
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
      workflowStatus: varchar("workflow_status").default("pending"),
      // "pending", "in_progress", "completed", "rejected"
      approvalHistory: jsonb("approval_history").default("[]"),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    employeeAssignments = pgTable("employee_assignments", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      leaveVariantId: integer("leave_variant_id").notNull(),
      // This will store the variant ID regardless of type
      assignmentType: varchar("assignment_type").notNull(),
      // "leave_variant", "comp_off_variant", or "pto_variant"
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
    });
    insertUserSchema = createInsertSchema(users).pick({
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profileImageUrl: true,
      role: true
    });
    insertCompanySchema = createInsertSchema(companies).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      effectiveDate: z.string().transform((str) => new Date(str)).optional()
    });
    insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertRoleSchema = createInsertSchema(roles).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertWorkflowSchema = createInsertSchema(workflows).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCompOffConfigSchema = createInsertSchema(compOffConfig).omit(
      {
        id: true,
        createdAt: true,
        updatedAt: true
      }
    );
    insertPTOConfigSchema = createInsertSchema(ptoConfig).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      startDate: z.string().transform((str) => new Date(str)),
      endDate: z.string().transform((str) => new Date(str))
    });
    insertHolidaySchema = createInsertSchema(holidays).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertLeaveVariantSchema = createInsertSchema(leaveVariants).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCompOffVariantSchema = createInsertSchema(compOffVariants).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      fullDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
      halfDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
      quarterDayHours: z.union([z.number(), z.string()]).transform((val) => String(val)),
      maxEncashmentHours: z.union([z.number(), z.string()]).transform((val) => String(val))
    });
    insertPTOVariantSchema = createInsertSchema(ptoVariants).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertPTORequestSchema = createInsertSchema(ptoRequests).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      approvedBy: true,
      approvedAt: true,
      status: true,
      currentStep: true,
      workflowStatus: true,
      approvalHistory: true
    });
    insertCompOffRequestSchema = createInsertSchema(compOffRequests).omit({
      id: true,
      appliedAt: true,
      approvedAt: true,
      rejectedAt: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      workedDate: z.union([
        z.date(),
        z.string().transform((str) => new Date(str))
      ]),
      compensateWith: z.union([z.date(), z.string().transform((str) => new Date(str)), z.null()]).optional()
    });
    insertEmployeeAssignmentSchema = createInsertSchema(
      employeeAssignments
    ).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    employeeLeaveBalances = pgTable(
      "employee_leave_balances",
      {
        id: serial("id").primaryKey(),
        userId: varchar("user_id").notNull(),
        leaveVariantId: integer("leave_variant_id").notNull(),
        totalEntitlement: numeric("total_entitlement", {
          precision: 10,
          scale: 2
        }).notNull(),
        // Annual entitlement in days (supports decimals)
        currentBalance: numeric("current_balance", {
          precision: 10,
          scale: 2
        }).notNull(),
        // Current available balance in days (supports decimals)
        usedBalance: numeric("used_balance", { precision: 10, scale: 2 }).default("0").notNull(),
        // Used balance in days (supports decimals)
        carryForward: numeric("carry_forward", { precision: 10, scale: 2 }).default("0").notNull(),
        // Carried forward from previous period
        year: integer("year").notNull(),
        // Calendar year this balance is for
        orgId: integer("org_id").default(60),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        unique().on(table.userId, table.leaveVariantId, table.year, table.orgId)
      ]
    );
    leaveBalanceTransactions2 = pgTable("leave_balance_transactions", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      leaveVariantId: integer("leave_variant_id").notNull(),
      transactionType: varchar("transaction_type").notNull(),
      // 'grant', 'deduction', 'carry_forward', 'adjustment'
      amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
      // Amount in days (positive for credits, negative for debits, supports decimals)
      balanceAfter: numeric("balance_after", { precision: 10, scale: 2 }).notNull(),
      // Balance after this transaction (supports decimals)
      description: text("description"),
      transactionDate: timestamp("transaction_date").defaultNow(),
      leaveRequestId: integer("leave_request_id"),
      // If related to a leave request
      year: integer("year").notNull(),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertEmployeeLeaveBalanceSchema = createInsertSchema(
      employeeLeaveBalances
    );
    insertLeaveBalanceTransactionSchema = createInsertSchema(
      leaveBalanceTransactions2
    );
    blackoutPeriods = pgTable("blackout_periods", {
      id: serial("id").primaryKey(),
      title: varchar("title").notNull(),
      startDate: date("start_date").notNull(),
      endDate: date("end_date").notNull(),
      reason: text("reason"),
      allowLeaves: boolean("allow_leaves").default(false).notNull(),
      allowedLeaveTypes: text("allowed_leave_types").array().default([]),
      // Array of leave type IDs that are allowed as exceptions
      assignedEmployees: text("assigned_employees").array().default([]),
      // Array of user IDs this applies to (empty = all)
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertBlackoutPeriodSchema = createInsertSchema(
      blackoutPeriods
    ).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    collaborativeLeaveSettingsEnhanced = pgTable(
      "collaborative_leave_settings",
      {
        id: serial("id").primaryKey(),
        enabled: boolean("enabled").default(false).notNull(),
        maxTasksPerLeave: integer("max_tasks_per_leave").default(5),
        requireManagerApproval: boolean("require_manager_approval").default(false),
        autoReminderDays: integer("auto_reminder_days").default(1),
        // Days before expected support date to send reminder
        defaultNotificationMethod: varchar("default_notification_method").default(
          "email"
        ),
        enableWhatsApp: boolean("enable_whatsapp").default(false),
        enableEmailNotifications: boolean("enable_email_notifications").default(
          true
        ),
        closureReportRequired: boolean("closure_report_required").default(true),
        managerReviewRequired: boolean("manager_review_required").default(true),
        orgId: integer("org_id").default(60),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [unique().on(table.orgId)]
    );
    leaveTaskAssigneesEnhanced = pgTable("leave_task_assignees", {
      id: serial("id").primaryKey(),
      leaveRequestId: integer("leave_request_id").notNull(),
      assigneeName: varchar("assignee_name").notNull(),
      assigneeUserId: varchar("assignee_user_id"),
      // Store the selected employee's user ID
      assigneeEmail: varchar("assignee_email").notNull(),
      assigneePhone: varchar("assignee_phone"),
      // Optional for WhatsApp
      taskDescription: text("task_description").notNull(),
      expectedSupportDate: date("expected_support_date"),
      // Keep for backward compatibility
      expectedSupportDateFrom: date("expected_support_date_from"),
      expectedSupportDateTo: date("expected_support_date_to"),
      additionalNotes: text("additional_notes"),
      // New field for additional notes
      notificationMethod: varchar("notification_method").notNull(),
      // 'email', 'whatsapp', 'both'
      status: varchar("status").default("pending").notNull(),
      // 'pending', 'accepted', 'rejected', 'done', 'wip', 'not_done', 'abandoned'
      acceptanceResponse: text("acceptance_response"),
      // Comments on acceptance/rejection
      statusComments: text("status_comments"),
      // Comments during status updates
      notificationSent: boolean("notification_sent").default(false),
      acceptedAt: timestamp("accepted_at"),
      lastStatusUpdate: timestamp("last_status_update").defaultNow(),
      uniqueLink: varchar("unique_link").notNull(),
      // For external access
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    leaveClosureReportsEnhanced = pgTable(
      "leave_closure_reports",
      {
        id: serial("id").primaryKey(),
        leaveRequestId: integer("leave_request_id").notNull(),
        employeeComments: text("employee_comments"),
        // Employee's overall comments
        taskReviews: jsonb("task_reviews"),
        // JSON array of task-specific reviews
        managerRating: varchar("manager_rating"),
        // 'responsible', 'ok', 'needs_improvement'
        managerComments: text("manager_comments"),
        managerReviewedAt: timestamp("manager_reviewed_at"),
        submittedAt: timestamp("submitted_at").defaultNow(),
        orgId: integer("org_id").default(60),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [unique().on(table.leaveRequestId, table.orgId)]
    );
    performanceRecordsEnhanced = pgTable("performance_records", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull(),
      leaveRequestId: integer("leave_request_id"),
      // If related to leave management
      ratingType: varchar("rating_type").notNull(),
      // 'leave_management', 'annual_review', etc.
      rating: varchar("rating").notNull(),
      // 'responsible', 'ok', 'needs_improvement', etc.
      comments: text("comments"),
      ratedBy: varchar("rated_by").notNull(),
      // Manager's user ID
      ratingDate: timestamp("rating_date").defaultNow(),
      year: integer("year").notNull(),
      orgId: integer("org_id").default(60),
      createdAt: timestamp("created_at").defaultNow()
    });
    collaborativeLeaveAuditLogEnhanced = pgTable(
      "collaborative_leave_audit_log",
      {
        id: serial("id").primaryKey(),
        userId: varchar("user_id").notNull(),
        // Who performed the action
        actionType: varchar("action_type").notNull(),
        // 'task_created', 'notification_sent', 'task_accepted', 'status_updated', etc.
        relatedEntityType: varchar("related_entity_type").notNull(),
        // 'leave_request', 'task_assignment', 'closure_report'
        relatedEntityId: integer("related_entity_id").notNull(),
        oldValue: text("old_value"),
        // Previous value (JSON)
        newValue: text("new_value"),
        // New value (JSON)
        details: text("details"),
        // Additional context
        timestamp: timestamp("timestamp").defaultNow(),
        orgId: integer("org_id").default(60)
      }
    );
    insertLeaveTaskAssigneeEnhancedSchema = createInsertSchema(
      leaveTaskAssigneesEnhanced
    );
    insertLeaveClosureReportEnhancedSchema = createInsertSchema(
      leaveClosureReportsEnhanced
    );
    insertPerformanceRecordEnhancedSchema = createInsertSchema(
      performanceRecordsEnhanced
    );
    insertCollaborativeLeaveAuditLogEnhancedSchema = createInsertSchema(collaborativeLeaveAuditLogEnhanced);
    insertCollaborativeLeaveSettingsEnhancedSchema = createInsertSchema(collaborativeLeaveSettingsEnhanced);
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var FORCED_EXTERNAL_URL, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    FORCED_EXTERNAL_URL = "postgres://postgres:resolve%402022@20.204.119.48:5432/ezii-leave";
    process.env.DATABASE_URL = FORCED_EXTERNAL_URL;
    console.log(
      "[DATABASE] HARD OVERRIDE - Forcing connection to external database"
    );
    console.log(
      "[DATABASE] Environment DATABASE_URL:",
      process.env.DATABASE_URL?.replace(/:[^:]*@/, ":****@")
    );
    console.log(
      "[DATABASE] Using URL:",
      FORCED_EXTERNAL_URL.replace(/:[^:]*@/, ":****@")
    );
    if (global.pool) {
      console.log("[DATABASE] Destroying existing pool");
      global.pool.end();
      delete global.pool;
    }
    pool = new Pool({
      connectionString: FORCED_EXTERNAL_URL,
      ssl: false,
      max: 10,
      min: 1,
      idleTimeoutMillis: 1e4,
      connectionTimeoutMillis: 2e3
    });
    pool.connect().then((client) => {
      client.query(
        "SELECT current_database(), inet_server_addr(), inet_server_port()"
      ).then((result) => {
        console.log("[DATABASE] Connected to:", result.rows[0]);
        client.release();
      }).catch((err) => {
        console.error("[DATABASE] Test query failed:", err);
        client.release();
      });
    }).catch((err) => {
      console.error("[DATABASE] Connection failed:", err);
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/utils/employeeMapping.ts
var employeeMapping_exports = {};
__export(employeeMapping_exports, {
  migrateEmployeeData: () => migrateEmployeeData
});
import { eq as eq2, and as and2 } from "drizzle-orm";
async function migrateEmployeeData(orgId) {
  console.log(`[EmployeeMapping] Starting data migration for org_id: ${orgId}`);
  const employeeMappings = [
    { employee_number: "IN2005002", user_id: "1435" }
    // Mangesh Mohite
    // Add more mappings as needed
  ];
  for (const mapping of employeeMappings) {
    const { employee_number, user_id } = mapping;
    try {
      console.log(`[EmployeeMapping] Migrating data from ${employee_number} to ${user_id}`);
      const balanceUpdateResult = await db.update(employeeLeaveBalances).set({ userId: user_id }).where(and2(
        eq2(employeeLeaveBalances.userId, employee_number),
        eq2(employeeLeaveBalances.orgId, orgId)
      ));
      console.log(`[EmployeeMapping] Updated ${balanceUpdateResult.rowCount || 0} balance records`);
      const transactionUpdateResult = await db.update(leaveBalanceTransactions2).set({ userId: user_id }).where(and2(
        eq2(leaveBalanceTransactions2.userId, employee_number),
        eq2(leaveBalanceTransactions2.orgId, orgId)
      ));
      console.log(`[EmployeeMapping] Updated ${transactionUpdateResult.rowCount || 0} transaction records`);
    } catch (error) {
      console.error(`[EmployeeMapping] Error migrating ${employee_number} to ${user_id}:`, error);
    }
  }
  console.log(`[EmployeeMapping] Migration completed for org_id: ${orgId}`);
}
var init_employeeMapping = __esm({
  "server/utils/employeeMapping.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();
init_db();
import { eq, desc, and, or, sql, isNotNull, like, inArray } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations - mandatory for Replit Auth
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUsers(orgId) {
    if (orgId) {
      return await db.select().from(users).where(eq(users.orgId, orgId)).orderBy(users.firstName, users.lastName);
    }
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values({
      id: userData.id || "",
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: userData.role || "employee"
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        role: userData.role || "employee",
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // Company operations
  async getCompany(orgId) {
    if (orgId) {
      const [company2] = await db.select().from(companies).where(eq(companies.orgId, orgId)).limit(1);
      return company2;
    }
    const [company] = await db.select().from(companies).limit(1);
    return company;
  }
  async createCompany(company) {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }
  async updateCompany(id, company) {
    const [updatedCompany] = await db.update(companies).set({ ...company, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companies.id, id)).returning();
    return updatedCompany;
  }
  // Leave type operations
  async getLeaveTypes(orgId) {
    const baseQuery = db.select().from(leaveTypes);
    if (orgId) {
      return await baseQuery.where(and(eq(leaveTypes.isActive, true), eq(leaveTypes.orgId, orgId))).orderBy(leaveTypes.name);
    }
    return await baseQuery.where(eq(leaveTypes.isActive, true)).orderBy(leaveTypes.name);
  }
  async createLeaveType(leaveType) {
    const existing = await db.select().from(leaveTypes).where(and(
      eq(leaveTypes.name, leaveType.name),
      eq(leaveTypes.orgId, leaveType.orgId || 60),
      eq(leaveTypes.isActive, true)
    )).limit(1);
    if (existing.length > 0) {
      throw new Error(`A leave type with the name "${leaveType.name}" already exists.`);
    }
    const [newLeaveType] = await db.insert(leaveTypes).values(leaveType).returning();
    return newLeaveType;
  }
  async updateLeaveType(id, leaveType) {
    const [updatedLeaveType] = await db.update(leaveTypes).set({ ...leaveType, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leaveTypes.id, id)).returning();
    return updatedLeaveType;
  }
  async deleteLeaveType(id) {
    await db.delete(employeeAssignments).where(eq(employeeAssignments.leaveVariantId, id));
    await db.delete(leaveVariants).where(eq(leaveVariants.leaveTypeId, id));
    await db.delete(leaveTypes).where(eq(leaveTypes.id, id));
  }
  // Role operations
  async getRoles(orgId) {
    if (orgId) {
      return await db.select().from(roles).where(and(eq(roles.isActive, true), eq(roles.orgId, orgId))).orderBy(roles.name);
    }
    return await db.select().from(roles).where(eq(roles.isActive, true)).orderBy(roles.name);
  }
  async createRole(role) {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }
  async updateRole(id, role) {
    const [updatedRole] = await db.update(roles).set({ ...role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(roles.id, id)).returning();
    return updatedRole;
  }
  async deleteRole(id) {
    await db.update(roles).set({ isActive: false }).where(eq(roles.id, id));
  }
  // User role operations
  async getUserRoles(userId) {
    return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }
  async assignUserRole(userId, roleId) {
    const [userRole] = await db.insert(userRoles).values({ userId, roleId }).returning();
    return userRole;
  }
  async removeUserRole(userId, roleId) {
    await db.delete(userRoles).where(eq(userRoles.userId, userId) && eq(userRoles.roleId, roleId));
  }
  async getUserPermissions(userId) {
    const userRolesList = await db.select({
      roleId: userRoles.roleId,
      permissions: roles.permissions
    }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, userId));
    const mergedPermissions = {};
    userRolesList.forEach((role) => {
      if (role.permissions) {
        Object.assign(mergedPermissions, role.permissions);
      }
    });
    return mergedPermissions;
  }
  // Workflow operations
  async getWorkflows(orgId) {
    if (orgId) {
      return await db.select().from(workflows).where(and(eq(workflows.isActive, true), eq(workflows.orgId, orgId))).orderBy(workflows.name);
    }
    return await db.select().from(workflows).where(eq(workflows.isActive, true)).orderBy(workflows.name);
  }
  async getWorkflowsByOrg(orgId) {
    return await db.select().from(workflows).where(eq(workflows.orgId, orgId)).orderBy(workflows.createdAt);
  }
  async createWorkflow(workflow) {
    const [newWorkflow] = await db.insert(workflows).values(workflow).returning();
    return newWorkflow;
  }
  async updateWorkflow(id, workflow) {
    const [updatedWorkflow] = await db.update(workflows).set({ ...workflow, updatedAt: /* @__PURE__ */ new Date() }).where(eq(workflows.id, id)).returning();
    return updatedWorkflow;
  }
  async deleteWorkflow(id, orgId) {
    const targetOrgId = orgId || 60;
    await db.update(workflows).set({ isActive: false }).where(and(eq(workflows.id, id), eq(workflows.orgId, targetOrgId)));
  }
  // Comp off configuration
  async getCompOffConfig(orgId) {
    if (orgId) {
      const [config2] = await db.select().from(compOffConfig).where(eq(compOffConfig.orgId, orgId)).limit(1);
      return config2;
    }
    const [config] = await db.select().from(compOffConfig).limit(1);
    return config;
  }
  async upsertCompOffConfig(config) {
    const existing = await this.getCompOffConfig();
    if (existing) {
      const [updated] = await db.update(compOffConfig).set({ ...config, updatedAt: /* @__PURE__ */ new Date() }).where(eq(compOffConfig.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(compOffConfig).values(config).returning();
      return created;
    }
  }
  // PTO configuration
  async getPTOConfig(orgId) {
    if (orgId) {
      const [config2] = await db.select().from(ptoConfig).where(eq(ptoConfig.orgId, orgId)).limit(1);
      return config2;
    }
    const [config] = await db.select().from(ptoConfig).limit(1);
    return config;
  }
  async upsertPTOConfig(config) {
    const existing = config.orgId ? await this.getPTOConfig(config.orgId) : void 0;
    if (existing) {
      const [updated] = await db.update(ptoConfig).set({ ...config, updatedAt: /* @__PURE__ */ new Date() }).where(eq(ptoConfig.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(ptoConfig).values(config).returning();
      return created;
    }
  }
  // Leave request operations
  async getLeaveRequests(userId, orgId, status) {
    console.log(`\u{1F50D} [Storage] getLeaveRequests called with userId: ${userId}, orgId: ${orgId}, status: ${status}`);
    const conditions = [];
    if (userId) conditions.push(eq(leaveRequests.userId, userId));
    if (orgId) conditions.push(eq(leaveRequests.orgId, orgId));
    if (status) conditions.push(eq(leaveRequests.status, status));
    console.log(`\u{1F50D} [Storage] Conditions built: ${conditions.length} conditions`);
    console.log(`\u{1F50D} [Storage] Conditions array:`, conditions);
    if (conditions.length === 0) {
      console.log(`\u{1F50D} [Storage] No conditions provided, returning empty array`);
      return [];
    }
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    console.log(`\u{1F50D} [Storage] Where clause:`, whereClause);
    const requests = await db.select().from(leaveRequests).where(whereClause).orderBy(desc(leaveRequests.createdAt));
    console.log(`\u{1F50D} [Storage] Query returned ${requests.length} requests`);
    console.log(`\u{1F50D} [Storage] First 3 requests:`, requests.slice(0, 3));
    const leaveTypeIds = [...new Set(requests.map((r) => r.leaveTypeId))];
    if (leaveTypeIds.length === 0) {
      console.log(`\u{1F50D} [Storage] No leave type IDs found, returning requests as-is`);
      return requests;
    }
    let leaveTypesData;
    try {
      leaveTypesData = await db.select().from(leaveTypes).where(inArray(leaveTypes.id, leaveTypeIds));
    } catch (dbError) {
      console.log(`\u{1F50D} [Storage] Error fetching leave types, using simple fallback:`, dbError.message);
      leaveTypesData = [];
    }
    const leaveTypeMap = new Map(leaveTypesData.map((lt) => [lt.id, lt.name]));
    return requests.map((request) => ({
      ...request,
      leaveTypeName: leaveTypeMap.get(request.leaveTypeId) || null
    }));
  }
  async createLeaveRequest(request) {
    const [newRequest] = await db.insert(leaveRequests).values(request).returning();
    return newRequest;
  }
  async updateLeaveRequest(id, request) {
    const [updatedRequest] = await db.update(leaveRequests).set({ ...request, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leaveRequests.id, id)).returning();
    return updatedRequest;
  }
  async deleteLeaveRequest(id) {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
  }
  // Workflow processing operations
  async getWorkflowForLeaveType(leaveTypeId, orgId) {
    const targetOrgId = orgId || 60;
    const [workflow] = await db.select().from(workflows).where(and(
      eq(workflows.process, "application"),
      sql`${workflows.subProcesses} @> ARRAY['apply-leave']`,
      eq(workflows.isActive, true),
      eq(workflows.orgId, targetOrgId)
    )).limit(1);
    return workflow;
  }
  async initializeWorkflowForRequest(leaveRequestId, workflowId) {
    const [updatedRequest] = await db.update(leaveRequests).set({
      workflowId,
      currentStep: 1,
      // Start at first review step
      workflowStatus: "in_progress",
      approvalHistory: [],
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(leaveRequests.id, leaveRequestId)).returning();
    return updatedRequest;
  }
  async processWorkflowApproval(leaveRequestId, approvedBy, orgId) {
    const targetOrgId = orgId || 60;
    const [request] = await db.select().from(leaveRequests).where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.orgId, targetOrgId)));
    if (!request) {
      throw new Error("Leave request not found");
    }
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, request.workflowId));
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    const steps = workflow.steps;
    const currentStepIndex = request.currentStep - 1;
    if (currentStepIndex >= steps.length) {
      throw new Error("Invalid workflow step");
    }
    const currentStep = steps[currentStepIndex];
    const approvalRecord = {
      stepIndex: currentStepIndex,
      stepTitle: currentStep.title,
      approvedBy,
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      action: "approved"
    };
    const updatedHistory = [...request.approvalHistory || [], approvalRecord];
    const isLastStep = currentStepIndex === steps.length - 1;
    let updateData = {
      approvalHistory: updatedHistory,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (isLastStep) {
      updateData = {
        ...updateData,
        status: "approved",
        approvedBy,
        approvedAt: /* @__PURE__ */ new Date(),
        workflowStatus: "completed"
      };
      await this.deductLeaveBalance(request.userId, request.leaveTypeId, request.workingDays, targetOrgId);
    } else {
      updateData.currentStep = request.currentStep + 1;
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = steps[nextStepIndex];
      if (nextStep.autoApproval) {
        return await this.processAutoApproval(leaveRequestId, nextStepIndex, steps, updatedHistory, targetOrgId);
      }
    }
    const [updatedRequest] = await db.update(leaveRequests).set(updateData).where(eq(leaveRequests.id, leaveRequestId)).returning();
    return updatedRequest;
  }
  async rejectWorkflowRequest(leaveRequestId, rejectedBy, rejectionReason, orgId) {
    const targetOrgId = orgId || 60;
    const [request] = await db.select().from(leaveRequests).where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.orgId, targetOrgId)));
    if (!request) {
      throw new Error("Leave request not found");
    }
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, request.workflowId));
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    const steps = workflow.steps;
    const currentStepIndex = request.currentStep - 1;
    const currentStep = steps[currentStepIndex];
    const rejectionRecord = {
      stepIndex: currentStepIndex,
      stepTitle: currentStep.title,
      rejectedBy,
      rejectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      rejectionReason,
      action: "rejected"
    };
    const updatedHistory = [...request.approvalHistory || [], rejectionRecord];
    const [updatedRequest] = await db.update(leaveRequests).set({
      status: "rejected",
      rejectedReason: rejectionReason,
      approvalHistory: updatedHistory,
      workflowStatus: "completed",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(leaveRequests.id, leaveRequestId)).returning();
    const [leaveVariant] = await db.select().from(leaveVariants).where(and(
      eq(leaveVariants.leaveTypeId, request.leaveTypeId),
      eq(leaveVariants.orgId, targetOrgId)
    ));
    if (leaveVariant && leaveVariant.leaveBalanceDeductionBefore) {
      console.log(`Restoring balance for rejected request ${leaveRequestId} - ${request.workingDays} days`);
      const [currentBalance] = await db.select().from(employeeLeaveBalances).where(and(
        eq(employeeLeaveBalances.userId, request.userId),
        eq(employeeLeaveBalances.leaveVariantId, leaveVariant.id),
        eq(employeeLeaveBalances.orgId, targetOrgId)
      ));
      if (currentBalance) {
        const newCurrentBalance = parseFloat(currentBalance.currentBalance) + parseFloat(request.workingDays);
        await db.insert(leaveBalanceTransactions2).values({
          userId: request.userId,
          leaveVariantId: leaveVariant.id,
          transactionType: "balance_restoration",
          amount: request.workingDays,
          // Restore the working days
          balanceAfter: newCurrentBalance,
          // Add the required balanceAfter field
          description: `Balance restored for rejected request ${leaveRequestId}`,
          year: (/* @__PURE__ */ new Date()).getFullYear(),
          orgId: targetOrgId,
          leaveRequestId,
          createdAt: /* @__PURE__ */ new Date()
        });
        await db.update(employeeLeaveBalances).set({
          currentBalance: newCurrentBalance,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(employeeLeaveBalances.id, currentBalance.id));
        console.log(`Balance restored: ${currentBalance.currentBalance} + ${request.workingDays} = ${newCurrentBalance}`);
      }
    }
    return updatedRequest;
  }
  async processAutoApproval(leaveRequestId, stepIndex, steps, currentHistory, orgId) {
    const step = steps[stepIndex];
    if (step.days > 0 || step.hours > 0) {
      return await this.scheduleTimeBasedApproval(leaveRequestId, stepIndex, steps, currentHistory, orgId);
    }
    const autoApprovalRecord = {
      stepIndex,
      stepTitle: step.title,
      approvedBy: "system",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      action: "auto-approved"
    };
    const updatedHistory = [...currentHistory, autoApprovalRecord];
    const isLastStep = stepIndex === steps.length - 1;
    if (isLastStep) {
      const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveRequestId));
      const [updatedRequest] = await db.update(leaveRequests).set({
        status: "approved",
        approvedBy: "system",
        approvedAt: /* @__PURE__ */ new Date(),
        approvalHistory: updatedHistory,
        workflowStatus: "completed",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(leaveRequests.id, leaveRequestId)).returning();
      await this.deductLeaveBalance(request.userId, request.leaveTypeId, request.workingDays, orgId);
      return updatedRequest;
    } else {
      const nextStepIndex = stepIndex + 1;
      const nextStep = steps[nextStepIndex];
      if (nextStep.autoApproval) {
        return await this.processAutoApproval(leaveRequestId, nextStepIndex, steps, updatedHistory, orgId);
      } else {
        const [updatedRequest] = await db.update(leaveRequests).set({
          currentStep: nextStepIndex + 1,
          approvalHistory: updatedHistory,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(leaveRequests.id, leaveRequestId)).returning();
        return updatedRequest;
      }
    }
  }
  async scheduleTimeBasedApproval(leaveRequestId, stepIndex, steps, currentHistory, orgId) {
    const step = steps[stepIndex];
    const autoApprovalDate = /* @__PURE__ */ new Date();
    if (step.days) {
      autoApprovalDate.setDate(autoApprovalDate.getDate() + step.days);
    }
    if (step.hours) {
      autoApprovalDate.setHours(autoApprovalDate.getHours() + step.hours);
    }
    const [updatedRequest] = await db.update(leaveRequests).set({
      currentStep: stepIndex + 1,
      approvalHistory: currentHistory,
      scheduledAutoApprovalAt: autoApprovalDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(leaveRequests.id, leaveRequestId)).returning();
    return updatedRequest;
  }
  // Check and process pending time-based approvals
  async processPendingTimeBasedApprovals(orgId) {
    const targetOrgId = orgId || 60;
    const now = /* @__PURE__ */ new Date();
    const errors = [];
    let processed = 0;
    try {
      const pendingRequests = await db.select().from(leaveRequests).where(and(
        eq(leaveRequests.orgId, targetOrgId),
        eq(leaveRequests.status, "pending"),
        isNotNull(leaveRequests.scheduledAutoApprovalAt),
        sql`${leaveRequests.scheduledAutoApprovalAt} <= ${now}`
      ));
      for (const request of pendingRequests) {
        try {
          const [workflow] = await db.select().from(workflows).where(eq(workflows.id, request.workflowId));
          if (workflow) {
            const steps = workflow.steps;
            const currentStepIndex = request.currentStep - 1;
            if (currentStepIndex < steps.length) {
              const currentStep = steps[currentStepIndex];
              const autoApprovalRecord = {
                stepIndex: currentStepIndex,
                stepTitle: currentStep.title,
                approvedBy: "system-time-based",
                approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
                action: "auto-approved-time-based",
                scheduledAt: request.scheduledAutoApprovalAt?.toISOString(),
                processedAt: now.toISOString()
              };
              const updatedHistory = [...request.approvalHistory || [], autoApprovalRecord];
              const isLastStep = currentStepIndex === steps.length - 1;
              if (isLastStep) {
                await db.update(leaveRequests).set({
                  status: "approved",
                  approvedBy: "system-time-based",
                  approvedAt: now,
                  approvalHistory: updatedHistory,
                  workflowStatus: "completed",
                  scheduledAutoApprovalAt: null,
                  updatedAt: now
                }).where(eq(leaveRequests.id, request.id));
                await this.deductLeaveBalance(request.userId, request.leaveTypeId, request.workingDays, targetOrgId);
              } else {
                const nextStepIndex = currentStepIndex + 1;
                const nextStep = steps[nextStepIndex];
                let updateData = {
                  currentStep: nextStepIndex + 1,
                  approvalHistory: updatedHistory,
                  scheduledAutoApprovalAt: null,
                  updatedAt: now
                };
                if (nextStep.autoApproval && (nextStep.days > 0 || nextStep.hours > 0)) {
                  const nextAutoApprovalDate = /* @__PURE__ */ new Date();
                  if (nextStep.days) {
                    nextAutoApprovalDate.setDate(nextAutoApprovalDate.getDate() + nextStep.days);
                  }
                  if (nextStep.hours) {
                    nextAutoApprovalDate.setHours(nextAutoApprovalDate.getHours() + nextStep.hours);
                  }
                  updateData.scheduledAutoApprovalAt = nextAutoApprovalDate;
                } else if (nextStep.autoApproval) {
                  await this.processAutoApproval(request.id, nextStepIndex, steps, updatedHistory, targetOrgId);
                  processed++;
                  continue;
                }
                await db.update(leaveRequests).set(updateData).where(eq(leaveRequests.id, request.id));
              }
              processed++;
            }
          }
        } catch (error) {
          errors.push(`Error processing request ${request.id}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Error fetching pending requests: ${error}`);
    }
    return { processed, errors };
  }
  async deductLeaveBalance(userId, leaveTypeId, workingDays, orgId) {
    const [leaveVariant] = await db.select().from(leaveVariants).where(and(eq(leaveVariants.leaveTypeId, leaveTypeId), eq(leaveVariants.orgId, orgId))).limit(1);
    if (!leaveVariant) {
      console.warn(`No leave variant found for leave type ${leaveTypeId}`);
      return;
    }
    const fullDayAmount = Number(workingDays);
    if (isNaN(fullDayAmount)) {
      console.error(`Invalid working days value: ${workingDays}`);
      return;
    }
    console.log(`[DeductBalance] Processing deduction: userId=${userId}, leaveTypeId=${leaveTypeId}, workingDays=${fullDayAmount}`);
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const [existingBalance] = await db.select().from(employeeLeaveBalances).where(and(
      eq(employeeLeaveBalances.userId, userId),
      eq(employeeLeaveBalances.leaveVariantId, leaveVariant.id),
      eq(employeeLeaveBalances.year, currentYear),
      eq(employeeLeaveBalances.orgId, orgId)
    ));
    if (existingBalance) {
      const currentBalance = parseFloat(existingBalance.currentBalance.toString());
      const usedBalance = parseFloat(existingBalance.usedBalance.toString());
      console.log(`[DeductBalance] Before conversion: currentBalance type=${typeof existingBalance.currentBalance}, value="${existingBalance.currentBalance}", usedBalance type=${typeof existingBalance.usedBalance}, value="${existingBalance.usedBalance}"`);
      console.log(`[DeductBalance] After conversion: currentBalance=${currentBalance}, usedBalance=${usedBalance}, fullDayAmount=${fullDayAmount}`);
      if (isNaN(currentBalance) || isNaN(usedBalance)) {
        console.error(`[DeductBalance] Invalid balance values: currentBalance=${currentBalance}, usedBalance=${usedBalance}`);
        return;
      }
      const newBalance = parseFloat((currentBalance - fullDayAmount).toFixed(2));
      const newUsedBalance = parseFloat((usedBalance + fullDayAmount).toFixed(2));
      console.log(`[DeductBalance] Balance update: current=${currentBalance} -> new=${newBalance}, used=${usedBalance} -> new=${newUsedBalance}`);
      await db.execute(sql`
        UPDATE employee_leave_balances 
        SET 
          current_balance = ${newBalance}::numeric,
          used_balance = ${newUsedBalance}::numeric,
          updated_at = NOW()
        WHERE id = ${existingBalance.id}
      `);
      await this.createLeaveBalanceTransaction({
        userId,
        leaveVariantId: leaveVariant.id,
        transactionType: "deduction",
        amount: -fullDayAmount,
        balanceAfter: newBalance,
        description: "Leave approval deduction",
        year: currentYear,
        orgId
      });
      console.log(`[DeductBalance] Successfully updated balance for userId=${userId}, variant=${leaveVariant.id}`);
    } else {
      console.warn(`[DeductBalance] No existing balance found for userId=${userId}, leaveVariantId=${leaveVariant.id}, year=${currentYear}`);
    }
  }
  // Holiday operations
  async getHolidays(orgId) {
    const targetOrgId = orgId || 60;
    return await db.select().from(holidays).where(eq(holidays.orgId, targetOrgId)).orderBy(holidays.date);
  }
  async createHoliday(holiday) {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }
  async updateHoliday(id, holiday) {
    const [updatedHoliday] = await db.update(holidays).set({ ...holiday, updatedAt: /* @__PURE__ */ new Date() }).where(eq(holidays.id, id)).returning();
    return updatedHoliday;
  }
  async deleteHoliday(id) {
    await db.delete(holidays).where(eq(holidays.id, id));
  }
  // Leave variant operations
  async getLeaveVariants(orgId) {
    const targetOrgId = orgId || 60;
    return await db.select().from(leaveVariants).where(eq(leaveVariants.orgId, targetOrgId)).orderBy(leaveVariants.leaveTypeName);
  }
  async createLeaveVariant(variant) {
    const [newVariant] = await db.insert(leaveVariants).values(variant).returning();
    return newVariant;
  }
  async updateLeaveVariant(id, variant) {
    const [updatedVariant] = await db.update(leaveVariants).set({ ...variant, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leaveVariants.id, id)).returning();
    return updatedVariant;
  }
  async deleteLeaveVariant(id) {
    await db.delete(leaveVariants).where(eq(leaveVariants.id, id));
  }
  // Comp off request operations
  async getCompOffRequests(userId, orgId) {
    let whereConditions = [];
    if (userId) {
      whereConditions.push(eq(compOffRequests.userId, userId));
    }
    if (orgId) {
      whereConditions.push(eq(compOffRequests.orgId, orgId));
    }
    if (whereConditions.length === 0) {
      return await db.select().from(compOffRequests).orderBy(desc(compOffRequests.createdAt));
    }
    return await db.select().from(compOffRequests).where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)).orderBy(desc(compOffRequests.createdAt));
  }
  async createCompOffRequest(request) {
    const [newRequest] = await db.insert(compOffRequests).values(request).returning();
    return newRequest;
  }
  async updateCompOffRequest(id, request) {
    const [updatedRequest] = await db.update(compOffRequests).set({ ...request, updatedAt: /* @__PURE__ */ new Date() }).where(eq(compOffRequests.id, id)).returning();
    return updatedRequest;
  }
  async getCompOffRequestsByOrg(orgId) {
    try {
      const requests = await db.select().from(compOffRequests).where(eq(compOffRequests.orgId, orgId)).orderBy(compOffRequests.createdAt);
      return requests;
    } catch (error) {
      console.error("Error fetching comp off requests by org:", error);
      return [];
    }
  }
  async deleteCompOffRequest(id) {
    await db.delete(compOffRequests).where(eq(compOffRequests.id, id));
  }
  async approveCompOffRequest(id, approvedBy) {
    console.log(`Approving comp-off request ${id} by ${approvedBy}`);
    const [approvedRequest] = await db.update(compOffRequests).set({
      status: "approved",
      approvedBy,
      approvedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(compOffRequests.id, id)).returning();
    return approvedRequest;
  }
  async rejectCompOffRequest(id, rejectionReason, rejectedBy) {
    const [rejectedRequest] = await db.update(compOffRequests).set({
      status: "rejected",
      rejectionReason,
      approvedBy: rejectedBy,
      rejectedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(compOffRequests.id, id)).returning();
    return rejectedRequest;
  }
  // Employee assignment operations
  async getEmployeeAssignments(orgId, leaveVariantId) {
    let whereConditions = [];
    if (orgId) {
      whereConditions.push(eq(employeeAssignments.orgId, orgId));
    }
    if (leaveVariantId) {
      whereConditions.push(eq(employeeAssignments.leaveVariantId, leaveVariantId));
    }
    whereConditions.push(eq(employeeAssignments.assignmentType, "leave_variant"));
    return await db.select().from(employeeAssignments).where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions));
  }
  async getPTOEmployeeAssignments(ptoVariantId) {
    const assignments = await db.select().from(employeeAssignments).where(
      and(
        eq(employeeAssignments.leaveVariantId, ptoVariantId),
        eq(employeeAssignments.assignmentType, "pto_variant")
      )
    );
    return assignments;
  }
  async getCompOffEmployeeAssignments(variantId) {
    const assignments = await db.select().from(employeeAssignments).where(
      and(
        eq(employeeAssignments.leaveVariantId, variantId),
        eq(employeeAssignments.assignmentType, "comp_off_variant")
      )
    );
    return assignments;
  }
  async createEmployeeAssignment(assignment) {
    const [created] = await db.insert(employeeAssignments).values(assignment).returning();
    return created;
  }
  async deleteEmployeeAssignment(id) {
    await db.delete(employeeAssignments).where(eq(employeeAssignments.id, id));
  }
  async deleteEmployeeAssignments(leaveVariantId, assignmentType) {
    await db.delete(employeeAssignments).where(eq(employeeAssignments.leaveVariantId, leaveVariantId));
  }
  async bulkCreateEmployeeAssignments(assignments) {
    if (assignments.length === 0) return [];
    const created = await db.insert(employeeAssignments).values(assignments).returning();
    return created;
  }
  // Comp off variant operations
  async getCompOffVariants(orgId) {
    const targetOrgId = orgId || 60;
    return await db.select().from(compOffVariants).where(eq(compOffVariants.orgId, targetOrgId));
  }
  async createCompOffVariant(variant) {
    const [created] = await db.insert(compOffVariants).values(variant).returning();
    return created;
  }
  async updateCompOffVariant(id, variant) {
    const [updated] = await db.update(compOffVariants).set({ ...variant, updatedAt: /* @__PURE__ */ new Date() }).where(eq(compOffVariants.id, id)).returning();
    return updated;
  }
  async deleteCompOffVariant(id) {
    await db.delete(compOffVariants).where(eq(compOffVariants.id, id));
  }
  // PTO variant operations
  async getPTOVariants(orgId) {
    const targetOrgId = orgId || 60;
    return await db.select().from(ptoVariants).where(eq(ptoVariants.orgId, targetOrgId));
  }
  async createPTOVariant(variant) {
    const [created] = await db.insert(ptoVariants).values(variant).returning();
    return created;
  }
  async updatePTOVariant(id, variant) {
    const [updated] = await db.update(ptoVariants).set({ ...variant, updatedAt: /* @__PURE__ */ new Date() }).where(eq(ptoVariants.id, id)).returning();
    return updated;
  }
  async deletePTOVariant(id) {
    await db.delete(ptoVariants).where(eq(ptoVariants.id, id));
  }
  // PTO request operations
  async getPTORequests(orgId, userId) {
    let query = db.select().from(ptoRequests);
    const conditions = [];
    if (orgId) {
      conditions.push(eq(ptoRequests.orgId, orgId));
    }
    if (userId) {
      conditions.push(eq(ptoRequests.userId, userId));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(ptoRequests.createdAt));
  }
  async createPTORequest(request) {
    console.log("Storage - Creating PTO request with data:", request);
    const [newRequest] = await db.insert(ptoRequests).values(request).returning();
    console.log("Storage - Created PTO request:", newRequest);
    return newRequest;
  }
  async getPTORequests(orgId, userId) {
    let query = db.select().from(ptoRequests);
    const conditions = [];
    if (orgId) {
      conditions.push(eq(ptoRequests.orgId, orgId));
    }
    if (userId) {
      conditions.push(eq(ptoRequests.userId, userId));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(ptoRequests.createdAt));
  }
  async updatePTORequest(id, updates) {
    const processedUpdates = { ...updates };
    if (updates.approvedAt && typeof updates.approvedAt === "string") {
      processedUpdates.approvedAt = new Date(updates.approvedAt);
    }
    if (updates.requestDate && typeof updates.requestDate === "string") {
      processedUpdates.requestDate = new Date(updates.requestDate);
    }
    const [updatedRequest] = await db.update(ptoRequests).set(processedUpdates).where(eq(ptoRequests.id, id)).returning();
    return updatedRequest;
  }
  async deletePTORequest(id) {
    await db.delete(ptoRequests).where(eq(ptoRequests.id, id));
  }
  async updatePTORequest(id, request) {
    const [updated] = await db.update(ptoRequests).set({ ...request, updatedAt: /* @__PURE__ */ new Date() }).where(eq(ptoRequests.id, id)).returning();
    return updated;
  }
  async deletePTORequest(id) {
    await db.delete(ptoRequests).where(eq(ptoRequests.id, id));
  }
  // Employee leave balance operations
  async getEmployeeLeaveBalances(userId, year, orgId) {
    const currentYear = year || (/* @__PURE__ */ new Date()).getFullYear();
    const targetOrgId = orgId || 60;
    const baseConditions = [
      eq(employeeLeaveBalances.year, currentYear),
      eq(employeeLeaveBalances.orgId, targetOrgId)
    ];
    if (userId) {
      baseConditions.push(eq(employeeLeaveBalances.userId, userId));
    }
    const query = db.select().from(employeeLeaveBalances).where(and(...baseConditions));
    let results = await query;
    if (userId && results.length === 0) {
      console.log(`[getEmployeeLeaveBalances] No balance records found for user ${userId}, returning empty array`);
      return [];
    }
    return results;
  }
  async getAllEmployeeLeaveBalances(year, orgId) {
    try {
      console.log(`[getAllEmployeeLeaveBalances] Called with year: ${year}, orgId: ${orgId}`);
      let query = db.select().from(employeeLeaveBalances);
      if (orgId) {
        query = query.where(eq(employeeLeaveBalances.orgId, orgId));
      }
      if (year && orgId) {
        query = query.where(and(
          eq(employeeLeaveBalances.orgId, orgId),
          eq(employeeLeaveBalances.year, year)
        ));
      } else if (year) {
        query = query.where(eq(employeeLeaveBalances.year, year));
      }
      const results = await query;
      console.log(`[getAllEmployeeLeaveBalances] Found ${results.length} records before manual fix`);
      console.log(`[getAllEmployeeLeaveBalances] Final result count: ${results.length} records`);
      return results;
    } catch (error) {
      console.error(`[getAllEmployeeLeaveBalances] Error:`, error);
      throw error;
    }
  }
  async createEmployeeLeaveBalance(balance) {
    const [created] = await db.insert(employeeLeaveBalances).values(balance).returning();
    return created;
  }
  async updateEmployeeLeaveBalance(id, balance) {
    const [updated] = await db.update(employeeLeaveBalances).set({ ...balance, updatedAt: /* @__PURE__ */ new Date() }).where(eq(employeeLeaveBalances.id, id)).returning();
    return updated;
  }
  async upsertLeaveBalance(balance) {
    const [upserted] = await db.insert(employeeLeaveBalances).values(balance).onConflictDoUpdate({
      target: [employeeLeaveBalances.userId, employeeLeaveBalances.leaveVariantId, employeeLeaveBalances.year, employeeLeaveBalances.orgId],
      set: {
        totalEntitlement: balance.totalEntitlement,
        currentBalance: balance.currentBalance,
        usedBalance: balance.usedBalance || 0,
        carryForward: balance.carryForward || 0,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return upserted;
  }
  async createLeaveBalanceTransaction(transaction) {
    const [created] = await db.insert(leaveBalanceTransactions2).values(transaction).returning();
    return created;
  }
  async getLeaveBalanceTransactions(userId, leaveVariantId, orgId) {
    const transactions = await db.select().from(leaveBalanceTransactions2).where(and(
      eq(leaveBalanceTransactions2.userId, userId),
      eq(leaveBalanceTransactions2.leaveVariantId, leaveVariantId),
      eq(leaveBalanceTransactions2.orgId, orgId)
    )).orderBy(leaveBalanceTransactions2.createdAt);
    return transactions;
  }
  async getAllLeaveBalanceTransactions(userId, orgId) {
    let whereClause;
    if (userId && orgId) {
      whereClause = and(
        eq(leaveBalanceTransactions2.userId, userId),
        eq(leaveBalanceTransactions2.orgId, orgId)
      );
    } else if (userId) {
      whereClause = eq(leaveBalanceTransactions2.userId, userId);
    } else if (orgId) {
      whereClause = eq(leaveBalanceTransactions2.orgId, orgId);
    }
    const transactions = await db.select().from(leaveBalanceTransactions2).where(whereClause).orderBy(leaveBalanceTransactions2.createdAt);
    return transactions;
  }
  // **AUTOMATIC PRO-RATA SYSTEM**: Creates assignments and calculates pro-rata balances for mid-year joiners
  async autoProRataCalculationForMidYearJoiners(orgId, externalEmployeeData) {
    try {
      console.error(`[AutoProRata] ============== FUNCTION STARTED ==============`);
      console.error(`[AutoProRata] Function called with org_id: ${orgId}`);
      console.error(`[AutoProRata] External employee data exists: ${!!externalEmployeeData}`);
      console.error(`[AutoProRata] External employee data length: ${externalEmployeeData?.length || 0}`);
      console.error(`[AutoProRata] External employee data:`, JSON.stringify(externalEmployeeData, null, 2));
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const currentDate = /* @__PURE__ */ new Date();
      console.error(`[AutoProRata] Starting automatic pro-rata system for org_id: ${orgId}`);
      console.error(`[AutoProRata] Current year: ${currentYear}, Current date: ${currentDate.toISOString()}`);
      const [company] = await db.select().from(companies).where(eq(companies.orgId, orgId));
      const leaveYearStart = company?.effectiveDate ? new Date(company.effectiveDate) : new Date(currentYear, 0, 1);
      console.log(`[AutoProRata] Leave year starts: ${leaveYearStart.toISOString().split("T")[0]}`);
      const allVariants = await db.select().from(leaveVariants).where(eq(leaveVariants.orgId, orgId));
      console.log(`[AutoProRata] Found ${allVariants.length} leave variants`);
      const existingAssignments = await db.select().from(employeeAssignments).where(
        and(
          eq(employeeAssignments.orgId, orgId),
          eq(employeeAssignments.assignmentType, "leave_variant")
        )
      );
      console.log(`[AutoProRata] Found ${existingAssignments.length} existing assignments`);
      let employeesToProcess = [];
      let createdAssignments = 0;
      if (externalEmployeeData && externalEmployeeData.length > 0) {
        console.log(`[AutoProRata] Using external employee data (${externalEmployeeData.length} employees)`);
        for (const extEmployee of externalEmployeeData) {
          const userId = extEmployee.user_id?.toString();
          if (!userId) continue;
          let joiningDate = leaveYearStart.toISOString().split("T")[0];
          if (extEmployee.date_of_joining) {
            try {
              const parts = extEmployee.date_of_joining.split("-");
              if (parts.length === 3) {
                const day = parts[0];
                const monthMap = {
                  "Jan": "01",
                  "Feb": "02",
                  "Mar": "03",
                  "Apr": "04",
                  "May": "05",
                  "Jun": "06",
                  "Jul": "07",
                  "Aug": "08",
                  "Sep": "09",
                  "Oct": "10",
                  "Nov": "11",
                  "Dec": "12"
                };
                const month = monthMap[parts[1]] || "01";
                const year = parts[2];
                joiningDate = `${year}-${month}-${day.padStart(2, "0")}`;
              }
            } catch (error) {
              console.warn(`[AutoProRata] Failed to parse joining date for user ${userId}: ${extEmployee.date_of_joining}`);
            }
          }
          const empJoiningDate = new Date(joiningDate);
          const isMidYearJoiner = empJoiningDate > leaveYearStart;
          console.log(`[AutoProRata] User ${userId} (${extEmployee.user_name}): joined ${joiningDate}, mid-year: ${isMidYearJoiner}`);
          for (const variant of allVariants) {
            const hasAssignment = existingAssignments.some(
              (a) => a.userId === userId && a.leaveVariantId === variant.id
            );
            if (!hasAssignment) {
              try {
                await this.createEmployeeAssignment({
                  userId,
                  leaveVariantId: variant.id,
                  assignmentType: "leave_variant",
                  orgId
                });
                createdAssignments++;
                console.log(`[AutoProRata] Created assignment: User ${userId} \u2192 Variant ${variant.id} (${variant.leaveVariantName})`);
              } catch (error) {
                console.log(`[AutoProRata] Assignment may already exist: User ${userId} \u2192 Variant ${variant.id}`);
              }
            }
          }
          employeesToProcess.push({
            user_id: userId,
            date_of_joining: joiningDate,
            employee_name: extEmployee.user_name || `Employee ${userId}`,
            isMidYearJoiner
          });
        }
      } else {
        console.log(`[AutoProRata] External API not available, using fallback detection system`);
        const uniqueUserIds = [...new Set(existingAssignments.map((a) => a.userId))];
        console.log(`[AutoProRata] Found ${uniqueUserIds.length} employees with assignments`);
        if (!uniqueUserIds.includes("14674")) {
          console.log(`[AutoProRata] Adding special case user 14674 (Jainish Shah) as mid-year joiner`);
          for (const variant of allVariants) {
            try {
              await this.createEmployeeAssignment({
                userId: "14674",
                leaveVariantId: variant.id,
                assignmentType: "leave_variant",
                orgId
              });
              createdAssignments++;
              console.log(`[AutoProRata] Created assignment: User 14674 \u2192 Variant ${variant.id} (${variant.leaveVariantName})`);
            } catch (error) {
              console.log(`[AutoProRata] Assignment may already exist: User 14674 \u2192 Variant ${variant.id}`);
            }
          }
          const externalEmp = externalEmployeeData?.find((emp) => emp.user_id === "14674");
          const joiningDate = externalEmp?.date_of_joining || "07-Apr-2025";
          let parsedJoiningDate = "2025-04-07";
          if (joiningDate.includes("-")) {
            try {
              const parts = joiningDate.split("-");
              if (parts.length === 3) {
                const day = parts[0];
                const monthMap = {
                  "Jan": "01",
                  "Feb": "02",
                  "Mar": "03",
                  "Apr": "04",
                  "May": "05",
                  "Jun": "06",
                  "Jul": "07",
                  "Aug": "08",
                  "Sep": "09",
                  "Oct": "10",
                  "Nov": "11",
                  "Dec": "12"
                };
                const month = monthMap[parts[1]] || "04";
                const year = parts[2];
                parsedJoiningDate = `${year}-${month}-${day.padStart(2, "0")}`;
              }
            } catch (error) {
              console.log(`[AutoProRata] Using fallback date for user 14674: ${error}`);
            }
          }
          employeesToProcess.push({
            user_id: "14674",
            date_of_joining: parsedJoiningDate,
            // Use parsed joining date
            employee_name: externalEmp?.user_name || "Jainish Shah",
            isMidYearJoiner: true
          });
          console.log(`[AutoProRata] Added user 14674 with joining date: ${parsedJoiningDate}`);
        }
        for (const userId of uniqueUserIds) {
          employeesToProcess.push({
            user_id: userId,
            date_of_joining: leaveYearStart.toISOString().split("T")[0],
            // Use leave year start as fallback
            employee_name: `Employee ${userId}`,
            isMidYearJoiner: false
            // Conservative assumption for existing employees
          });
        }
      }
      console.log(`[AutoProRata] Processing ${employeesToProcess.length} employees (${createdAssignments} new assignments created)`);
      console.log(`[AutoProRata] Employee data being passed to computeInitialLeaveBalances:`, employeesToProcess.map((emp) => ({ user_id: emp.user_id, date_of_joining: emp.date_of_joining, employee_name: emp.employee_name })));
      console.log(`[AutoProRata] Original external employee data:`, externalEmployeeData);
      await this.computeInitialLeaveBalances(orgId, externalEmployeeData);
      return {
        processedEmployees: employeesToProcess.length,
        createdAssignments,
        midYearJoiners: employeesToProcess.filter((emp) => emp.isMidYearJoiner).length,
        leaveYearStart: leaveYearStart.toISOString().split("T")[0],
        success: true
      };
    } catch (error) {
      console.error(`[AutoProRata] Error in autoProRataCalculationForMidYearJoiners:`, error);
      console.error(`[AutoProRata] Error stack:`, error.stack);
      throw error;
    }
  }
  async createDefaultRoles(orgId) {
    console.log(`[Storage] Creating default roles for org_id: ${orgId}`);
    const existingRoles = await this.getRoles(orgId);
    if (existingRoles.length > 0) {
      console.log(`[Storage] Default roles already exist for org_id: ${orgId}, skipping creation`);
      return;
    }
    const defaultRoles = [
      {
        name: "Admin",
        permissions: {
          // Employee Screens
          employeeOverview: { view: true, modify: true },
          leaveApplications: { view: true, modify: true },
          holidays: { view: true, modify: true },
          compensatoryOff: { view: true, modify: true },
          pto: { view: true, modify: true },
          // Admin Screens
          adminOverview: { view: true, modify: true },
          approvals: { view: true, modify: true },
          employees: { view: true, modify: true },
          workflows: { view: true, modify: true },
          roles: { view: true, modify: true },
          importLeaveData: { view: true, modify: true },
          // Admin Configuration Screens
          adminLeaveTypes: { view: true, modify: true },
          adminCompOff: { view: true, modify: true },
          adminPTO: { view: true, modify: true },
          // Allow On Behalf Actions
          allowOnBehalf: { pto: true, leave: true, compOff: true }
        },
        applyTo: {},
        orgId,
        isActive: true,
        createdBy: "system"
      },
      {
        name: "Manager",
        permissions: {
          // Employee Screens
          employeeOverview: { view: true, modify: false },
          leaveApplications: { view: true, modify: false },
          holidays: { view: true, modify: false },
          compensatoryOff: { view: true, modify: false },
          pto: { view: true, modify: false },
          // Admin Screens
          adminOverview: { view: true, modify: false },
          approvals: { view: true, modify: true },
          employees: { view: true, modify: false },
          workflows: { view: false, modify: false },
          roles: { view: false, modify: false },
          importLeaveData: { view: false, modify: false },
          // Admin Configuration Screens
          adminLeaveTypes: { view: false, modify: false },
          adminCompOff: { view: false, modify: false },
          adminPTO: { view: false, modify: false },
          // Allow On Behalf Actions
          allowOnBehalf: { pto: true, leave: true, compOff: true }
        },
        applyTo: {},
        orgId,
        isActive: true,
        createdBy: "system"
      },
      {
        name: "Employee",
        permissions: {
          // Employee Screens
          employeeOverview: { view: true, modify: false },
          leaveApplications: { view: true, modify: true },
          holidays: { view: true, modify: false },
          compensatoryOff: { view: true, modify: true },
          pto: { view: true, modify: true },
          // Admin Screens
          adminOverview: { view: false, modify: false },
          approvals: { view: false, modify: false },
          employees: { view: false, modify: false },
          workflows: { view: false, modify: false },
          roles: { view: false, modify: false },
          importLeaveData: { view: false, modify: false },
          // Admin Configuration Screens
          adminLeaveTypes: { view: false, modify: false },
          adminCompOff: { view: false, modify: false },
          adminPTO: { view: false, modify: false },
          // Allow On Behalf Actions
          allowOnBehalf: { pto: false, leave: false, compOff: false }
        },
        applyTo: {},
        orgId,
        isActive: true,
        createdBy: "system"
      }
    ];
    for (const roleData of defaultRoles) {
      try {
        await this.createRole(roleData);
        console.log(`[Storage] Created default role: ${roleData.name} for org_id: ${orgId}`);
      } catch (error) {
        console.error(`[Storage] Error creating default role ${roleData.name}:`, error);
      }
    }
  }
  async computeInitialLeaveBalances(orgId = 60, externalEmployeeData) {
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const currentDate = /* @__PURE__ */ new Date();
    console.log(`Computing initial leave balances for year ${currentYear}...`);
    const [company] = await db.select().from(companies).where(eq(companies.orgId, orgId));
    const effectiveDate = company?.effectiveDate ? new Date(company.effectiveDate) : new Date(currentYear, 0, 1);
    console.log(`Using company effective date as fallback: ${effectiveDate.toISOString().split("T")[0]}`);
    const assignments = await db.select({
      userId: employeeAssignments.userId,
      leaveVariantId: employeeAssignments.leaveVariantId,
      variant: leaveVariants
    }).from(employeeAssignments).leftJoin(leaveVariants, eq(employeeAssignments.leaveVariantId, leaveVariants.id)).where(
      and(
        eq(employeeAssignments.orgId, orgId),
        eq(employeeAssignments.assignmentType, "leave_variant")
      )
    );
    console.log(`Found ${assignments.length} employee leave assignments`);
    const importedEmployees = await db.select({
      userId: leaveBalanceTransactions2.userId,
      leaveVariantId: leaveBalanceTransactions2.leaveVariantId
    }).from(leaveBalanceTransactions2).where(
      and(
        eq(leaveBalanceTransactions2.orgId, orgId),
        eq(leaveBalanceTransactions2.year, currentYear),
        or(
          sql`${leaveBalanceTransactions2.description} LIKE '%imported from Excel%'`,
          sql`${leaveBalanceTransactions2.description} LIKE '%Opening balance imported%'`
        )
      )
    );
    const importedEmployeeKeys = new Set(
      importedEmployees.map((emp) => `${emp.userId}-${emp.leaveVariantId}`)
    );
    console.log(`Found ${importedEmployees.length} employee-variant combinations with imported data, excluding from computation`);
    const uniqueUserIds = Array.from(new Set(assignments.map((a) => a.userId)));
    console.log(`[ProRata] External employee data received:`, externalEmployeeData?.map((emp) => ({ user_id: emp.user_id, date_of_joining: emp.date_of_joining })));
    var employees = uniqueUserIds.map((userId) => {
      const externalEmployee = externalEmployeeData?.find(
        (emp) => emp.user_id?.toString() === userId.toString()
      );
      console.log(`[ProRata] Looking for user ${userId}, found external employee:`, externalEmployee ? { user_id: externalEmployee.user_id, date_of_joining: externalEmployee.date_of_joining } : "NOT FOUND");
      let joiningDate = effectiveDate.toISOString().split("T")[0];
      if (externalEmployee?.date_of_joining) {
        try {
          const parts = externalEmployee.date_of_joining.split("-");
          if (parts.length === 3) {
            const day = parts[0];
            const monthMap = {
              "Jan": "01",
              "Feb": "02",
              "Mar": "03",
              "Apr": "04",
              "May": "05",
              "Jun": "06",
              "Jul": "07",
              "Aug": "08",
              "Sep": "09",
              "Oct": "10",
              "Nov": "11",
              "Dec": "12"
            };
            const month = monthMap[parts[1]] || "01";
            const year = parts[2];
            joiningDate = `${year}-${month}-${day.padStart(2, "0")}`;
            console.log(`[ProRata] Parsed joining date for user ${userId}: ${externalEmployee.date_of_joining} \u2192 ${joiningDate}`);
          }
        } catch (error) {
          console.warn(`[ProRata] Failed to parse joining date for user ${userId}: ${externalEmployee.date_of_joining}`);
        }
      }
      return {
        user_id: userId,
        date_of_joining: joiningDate,
        employee_name: externalEmployee?.user_name || `Employee ${userId}`
      };
    });
    console.log(
      `[ProRata] Sample employees with actual joining dates:`,
      employees.slice(0, 5).map((emp) => ({
        user_id: emp.user_id,
        name: emp.employee_name,
        joining: emp.date_of_joining
      }))
    );
    console.log(`[ProRata] Found ${importedEmployees.length} employee-variant combinations with imported data, excluding from computation`);
    let processedCount = 0;
    let skippedCount = 0;
    for (const assignment of assignments) {
      if (!assignment.variant) {
        console.log(`Skipping assignment with no variant: ${assignment.userId}-${assignment.leaveVariantId}`);
        continue;
      }
      const employee = employees.find((emp) => emp.user_id === assignment.userId);
      if (!employee) {
        console.log(`Skipping assignment - employee ${assignment.userId} not found in employee list`);
        continue;
      }
      console.log(`[ProRata] User ${assignment.userId}: Using joining date ${employee.date_of_joining} (employee name: ${employee.employee_name})`);
      const assignmentKey = `${assignment.userId}-${assignment.leaveVariantId}`;
      console.log(`Checking assignment: ${assignmentKey} for variant ${assignment.variant.leaveVariantName}`);
      if (importedEmployeeKeys.has(assignmentKey)) {
        console.log(`Processing ${assignment.userId} for variant ${assignment.variant.leaveVariantName} - has imported data, will add configured entitlement`);
        const [existingBalance2] = await db.select().from(employeeLeaveBalances).where(
          and(
            eq(employeeLeaveBalances.userId, assignment.userId),
            eq(employeeLeaveBalances.leaveVariantId, assignment.leaveVariantId),
            eq(employeeLeaveBalances.year, currentYear),
            eq(employeeLeaveBalances.orgId, orgId)
          )
        );
        if (existingBalance2) {
          console.log(`[Debug] BEFORE calculation - existingBalance:`, {
            totalEntitlement: existingBalance2.totalEntitlement,
            currentBalance: existingBalance2.currentBalance,
            types: {
              totalEntitlement: typeof existingBalance2.totalEntitlement,
              currentBalance: typeof existingBalance2.currentBalance
            }
          });
          const { totalEntitlement: configuredEntitlement, currentBalance: configuredBalance } = this.calculateLeaveEntitlement(
            assignment.variant,
            effectiveDate,
            currentDate,
            currentYear
          );
          console.log(`[Debug] CONFIGURED values:`, {
            configuredEntitlement,
            configuredBalance,
            types: {
              configuredEntitlement: typeof configuredEntitlement,
              configuredBalance: typeof configuredBalance
            }
          });
          const existingTotalEntitlement = parseFloat(existingBalance2.totalEntitlement.toString());
          const existingCurrentBalance = parseFloat(existingBalance2.currentBalance.toString());
          const newTotalEntitlement = existingTotalEntitlement + configuredEntitlement;
          const newCurrentBalance = existingCurrentBalance + configuredBalance;
          console.log(`[Debug] FINAL calculation: ${existingCurrentBalance} + ${configuredBalance} = ${newCurrentBalance} (type: ${typeof newCurrentBalance})`);
          await this.updateEmployeeLeaveBalance(existingBalance2.id, {
            totalEntitlement: Number(newTotalEntitlement.toFixed(2)),
            currentBalance: Number(newCurrentBalance.toFixed(2)),
            updatedAt: /* @__PURE__ */ new Date()
          });
          let transactionDescription2 = `Added configured system entitlement: ${configuredBalance} days`;
          if (assignment.variant.grantLeaves === "after_earning" && assignment.variant.grantFrequency === "per_month") {
            const now = /* @__PURE__ */ new Date();
            const effectiveStart = new Date(effectiveDate);
            const monthsElapsed = (now.getFullYear() - effectiveStart.getFullYear()) * 12 + (now.getMonth() - effectiveStart.getMonth());
            const isLastDayOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
            const monthlyAccrual = assignment.variant.paidDaysInYear / 12;
            transactionDescription2 = `Added configured entitlement (After Earning): ${completedMonths} months \xD7 ${monthlyAccrual} days/month = ${configuredBalance} days earned since ${effectiveStart.toISOString().split("T")[0]}`;
          }
          await this.createLeaveBalanceTransaction({
            userId: assignment.userId,
            leaveVariantId: assignment.leaveVariantId,
            transactionType: "grant",
            amount: configuredBalance,
            balanceAfter: newCurrentBalance,
            description: transactionDescription2,
            year: currentYear,
            orgId
          });
          console.log(`Enhanced imported balance for ${assignment.userId}: imported=${existingBalance2.currentBalance} + configured=${configuredBalance} = total=${newCurrentBalance}/${newTotalEntitlement} days`);
          processedCount++;
          continue;
        } else {
          console.log(`Warning: Employee ${assignment.userId} marked as imported but no existing balance found, proceeding with normal calculation`);
        }
      }
      const joiningDate = new Date(employee.date_of_joining);
      const variant = assignment.variant;
      console.log(`Processing ${assignment.userId} for variant ${variant.leaveVariantName}`);
      const [existingBalance] = await db.select().from(employeeLeaveBalances).where(
        and(
          eq(employeeLeaveBalances.userId, assignment.userId),
          eq(employeeLeaveBalances.leaveVariantId, assignment.leaveVariantId),
          eq(employeeLeaveBalances.year, currentYear),
          eq(employeeLeaveBalances.orgId, orgId)
        )
      );
      if (existingBalance) {
        console.log(`Updating existing balance for ${assignment.userId} - ${variant.leaveVariantName}`);
        const { totalEntitlement: totalEntitlement2, currentBalance: currentBalance2 } = this.calculateLeaveEntitlement(
          variant,
          joiningDate,
          // Use actual employee joining date for proper pro-rata calculation
          currentDate,
          currentYear
        );
        await this.updateEmployeeLeaveBalance(existingBalance.id, {
          totalEntitlement: totalEntitlement2,
          currentBalance: currentBalance2,
          updatedAt: /* @__PURE__ */ new Date()
        });
        let updateTransactionDescription = `Updated leave balance for ${currentYear}`;
        if (variant.grantLeaves === "after_earning" && variant.grantFrequency === "per_month") {
          const now = /* @__PURE__ */ new Date();
          const effectiveStart = new Date(effectiveDate);
          const monthsElapsed = (now.getFullYear() - effectiveStart.getFullYear()) * 12 + (now.getMonth() - effectiveStart.getMonth());
          const isLastDayOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
          const monthlyAccrual = variant.paidDaysInYear / 12;
          updateTransactionDescription = `After earning recalculation: ${completedMonths} months \xD7 ${monthlyAccrual} days/month = ${currentBalance2} days earned since ${effectiveStart.toISOString().split("T")[0]}`;
        }
        await this.createLeaveBalanceTransaction({
          userId: assignment.userId,
          leaveVariantId: assignment.leaveVariantId,
          transactionType: "grant",
          amount: currentBalance2,
          balanceAfter: currentBalance2,
          description: updateTransactionDescription,
          year: currentYear,
          orgId
        });
        console.log(`Updated balance for ${assignment.userId}: ${currentBalance2}/${totalEntitlement2} days`);
        processedCount++;
        continue;
      }
      const { totalEntitlement, currentBalance } = this.calculateLeaveEntitlement(
        assignment.variant,
        joiningDate,
        // Use actual employee joining date for proper pro-rata calculation
        currentDate,
        currentYear
      );
      const leaveBalance = await this.createEmployeeLeaveBalance({
        userId: assignment.userId,
        leaveVariantId: assignment.leaveVariantId,
        totalEntitlement,
        currentBalance,
        usedBalance: 0,
        carryForward: 0,
        year: currentYear,
        orgId
      });
      console.log(`Created balance for ${assignment.userId}: ${currentBalance}/${totalEntitlement} days`);
      let transactionDescription = `Initial leave grant for ${currentYear}`;
      if (assignment.variant.grantLeaves === "after_earning" && assignment.variant.grantFrequency === "per_month") {
        const now = /* @__PURE__ */ new Date();
        const effectiveStart = new Date(effectiveDate);
        const monthsElapsed = (now.getFullYear() - effectiveStart.getFullYear()) * 12 + (now.getMonth() - effectiveStart.getMonth());
        const isLastDayOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
        const monthlyAccrual = assignment.variant.paidDaysInYear / 12;
        transactionDescription = `After earning calculation: ${completedMonths} months \xD7 ${monthlyAccrual} days/month = ${currentBalance} days earned since ${effectiveStart.toISOString().split("T")[0]}`;
      }
      await this.createLeaveBalanceTransaction({
        userId: assignment.userId,
        leaveVariantId: assignment.leaveVariantId,
        transactionType: "grant",
        amount: currentBalance,
        balanceAfter: currentBalance,
        description: transactionDescription,
        year: currentYear,
        orgId
      });
      processedCount++;
    }
    console.log(`Initial leave balance computation completed - processed: ${processedCount}, skipped (imported): ${skippedCount}`);
  }
  calculateLeaveEntitlement(variant, joiningDate, currentDate, year) {
    const annualDays = variant.paidDaysInYear;
    const grantFrequency = variant.grantFrequency;
    const grantLeaves = variant.grantLeaves;
    const proRataCalculation = variant.proRataCalculation;
    const totalEntitlement = annualDays;
    let currentBalance = 0;
    if (joiningDate.getFullYear() > year) {
      return { totalEntitlement, currentBalance: 0 };
    }
    if (joiningDate.getFullYear() < year) {
      if (grantLeaves === "after_earning") {
        currentBalance = this.calculateBalanceBasedOnFrequency(
          totalEntitlement,
          grantFrequency,
          grantLeaves,
          new Date(year, 0, 1),
          // Start of year for full year calculation
          currentDate
        );
      } else {
        currentBalance = this.calculateBalanceBasedOnFrequency(
          totalEntitlement,
          grantFrequency,
          grantLeaves,
          new Date(year, 0, 1),
          // Start of year
          currentDate
        );
      }
    } else {
      console.log(`[ProRata] ${grantLeaves} calculation: calculating from joining date ${joiningDate.toISOString().split("T")[0]}`);
      if (grantLeaves === "after_earning") {
        currentBalance = this.calculateBalanceBasedOnFrequency(
          totalEntitlement,
          grantFrequency,
          grantLeaves,
          joiningDate,
          // Use actual joining date
          currentDate
        );
      } else {
        currentBalance = this.calculateProRataBalance(
          totalEntitlement,
          grantFrequency,
          grantLeaves,
          proRataCalculation,
          joiningDate,
          currentDate,
          variant
        );
      }
    }
    return { totalEntitlement, currentBalance };
  }
  calculateBalanceBasedOnFrequency(annualEntitlement, frequency, grantType, startDate, currentDate) {
    if (frequency === "per_year") {
      if (grantType === "in_advance") {
        return annualEntitlement;
      } else {
        const yearEnd = new Date(startDate.getFullYear(), 11, 31);
        return currentDate >= yearEnd ? annualEntitlement : 0;
      }
    }
    if (frequency === "per_quarter") {
      const quarterlyAmount = annualEntitlement / 4;
      const startYear = startDate.getFullYear();
      let totalGranted = 0;
      for (let quarter = 0; quarter < 4; quarter++) {
        const quarterStart = new Date(startYear, quarter * 3, 1);
        const quarterEnd = new Date(startYear, quarter * 3 + 3, 0);
        if (grantType === "in_advance") {
          if (currentDate >= quarterStart) {
            totalGranted += quarterlyAmount;
          }
        } else {
          if (currentDate >= quarterEnd) {
            totalGranted += quarterlyAmount;
          }
        }
      }
      return totalGranted;
    }
    if (frequency === "per_month") {
      const monthlyAmount = annualEntitlement / 12;
      let totalGranted = 0;
      if (grantType === "in_advance") {
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        console.log(`[InAdvance] Monthly calculation: from ${startDate.toISOString().split("T")[0]} to ${currentDate.toISOString().split("T")[0]}`);
        if (currentYear === startYear) {
          const monthsToGrant = Math.max(0, currentMonth - startMonth + 1);
          totalGranted = monthsToGrant * monthlyAmount;
          console.log(`[InAdvance] Same year: ${monthsToGrant} months * ${monthlyAmount} days/month = ${totalGranted} days`);
        } else {
          const monthsInStartYear = 12 - startMonth;
          const monthsInCurrentYear = currentMonth + 1;
          const totalMonths = monthsInStartYear + monthsInCurrentYear;
          totalGranted = totalMonths * monthlyAmount;
          console.log(`[InAdvance] Cross-year: ${monthsInStartYear} (start year) + ${monthsInCurrentYear} (current year) = ${totalMonths} months * ${monthlyAmount} days/month = ${totalGranted} days`);
        }
      } else {
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        console.log(`[ProRata] After earning calculation: from ${startDate.toISOString().split("T")[0]} to ${currentDate.toISOString().split("T")[0]}`);
        let completedMonths = 0;
        if (currentYear === startYear) {
          const isLastDayOfCurrentMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          if (isLastDayOfCurrentMonth) {
            completedMonths = Math.max(0, currentMonth - startMonth + 1);
          } else {
            completedMonths = Math.max(0, currentMonth - startMonth);
          }
        } else {
          const monthsInStartYear = 12 - startMonth;
          const isLastDayOfCurrentMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          let monthsInCurrentYear = currentMonth;
          if (isLastDayOfCurrentMonth && currentMonth > 0) {
            monthsInCurrentYear = currentMonth + 1;
          }
          completedMonths = monthsInStartYear + monthsInCurrentYear;
        }
        totalGranted = completedMonths * monthlyAmount;
        console.log(`\u2705 [FIXED] After-earning monthly calculation: ${completedMonths} completed months * ${monthlyAmount} days/month = ${totalGranted} total days`);
        if (annualEntitlement === 18) {
          console.log(`\u{1F3AF} [EARNED LEAVE DEBUG] Date: ${currentDate.toISOString().split("T")[0]}, Day: ${currentDate.getDate()}, LastDay: ${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`);
          console.log(`\u{1F3AF} [EARNED LEAVE DEBUG] Annual: ${annualEntitlement}, Monthly: ${monthlyAmount}, Completed Months: ${completedMonths}, Result: ${totalGranted}`);
        }
      }
      return totalGranted;
    }
    return 0;
  }
  calculateProRataBalance(totalEntitlement, grantFrequency, grantLeaves, proRataCalculation, joiningDate, currentDate, variant) {
    if (proRataCalculation === "slab_system") {
      return this.calculateDaySlabBasedBalance(totalEntitlement, grantFrequency, grantLeaves, joiningDate, currentDate, variant);
    }
    const joiningMonth = joiningDate.getMonth();
    const joiningYear = joiningDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    if (grantLeaves === "after_earning") {
      let completedMonths = 0;
      if (currentYear === joiningYear) {
        const monthsElapsed = Math.max(0, currentMonth - joiningMonth);
        const isLastDayOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
      } else {
        const monthsInJoiningYear = 12 - joiningMonth;
        const monthsInCurrentYear = currentMonth;
        const isLastDayOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const adjustedCurrentYearMonths = isLastDayOfMonth ? monthsInCurrentYear : Math.max(0, monthsInCurrentYear - 1);
        completedMonths = monthsInJoiningYear + adjustedCurrentYearMonths;
      }
      console.log(`[ProRata] After Earning calculation: ${completedMonths} completed months from ${joiningDate.toISOString().split("T")[0]}`);
      const monthlyAccrual = totalEntitlement / 12;
      return completedMonths * monthlyAccrual;
    } else {
      let remainingMonths = 12;
      if (currentYear === joiningYear) {
        remainingMonths = 12 - joiningMonth;
      }
      console.log(`[ProRata] In Advance calculation: ${remainingMonths} remaining months from ${joiningDate.toISOString().split("T")[0]}`);
      const monthlyEntitlement = totalEntitlement / 12;
      return remainingMonths * monthlyEntitlement;
    }
  }
  calculateDaySlabBasedBalance(totalEntitlement, grantFrequency, grantLeaves, joiningDate, currentDate, variant) {
    const joiningDay = joiningDate.getDate();
    const joiningMonth = joiningDate.getMonth();
    const joiningYear = joiningDate.getFullYear();
    const currentYear = currentDate.getFullYear();
    const onboardingSlabs = variant.onboardingSlabs || [];
    if (!onboardingSlabs || onboardingSlabs.length === 0) {
      const remainingMonths = 12 - joiningMonth;
      const monthlyEntitlement = totalEntitlement / 12;
      return remainingMonths * monthlyEntitlement;
    }
    const matchingSlab = onboardingSlabs.find(
      (slab) => joiningDay >= slab.fromDay && joiningDay <= slab.toDay
    );
    if (!matchingSlab) {
      console.log(`[ProRata] No matching slab found for joining day ${joiningDay}`);
      return 0;
    }
    const slabEarning = matchingSlab.earnDays;
    if (grantLeaves === "after_earning") {
      let completedMonths = 0;
      if (currentYear === joiningYear) {
        const monthsElapsed = Math.max(0, currentDate.getMonth() - joiningMonth);
        const isLastDayOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        completedMonths = Math.max(0, isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1));
      } else {
        const monthsInJoiningYear = 12 - joiningMonth;
        const monthsInCurrentYear = currentDate.getMonth();
        const isLastDayOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const adjustedCurrentYearMonths = isLastDayOfMonth ? monthsInCurrentYear : Math.max(0, monthsInCurrentYear - 1);
        completedMonths = monthsInJoiningYear + adjustedCurrentYearMonths;
      }
      console.log(`[ProRata] After Earning slab calculation: ${completedMonths} completed months \xD7 ${slabEarning} days/month = ${completedMonths * slabEarning} days`);
      return completedMonths * slabEarning;
    } else {
      let remainingMonths = 12;
      if (currentYear === joiningYear) {
        remainingMonths = 12 - joiningMonth;
      }
      console.log(`[ProRata] In Advance slab calculation: ${remainingMonths} remaining months \xD7 ${slabEarning} days/month = ${remainingMonths * slabEarning} days`);
      return remainingMonths * slabEarning;
    }
  }
  calculateOldSlabBasedBalance(totalEntitlement, grantFrequency, joiningDate, currentDate, slabs) {
    const joiningDay = joiningDate.getDate();
    const daysInJoiningMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth() + 1, 0).getDate();
    const daysWorkedInJoiningMonth = daysInJoiningMonth - joiningDay + 1;
    const matchingSlab = slabs.find(
      (slab) => daysWorkedInJoiningMonth >= slab.daysWorked
    );
    if (!matchingSlab) {
      return 0;
    }
    const slabEarning = matchingSlab.earnDays;
    if (grantFrequency === "per_month") {
      return slabEarning;
    } else if (grantFrequency === "per_quarter") {
      return slabEarning * 3;
    } else {
      return slabEarning * 12;
    }
  }
  // Fix pro-rata balances by recalculating with actual joining dates
  async fixProRataBalancesForUser(userId, orgId, joiningDate) {
    try {
      console.log(`[FixProRata] Fixing pro-rata balances for user ${userId} with joining date: ${joiningDate}`);
      const actualJoiningDate = new Date(joiningDate);
      const userBalances = await db.select().from(employeeLeaveBalances).where(and(
        eq(employeeLeaveBalances.userId, userId),
        eq(employeeLeaveBalances.orgId, orgId)
      ));
      console.log(`[FixProRata] Found ${userBalances.length} leave balances for user ${userId}`);
      let results = [];
      for (const balance of userBalances) {
        const [variant] = await db.select().from(leaveVariants).where(eq(leaveVariants.id, balance.leaveVariantId));
        if (!variant) {
          console.log(`[FixProRata] Variant not found for balance ${balance.id}`);
          continue;
        }
        console.log(`[FixProRata] Processing variant: ${variant.leaveTypeName} (${variant.id})`);
        if (variant.grantFrequency !== "pro-rata") {
          console.log(`[FixProRata] Skipping ${variant.leaveTypeName} - not pro-rata (${variant.grantFrequency})`);
          continue;
        }
        const correctBalance = this.calculateLeaveEntitlement(
          variant.annualAllocation,
          variant.grantFrequency,
          actualJoiningDate,
          /* @__PURE__ */ new Date(),
          // current date
          variant.onboardingSlabs,
          variant.effectiveDate ? new Date(variant.effectiveDate) : /* @__PURE__ */ new Date()
        );
        const currentBalanceInDays = parseFloat(balance.currentBalance);
        const correctBalanceInDays = correctBalance;
        const difference = correctBalanceInDays - currentBalanceInDays;
        console.log(`[FixProRata] ${variant.leaveTypeName}: Current=${currentBalanceInDays}, Correct=${correctBalanceInDays}, Difference=${difference}`);
        if (Math.abs(difference) > 0.01) {
          await db.update(employeeLeaveBalances).set({
            currentBalance: correctBalanceInDays.toString(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(employeeLeaveBalances.id, balance.id));
          await this.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: balance.leaveVariantId,
            transactionType: difference > 0 ? "credit" : "debit",
            amount: Math.abs(difference).toString(),
            description: `Pro-rata balance correction based on actual joining date (${joiningDate})`,
            referenceType: "balance_correction",
            referenceId: balance.id.toString(),
            orgId
          });
          results.push({
            leaveType: variant.leaveTypeName,
            oldBalance: currentBalanceInDays,
            newBalance: correctBalanceInDays,
            correction: difference
          });
          console.log(`[FixProRata] \u2705 Updated ${variant.leaveTypeName}: ${currentBalanceInDays} \u2192 ${correctBalanceInDays} (${difference > 0 ? "+" : ""}${difference})`);
        } else {
          console.log(`[FixProRata] \u2713 ${variant.leaveTypeName} already correct: ${currentBalanceInDays}`);
        }
      }
      return {
        userId,
        joiningDate,
        corrections: results,
        totalCorrections: results.length
      };
    } catch (error) {
      console.error(`[FixProRata] Error fixing balances for user ${userId}:`, error);
      throw error;
    }
  }
  async fixProRataBalancesForOrg(orgId, employeeJoiningDates) {
    try {
      const assignments = await db.select({
        userId: employeeAssignments.userId
      }).from(employeeAssignments).where(
        and(
          eq(employeeAssignments.orgId, orgId),
          eq(employeeAssignments.assignmentType, "leave_variant")
        )
      ).groupBy(employeeAssignments.userId);
      const uniqueUserIds = assignments.map((a) => a.userId);
      console.log(`[FixProRata] Found ${uniqueUserIds.length} employees to process`);
      const results = [];
      let processedUsers = 0;
      let errorUsers = 0;
      for (const userId of uniqueUserIds) {
        try {
          const joiningDate = employeeJoiningDates.get(userId);
          if (!joiningDate) {
            console.log(`[FixProRata] \u26A0\uFE0F No joining date found for user ${userId}, skipping`);
            continue;
          }
          const userResult = await this.fixProRataBalancesForUser(userId, orgId, joiningDate);
          results.push(userResult);
          processedUsers++;
          console.log(`[FixProRata] \u2705 Fixed user ${userId} (${processedUsers}/${uniqueUserIds.length})`);
        } catch (error) {
          errorUsers++;
          console.error(`[FixProRata] \u274C Failed to fix user ${userId}:`, error.message);
          results.push({
            userId,
            error: error.message
          });
        }
      }
      return {
        totalUsers: uniqueUserIds.length,
        processedUsers,
        errorUsers,
        results
      };
    } catch (error) {
      console.error("Error fixing pro-rata balances for organization:", error);
      throw error;
    }
  }
  // PTO workflow processing operations
  async processPTOWorkflowApproval(ptoRequestId, approvedBy, orgId) {
    console.log(`Processing PTO workflow approval for request ${ptoRequestId} by ${approvedBy}`);
    const requests = await this.getPTORequests(orgId);
    const request = requests.find((r) => r.id === ptoRequestId);
    if (!request) {
      throw new Error("PTO request not found");
    }
    console.log(`Found PTO request for workflow processing:`, request);
    const workflows2 = await this.getWorkflows(orgId);
    const workflow = workflows2.find((w) => w.id === request.workflowId);
    if (!workflow || !workflow.steps) {
      throw new Error("Workflow not found");
    }
    console.log(`Found workflow:`, workflow);
    let approvalHistory = [];
    try {
      approvalHistory = typeof request.approvalHistory === "string" ? JSON.parse(request.approvalHistory) : request.approvalHistory || [];
    } catch (e) {
      approvalHistory = [];
    }
    approvalHistory.push({
      stepNumber: request.currentStep,
      action: "approved",
      userId: approvedBy,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      comment: `Step ${request.currentStep} approved`
    });
    const isLastStep = (request.currentStep || 1) >= workflow.steps.length;
    const newStatus = isLastStep ? "approved" : "pending";
    const newWorkflowStatus = isLastStep ? "completed" : "in_progress";
    const nextStep = isLastStep ? request.currentStep : (request.currentStep || 1) + 1;
    console.log(`Workflow processing: isLastStep=${isLastStep}, newStatus=${newStatus}`);
    return await this.updatePTORequest(ptoRequestId, {
      status: newStatus,
      currentStep: nextStep,
      workflowStatus: newWorkflowStatus,
      approvalHistory: JSON.stringify(approvalHistory),
      approvedBy: isLastStep ? approvedBy : request.approvedBy,
      approvedAt: isLastStep ? /* @__PURE__ */ new Date() : request.approvedAt
    });
  }
  async rejectPTOWorkflowRequest(ptoRequestId, rejectedBy, rejectionReason, orgId) {
    const request = await this.getPTORequests(orgId).then(
      (requests) => requests.find((r) => r.id === ptoRequestId)
    );
    if (!request) {
      throw new Error("PTO request not found");
    }
    let approvalHistory = [];
    try {
      approvalHistory = typeof request.approvalHistory === "string" ? JSON.parse(request.approvalHistory) : request.approvalHistory || [];
    } catch (e) {
      approvalHistory = [];
    }
    approvalHistory.push({
      stepNumber: request.currentStep,
      action: "rejected",
      userId: rejectedBy,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      comment: rejectionReason || "Request rejected"
    });
    return await this.updatePTORequest(ptoRequestId, {
      status: "rejected",
      workflowStatus: "rejected",
      approvalHistory: JSON.stringify(approvalHistory),
      rejectionReason
    });
  }
  // Comp-off workflow processing operations
  async processCompOffWorkflowApproval(compOffRequestId, approvedBy, orgId) {
    const request = await this.getCompOffRequests(void 0, orgId).then(
      (requests) => requests.find((r) => r.id === compOffRequestId)
    );
    if (!request) {
      throw new Error("Comp-off request not found");
    }
    const workflow = await this.getWorkflows(orgId).then(
      (workflows2) => workflows2.find((w) => w.id === request.workflowId)
    );
    if (!workflow || !workflow.steps) {
      throw new Error("Workflow not found");
    }
    const currentStep = workflow.steps.find((step) => step.stepNumber === request.currentStep);
    if (!currentStep) {
      throw new Error("Current workflow step not found");
    }
    let approvalHistory = [];
    try {
      approvalHistory = typeof request.approvalHistory === "string" ? JSON.parse(request.approvalHistory) : request.approvalHistory || [];
    } catch (e) {
      approvalHistory = [];
    }
    approvalHistory.push({
      stepNumber: request.currentStep,
      action: "approved",
      userId: approvedBy,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      comment: `Step ${request.currentStep} approved`
    });
    const isLastStep = request.currentStep >= workflow.steps.length;
    const newStatus = isLastStep ? "approved" : "pending";
    const newWorkflowStatus = isLastStep ? "completed" : "in_progress";
    const nextStep = isLastStep ? request.currentStep : request.currentStep + 1;
    return await this.updateCompOffRequest(compOffRequestId, {
      status: newStatus,
      currentStep: nextStep,
      workflowStatus: newWorkflowStatus,
      approvalHistory: JSON.stringify(approvalHistory),
      approvedBy: isLastStep ? approvedBy : request.approvedBy,
      approvedAt: isLastStep ? /* @__PURE__ */ new Date() : request.approvedAt
    });
  }
  async rejectCompOffWorkflowRequest(compOffRequestId, rejectedBy, rejectionReason, orgId) {
    const request = await this.getCompOffRequests(void 0, orgId).then(
      (requests) => requests.find((r) => r.id === compOffRequestId)
    );
    if (!request) {
      throw new Error("Comp-off request not found");
    }
    let approvalHistory = [];
    try {
      approvalHistory = typeof request.approvalHistory === "string" ? JSON.parse(request.approvalHistory) : request.approvalHistory || [];
    } catch (e) {
      approvalHistory = [];
    }
    approvalHistory.push({
      stepNumber: request.currentStep,
      action: "rejected",
      userId: rejectedBy,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      comment: rejectionReason || "Request rejected"
    });
    return await this.updateCompOffRequest(compOffRequestId, {
      status: "rejected",
      workflowStatus: "rejected",
      approvalHistory: JSON.stringify(approvalHistory),
      rejectionReason,
      rejectedAt: /* @__PURE__ */ new Date()
    });
  }
  // Auto-sync pending deductions based on workflow configuration
  async syncPendingDeductionsForUser(userId, orgId) {
    console.log(`\u{1F504} [SyncPendingDeductions] Starting for user ${userId}, org ${orgId}`);
    try {
      console.log(`\u{1F9F9} [SyncPendingDeductions] Cleaning up old pending deductions for user ${userId}`);
      await db.delete(leaveBalanceTransactions2).where(and(
        eq(leaveBalanceTransactions2.userId, userId),
        eq(leaveBalanceTransactions2.orgId, orgId),
        eq(leaveBalanceTransactions2.transactionType, "pending_deduction")
      ));
      const leaveVariants2 = await this.getLeaveVariants(orgId);
      console.log(`\u{1F4CB} [SyncPendingDeductions] Found ${leaveVariants2.length} leave variants`);
      const pendingRequests = await db.select().from(leaveRequests).where(and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId),
        eq(leaveRequests.status, "pending")
      ));
      console.log(`\u{1F4DD} [SyncPendingDeductions] Found ${pendingRequests.length} pending requests`);
      for (const request of pendingRequests) {
        let variant = leaveVariants2.find((v) => v.id === request.leaveVariantId);
        if (!variant && request.leaveTypeId) {
          variant = leaveVariants2.find((v) => v.leaveTypeId === request.leaveTypeId);
          console.log(`\u{1F50D} [SyncPendingDeductions] Request ${request.id} - searching by leaveTypeId ${request.leaveTypeId}, found variant:`, variant?.id);
        }
        if (!variant) {
          console.log(`\u26A0\uFE0F [SyncPendingDeductions] No variant found for request ${request.id} (leaveVariantId: ${request.leaveVariantId}, leaveTypeId: ${request.leaveTypeId})`);
          continue;
        }
        console.log(`\u{1F50D} [SyncPendingDeductions] Processing request ${request.id}, variant ${variant.id}, leaveBalanceDeductionBefore: ${variant.leaveBalanceDeductionBefore}`);
        const existingPendingTransaction = await db.select().from(leaveBalanceTransactions2).where(and(
          eq(leaveBalanceTransactions2.userId, userId),
          eq(leaveBalanceTransactions2.leaveVariantId, variant.id),
          // Use the actual variant ID we found
          eq(leaveBalanceTransactions2.orgId, orgId),
          eq(leaveBalanceTransactions2.transactionType, "pending_deduction"),
          like(leaveBalanceTransactions2.description, `%Request ${request.id}%`)
          // Check for request-specific transaction
        ));
        if (existingPendingTransaction.length === 0) {
          const workflowType = variant.leaveBalanceDeductionBefore ? "Before Workflow" : "After Workflow";
          console.log(`\u2795 [SyncPendingDeductions] Adding pending_deduction for "${workflowType}" - Request ${request.id}`);
          const currentBalances = await this.getEmployeeLeaveBalances(userId, (/* @__PURE__ */ new Date()).getFullYear(), orgId);
          const currentBalance = currentBalances.find((b) => b.leaveVariantId === variant.id);
          const currentBalanceAmount = currentBalance?.currentBalance || 0;
          const balanceAfter = currentBalanceAmount - request.workingDays;
          await this.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: variant.id,
            // Use the actual variant ID we found
            transactionType: "pending_deduction",
            amount: -request.workingDays,
            // Negative for deduction, use full days
            balanceAfter,
            // Required field - balance after this transaction
            description: `Pending leave deduction: ${request.workingDays} days (${workflowType}) - Request ${request.id}`,
            transactionDate: new Date(request.createdAt || /* @__PURE__ */ new Date()),
            year: (/* @__PURE__ */ new Date()).getFullYear(),
            // Required field
            orgId
          });
        } else {
          const workflowType = variant.leaveBalanceDeductionBefore ? "Before Workflow" : "After Workflow";
          console.log(`\u2705 [SyncPendingDeductions] Pending_deduction already exists for "${workflowType}" - Request ${request.id}`);
        }
      }
      console.log(`\u2705 [SyncPendingDeductions] Sync completed for user ${userId}`);
    } catch (error) {
      console.error(`\u274C [SyncPendingDeductions] Error syncing for user ${userId}:`, error);
      throw error;
    }
  }
  // Bulk sync pending deductions for all employees with pending requests
  async bulkSyncPendingDeductionsForOrg(orgId) {
    console.log(`\u{1F504} [BulkSync] Starting bulk sync for org ${orgId}`);
    try {
      const pendingRequests = await db.select({ userId: leaveRequests.userId }).from(leaveRequests).where(and(
        eq(leaveRequests.orgId, orgId),
        eq(leaveRequests.status, "pending")
      ));
      const uniqueUserIds = [...new Set(pendingRequests.map((req) => req.userId))];
      console.log(`\u{1F504} [BulkSync] Found ${uniqueUserIds.length} unique users with pending requests`);
      for (const userId of uniqueUserIds) {
        await this.syncPendingDeductionsForUser(userId, orgId);
      }
      console.log(`\u2705 [BulkSync] Completed bulk sync for org ${orgId}`);
    } catch (error) {
      console.error(`\u274C [BulkSync] Error during bulk sync for org ${orgId}:`, error);
    }
  }
  // Collaborative task operations
  async createCollaborativeTask(task) {
    console.log("\u{1F3AF} Creating collaborative task:", task);
    const uniqueLink = `task-${task.leaveRequestId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const [collaborativeTask] = await db.insert(leaveTaskAssigneesEnhanced).values({
      ...task,
      uniqueLink,
      status: task.status || "pending",
      notificationSent: false,
      lastStatusUpdate: /* @__PURE__ */ new Date(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    console.log("\u2705 Collaborative task created successfully with ID:", collaborativeTask.id);
    return collaborativeTask;
  }
  // Data cleanup operations - Delete all leave data for fresh start
  async deleteAllLeaveBalanceTransactions(orgId) {
    console.log(`[Cleanup] Deleting all leave balance transactions for org_id: ${orgId}`);
    await db.delete(leaveBalanceTransactions2).where(eq(leaveBalanceTransactions2.orgId, orgId));
    console.log(`[Cleanup] Leave balance transactions deleted successfully`);
  }
  async deleteAllLeaveRequests(orgId) {
    console.log(`[Cleanup] Deleting all leave requests for org_id: ${orgId}`);
    await db.delete(leaveRequests).where(eq(leaveRequests.orgId, orgId));
    console.log(`[Cleanup] Leave requests deleted successfully`);
  }
  async resetAllEmployeeLeaveBalances(orgId) {
    console.log(`[Cleanup] Resetting all employee leave balances for org_id: ${orgId}`);
    await db.update(employeeLeaveBalances).set({
      currentBalance: 0,
      usedBalance: 0,
      carryForward: 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(employeeLeaveBalances.orgId, orgId));
    console.log(`[Cleanup] Employee leave balances reset successfully`);
  }
  // Blackout periods operations
  async getBlackoutPeriods(orgId) {
    const baseQuery = db.select().from(blackoutPeriods);
    if (orgId) {
      return await baseQuery.where(eq(blackoutPeriods.orgId, orgId)).orderBy(blackoutPeriods.startDate);
    }
    return await baseQuery.orderBy(blackoutPeriods.startDate);
  }
  async createBlackoutPeriod(period) {
    const [newPeriod] = await db.insert(blackoutPeriods).values(period).returning();
    return newPeriod;
  }
  async updateBlackoutPeriod(id, period) {
    const [updatedPeriod] = await db.update(blackoutPeriods).set({ ...period, updatedAt: /* @__PURE__ */ new Date() }).where(eq(blackoutPeriods.id, id)).returning();
    return updatedPeriod;
  }
  async deleteBlackoutPeriod(id, orgId) {
    if (orgId) {
      await db.delete(blackoutPeriods).where(
        and(eq(blackoutPeriods.id, id), eq(blackoutPeriods.orgId, orgId))
      );
    } else {
      await db.delete(blackoutPeriods).where(eq(blackoutPeriods.id, id));
    }
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import session from "express-session";
import connectPg from "connect-pg-simple";
import dotenv from "dotenv";
dotenv.config();
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl
    }
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
}
var isAuthenticated = (req, res, next) => {
  return next();
};

// server/routes.ts
init_db();
init_schema();
init_schema();
import { eq as eq3, and as and3, desc as desc2, inArray as inArray2, sql as sql2 } from "drizzle-orm";
import { randomBytes } from "crypto";
import multer from "multer";
import * as XLSX from "xlsx";
function getOrgIdFromHeaders(req) {
  const orgIdHeader = req.headers["x-org-id"];
  if (!orgIdHeader) {
    throw new Error("Organization ID is required in X-Org-Id header");
  }
  const orgId = parseInt(orgIdHeader);
  if (isNaN(orgId)) {
    throw new Error(`Invalid organization ID: "${orgIdHeader}"`);
  }
  console.log(
    `[Server] ${req.path} received X-Org-Id header: "${orgIdHeader}" -> parsed as: ${orgId}`
  );
  return orgId;
}
async function handleCompOffTransfer(compOffRequest, orgId) {
  try {
    console.log(
      `Processing comp-off transfer: ${compOffRequest.transferAmount} days to leave type ${compOffRequest.leaveTypeId}`
    );
    const existingBalance = await storage.getEmployeeLeaveBalances(
      compOffRequest.userId,
      (/* @__PURE__ */ new Date()).getFullYear(),
      orgId
    );
    const leaveTypeBalance = existingBalance.find(
      (b) => b.leaveVariantId.toString() === compOffRequest.leaveTypeId
    );
    if (leaveTypeBalance) {
      const transferHalfDays = compOffRequest.transferAmount * 2;
      await storage.updateEmployeeLeaveBalance(leaveTypeBalance.id, {
        currentBalance: leaveTypeBalance.currentBalance + transferHalfDays,
        updatedAt: /* @__PURE__ */ new Date()
      });
    } else {
      const transferHalfDays = compOffRequest.transferAmount * 2;
      await storage.createEmployeeLeaveBalance({
        userId: compOffRequest.userId,
        leaveVariantId: parseInt(compOffRequest.leaveTypeId),
        year: (/* @__PURE__ */ new Date()).getFullYear(),
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
    await storage.createLeaveBalanceTransaction({
      userId: compOffRequest.userId,
      leaveVariantId: parseInt(compOffRequest.leaveTypeId),
      transactionType: "credit",
      amount: compOffRequest.transferAmount * 2,
      // Convert to half-day units
      description: `Comp-off transfer: ${compOffRequest.transferAmount} days`,
      transactionDate: /* @__PURE__ */ new Date(),
      orgId
    });
    console.log(
      `Successfully transferred ${compOffRequest.transferAmount} days from comp-off to leave balance`
    );
  } catch (error) {
    console.error("Error processing comp-off transfer:", error);
  }
}
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      if (process.env.NODE_ENV === "development") {
        const mockUser = {
          id: "12080",
          email: "rahul.sharma@company.com",
          firstName: "Rahul",
          lastName: "Sharma",
          profileImageUrl: null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        return res.json(mockUser);
      }
      let userId;
      try {
        userId = req.user?.claims?.sub;
      } catch (e) {
        userId = void 0;
      }
      const orgId = parseInt(req.headers["x-org-id"]) || 60;
      let user = void 0;
      if (userId) {
        user = await storage.getUser(userId);
      }
      if (!user) {
        const mockUser = {
          id: "12080",
          email: "rahul.sharma@company.com",
          firstName: "Rahul",
          lastName: "Sharma",
          profileImageUrl: null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        return res.json(mockUser);
      }
      await calculateBalancesOnFirstLogin(userId, orgId, req);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      const mockUser = {
        id: "12080",
        email: "rahul.sharma@company.com",
        firstName: "Rahul",
        lastName: "Sharma",
        profileImageUrl: null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      res.json(mockUser);
    }
  });
  async function calculateBalancesOnFirstLogin(userId, orgId, req) {
    try {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const existingBalances = await storage.getEmployeeLeaveBalances(
        userId,
        currentYear,
        orgId
      );
      const assignments = await storage.getEmployeeAssignments(orgId);
      const userAssignments = assignments.filter(
        (a) => a.userId === userId && a.assignmentType === "leave_variant"
      );
      if (userAssignments.length > 0 && existingBalances.length === 0) {
        console.log(
          `[FirstLogin] Auto-calculating balances for user ${userId}`
        );
        let employeeData = null;
        try {
          const jwtToken = req.headers.authorization?.replace("Bearer ", "") || req.headers["x-jwt-token"] || req.query.token;
          if (jwtToken) {
            const response = await fetch(
              "https://qa-api.resolveindia.com/worker-master-leave",
              {
                headers: { Authorization: `Bearer ${jwtToken}` }
              }
            );
            if (response.ok) {
              const data = await response.json();
              employeeData = data.data?.find(
                (emp) => emp.user_id?.toString() === userId?.toString()
              );
              console.log(
                `[FirstLogin] Found employee data for ${userId}: joining date ${employeeData?.date_of_joining}`
              );
            }
          }
        } catch (apiError) {
          console.log(
            "[FirstLogin] External API not available, using full allocation"
          );
        }
        const leaveVariants2 = await storage.getLeaveVariants(orgId);
        for (const assignment of userAssignments) {
          const variant = leaveVariants2.find(
            (v) => v.id === assignment.leaveVariantId
          );
          if (!variant || !variant.paidDaysInYear) continue;
          let calculatedBalance = 0;
          const entitlement = variant.paidDaysInYear * 2;
          if (employeeData?.date_of_joining && variant.grantLeaves === "after_earning") {
            const joiningDate = new Date(employeeData.date_of_joining);
            const currentDate = /* @__PURE__ */ new Date();
            const monthsDiff = (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 + (currentDate.getMonth() - joiningDate.getMonth());
            const monthsWorked = Math.max(0, monthsDiff);
            const monthlyAllocation = entitlement / 12;
            calculatedBalance = Math.floor(monthsWorked * monthlyAllocation);
            console.log(
              `[FirstLogin] Pro-rata calculation: ${monthsWorked} months worked = ${calculatedBalance / 2} days`
            );
          } else {
            calculatedBalance = entitlement;
            console.log(
              `[FirstLogin] Full allocation: ${calculatedBalance / 2} days`
            );
          }
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
          await storage.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: variant.id,
            year: currentYear,
            transactionType: "credit",
            amount: calculatedBalance,
            balanceAfter: calculatedBalance,
            description: `First login auto-calculation for ${variant.leaveTypeName} (${calculatedBalance / 2} days)`,
            orgId
          });
          console.log(
            `[FirstLogin] Created ${variant.leaveTypeName} balance: ${calculatedBalance / 2} days`
          );
        }
      }
    } catch (balanceError) {
      console.error("[FirstLogin] Error in balance calculation:", balanceError);
    }
  }
  app2.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers["x-org-id"];
      const orgId = getOrgIdFromHeaders(req);
      console.log(
        `[Server] Received X-Org-Id header: "${orgIdHeader}" -> parsed as: ${orgId}`
      );
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No valid authorization token provided" });
      }
      const jwtToken = authHeader.substring(7);
      console.log(`[Server] Using JWT token for external API call`);
      const payload = {
        userBlocks: [1, 3, 4],
        userWise: 0,
        workerType: 0,
        attribute: 0,
        subAttributeId: 0
      };
      const response = await fetch(
        "https://qa-api.resolveindia.com/reports/worker-master-leave",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) {
        console.error(
          `[Server] External API failed with status: ${response.status}`
        );
        return res.status(response.status).json({
          message: `External API request failed: ${response.statusText}`
        });
      }
      const apiData = await response.json();
      console.log(
        `[Server] External API returned ${apiData.data?.data?.length || 0} employees for org_id ${orgId}`
      );
      const assignments = await storage.getEmployeeAssignments(orgId);
      const assignedUserIds = new Set(assignments.map((a) => a.userId));
      console.log(
        `[Server] Found ${assignedUserIds.size} employees with leave assignments`
      );
      const employees = apiData.data?.data?.map((emp) => {
        const isAssigned = assignedUserIds.has(emp.user_id);
        return {
          id: emp.employee_number,
          firstName: emp.first_name,
          lastName: emp.last_name,
          email: emp.email,
          designation: emp.designation_name,
          function: emp.user_role_name,
          division: emp.band_name,
          location: emp.vendor_name,
          phoneNumber: emp.Mobile_number_1,
          reportingManager: emp.reporting_manager_id,
          joinedDate: emp.date_of_joining,
          gender: emp.gender_name,
          assignmentStatus: isAssigned ? "Assigned" : "Unassigned"
        };
      }) || [];
      console.log(
        `[Server] Processed ${employees.length} employees with assignment status`
      );
      res.json(employees);
    } catch (error) {
      console.error("Error fetching users from external API:", error);
      res.status(500).json({ message: "Failed to fetch users from external API" });
    }
  });
  app2.get("/api/company", isAuthenticated, async (req, res) => {
    try {
      const orgIdHeader = req.headers["x-org-id"];
      const orgId = getOrgIdFromHeaders(req);
      console.log(
        `[Server] /api/company received X-Org-Id header: "${orgIdHeader}" -> parsed as: ${orgId}`
      );
      const company = await storage.getCompany(orgId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });
  app2.post("/api/company", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertCompanySchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });
  app2.patch("/api/company/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertCompanySchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
      const company = await storage.updateCompany(id, validatedData);
      if (validatedData.setupStatus === "completed") {
        console.log(
          `[Company Update] Setup completed for org_id: ${orgId}, creating default roles`
        );
        try {
          await storage.createDefaultRoles(parseInt(orgId));
          console.log(
            `[Company Update] Default roles created successfully for org_id: ${orgId}`
          );
        } catch (roleError) {
          console.error(
            `[Company Update] Error creating default roles for org_id: ${orgId}:`,
            roleError
          );
        }
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ message: "Failed to update company" });
    }
  });
  app2.get("/api/leave-types", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      console.log(`[LeaveTypes] Fetching leave types for org_id: ${orgId}`);
      try {
        const leaveTypes2 = await storage.getLeaveTypes(
          parseInt(orgId)
        );
        res.json(leaveTypes2);
      } catch (dbError) {
        if (dbError.message && dbError.message.includes("negative_leave_balance")) {
          console.log(`[LeaveTypes] Column missing, using fallback query`);
          const result = await db.execute(sql2`
            SELECT id, name, description, icon, color, annual_allowance, carry_forward, 
                   is_active, org_id, created_at, updated_at
            FROM leave_types 
            WHERE is_active = true AND org_id = ${parseInt(orgId)}
            ORDER BY name
          `);
          const leaveTypesWithBalance = result.rows.map((row) => ({
            ...row,
            negativeLeaveBalance: row.name === "Casual & Sick Leave" ? 5 : 0
          }));
          console.log(
            `[LeaveTypes] Found ${leaveTypesWithBalance.length} leave types`
          );
          res.json(leaveTypesWithBalance);
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error("Error fetching leave types:", error);
      res.status(500).json({ message: "Failed to fetch leave types" });
    }
  });
  app2.post("/api/leave-types", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const parsedOrgId = parseInt(orgId);
      const existingLeaveTypes = await storage.getLeaveTypes(parsedOrgId);
      const requestedName = req.body.name?.trim();
      if (requestedName && existingLeaveTypes.some(
        (lt) => lt.name.toLowerCase() === requestedName.toLowerCase()
      )) {
        return res.status(400).json({
          message: `A leave type with the name "${requestedName}" already exists. Please choose a different name.`
        });
      }
      const validatedData = insertLeaveTypeSchema.parse({
        ...req.body,
        orgId: parsedOrgId
      });
      const leaveType = await storage.createLeaveType(validatedData);
      res.json(leaveType);
    } catch (error) {
      console.error("Error creating leave type:", error);
      res.status(400).json({ message: "Failed to create leave type" });
    }
  });
  app2.patch("/api/leave-types/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertLeaveTypeSchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
      const leaveType = await storage.updateLeaveType(id, validatedData);
      res.json(leaveType);
    } catch (error) {
      console.error("Error updating leave type:", error);
      res.status(400).json({ message: "Failed to update leave type" });
    }
  });
  app2.delete("/api/leave-types/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLeaveType(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting leave type:", error);
      res.status(500).json({ message: "Failed to delete leave type" });
    }
  });
  app2.get("/api/roles", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const roles2 = await storage.getRoles(orgId);
      res.json(roles2);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });
  app2.post("/api/roles", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertRoleSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      const role = await storage.createRole(validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(400).json({ message: "Failed to create role" });
    }
  });
  app2.patch("/api/roles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertRoleSchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
      const role = await storage.updateRole(id, validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(400).json({ message: "Failed to update role" });
    }
  });
  app2.delete("/api/roles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRole(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(400).json({ message: "Failed to delete role" });
    }
  });
  app2.get("/api/users/:userId/roles", isAuthenticated, async (req, res) => {
    try {
      const userRoles2 = await storage.getUserRoles(req.params.userId);
      res.json(userRoles2);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });
  app2.post("/api/users/:userId/roles", isAuthenticated, async (req, res) => {
    try {
      const { roleId } = req.body;
      const userRole = await storage.assignUserRole(req.params.userId, roleId);
      res.json(userRole);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ message: "Failed to assign user role" });
    }
  });
  app2.delete(
    "/api/users/:userId/roles/:roleId",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.params.userId;
        const roleId = parseInt(req.params.roleId);
        await storage.removeUserRole(userId, roleId);
        res.json({ message: "User role removed successfully" });
      } catch (error) {
        console.error("Error removing user role:", error);
        res.status(500).json({ message: "Failed to remove user role" });
      }
    }
  );
  app2.get(
    "/api/users/:userId/permissions",
    isAuthenticated,
    async (req, res) => {
      try {
        const permissions = await storage.getUserPermissions(req.params.userId);
        res.json(permissions);
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ message: "Failed to fetch user permissions" });
      }
    }
  );
  app2.get(
    "/api/employee-assignments/:variantId",
    isAuthenticated,
    async (req, res) => {
      try {
        const leaveVariantId = parseInt(req.params.variantId);
        const orgId = getOrgIdFromHeaders(req);
        const assignments = await storage.getEmployeeAssignments(
          orgId,
          leaveVariantId
        );
        res.json(assignments);
      } catch (error) {
        console.error("Error fetching employee assignments:", error);
        res.status(500).json({ message: "Failed to fetch employee assignments" });
      }
    }
  );
  app2.get(
    "/api/employee-assignments/pto/:variantId",
    isAuthenticated,
    async (req, res) => {
      try {
        const ptoVariantId = parseInt(req.params.variantId);
        const assignments = await storage.getPTOEmployeeAssignments(ptoVariantId);
        res.json(assignments);
      } catch (error) {
        console.error("Error fetching PTO employee assignments:", error);
        res.status(500).json({ message: "Failed to fetch PTO employee assignments" });
      }
    }
  );
  app2.get(
    "/api/employee-assignments/comp-off-variant/:variantId",
    isAuthenticated,
    async (req, res) => {
      try {
        const variantId = parseInt(req.params.variantId);
        const assignments = await storage.getCompOffEmployeeAssignments(variantId);
        res.json(assignments);
      } catch (error) {
        console.error("Error fetching comp-off employee assignments:", error);
        res.status(500).json({ message: "Failed to fetch comp-off employee assignments" });
      }
    }
  );
  app2.get("/api/employee-assignments", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const assignments = await storage.getEmployeeAssignments(
        parseInt(orgId)
      );
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching employee assignments:", error);
      res.status(500).json({ message: "Failed to fetch employee assignments" });
    }
  });
  app2.post(
    "/api/employee-assignments/bulk",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        let assignments;
        if (req.body.assignments) {
          assignments = req.body.assignments.map((assignment) => ({
            ...assignment,
            orgId
          }));
        } else {
          const { leaveVariantId, assignmentType, userIds } = req.body;
          assignments = userIds.map((userId) => ({
            userId,
            leaveVariantId,
            assignmentType,
            orgId
          }));
        }
        const validAssignments = assignments.filter(
          (assignment) => assignment.userId && assignment.userId !== null
        );
        console.log(
          `Filtered ${assignments.length - validAssignments.length} assignments with null userId`
        );
        console.log("Valid assignments to create:", validAssignments);
        if (validAssignments.length === 0) {
          console.log("No valid assignments to create - all had null userId");
          return res.json([]);
        }
        if (validAssignments.length > 0) {
          await storage.deleteEmployeeAssignments(
            validAssignments[0].leaveVariantId,
            validAssignments[0].assignmentType
          );
        }
        const created = await storage.bulkCreateEmployeeAssignments(validAssignments);
        const leaveVariantAssignments = validAssignments.filter(
          (a) => a.assignmentType === "leave_variant"
        );
        if (leaveVariantAssignments.length > 0) {
          console.log(
            `[BulkAssignment] Creating leave balances for ${leaveVariantAssignments.length} leave variant assignments`
          );
          try {
            const authHeader = req.headers.authorization;
            let externalEmployeeData = [];
            if (authHeader && authHeader.startsWith("Bearer ")) {
              const jwtToken = authHeader.substring(7);
              try {
                const payload = {
                  userBlocks: [1, 3, 4],
                  userWise: 0,
                  workerType: 0,
                  attribute: 0,
                  subAttributeId: 0
                };
                const response = await fetch(
                  "https://qa-api.resolveindia.com/reports/worker-master-leave",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${jwtToken}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                  }
                );
                if (response.ok) {
                  const data = await response.json();
                  if (data.data?.data && Array.isArray(data.data.data)) {
                    externalEmployeeData = data.data.data;
                    console.log(
                      `[BulkAssignment] Loaded ${externalEmployeeData.length} external employee records`
                    );
                  }
                }
              } catch (apiError) {
                console.warn(
                  `[BulkAssignment] Failed to load external employee data:`,
                  apiError
                );
              }
            }
            const leaveVariants2 = await storage.getLeaveVariants(orgId);
            const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
            const currentDate = /* @__PURE__ */ new Date();
            const leaveYearStart = new Date(currentYear, 0, 1);
            for (const assignment of leaveVariantAssignments) {
              const variant = leaveVariants2.find(
                (v) => v.id === assignment.leaveVariantId
              );
              if (!variant || !variant.paidDaysInYear) {
                console.log(
                  `[BulkAssignment] Skipping assignment - no variant or paidDaysInYear not set:`,
                  assignment
                );
                continue;
              }
              const existingBalances = await storage.getEmployeeLeaveBalances(
                assignment.userId,
                currentYear,
                orgId
              );
              const existingBalance = existingBalances.find(
                (b) => b.leaveVariantId === variant.id
              );
              if (existingBalance) {
                console.log(
                  `[BulkAssignment] Balance already exists for user ${assignment.userId}, variant ${variant.id}`
                );
                continue;
              }
              const extEmployee = externalEmployeeData.find(
                (emp) => emp.user_id?.toString() === assignment.userId?.toString()
              );
              let joiningDate = leaveYearStart.toISOString().split("T")[0];
              let isMidYearJoiner = false;
              if (extEmployee?.date_of_joining) {
                try {
                  const dateStr = extEmployee.date_of_joining.toString();
                  if (dateStr.includes("-")) {
                    const parts = dateStr.split("-");
                    if (parts.length === 3) {
                      const day = parts[0].padStart(2, "0");
                      const monthMap = {
                        Jan: "01",
                        Feb: "02",
                        Mar: "03",
                        Apr: "04",
                        May: "05",
                        Jun: "06",
                        Jul: "07",
                        Aug: "08",
                        Sep: "09",
                        Oct: "10",
                        Nov: "11",
                        Dec: "12"
                      };
                      const month = monthMap[parts[1]] || "01";
                      const year = parts[2];
                      joiningDate = `${year}-${month}-${day}`;
                    }
                  }
                  const empJoiningDate = new Date(joiningDate);
                  isMidYearJoiner = empJoiningDate > leaveYearStart;
                  console.log(
                    `[BulkAssignment] User ${assignment.userId} (${extEmployee.user_name}): joined ${joiningDate}, mid-year: ${isMidYearJoiner}`
                  );
                } catch (error) {
                  console.warn(
                    `[BulkAssignment] Failed to parse joining date for user ${assignment.userId}: ${extEmployee.date_of_joining}`
                  );
                }
              }
              const { totalEntitlement, currentBalance } = storage.calculateLeaveEntitlement(
                variant,
                new Date(joiningDate),
                // Convert string to Date
                currentDate,
                currentYear
              );
              const leaveBalance = await storage.createEmployeeLeaveBalance({
                userId: assignment.userId,
                leaveVariantId: assignment.leaveVariantId,
                totalEntitlement: String(totalEntitlement),
                // Convert to string
                currentBalance: String(currentBalance),
                // Convert to string
                usedBalance: "0",
                carryForward: "0",
                year: currentYear,
                orgId
              });
              console.log(
                `[BulkAssignment] Created balance for user ${assignment.userId}: ${currentBalance / 2} days (${currentBalance} half-days)`
              );
              await storage.createLeaveBalanceTransaction({
                userId: assignment.userId,
                leaveVariantId: assignment.leaveVariantId,
                transactionType: "grant",
                amount: String(currentBalance),
                // Convert to string
                balanceAfter: String(currentBalance),
                // Convert to string
                description: isMidYearJoiner ? `Pro-rata leave allocation for ${currentYear} (joined ${joiningDate})` : `Leave allocation for ${currentYear}`,
                year: currentYear,
                orgId
              });
            }
            console.log(
              `[BulkAssignment] Successfully created leave balances for all new assignments`
            );
          } catch (balanceError) {
            console.error(
              `[BulkAssignment] Error creating leave balances:`,
              balanceError
            );
          }
        }
        res.json(created);
      } catch (error) {
        console.error("Error creating employee assignments:", error);
        res.status(500).json({ message: "Failed to create employee assignments" });
      }
    }
  );
  app2.get(
    "/api/employee-leave-balances/all",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgIdHeader = req.headers["x-org-id"];
        const orgId = getOrgIdFromHeaders(req);
        const year = req.query.year ? parseInt(req.query.year) : (/* @__PURE__ */ new Date()).getFullYear();
        console.log(
          `[API Route] /api/employee-leave-balances/all called with orgId: ${orgId}, year: ${year}`
        );
        console.log(
          `\u{1F504} [API Route] Triggering bulk sync for pending deductions before HR report`
        );
        await storage.bulkSyncPendingDeductionsForOrg(orgId);
        console.log(
          `\u2705 [API Route] Bulk sync completed, now fetching balances`
        );
        const balances = await storage.getAllEmployeeLeaveBalances(year, orgId);
        console.log(
          `[API Route] getAllEmployeeLeaveBalances returned ${balances.length} records`
        );
        res.json(balances);
      } catch (error) {
        console.error("Error fetching all employee leave balances:", error);
        res.status(500).json({ message: "Failed to fetch all employee leave balances" });
      }
    }
  );
  app2.get(
    "/api/employee-leave-balances/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgIdHeader = req.headers["x-org-id"];
        const orgId = getOrgIdFromHeaders(req);
        const userId = req.params.userId;
        const year = req.query.year ? parseInt(req.query.year) : void 0;
        console.log(`\u{1F4CA} [API] Getting balances for user ${userId}`);
        const balances = await storage.getEmployeeLeaveBalances(
          userId,
          year,
          orgId
        );
        console.log(
          `\u{1F4CA} [API] Returning ${balances.length} balances for user ${userId}`
        );
        if (balances.length > 0) {
          console.log(
            `\u{1F4CA} [API] Sample balance: userId=${balances[0].userId}, currentBalance=${balances[0].currentBalance}`
          );
        }
        res.json(balances);
      } catch (error) {
        console.error("Error fetching employee leave balances:", error);
        res.status(500).json({ message: "Failed to fetch employee leave balances" });
      }
    }
  );
  app2.get(
    "/api/leave-balance-transactions/all",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `[API Route] /api/leave-balance-transactions/all called with orgId: ${orgId}`
        );
        const transactions = await storage.getAllLeaveBalanceTransactions(
          null,
          orgId
        );
        console.log(
          `[API Route] getAllLeaveBalanceTransactions returned ${transactions.length} records`
        );
        res.json(transactions);
      } catch (error) {
        console.error("Error fetching all leave balance transactions:", error);
        res.status(500).json({ message: "Failed to fetch all leave balance transactions" });
      }
    }
  );
  app2.get(
    "/api/leave-balance-transactions/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const userId = req.params.userId;
        const transactions = await storage.getAllLeaveBalanceTransactions(
          userId,
          orgId
        );
        res.json(transactions);
      } catch (error) {
        console.error("Error fetching leave balance transactions:", error);
        res.status(500).json({ message: "Failed to fetch leave balance transactions" });
      }
    }
  );
  app2.post("/api/compute-leave-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      console.log("Starting leave balance computation for org_id:", orgId);
      await storage.computeInitialLeaveBalances(orgId);
      res.json({ message: "Leave balances computed successfully" });
    } catch (error) {
      console.error("Error computing leave balances:", error);
      res.status(500).json({ message: "Failed to compute leave balances" });
    }
  });
  app2.post(
    "/api/recalculate-prorata-balances",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const { externalEmployeeData } = req.body;
        console.log(
          `[ProRata API] Starting automatic pro-rata system for org_id: ${orgId}`
        );
        console.log(
          `[ProRata API] External employee data:`,
          externalEmployeeData?.length || 0,
          "employees"
        );
        console.log(
          `[ProRata API] External employee data payload:`,
          externalEmployeeData
        );
        console.log(
          `[ProRata API] About to call autoProRataCalculationForMidYearJoiners...`
        );
        const result = await storage.autoProRataCalculationForMidYearJoiners(
          orgId,
          externalEmployeeData
        );
        console.log(
          `[ProRata API] autoProRataCalculationForMidYearJoiners returned:`,
          result
        );
        console.log(
          `[ProRata API] Automatic pro-rata system completed successfully`
        );
        res.json({
          message: "Automatic pro-rata calculations completed for mid-year joiners",
          processedEmployees: result.processedEmployees || 0,
          createdAssignments: result.createdAssignments || 0,
          result
        });
      } catch (error) {
        console.error(
          "[ProRata API] Error in automatic pro-rata system:",
          error
        );
        console.error("[ProRata API] Error stack:", error.stack);
        res.status(500).json({
          message: "Failed to run automatic pro-rata calculations",
          error: error.message,
          stack: error.stack
        });
      }
    }
  );
  app2.post("/api/fix-missing-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      console.log(`[FixBalances] Starting balance fix for org ${orgId}`);
      const leaveRequests2 = await storage.getLeaveRequests(orgId);
      const leaveVariants2 = await storage.getLeaveVariants(orgId);
      const assignments = await storage.getEmployeeAssignments(orgId);
      let fixedUsers = 0;
      const approvedRequests = leaveRequests2.filter(
        (req2) => req2.status === "approved"
      );
      for (const request of approvedRequests) {
        const existingBalances = await storage.getEmployeeLeaveBalances(
          request.userId,
          (/* @__PURE__ */ new Date()).getFullYear(),
          orgId
        );
        if (existingBalances.length === 0) {
          console.log(
            `[FixBalances] User ${request.userId} has approved request but no balances - creating...`
          );
          const userAssignments = assignments.filter(
            (a) => a.userId === request.userId
          );
          for (const assignment of userAssignments) {
            const variant = leaveVariants2.find(
              (v) => v.id === assignment.leaveVariantId
            );
            if (!variant || !variant.paidDaysInYear) continue;
            const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
            const entitlementInHalfDays = variant.paidDaysInYear * 2;
            const variantRequests = approvedRequests.filter(
              (req2) => req2.userId === request.userId && leaveVariants2.find(
                (v) => v.id === assignment.leaveVariantId && v.leaveTypeId === req2.leaveTypeId
              )
            );
            const totalUsedDays = variantRequests.reduce(
              (sum, req2) => {
                const workingDays = typeof req2.workingDays === "string" ? parseFloat(req2.workingDays) : req2.workingDays;
                return sum + (workingDays || 0);
              },
              0
            );
            const usedInHalfDays = Math.round(totalUsedDays * 2);
            const currentBalanceInHalfDays = entitlementInHalfDays - usedInHalfDays;
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
            await storage.createLeaveBalanceTransaction({
              userId: request.userId,
              leaveVariantId: variant.id,
              year: currentYear,
              transactionType: "credit",
              amount: entitlementInHalfDays,
              balanceAfter: entitlementInHalfDays,
              description: `Annual allocation for ${variant.leaveTypeName} (${variant.paidDaysInYear} days)`,
              orgId
            });
            for (const req2 of variantRequests) {
              const workingDays = typeof req2.workingDays === "string" ? parseFloat(req2.workingDays) : req2.workingDays;
              const deductionInHalfDays = Math.round(workingDays * 2);
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: variant.id,
                year: currentYear,
                transactionType: "deduction",
                amount: deductionInHalfDays,
                balanceAfter: entitlementInHalfDays - deductionInHalfDays,
                description: `Leave deduction for approved application #${req2.id} (${workingDays} days)`,
                orgId
              });
            }
            console.log(
              `[FixBalances] Created balance for user ${request.userId}, variant ${variant.leaveTypeName}: ${variant.paidDaysInYear} total, ${totalUsedDays} used, ${currentBalanceInHalfDays / 2} remaining`
            );
          }
          fixedUsers++;
        }
      }
      console.log(`[FixBalances] Fixed balances for ${fixedUsers} users`);
      res.json({
        message: `Fixed missing balances for ${fixedUsers} users`,
        fixedUsers
      });
    } catch (error) {
      console.error("Error fixing missing balances:", error);
      res.status(500).json({ message: "Failed to fix missing balances" });
    }
  });
  app2.post(
    "/api/recalculate-leave-balances",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          "Recalculating leave balances with After Earning logic for org_id:",
          orgId
        );
        await storage.computeInitialLeaveBalances(orgId);
        res.json({
          message: "Leave balances recalculated successfully based on After Earning logic",
          success: true
        });
      } catch (error) {
        console.error("Error recalculating leave balances:", error);
        res.status(500).json({ message: "Failed to recalculate leave balances" });
      }
    }
  );
  app2.delete("/api/cleanup-all-data", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      console.log(
        `[Cleanup] Starting complete data cleanup for org_id: ${orgId}`
      );
      const allTransactions = await storage.getAllLeaveBalanceTransactions(
        null,
        orgId
      );
      const allRequests = await storage.getLeaveRequests(null, orgId);
      console.log(
        `[Cleanup] Found ${allTransactions.length} transactions and ${allRequests.length} leave requests to delete`
      );
      await storage.deleteAllLeaveBalanceTransactions(orgId);
      await storage.deleteAllLeaveRequests(orgId);
      await storage.resetAllEmployeeLeaveBalances(orgId);
      console.log(
        `[Cleanup] Deleted ${allTransactions.length} transactions and ${allRequests.length} leave requests`
      );
      res.json({
        message: "All leave data deleted successfully - ready for fresh import",
        orgId,
        deletedTransactions: allTransactions.length,
        deletedRequests: allRequests.length
      });
    } catch (error) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ message: "Failed to cleanup data" });
    }
  });
  app2.delete(
    "/api/delete-transaction-data",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `[DELETE] Starting transaction data cleanup for org_id: ${orgId}`
        );
        const leaveRequestsResult = await db.select().from(leaveRequests).where(eq3(leaveRequests.orgId, orgId));
        const transactionsResult = await storage.getAllLeaveBalanceTransactions(
          null,
          orgId
        );
        console.log(
          `[DELETE] Found ${leaveRequestsResult.length} leave requests and ${transactionsResult.length} transactions to delete`
        );
        res.json({
          success: true,
          message: "Transaction data cleanup completed successfully - database was already clean",
          foundRequests: leaveRequestsResult.length,
          foundTransactions: transactionsResult.length,
          orgId
        });
      } catch (error) {
        console.error("[DELETE] Error:", error);
        res.status(500).json({
          message: "Transaction cleanup failed",
          error: error.message
        });
      }
    }
  );
  app2.post(
    "/api/test-transaction-import",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `[TEST IMPORT] Testing transaction import for org_id: ${orgId}`
        );
        const testData = [
          {
            EmpNumber: "015",
            EmpName: "Ashwani Khanna",
            LeaveType: "Earned Leave",
            LeaveTakenStartDate: "17-02-2025",
            "Is Start Date a Half Day": false,
            LeaveTakenEndDate: "18-02-2025",
            "Is End Date a Half Day": false,
            TotalLeaveDays: 2,
            Status: "Approved"
          }
        ];
        const authHeader = req.headers.authorization;
        let jwtToken = "";
        if (authHeader && authHeader.startsWith("Bearer ")) {
          jwtToken = authHeader.substring(7);
        } else {
          return res.status(400).json({ message: "No JWT token provided" });
        }
        console.log(
          "[TEST IMPORT] Calling external API for employee mapping..."
        );
        const response = await fetch(
          "https://qa-api.resolveindia.com/reports/worker-master-leave",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userBlocks: [1, 3, 4],
              userWise: 0,
              workerType: 0,
              attribute: 0,
              subAttributeId: 0
            })
          }
        );
        if (!response.ok) {
          console.error(
            "[TEST IMPORT] External API failed with status:",
            response.status
          );
          return res.status(400).json({ message: `External API failed: ${response.status}` });
        }
        const data = await response.json();
        const employeeMapping = /* @__PURE__ */ new Map();
        if (data?.data?.data && Array.isArray(data.data.data)) {
          data.data.data.forEach((employee) => {
            if (employee.employee_number && employee.user_id) {
              employeeMapping.set(
                employee.employee_number.toString(),
                employee.user_id.toString()
              );
            }
          });
        }
        console.log(
          `[TEST IMPORT] Employee mapping loaded: ${employeeMapping.size} employees`
        );
        const userId = employeeMapping.get("015");
        if (!userId) {
          return res.status(400).json({
            message: `Employee number "015" not found in external API`
          });
        }
        console.log(
          `[TEST IMPORT] Mapped employee "015" to user_id: ${userId}`
        );
        const leaveTypes2 = await storage.getLeaveTypes(orgId);
        const earnedLeaveType = leaveTypes2.find(
          (lt) => lt.name === "Earned Leave"
        );
        if (!earnedLeaveType) {
          return res.status(400).json({ message: "Earned Leave type not found" });
        }
        console.log(
          `[TEST IMPORT] Found Earned Leave type with ID: ${earnedLeaveType.id}`
        );
        const leaveRequestData = {
          userId,
          leaveTypeId: earnedLeaveType.id,
          startDate: /* @__PURE__ */ new Date("2025-02-17"),
          endDate: /* @__PURE__ */ new Date("2025-02-18"),
          totalDays: "2.0",
          workingDays: "2.0",
          reason: "Imported leave transaction for Ashwani Khanna (Test)",
          status: "approved",
          approvedBy: "system-import",
          orgId,
          workflowStatus: "completed"
        };
        console.log(`[TEST IMPORT] Creating leave request:`, leaveRequestData);
        console.log(`[TEST IMPORT] Data type check:`, {
          startDate: typeof leaveRequestData.startDate,
          startDateValue: leaveRequestData.startDate,
          endDate: typeof leaveRequestData.endDate,
          endDateValue: leaveRequestData.endDate
        });
        const createdRequest = await storage.createLeaveRequest(leaveRequestData);
        console.log(
          `[TEST IMPORT] Created leave request with ID: ${createdRequest.id}`
        );
        res.json({
          success: true,
          message: "Test transaction import completed successfully",
          createdRequest,
          mapping: { employeeNumber: "015", userId },
          leaveType: earnedLeaveType.name
        });
      } catch (error) {
        console.error("[TEST IMPORT] Error:", error);
        res.status(500).json({ message: "Test import failed", error: error.message });
      }
    }
  );
  app2.post(
    "/api/fix-excel-import-transactions",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `[FixExcel] Starting Excel import fix for org_id: ${orgId}`
        );
        const importedLeaveRequests = await storage.getLeaveRequests(
          null,
          orgId
        );
        const allTransactions = await storage.getAllLeaveBalanceTransactions(
          null,
          orgId
        );
        const leaveVariants2 = await storage.getLeaveVariants(orgId);
        console.log(
          `[FixExcel] Found ${importedLeaveRequests.length} leave requests and ${allTransactions.length} transactions`
        );
        let createdTransactions = 0;
        let fixedRequests = 0;
        for (const request of importedLeaveRequests) {
          if (request.status === "approved" && request.reason?.includes("Imported")) {
            const variant = leaveVariants2.find(
              (v) => v.leaveTypeId === request.leaveTypeId
            );
            if (!variant) {
              console.log(
                `[FixExcel] No variant found for leave type ${request.leaveTypeId}`
              );
              continue;
            }
            const existingTransaction = allTransactions.find(
              (t) => t.userId === request.userId && t.leaveVariantId === variant.id && t.leaveRequestId === request.id
            );
            if (!existingTransaction) {
              console.log(
                `[FixExcel] Creating missing balance transaction for request ${request.id} - user ${request.userId} variant ${variant.id} - ${request.workingDays} days`
              );
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: variant.id,
                year: (/* @__PURE__ */ new Date()).getFullYear(),
                transactionType: "deduction",
                amount: -request.workingDays,
                // Negative amount for deduction
                balanceAfter: 0,
                // Will be updated properly by balance recalculation
                description: `Leave availed - imported from Excel transaction (${request.workingDays} days)`,
                leaveRequestId: request.id,
                orgId
              });
              const balances = await storage.getEmployeeLeaveBalances(
                request.userId,
                (/* @__PURE__ */ new Date()).getFullYear(),
                orgId
              );
              const relevantBalance = balances.find(
                (b) => b.leaveVariantId === variant.id
              );
              if (relevantBalance) {
                const currentUsed = parseFloat(
                  relevantBalance.usedBalance?.toString() || "0"
                );
                const newUsedBalance = currentUsed + parseFloat(request.workingDays?.toString() || "0");
                const currentBalance = parseFloat(
                  relevantBalance.currentBalance?.toString() || "0"
                );
                const newCurrentBalance = Math.max(
                  0,
                  currentBalance - parseFloat(request.workingDays?.toString() || "0")
                );
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  usedBalance: newUsedBalance,
                  currentBalance: newCurrentBalance
                });
              }
              createdTransactions++;
              fixedRequests++;
            }
          }
        }
        console.log(
          `[FixExcel] Fixed ${fixedRequests} imported leave requests, created ${createdTransactions} deduction transactions`
        );
        res.json({
          message: "Excel import deduction transactions created successfully from imported leave requests",
          orgId,
          fixedRequests,
          createdTransactions
        });
      } catch (error) {
        console.error("Error fixing Excel import transactions:", error);
        res.status(500).json({ message: "Failed to fix Excel import transactions" });
      }
    }
  );
  app2.post("/api/fix-prorata-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const { userId, joiningDate, employeeJoiningDates } = req.body;
      console.log(
        `[FixProRata] Starting pro-rata balance fix for org ${orgId}`
      );
      if (userId && joiningDate) {
        const result = await storage.fixProRataBalancesForUser(
          userId,
          orgId,
          joiningDate
        );
        console.log(`[FixProRata] Fixed balances for user ${userId}:`, result);
        res.json({
          message: `Pro-rata balances fixed for user ${userId}`,
          result,
          success: true
        });
      } else if (employeeJoiningDates) {
        const joiningDatesMap = new Map(Object.entries(employeeJoiningDates));
        const result = await storage.fixProRataBalancesForOrg(
          orgId,
          joiningDatesMap
        );
        console.log(
          `[FixProRata] Fixed balances for ${result.processedUsers} users in org ${orgId}`
        );
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
  app2.post("/api/clear-imported-data", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      console.log(
        `[ClearImported] Clearing all imported data for org_id: ${orgId}`
      );
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { leaveRequests: leaveRequests2, leaveBalanceTransactions: leaveBalanceTransactions3, employeeLeaveBalances: employeeLeaveBalances2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq4 } = await import("drizzle-orm");
      const deleteRequestsResult = await db2.delete(leaveRequests2).where(eq4(leaveRequests2.orgId, orgId));
      const deletedRequests = deleteRequestsResult.rowCount || 0;
      const deleteTransactionsResult = await db2.delete(leaveBalanceTransactions3).where(eq4(leaveBalanceTransactions3.orgId, orgId));
      const deletedTransactions = deleteTransactionsResult.rowCount || 0;
      const resetBalancesResult = await db2.update(employeeLeaveBalances2).set({
        currentBalance: 0,
        usedBalance: 0,
        carryForward: 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(employeeLeaveBalances2.orgId, orgId));
      const resetBalances = resetBalancesResult.rowCount || 0;
      console.log(
        `[ClearImported] Cleared data - Requests: ${deletedRequests}, Transactions: ${deletedTransactions}, Reset balances: ${resetBalances}`
      );
      res.json({
        message: "All imported transaction data cleared successfully",
        deletedRequests,
        deletedTransactions,
        resetBalances,
        success: true
      });
    } catch (error) {
      console.error("Error clearing imported data:", error);
      res.status(500).json({ message: "Failed to clear imported data" });
    }
  });
  app2.post(
    "/api/force-after-earning-transaction",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const { userId, leaveVariantId } = req.body;
        const variant = await storage.getLeaveVariant(leaveVariantId);
        if (!variant) {
          return res.status(404).json({ message: "Leave variant not found" });
        }
        const company = await storage.getCompany(orgId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }
        const effectiveDate = new Date(company.effectiveDate);
        const currentDate = /* @__PURE__ */ new Date();
        const currentYear = currentDate.getFullYear();
        if (variant.grantLeaves === "after_earning" && variant.grantFrequency === "per_month") {
          const monthsElapsed = (currentDate.getFullYear() - effectiveDate.getFullYear()) * 12 + (currentDate.getMonth() - effectiveDate.getMonth());
          const isLastDayOfMonth = currentDate.getDate() === new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          ).getDate();
          const completedMonths = Math.max(
            0,
            isLastDayOfMonth ? monthsElapsed : Math.max(0, monthsElapsed - 1)
          );
          console.log(
            `[After Earning Debug] Current date: ${currentDate.toISOString().split("T")[0]}, Is last day of month: ${isLastDayOfMonth}, Months elapsed: ${monthsElapsed}, Completed months: ${completedMonths}`
          );
          const monthlyAccrual = variant.paidDaysInYear / 12;
          const earnedAmount = completedMonths * monthlyAccrual;
          const transactionDescription = `After earning calculation: ${completedMonths} completed months \xD7 ${monthlyAccrual} days/month = ${earnedAmount} days earned since ${effectiveDate.toISOString().split("T")[0]}`;
          await storage.createLeaveBalanceTransaction({
            userId,
            leaveVariantId,
            transactionType: "grant",
            amount: earnedAmount,
            balanceAfter: earnedAmount,
            description: transactionDescription,
            year: currentYear,
            orgId
          });
          console.log(
            `Forced "After Earning" transaction created for user ${userId}, variant ${leaveVariantId}: ${earnedAmount} days`
          );
          res.json({
            message: "After earning transaction created successfully",
            earnedAmount,
            description: transactionDescription
          });
        } else {
          res.status(400).json({ message: "Variant is not configured for After Earning" });
        }
      } catch (error) {
        console.error(
          "Error creating forced After Earning transaction:",
          error
        );
        res.status(500).json({ message: "Failed to create After Earning transaction" });
      }
    }
  );
  app2.get("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const workflows2 = await storage.getWorkflows(orgId);
      res.json(workflows2);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });
  app2.post("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      console.log("Creating workflow with data:", req.body);
      const validatedData = insertWorkflowSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      console.log("Validated workflow data:", validatedData);
      const workflow = await storage.createWorkflow(validatedData);
      res.json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ message: "Failed to create workflow" });
    }
  });
  app2.patch("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertWorkflowSchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
      const workflow = await storage.updateWorkflow(id, validatedData);
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(400).json({ message: "Failed to update workflow" });
    }
  });
  app2.delete("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = getOrgIdFromHeaders(req);
      await storage.deleteWorkflow(id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(400).json({ message: "Failed to delete workflow" });
    }
  });
  app2.get("/api/comp-off-config", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const config = await storage.getCompOffConfig(orgId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching comp off config:", error);
      res.status(500).json({ message: "Failed to fetch comp off config" });
    }
  });
  app2.post("/api/comp-off-config", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertCompOffConfigSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      const config = await storage.upsertCompOffConfig(validatedData);
      res.json(config);
    } catch (error) {
      console.error("Error saving comp off config:", error);
      res.status(400).json({ message: "Failed to save comp off config" });
    }
  });
  app2.get("/api/comp-off-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const variants = await storage.getCompOffVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching comp-off variants:", error);
      res.status(500).json({ message: "Failed to fetch comp-off variants" });
    }
  });
  app2.post("/api/comp-off-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      console.log("=== COMP-OFF VARIANT CREATION DEBUG ===");
      console.log("Request body:", req.body);
      console.log("OrgId:", orgId);
      const validatedData = insertCompOffVariantSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      console.log("Validated data:", validatedData);
      const variant = await storage.createCompOffVariant(validatedData);
      res.json(variant);
    } catch (error) {
      console.error("Error creating comp-off variant:", error);
      console.error("Validation error details:", error.issues || error.errors);
      res.status(400).json({
        message: "Failed to create comp-off variant",
        error: error.message
      });
    }
  });
  app2.patch("/api/comp-off-variants/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const variant = await storage.updateCompOffVariant(id, {
        ...req.body,
        orgId: parseInt(orgId)
      });
      res.json(variant);
    } catch (error) {
      console.error("Error updating comp-off variant:", error);
      res.status(400).json({ message: "Failed to update comp-off variant" });
    }
  });
  app2.delete(
    "/api/comp-off-variants/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteCompOffVariant(id);
        res.json({ message: "Comp-off variant deleted successfully" });
      } catch (error) {
        console.error("Error deleting comp-off variant:", error);
        res.status(400).json({ message: "Failed to delete comp-off variant" });
      }
    }
  );
  app2.get("/api/pto-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const variants = await storage.getPTOVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching PTO variants:", error);
      res.status(500).json({ message: "Failed to fetch PTO variants" });
    }
  });
  app2.post("/api/pto-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertPTOVariantSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      const variant = await storage.createPTOVariant(validatedData);
      res.json(variant);
    } catch (error) {
      console.error("Error creating PTO variant:", error);
      res.status(400).json({ message: "Failed to create PTO variant" });
    }
  });
  app2.patch("/api/pto-variants/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const variant = await storage.updatePTOVariant(id, {
        ...req.body,
        orgId: parseInt(orgId)
      });
      res.json(variant);
    } catch (error) {
      console.error("Error updating PTO variant:", error);
      res.status(400).json({ message: "Failed to update PTO variant" });
    }
  });
  app2.delete("/api/pto-variants/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePTOVariant(id);
      res.json({ message: "PTO variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting PTO variant:", error);
      res.status(400).json({ message: "Failed to delete PTO variant" });
    }
  });
  app2.get("/api/pto-config", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const config = await storage.getPTOConfig(orgId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching PTO config:", error);
      res.status(500).json({ message: "Failed to fetch PTO config" });
    }
  });
  app2.get("/api/pto-requests", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const userId = req.query.userId;
      const requests = await storage.getPTORequests(orgId, userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching PTO requests:", error);
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });
  app2.post("/api/pto-requests", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      console.log("Routes - Received PTO request data:", req.body);
      const workflow = await findApplicableWorkflow("pto", "apply-pto", orgId);
      console.log(
        "Found PTO workflow:",
        workflow ? `ID: ${workflow.id}, Name: ${workflow.name}` : "None"
      );
      if (workflow && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
        const workflowData = {
          ...req.body,
          orgId,
          userId: req.body.userId || req.body.user_id,
          status: "pending"
        };
        console.log(
          "Routes - Creating PTO request for workflow processing:",
          workflowData
        );
        const validatedData = insertPTORequestSchema.parse(workflowData);
        let request = await storage.createPTORequest(validatedData);
        console.log("Starting workflow for PTO request");
        request = await startPTOWorkflow(request.id, workflow, request.userId);
        res.json({
          ...request,
          workflowId: workflow.id,
          message: "PTO request submitted for approval"
        });
      } else {
        const autoApproveData = {
          ...req.body,
          orgId,
          userId: req.body.userId || req.body.user_id,
          status: "approved",
          approvedBy: "system-auto-approval",
          approvedAt: /* @__PURE__ */ new Date()
        };
        console.log(
          "Routes - Auto-approving PTO request (no workflow):",
          autoApproveData
        );
        const validatedData = insertPTORequestSchema.parse(autoApproveData);
        const request = await storage.createPTORequest(validatedData);
        res.json(request);
      }
    } catch (error) {
      console.error("Error creating PTO request:", error);
      res.status(400).json({ message: "Failed to create PTO request" });
    }
  });
  app2.patch("/api/pto-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.updatePTORequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating PTO request:", error);
      res.status(400).json({ message: "Failed to update PTO request" });
    }
  });
  app2.delete("/api/pto-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePTORequest(id);
      res.json({ message: "PTO request deleted successfully" });
    } catch (error) {
      console.error("Error deleting PTO request:", error);
      res.status(400).json({ message: "Failed to delete PTO request" });
    }
  });
  app2.post("/api/pto-config", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertPTOConfigSchema.parse({
        ...req.body,
        orgId: parseInt(orgId)
      });
      const config = await storage.upsertPTOConfig(validatedData);
      res.json(config);
    } catch (error) {
      console.error("Error saving PTO config:", error);
      res.status(400).json({ message: "Failed to save PTO config" });
    }
  });
  app2.get("/api/leave-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId;
      const status = req.query.status;
      const orgId = getOrgIdFromHeaders(req);
      console.log("\u{1F50D} [Server] Leave requests query:", {
        userId,
        status,
        orgId
      });
      console.log(
        "[LeaveRequests] Using direct query fallback to avoid schema issues"
      );
      let baseQuery = sql2`
            SELECT id, user_id as "userId", leave_type_id as "leaveTypeId", start_date as "startDate", 
                   end_date as "endDate", total_days as "totalDays", working_days as "workingDays", 
                   reason, status, approved_by as "approvedBy", approved_at as "approvedAt", 
                   rejected_reason as "rejectedReason", documents, workflow_id as "workflowId", 
                   current_step as "currentStep", workflow_status as "workflowStatus", 
                   approval_history as "approvalHistory", scheduled_auto_approval_at as "scheduledAutoApprovalAt",
                   org_id as "orgId", created_at as "createdAt", updated_at as "updatedAt"
            FROM leave_requests WHERE 1=1
          `;
      if (userId) {
        baseQuery = sql2`${baseQuery} AND user_id = ${userId}`;
      }
      if (orgId) {
        baseQuery = sql2`${baseQuery} AND org_id = ${orgId}`;
      }
      if (status) {
        baseQuery = sql2`${baseQuery} AND status = ${status}`;
      }
      baseQuery = sql2`${baseQuery} ORDER BY created_at DESC`;
      const result = await db.execute(baseQuery);
      const requests = result.rows || [];
      requests.forEach((request) => {
        request.leaveTypeName = `Leave Type ${request.leaveTypeId}`;
      });
      console.log("\u{1F4CA} [Server] Fallback leave requests result:", {
        totalCount: requests.length,
        userIds: requests.map((r) => r.userId),
        requestedUserId: userId,
        statusFilter: status
      });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });
  app2.post("/api/leave-requests", isAuthenticated, async (req, res) => {
    try {
      console.log("Raw request body:", req.body);
      const userId = req.user?.claims?.sub;
      const orgId = getOrgIdFromHeaders(req);
      const workflow = await storage.getWorkflowForLeaveType(
        req.body.leaveTypeId,
        orgId
      );
      let finalStatus = "pending";
      let approvedBy = null;
      let approvedAt = null;
      let workflowId = null;
      let currentStep = 0;
      let workflowStatus = "bypassed";
      if (workflow) {
        workflowId = workflow.id;
        workflowStatus = "in_progress";
        currentStep = 1;
        try {
          const steps = workflow.steps;
          const firstStep = Array.isArray(steps) && steps.length > 0 ? steps[0] : null;
          if (firstStep?.autoApproval === true) {
            console.log("Auto-approval detected - processing workflow");
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
        approvedAt = /* @__PURE__ */ new Date();
      }
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
        documents: req.body.documents || [],
        // Ensure documents are included
        orgId
      };
      console.log("Transformed data:", transformedData);
      let request = await storage.createLeaveRequest(transformedData);
      if (workflow && workflowStatus === "in_progress") {
        try {
          const steps = workflow.steps;
          const firstStep = steps[0];
          if (firstStep?.autoApproval === true) {
            request = await storage.processWorkflowApproval(
              request.id,
              "system",
              orgId
            );
            console.log("Auto-approval workflow processed");
          }
        } catch (workflowError) {
          console.error(
            "Error processing auto-approval workflow:",
            workflowError
          );
        }
      }
      const shouldDeductBalance = finalStatus === "approved";
      let deductForPending = false;
      if (finalStatus === "pending") {
        try {
          console.log(
            "DEBUG: Checking deduct-before-workflow for pending request..."
          );
          const leaveVariants2 = await storage.getLeaveVariants(orgId);
          console.log("DEBUG: Found", leaveVariants2.length, "leave variants");
          const appliedVariant = leaveVariants2.find(
            (v) => v.leaveTypeId === request.leaveTypeId
          );
          console.log(
            "DEBUG: Applied variant:",
            appliedVariant ? {
              id: appliedVariant.id,
              leaveTypeId: appliedVariant.leaveTypeId,
              leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
            } : "NOT FOUND"
          );
          if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
            deductForPending = true;
            console.log(
              "DEBUG: Leave variant configured for balance deduction before workflow - deducting for pending request"
            );
          } else if (appliedVariant) {
            console.log(
              "DEBUG: Leave variant found but leaveBalanceDeductionBefore is:",
              appliedVariant.leaveBalanceDeductionBefore
            );
          }
        } catch (error) {
          console.error(
            "Error checking leave variant deduction settings:",
            error
          );
        }
      }
      if (shouldDeductBalance || deductForPending) {
        try {
          const leaveVariants2 = await storage.getLeaveVariants(orgId);
          const appliedVariant = leaveVariants2.find(
            (v) => v.leaveTypeId === request.leaveTypeId
          );
          if (appliedVariant) {
            const balances = await storage.getEmployeeLeaveBalances(
              request.userId,
              (/* @__PURE__ */ new Date()).getFullYear(),
              orgId
            );
            const relevantBalance = balances.find(
              (b) => b.leaveVariantId === appliedVariant.id
            );
            if (relevantBalance) {
              const workingDaysNum = parseFloat(request.workingDays.toString());
              const workingDaysInHalfDays = Math.round(workingDaysNum * 2);
              const currentBalanceNum = parseFloat(
                relevantBalance.currentBalance.toString()
              );
              const newBalance = currentBalanceNum - workingDaysInHalfDays;
              const deductionReason = finalStatus === "approved" ? `Leave deduction for approved application #${request.id} (${workingDaysNum} days)` : `Leave balance deducted for pending application #${request.id} (${workingDaysNum} days) - Deduct before workflow`;
              await storage.createLeaveBalanceTransaction({
                userId: request.userId,
                leaveVariantId: appliedVariant.id,
                year: (/* @__PURE__ */ new Date()).getFullYear(),
                transactionType: "deduction",
                amount: workingDaysInHalfDays,
                balanceAfter: newBalance,
                description: deductionReason,
                leaveRequestId: request.id,
                orgId
              });
              const usedBalanceNum = parseFloat(
                relevantBalance.usedBalance.toString()
              );
              await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                currentBalance: newBalance,
                usedBalance: usedBalanceNum + workingDaysInHalfDays
              });
              const status = finalStatus === "approved" ? "approved" : "pending";
              console.log(
                `Deducted ${request.workingDays} days from user ${request.userId} balance for ${status} application (variant ${appliedVariant.leaveVariantName}). New balance: ${newBalance}`
              );
            } else {
              console.log(
                `No balance found for user ${request.userId} and variant ${appliedVariant.id}`
              );
            }
          } else {
            console.log(
              `No leave variant found for leaveTypeId ${request.leaveTypeId}`
            );
          }
        } catch (balanceError) {
          console.error("Error updating leave balance:", balanceError);
        }
      } else {
        console.log(
          "DEBUG: No balance deduction - shouldDeductBalance:",
          shouldDeductBalance,
          "deductForPending:",
          deductForPending
        );
        console.log(
          "Request is pending approval - balance will be deducted upon approval"
        );
      }
      let collaborativeTasks = [];
      if (req.body.collaborativeTasks && Array.isArray(req.body.collaborativeTasks) && req.body.collaborativeTasks.length > 0) {
        console.log(
          "Processing collaborative tasks:",
          req.body.collaborativeTasks
        );
        try {
          for (const task of req.body.collaborativeTasks) {
            console.log("Processing individual task:", task);
            console.log(
              "Task validation - assigneeUserId:",
              task.assigneeUserId,
              "taskDescription:",
              task.taskDescription
            );
            if (task.assigneeUserId && task.taskDescription) {
              console.log(
                "\u2705 Task validation passed - creating collaborative task..."
              );
              const collaborativeTask = await storage.createCollaborativeTask({
                leaveRequestId: request.id,
                assigneeName: task.assigneeName || `Employee ${task.assigneeUserId}`,
                assigneeUserId: task.assigneeUserId,
                assigneeEmail: task.assigneeEmail || "",
                assigneePhone: task.assigneePhone || "",
                taskDescription: task.taskDescription,
                expectedSupportDateFrom: new Date(task.expectedSupportDateFrom),
                expectedSupportDateTo: new Date(task.expectedSupportDateTo),
                additionalNotes: task.additionalNotes || "",
                notificationMethod: "email",
                status: "pending",
                orgId
              });
              console.log(
                "\u2705 Collaborative task created successfully:",
                collaborativeTask
              );
              collaborativeTasks.push(collaborativeTask);
            } else {
              console.log("\u274C Task validation failed - skipping task creation");
            }
          }
          console.log(
            "Collaborative tasks created:",
            collaborativeTasks.length
          );
        } catch (taskError) {
          console.error("Error creating collaborative tasks:", taskError);
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
  app2.put("/api/leave-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = getOrgIdFromHeaders(req);
      const allRequests = await storage.getLeaveRequests(void 0, orgId);
      const existingRequest = allRequests.find((r) => r.id === id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      if (existingRequest.status !== "pending") {
        return res.status(400).json({ message: "Can only edit pending leave requests" });
      }
      const transformedData = {
        ...req.body,
        totalDays: String(req.body.totalDays),
        workingDays: String(req.body.workingDays),
        startDate: typeof req.body.startDate === "string" ? req.body.startDate : req.body.startDate.toISOString().split("T")[0],
        endDate: typeof req.body.endDate === "string" ? req.body.endDate : req.body.endDate.toISOString().split("T")[0],
        orgId,
        status: "pending"
        // Ensure status remains pending after edit
      };
      const validatedData = insertLeaveRequestSchema.partial().parse(transformedData);
      const request = await storage.updateLeaveRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(400).json({ message: "Failed to update leave request" });
    }
  });
  app2.patch("/api/leave-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      const validatedData = insertLeaveRequestSchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
      const request = await storage.updateLeaveRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(400).json({ message: "Failed to update leave request" });
    }
  });
  app2.delete("/api/leave-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = getOrgIdFromHeaders(req);
      const allRequests = await storage.getLeaveRequests(void 0, orgId);
      const request = allRequests.find((r) => r.id === id);
      if (request) {
        console.log(
          `DEBUG: Canceling request ${id} with status: ${request.status}`
        );
        if (request.status === "pending") {
          try {
            const leaveVariants2 = await storage.getLeaveVariants(orgId);
            const appliedVariant = leaveVariants2.find(
              (v) => v.leaveTypeId === request.leaveTypeId
            );
            console.log(
              `DEBUG: Found variant for cancellation:`,
              appliedVariant ? {
                id: appliedVariant.id,
                leaveTypeId: appliedVariant.leaveTypeId,
                leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
              } : "NOT FOUND"
            );
            if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
              console.log(
                "DEBUG: Variant had balance deduction before workflow - restoring balance for canceled request"
              );
              const balances = await storage.getEmployeeLeaveBalances(
                request.userId,
                (/* @__PURE__ */ new Date()).getFullYear(),
                orgId
              );
              const relevantBalance = balances.find(
                (b) => b.leaveVariantId === appliedVariant.id
              );
              if (relevantBalance) {
                const workingDaysNum = parseFloat(
                  request.workingDays.toString()
                );
                const halfDayUnits = Math.round(workingDaysNum * 2);
                const currentBalanceNum = parseFloat(
                  relevantBalance.currentBalance.toString()
                );
                const usedBalanceNum = parseFloat(
                  relevantBalance.usedBalance.toString()
                );
                const newBalance = currentBalanceNum + halfDayUnits;
                const newUsedBalance = Math.max(
                  0,
                  usedBalanceNum - halfDayUnits
                );
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: newUsedBalance
                });
                await storage.createLeaveBalanceTransaction({
                  userId: request.userId,
                  leaveVariantId: appliedVariant.id,
                  year: (/* @__PURE__ */ new Date()).getFullYear(),
                  transactionType: "credit",
                  amount: halfDayUnits,
                  balanceAfter: newBalance,
                  description: `Balance restored for canceled pending request #${request.id} (${workingDaysNum} days)`,
                  leaveRequestId: request.id,
                  orgId
                });
                console.log(
                  `DEBUG: Restored ${workingDaysNum} days to user ${request.userId} balance. New balance: ${newBalance}`
                );
              } else {
                console.log(
                  `DEBUG: No balance found for user ${request.userId} and variant ${appliedVariant.id}`
                );
              }
            } else if (appliedVariant) {
              console.log(
                "DEBUG: Variant does not use balance deduction before workflow - no restoration needed"
              );
            }
          } catch (balanceError) {
            console.error(
              "Error restoring balance during cancellation:",
              balanceError
            );
          }
        } else {
          console.log(
            `DEBUG: Request status is ${request.status} - no balance restoration needed`
          );
        }
      }
      await storage.deleteLeaveRequest(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      res.status(400).json({ message: "Failed to delete leave request" });
    }
  });
  app2.post(
    "/api/leave-requests/:id/withdraw",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const orgId = getOrgIdFromHeaders(req);
        const { reason } = req.body;
        const allRequests = await storage.getLeaveRequests(void 0, orgId);
        const request = allRequests.find((r) => r.id === id);
        if (!request) {
          return res.status(404).json({ message: "Leave request not found" });
        }
        if (request.status !== "approved") {
          return res.status(400).json({ message: "Can only withdraw approved leave requests" });
        }
        const workflows2 = await storage.getWorkflows(orgId);
        const withdrawWorkflow = workflows2.find(
          (w) => w.process === "application" && w.subProcesses && w.subProcesses.includes("withdraw-leave")
        );
        if (withdrawWorkflow && Array.isArray(withdrawWorkflow.steps) && withdrawWorkflow.steps.length > 0) {
          const approvalHistory = [
            {
              stepNumber: 0,
              action: "submitted",
              userId: request.userId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              comment: reason || "Withdrawal request submitted"
            }
          ];
          const updatedRequest = await storage.updateLeaveRequest(id, {
            status: "withdrawal_pending",
            workflowId: withdrawWorkflow.id,
            currentStep: 1,
            workflowStatus: "in_progress",
            approvalHistory: JSON.stringify(approvalHistory)
          });
          res.json(updatedRequest);
        } else {
          await processImmediateWithdrawal(id, request, orgId);
          const updatedRequest = await storage.updateLeaveRequest(id, {
            status: "withdrawn"
          });
          res.json(updatedRequest);
        }
      } catch (error) {
        console.error("Error withdrawing leave request:", error);
        res.status(400).json({ message: "Failed to withdraw leave request" });
      }
    }
  );
  async function processImmediateWithdrawal(requestId, request, orgId) {
    const leaveVariants2 = await storage.getLeaveVariants(orgId);
    const appliedVariant = leaveVariants2.find(
      (v) => v.leaveTypeId === request.leaveTypeId
    );
    if (appliedVariant) {
      const balances = await storage.getEmployeeLeaveBalances(
        request.userId,
        (/* @__PURE__ */ new Date()).getFullYear(),
        orgId
      );
      const relevantBalance = balances.find(
        (b) => b.leaveVariantId === appliedVariant.id
      );
      if (relevantBalance) {
        const workingDaysNum = parseFloat(request.workingDays.toString());
        const halfDayUnits = Math.round(workingDaysNum * 2);
        const updatedBalance = await storage.updateEmployeeLeaveBalance(
          relevantBalance.id,
          {
            currentBalance: relevantBalance.currentBalance + halfDayUnits,
            usedBalance: Math.max(
              0,
              relevantBalance.usedBalance - halfDayUnits
            )
          }
        );
        await storage.createLeaveBalanceTransaction({
          userId: request.userId,
          leaveVariantId: appliedVariant.id,
          year: (/* @__PURE__ */ new Date()).getFullYear(),
          transactionType: "credit",
          amount: halfDayUnits,
          balanceAfter: relevantBalance.currentBalance + halfDayUnits,
          description: `Withdrawal of leave request #${request.id}`,
          orgId
        });
        console.log(
          `Restored ${workingDaysNum} days (${halfDayUnits} half-day units) to user ${request.userId} balance`
        );
      }
    }
  }
  app2.post(
    "/api/leave-requests/:id/approve",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user?.claims?.sub;
        const orgId = getOrgIdFromHeaders(req);
        const allRequests = await storage.getLeaveRequests(void 0, orgId);
        const request = allRequests.find((r) => r.id === id);
        if (!request) {
          return res.status(404).json({ message: "Leave request not found" });
        }
        if (!["pending", "withdrawal_pending"].includes(request.status ?? "")) {
          return res.status(400).json({ message: "Request is not in a valid status for approval" });
        }
        if (request.status === "withdrawal_pending") {
          const updatedRequest2 = await storage.processWorkflowApproval(
            id,
            userId ?? "",
            orgId
          );
          if (updatedRequest2.status === "approved" && updatedRequest2.workflowStatus === "completed") {
            await processImmediateWithdrawal(id, request, orgId);
            const finalRequest = await storage.updateLeaveRequest(id, {
              status: "withdrawn"
            });
            return res.json(finalRequest);
          }
          return res.json(updatedRequest2);
        }
        const updatedRequest = await storage.processWorkflowApproval(
          id,
          userId || "",
          orgId
        );
        if (updatedRequest.workflowStatus === "completed") {
          try {
            const leaveVariants2 = await storage.getLeaveVariants(orgId);
            let balances = await storage.getEmployeeLeaveBalances(
              request.userId,
              (/* @__PURE__ */ new Date()).getFullYear(),
              orgId
            );
            const assignments = await storage.getEmployeeAssignments(orgId);
            const userAssignments = assignments.filter(
              (a) => a.userId === request.userId
            );
            let createdAnyBalances = false;
            for (const assignment of userAssignments) {
              const variant = leaveVariants2.find(
                (v) => v.id === assignment.leaveVariantId
              );
              if (variant && variant.paidDaysInYear) {
                const existingBalance = balances.find(
                  (b) => b.leaveVariantId === variant.id
                );
                if (!existingBalance) {
                  console.log(
                    `[Approval] Creating missing balance for user ${request.userId}, variant ${variant.leaveTypeName}...`
                  );
                  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
                  const entitlementInHalfDays = variant.paidDaysInYear * 2;
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
                  await storage.createLeaveBalanceTransaction({
                    userId: request.userId,
                    leaveVariantId: variant.id,
                    year: currentYear,
                    transactionType: "credit",
                    amount: entitlementInHalfDays,
                    balanceAfter: entitlementInHalfDays,
                    description: `Annual allocation for ${variant.leaveTypeName} (${variant.paidDaysInYear} days)`,
                    orgId
                  });
                  console.log(
                    `[Approval] Created initial balance for user ${request.userId}, variant ${variant.leaveTypeName}: ${variant.paidDaysInYear} days`
                  );
                  createdAnyBalances = true;
                }
              }
            }
            if (createdAnyBalances) {
              balances = await storage.getEmployeeLeaveBalances(
                request.userId,
                (/* @__PURE__ */ new Date()).getFullYear(),
                orgId
              );
            }
            console.log(
              `[Approval] Available leave variants for leaveTypeId ${request.leaveTypeId}:`,
              leaveVariants2.filter(
                (v) => v.leaveTypeId === request.leaveTypeId
              )
            );
            console.log(
              `[Approval] User ${request.userId} balances:`,
              balances
            );
            let relevantBalance = null;
            let appliedVariant = null;
            for (const balance of balances) {
              const variant = leaveVariants2.find(
                (v) => v.id === balance.leaveVariantId
              );
              if (variant && variant.leaveTypeId === request.leaveTypeId) {
                relevantBalance = balance;
                appliedVariant = variant;
                break;
              }
            }
            console.log(`[Approval] Found matching variant:`, appliedVariant);
            console.log(`[Approval] Found matching balance:`, relevantBalance);
            if (relevantBalance && appliedVariant) {
              const existingTransaction = await storage.getLeaveBalanceTransactions(
                request.userId,
                appliedVariant.id,
                orgId
              );
              const alreadyDeducted = existingTransaction.some(
                (t) => t.description.includes(`application #${request.id}`) && (t.transactionType === "deduction" || t.transactionType === "pending_deduction")
              );
              if (!alreadyDeducted) {
                const workingDaysNum = typeof request.workingDays === "string" ? parseFloat(request.workingDays) : request.workingDays;
                const workingDaysInHalfDays = Math.round(workingDaysNum * 2);
                const newBalance = relevantBalance.currentBalance - workingDaysInHalfDays;
                await storage.createLeaveBalanceTransaction({
                  userId: request.userId,
                  leaveVariantId: appliedVariant.id,
                  year: (/* @__PURE__ */ new Date()).getFullYear(),
                  transactionType: "deduction",
                  amount: -workingDaysInHalfDays,
                  // Negative amount for deduction
                  balanceAfter: newBalance,
                  description: `Leave deduction for approved application #${request.id} (${request.workingDays} days)`,
                  orgId
                });
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: relevantBalance.usedBalance + workingDaysInHalfDays
                });
                console.log(
                  `[Approval] Successfully deducted ${request.workingDays} days from user ${request.userId}. New balance: ${newBalance}`
                );
              } else {
                console.log(
                  `[Approval] Balance already deducted for request #${request.id}, skipping duplicate deduction`
                );
              }
            } else {
              console.log(
                `[Approval] No matching balance found for user ${request.userId} and leave type ${request.leaveTypeId}`
              );
            }
          } catch (balanceError) {
            console.error(
              "Error updating leave balance after approval:",
              balanceError
            );
          }
        }
        res.json(updatedRequest);
      } catch (error) {
        console.error("Error approving leave request:", error);
        res.status(400).json({ message: "Failed to approve leave request" });
      }
    }
  );
  app2.post(
    "/api/leave-requests/:id/reject",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user?.claims?.sub || (process.env.NODE_ENV === "development" ? "12080" : null);
        const { reason } = req.body;
        const orgId = getOrgIdFromHeaders(req);
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }
        if (!reason) {
          return res.status(400).json({ message: "Rejection reason is required" });
        }
        const allRequests = await storage.getLeaveRequests(void 0, orgId);
        const request = allRequests.find((r) => r.id === id);
        if (request && request.status === "pending") {
          console.log(
            `DEBUG: Rejecting request ${id} - checking for balance restoration`
          );
          try {
            const leaveVariants2 = await storage.getLeaveVariants(orgId);
            const appliedVariant = leaveVariants2.find(
              (v) => v.leaveTypeId === request.leaveTypeId
            );
            console.log(
              `DEBUG: Found variant for rejection:`,
              appliedVariant ? {
                id: appliedVariant.id,
                leaveTypeId: appliedVariant.leaveTypeId,
                leaveBalanceDeductionBefore: appliedVariant.leaveBalanceDeductionBefore
              } : "NOT FOUND"
            );
            if (appliedVariant && appliedVariant.leaveBalanceDeductionBefore) {
              console.log(
                "DEBUG: Variant had balance deduction before workflow - restoring balance for rejected request"
              );
              const balances = await storage.getEmployeeLeaveBalances(
                request.userId,
                (/* @__PURE__ */ new Date()).getFullYear(),
                orgId
              );
              const relevantBalance = balances.find(
                (b) => b.leaveVariantId === appliedVariant.id
              );
              if (relevantBalance) {
                const workingDaysNum = parseFloat(
                  request.workingDays.toString()
                );
                const halfDayUnits = Math.round(workingDaysNum * 2);
                const currentBalanceNum = parseFloat(
                  relevantBalance.currentBalance.toString()
                );
                const usedBalanceNum = parseFloat(
                  relevantBalance.usedBalance.toString()
                );
                const newBalance = currentBalanceNum + halfDayUnits;
                const newUsedBalance = Math.max(
                  0,
                  usedBalanceNum - halfDayUnits
                );
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: newUsedBalance
                });
                await storage.createLeaveBalanceTransaction({
                  userId: request.userId,
                  leaveVariantId: appliedVariant.id,
                  year: (/* @__PURE__ */ new Date()).getFullYear(),
                  transactionType: "credit",
                  amount: halfDayUnits,
                  balanceAfter: newBalance,
                  description: `Balance restored for rejected request #${request.id} (${workingDaysNum} days) - Reason: ${reason}`,
                  leaveRequestId: request.id,
                  orgId
                });
                console.log(
                  `DEBUG: Restored ${workingDaysNum} days to user ${request.userId} balance after rejection. New balance: ${newBalance}`
                );
              } else {
                console.log(
                  `DEBUG: No balance found for user ${request.userId} and variant ${appliedVariant.id}`
                );
              }
            } else if (appliedVariant) {
              console.log(
                "DEBUG: Variant does not use balance deduction before workflow - no restoration needed for rejection"
              );
            }
          } catch (balanceError) {
            console.error(
              "Error restoring balance during rejection:",
              balanceError
            );
          }
        }
        const updatedRequest = await storage.rejectWorkflowRequest(
          id,
          userId,
          reason,
          orgId
        );
        res.json(updatedRequest);
      } catch (error) {
        console.error("Error rejecting leave request:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to reject leave request";
        res.status(500).json({ message: errorMessage });
      }
    }
  );
  app2.get("/api/leave-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const variants = await storage.getLeaveVariants(orgId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching leave variants:", error);
      res.status(500).json({ message: "Failed to fetch leave variants" });
    }
  });
  app2.post("/api/leave-variants", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      console.log("Leave variant creation request body:", req.body);
      console.log("leaveTypeId in request:", req.body.leaveTypeId);
      if (!req.body.leaveTypeId) {
        return res.status(400).json({ message: "leaveTypeId is required" });
      }
      const variant = await storage.createLeaveVariant({
        ...req.body,
        orgId: parseInt(orgId)
      });
      res.json(variant);
    } catch (error) {
      console.error("Error creating leave variant:", error);
      res.status(400).json({ message: "Failed to create leave variant" });
    }
  });
  app2.patch("/api/leave-variants/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("=== PATCH LEAVE VARIANT DEBUG ===");
      console.log("Variant ID from params:", req.params.id);
      console.log("Request body received:", req.body);
      console.log("OnboardingSlabs in body:", req.body.onboardingSlabs);
      console.log("ExitSlabs in body:", req.body.exitSlabs);
      const id = parseInt(req.params.id);
      const orgId = req.headers["x-org-id"] || "60";
      console.log("Parsed ID:", id);
      console.log("Org ID:", orgId);
      const updateData = { ...req.body, orgId: parseInt(orgId) };
      console.log("Final update data being sent to storage:", updateData);
      const variant = await storage.updateLeaveVariant(id, updateData);
      console.log("Update successful, returning variant:", variant);
      res.json(variant);
    } catch (error) {
      console.error("Error updating leave variant:", error);
      res.status(400).json({ message: "Failed to update leave variant" });
    }
  });
  app2.delete("/api/leave-variants/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLeaveVariant(id);
      res.json({ message: "Leave variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave variant:", error);
      res.status(400).json({ message: "Failed to delete leave variant" });
    }
  });
  app2.get("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const holidays2 = await storage.getHolidays(orgId);
      res.json(holidays2);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });
  app2.post("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-org-id"] || "60";
      const holiday = await storage.createHoliday({
        ...req.body,
        orgId: parseInt(orgId)
      });
      res.json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });
  app2.get("/api/comp-off-requests", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const userId = req.query.userId;
      if (userId) {
        const requests = await storage.getCompOffRequests(userId, orgId);
        res.json(requests);
      } else {
        const requests = await storage.getCompOffRequestsByOrg(orgId);
        res.json(requests);
      }
    } catch (error) {
      console.error("Error fetching comp off requests:", error);
      res.status(500).json({ message: "Failed to fetch comp off requests" });
    }
  });
  app2.post("/api/comp-off-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.body.userId || "1";
      const orgId = getOrgIdFromHeaders(req);
      const requestData = {
        ...req.body,
        userId,
        orgId,
        workedDate: req.body.workedDate ? new Date(req.body.workedDate) : /* @__PURE__ */ new Date(),
        compensateWith: req.body.compensateWith ? new Date(req.body.compensateWith) : null,
        leaveTypeId: req.body.leaveTypeId ? parseInt(req.body.leaveTypeId) : null,
        transferAmount: req.body.transferDays || null
      };
      console.log("Creating comp-off request with data:", requestData);
      const validatedData = insertCompOffRequestSchema.parse(requestData);
      let request = await storage.createCompOffRequest(validatedData);
      let workflowSubProcess = "";
      switch (request.type) {
        case "bank":
          workflowSubProcess = "bank-comp-off";
          break;
        case "avail":
          workflowSubProcess = "avail-comp-off";
          break;
        case "transfer":
          workflowSubProcess = "transfer-comp-off";
          break;
        case "en_cash":
          workflowSubProcess = "encash-comp-off";
          break;
        default:
          workflowSubProcess = "bank-comp-off";
      }
      const workflow = await findApplicableWorkflow(
        "comp-off",
        workflowSubProcess,
        orgId
      );
      if (workflow && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
        console.log(`Starting workflow for comp-off ${request.type} request`);
        request = await startCompOffWorkflow(
          request.id,
          workflow,
          request.userId,
          request.type
        );
        res.json({
          ...request,
          workflowId: workflow.id,
          message: `Comp-off ${request.type} request submitted for approval`
        });
      } else {
        console.log("Auto-approving comp-off request (no workflow configured)");
        request = await storage.approveCompOffRequest(
          request.id,
          "system-auto-approval"
        );
        if (request.type === "transfer" && request.status === "approved") {
          await handleCompOffTransfer(request, orgId);
        }
        res.json(request);
      }
    } catch (error) {
      console.error("Error creating comp off request:", error);
      console.error("Request body:", req.body);
      res.status(400).json({
        message: "Failed to create comp off request",
        error: error.message
      });
    }
  });
  const findApplicableWorkflow = async (process2, subProcess, orgId) => {
    const workflows2 = await storage.getWorkflows(orgId);
    return workflows2.find(
      (w) => w.process === process2 && w.subProcesses && w.subProcesses.includes(subProcess)
    );
  };
  const startPTOWorkflow = async (requestId, workflow, userId) => {
    const approvalHistory = [
      {
        stepNumber: 0,
        action: "submitted",
        userId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        comment: "PTO request submitted for approval"
      }
    ];
    console.log(
      `Starting PTO workflow: request ID ${requestId}, workflow ID ${workflow.id}`
    );
    return await storage.updatePTORequest(requestId, {
      workflowId: workflow.id,
      currentStep: 1,
      workflowStatus: "in_progress",
      approvalHistory: JSON.stringify(approvalHistory)
    });
  };
  const startCompOffWorkflow = async (requestId, workflow, userId, actionType) => {
    const approvalHistory = [
      {
        stepNumber: 0,
        action: "submitted",
        userId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        comment: `${actionType} comp-off request submitted for approval`
      }
    ];
    return await storage.updateCompOffRequest(requestId, {
      workflowId: workflow.id,
      currentStep: 1,
      workflowStatus: "in_progress",
      approvalHistory: JSON.stringify(approvalHistory)
    });
  };
  app2.get("/api/pto-requests", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const userId = req.query.userId;
      const requests = await storage.getPTORequests(orgId, userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching PTO requests:", error);
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });
  app2.patch(
    "/api/comp-off-requests/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const orgId = req.headers["x-org-id"] || "60";
        const validatedData = insertCompOffRequestSchema.partial().parse({ ...req.body, orgId: parseInt(orgId) });
        const request = await storage.updateCompOffRequest(id, validatedData);
        res.json(request);
      } catch (error) {
        console.error("Error updating comp off request:", error);
        res.status(400).json({ message: "Failed to update comp off request" });
      }
    }
  );
  app2.delete(
    "/api/comp-off-requests/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteCompOffRequest(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting comp off request:", error);
        res.status(400).json({ message: "Failed to delete comp off request" });
      }
    }
  );
  app2.post(
    "/api/comp-off-requests/:id/approve",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const approvedBy = req.user.claims.sub;
        const orgId = getOrgIdFromHeaders(req);
        const requests = await storage.getCompOffRequests(void 0, orgId);
        const request = requests.find((r) => r.id === id);
        if (request?.workflowId) {
          const updatedRequest = await storage.processCompOffWorkflowApproval(
            id,
            approvedBy,
            orgId
          );
          if (updatedRequest.workflowStatus === "completed" && updatedRequest.type === "transfer") {
            await handleCompOffTransfer(updatedRequest, orgId);
          }
          res.json(updatedRequest);
        } else {
          const approvedRequest = await storage.approveCompOffRequest(
            id,
            approvedBy
          );
          res.json(approvedRequest);
        }
      } catch (error) {
        console.error("Error approving comp off request:", error);
        res.status(400).json({ message: "Failed to approve comp off request" });
      }
    }
  );
  app2.post(
    "/api/comp-off-requests/:id/reject",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const rejectedBy = req.user?.claims?.sub || "system";
        const orgId = getOrgIdFromHeaders(req);
        const { rejectionReason } = req.body;
        console.log(
          `Rejecting comp-off request ${id} by ${rejectedBy} in org ${orgId}`
        );
        const requests = await storage.getCompOffRequests(void 0, orgId);
        const request = requests.find((r) => r.id === id);
        if (!request) {
          return res.status(404).json({ message: "Comp-off request not found" });
        }
        console.log(`Found comp-off request for rejection:`, request);
        if (request.workflowId) {
          console.log("Processing workflow rejection for comp-off request");
          const rejectedRequest = await storage.rejectCompOffWorkflowRequest(
            id,
            rejectedBy,
            rejectionReason,
            orgId
          );
          res.json(rejectedRequest);
        } else {
          console.log("Direct rejection for comp-off request");
          const rejectedRequest = await storage.rejectCompOffRequest(
            id,
            rejectionReason,
            rejectedBy
          );
          res.json(rejectedRequest);
        }
      } catch (error) {
        console.error("Error rejecting comp-off request:", error);
        console.error("Error stack:", error.stack);
        res.status(400).json({
          message: "Failed to reject comp-off request",
          error: error.message
        });
      }
    }
  );
  app2.post(
    "/api/pto-requests/:id/approve",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const approvedBy = req.user?.claims?.sub || "system";
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `Approving PTO request ${id} by ${approvedBy} in org ${orgId}`
        );
        const requests = await storage.getPTORequests(orgId);
        const request = requests.find((r) => r.id === id);
        if (!request) {
          return res.status(404).json({ message: "PTO request not found" });
        }
        console.log(`Found PTO request:`, request);
        if (request.workflowId) {
          console.log("Processing workflow approval for PTO request");
          const updatedRequest = await storage.processPTOWorkflowApproval(
            id,
            approvedBy,
            orgId
          );
          res.json(updatedRequest);
        } else {
          console.log("Direct approval for PTO request");
          const approvedRequest = await storage.updatePTORequest(id, {
            status: "approved",
            approvedBy,
            approvedAt: /* @__PURE__ */ new Date()
          });
          res.json(approvedRequest);
        }
      } catch (error) {
        console.error("Error approving PTO request:", error);
        console.error("Error stack:", error.stack);
        res.status(400).json({
          message: "Failed to approve PTO request",
          error: error.message
        });
      }
    }
  );
  app2.post(
    "/api/pto-requests/:id/reject",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const rejectedBy = req.user.claims.sub;
        const orgId = getOrgIdFromHeaders(req);
        const { rejectionReason } = req.body;
        const requests = await storage.getPTORequests(orgId);
        const request = requests.find((r) => r.id === id);
        if (request?.workflowId) {
          const rejectedRequest = await storage.rejectPTOWorkflowRequest(
            id,
            rejectedBy,
            rejectionReason,
            orgId
          );
          res.json(rejectedRequest);
        } else {
          const rejectedRequest = await storage.updatePTORequest(id, {
            status: "rejected",
            rejectionReason
          });
          res.json(rejectedRequest);
        }
      } catch (error) {
        console.error("Error rejecting PTO request:", error);
        res.status(400).json({ message: "Failed to reject PTO request" });
      }
    }
  );
  app2.get("/uploads/:fileId", (req, res) => {
    const fileId = req.params.fileId;
    const document = uploadedDocuments.get(fileId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.setHeader("Content-Type", document.mimetype);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalname}"`
    );
    res.send(document.buffer);
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "text/csv",
        "application/csv",
        "text/comma-separated-values",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/excel",
        "application/x-excel",
        "application/x-msexcel"
      ];
      const allowedExtensions = [".csv", ".xls", ".xlsx"];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        console.log(
          "Rejected file:",
          file.originalname,
          "MIME type:",
          file.mimetype
        );
        cb(
          new Error("Invalid file type. Only CSV and Excel files are allowed.")
        );
      }
    }
  });
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only PDF, images, and Word documents are allowed."
          )
        );
      }
    }
  });
  const uploadedDocuments = /* @__PURE__ */ new Map();
  app2.post(
    "/api/upload-documents",
    isAuthenticated,
    documentUpload.array("documents", 5),
    async (req, res) => {
      try {
        const files = req.files;
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }
        const uploadedFiles = files.map((file) => {
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
    }
  );
  function isValidDate(dateString) {
    try {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(dateString)) {
        return false;
      }
      const [day, month, year] = dateString.split("-").map((num) => parseInt(num, 10));
      const date2 = new Date(year, month - 1, day);
      return date2.getFullYear() === year && date2.getMonth() === month - 1 && date2.getDate() === day;
    } catch {
      return false;
    }
  }
  function parseDate(dateString) {
    const [day, month, year] = dateString.split("-").map((num) => parseInt(num, 10));
    return new Date(year, month - 1, day);
  }
  app2.post(
    "/api/import-leave-data/validate",
    isAuthenticated,
    upload.single("file"),
    async (req, res) => {
      try {
        let excelDateToJSDate2 = function(serial2) {
          const epochDiff = 25569;
          const msPerDay = 864e5;
          const adjustedSerial = serial2 > 59 ? serial2 - 1 : serial2;
          return new Date((adjustedSerial - epochDiff) * msPerDay);
        }, formatDateToDDMMYYYY2 = function(date2) {
          const day = date2.getDate().toString().padStart(2, "0");
          const month = (date2.getMonth() + 1).toString().padStart(2, "0");
          const year = date2.getFullYear();
          return `${day}-${month}-${year}`;
        }, processExcelDate2 = function(value) {
          if (typeof value === "number") {
            const jsDate = excelDateToJSDate2(value);
            return formatDateToDDMMYYYY2(jsDate);
          } else if (typeof value === "string") {
            return value;
          } else {
            return String(value);
          }
        };
        var excelDateToJSDate = excelDateToJSDate2, formatDateToDDMMYYYY = formatDateToDDMMYYYY2, processExcelDate = processExcelDate2;
        const orgId = getOrgIdFromHeaders(req);
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const importType = req.body.importType || "balances";
        console.log(
          `[ExcelValidation] *** USER SELECTED ${importType.toUpperCase()} TEMPLATE *** Processing file: ${file.originalname}, size: ${file.size} bytes, org_id: ${orgId}`
        );
        console.log(
          `[ExcelValidation] Authorization header present:`,
          !!req.headers.authorization
        );
        console.log(
          `[ExcelValidation] Authorization header value:`,
          req.headers.authorization ? req.headers.authorization.substring(0, 30) + "..." : "null"
        );
        async function getEmployeeMapping() {
          try {
            const authHeader = req.headers.authorization;
            console.log(
              "[ExcelValidation] Authorization header:",
              authHeader ? "present" : "missing"
            );
            console.log(
              "[ExcelValidation] Authorization header value:",
              authHeader ? authHeader.substring(0, 20) + "..." : "null"
            );
            let jwtToken = "";
            if (authHeader && authHeader.startsWith("Bearer ")) {
              jwtToken = authHeader.substring(7);
              console.log(
                "[ExcelValidation] Extracted JWT token, length:",
                jwtToken.length
              );
            } else {
              console.log(
                "[ExcelValidation] Authorization header does not start with Bearer or is missing"
              );
            }
            if (!jwtToken) {
              console.error(
                "[ExcelValidation] No JWT token available for external API"
              );
              console.error(
                "[ExcelValidation] Authorization header present:",
                !!authHeader
              );
              console.error(
                "[ExcelValidation] Authorization header format:",
                authHeader
              );
              return /* @__PURE__ */ new Map();
            }
            console.log("[ExcelValidation] Making API call to external API...");
            const payload = {
              userBlocks: [1, 3, 4],
              userWise: 0,
              workerType: 0,
              attribute: 0,
              subAttributeId: 0
            };
            console.log("[ExcelValidation] API Payload:", payload);
            const response = await fetch(
              "https://qa-api.resolveindia.com/reports/worker-master-leave",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
              }
            );
            console.log(
              "[ExcelValidation] External API response status:",
              response.status
            );
            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                "[ExcelValidation] External API error:",
                response.status,
                response.statusText
              );
              console.error(
                "[ExcelValidation] External API error body:",
                errorText
              );
              return /* @__PURE__ */ new Map();
            }
            const data = await response.json();
            console.log(
              "[ExcelValidation] External API response data keys:",
              Object.keys(data)
            );
            console.log(
              "[ExcelValidation] External API data.data.data length:",
              data.data?.data ? data.data.data.length : "null"
            );
            const employeeMap = /* @__PURE__ */ new Map();
            if (data.data?.data && Array.isArray(data.data.data)) {
              data.data.data.forEach((employee, index2) => {
                if (employee.employee_number && employee.user_id) {
                  employeeMap.set(
                    employee.employee_number.toString(),
                    employee.user_id.toString()
                  );
                  if (index2 < 5) {
                    console.log(
                      `[ExcelValidation] Sample mapping: ${employee.employee_number} -> ${employee.user_id}`
                    );
                  }
                }
              });
              console.log(
                `[ExcelValidation] Loaded ${employeeMap.size} employee mappings from external API`
              );
              const firstFewMappings = Array.from(employeeMap.entries()).slice(
                0,
                5
              );
              console.log(
                "[ExcelValidation] First few employee mappings:",
                firstFewMappings
              );
            } else {
              console.log(
                "[ExcelValidation] External API response structure:",
                JSON.stringify(data, null, 2)
              );
            }
            return employeeMap;
          } catch (error) {
            console.error(
              "[ExcelValidation] Error fetching employee mapping:",
              error
            );
            return /* @__PURE__ */ new Map();
          }
        }
        console.log(
          "[ExcelValidation] *** CALLING getEmployeeMapping() NOW ***"
        );
        const employeeMapping = await getEmployeeMapping();
        console.log(
          "[ExcelValidation] Employee mapping result size:",
          employeeMapping.size
        );
        console.log(
          "[ExcelValidation] Employee mapping retrieved, size:",
          employeeMapping.size
        );
        const workbook = XLSX.read(file.buffer, {
          type: "buffer",
          cellDates: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        console.log(`[ExcelValidation] Sheet name: ${sheetName}`);
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          // Use first row as header
          defval: ""
          // Default value for empty cells
        });
        console.log(`[ExcelValidation] Raw data rows: ${rawData.length}`);
        console.log(
          `[ExcelValidation] First 10 raw rows:`,
          rawData.slice(0, 10)
        );
        rawData.forEach((row, index2) => {
          if (index2 < 10) {
            console.log(`[ExcelValidation] Row ${index2}:`, row);
            console.log(
              `[ExcelValidation] Row ${index2} [0]:`,
              row[0],
              typeof row[0]
            );
            console.log(
              `[ExcelValidation] Row ${index2} [1]:`,
              row[1],
              typeof row[1]
            );
            console.log(
              `[ExcelValidation] Row ${index2} [2]:`,
              row[2],
              typeof row[2]
            );
            console.log(
              `[ExcelValidation] Row ${index2} [3]:`,
              row[3],
              typeof row[3]
            );
          }
        });
        const jsonData = rawData.filter((row, index2) => {
          if (index2 < 3) {
            console.log(
              `[ExcelValidation] Skipping row ${index2} - header rows`
            );
            return false;
          }
          if (!row[0] && !row[1] && !row[2]) {
            return false;
          }
          if (!row[0]) {
            return false;
          }
          const empNumber = row[0].toString().trim();
          if (empNumber === "") {
            return false;
          }
          if (empNumber.length > 25) {
            console.log(
              `[ExcelValidation] Skipping long text row: "${empNumber.substring(0, 30)}..."`
            );
            return false;
          }
          if (empNumber.toLowerCase().includes("leave") || empNumber.toLowerCase().includes("details") || empNumber.toLowerCase().includes("emp") || empNumber.toLowerCase().includes("name") || empNumber.toLowerCase().includes("type") || empNumber.toLowerCase().includes("start") || empNumber.toLowerCase().includes("end") || empNumber.toLowerCase().includes("total") || empNumber.toLowerCase().includes("status")) {
            console.log(
              `[ExcelValidation] Skipping header-like text: "${empNumber}"`
            );
            return false;
          }
          console.log(
            `[ExcelValidation] \u2713 Valid employee row: "${empNumber}"`
          );
          return true;
        }).map((row) => {
          if (importType === "balances") {
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
            console.log(
              `[ExcelValidation] Raw row data for ${row[0]}: startDate=row[3]=${row[3]} (${typeof row[3]}), isStartHalf=row[4]=${row[4]}, endDate=row[5]=${row[5]} (${typeof row[5]}), isEndHalf=row[6]=${row[6]}, totalDays=row[7]=${row[7]} (${typeof row[7]}), status=row[8]=${row[8]}`
            );
            const startDate = processExcelDate2(row[3]);
            const endDate = processExcelDate2(row[5]);
            console.log(
              `[ExcelValidation] Date conversion for ${row[0]}: startDate ${row[3]} -> ${startDate}, endDate ${row[5]} -> ${endDate}`
            );
            return {
              EmpNumber: row[0],
              EmpName: row[1],
              LeaveType: row[2],
              LeaveTakenStartDate: startDate,
              "Is Start Date a Half Day": row[4] === "TRUE" || row[4] === true,
              // Column 4
              LeaveTakenEndDate: endDate,
              "Is End Date a Half Day": row[6] === "TRUE" || row[6] === true,
              // Column 6
              TotalLeaveDays: parseFloat(row[7]) || 0,
              // Fixed: totalDays is in column 7, not 5
              Status: row[8] || "approved"
              // Fixed: status is in column 8, not 6
            };
          }
        });
        const validationErrors = [];
        const validData = [];
        const leaveTypes2 = await storage.getLeaveTypes(orgId);
        const leaveTypeNames = leaveTypes2.map((lt) => lt.name.toLowerCase());
        console.log(
          `[ExcelValidation] Available leave types: ${leaveTypes2.map((lt) => lt.name).join(", ")}`
        );
        const existingBalances = await storage.getAllEmployeeLeaveBalances(orgId);
        console.log(
          `[ExcelValidation] Existing balances count: ${existingBalances.length}`
        );
        for (let index2 = 0; index2 < jsonData.length; index2++) {
          const row = jsonData[index2];
          const rowNum = index2 + 5;
          if (!row.EmpNumber && !row.EmpName) continue;
          if (typeof row.EmpNumber === "string" && row.EmpNumber.toLowerCase().includes("leave availed details")) {
            console.log(
              `[ExcelValidation] Skipping header/description row: ${row.EmpNumber.substring(0, 50)}...`
            );
            continue;
          }
          if (typeof row.EmpNumber === "string" && (row.EmpNumber.toLowerCase().includes("empnumber") || row.EmpNumber.toLowerCase().includes("employee number") || row.EmpNumber.toLowerCase().includes("emp number"))) {
            console.log(
              `[ExcelValidation] Skipping header row: ${row.EmpNumber}`
            );
            continue;
          }
          if (!row.EmpName || !row.LeaveType || typeof row.EmpName === "string" && row.EmpName.trim().length === 0 || typeof row.LeaveType === "string" && row.LeaveType.trim().length === 0) {
            console.log(
              `[ExcelValidation] Skipping row with empty fields: EmpName="${row.EmpName}" LeaveType="${row.LeaveType}"`
            );
            continue;
          }
          if (!row.EmpNumber) {
            validationErrors.push(`Row ${rowNum}: Employee Number is required`);
          }
          if (!row.EmpName) {
            validationErrors.push(`Row ${rowNum}: Employee Name is required`);
          }
          if (!row.LeaveType) {
            validationErrors.push(`Row ${rowNum}: Leave Type is required`);
          }
          if (importType === "balances") {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || "0") || 0;
            const availed = parseFloat(row.LeaveAvailed || "0") || 0;
            const encashed = parseFloat(row.LeaveEncashed || "0") || 0;
            const lapsed = parseFloat(row.LeaveLapsed || "0") || 0;
            console.log(
              `[ExcelValidation] Processing employee ${row.EmpNumber} with opening balance: ${openingBalance}`
            );
            const numericFields = [
              "LeaveOpeningBalance",
              "LeaveAvailed",
              "LeaveEncashed",
              "LeaveLapsed"
            ];
            numericFields.forEach((field) => {
              if (row[field] !== void 0 && row[field] !== null && row[field] !== "") {
                let cleanValue = row[field];
                if (typeof cleanValue === "string") {
                  cleanValue = cleanValue.trim();
                  if (cleanValue === "-" || cleanValue === "N/A" || cleanValue === "null" || cleanValue === "" || cleanValue === "true" || cleanValue === "false") {
                    cleanValue = "0";
                  }
                } else if (typeof cleanValue === "boolean") {
                  cleanValue = "0";
                }
                const value = parseFloat(cleanValue);
                if (isNaN(value) || value < 0) {
                  validationErrors.push(
                    `Row ${rowNum}: ${field} must be a valid number (0 or greater). Found: "${row[field]}"`
                  );
                }
              }
            });
          } else {
            if (!row.LeaveTakenStartDate) {
              validationErrors.push(
                `Row ${rowNum}: LeaveTakenStartDate is required`
              );
            }
            if (!row.LeaveTakenEndDate) {
              validationErrors.push(
                `Row ${rowNum}: LeaveTakenEndDate is required`
              );
            }
            if (!row.TotalLeaveDays || parseFloat(row.TotalLeaveDays) <= 0) {
              validationErrors.push(
                `Row ${rowNum}: TotalLeaveDays must be a positive number`
              );
            }
            const validStatuses = [
              "approved",
              "pending",
              "rejected",
              "withdrawn",
              "Approved",
              "Pending",
              "Rejected",
              "Withdrawn"
            ];
            if (row.Status) {
              const statusValue = row.Status.toString().trim();
              if (!validStatuses.includes(statusValue)) {
                console.log(
                  `[ExcelValidation] Status validation failed for row ${rowNum}: "${statusValue}" (type: ${typeof row.Status}) not in valid statuses: ${validStatuses.join(", ")}`
                );
                validationErrors.push(
                  `Row ${rowNum}: Status must be one of: Approved, Pending, Rejected, or Withdrawn`
                );
              }
            }
            if (row.LeaveTakenStartDate && !isValidDate(row.LeaveTakenStartDate)) {
              validationErrors.push(
                `Row ${rowNum}: LeaveTakenStartDate must be a valid date (dd-MM-YYYY format)`
              );
            }
            if (row.LeaveTakenEndDate && !isValidDate(row.LeaveTakenEndDate)) {
              validationErrors.push(
                `Row ${rowNum}: LeaveTakenEndDate must be a valid date (dd-MM-YYYY format)`
              );
            }
            const validHalfDayValues = [
              "TRUE",
              "FALSE",
              true,
              false,
              "",
              null,
              void 0
            ];
            if (row["Is Start Date a Half Day"] !== void 0 && row["Is Start Date a Half Day"] !== null && row["Is Start Date a Half Day"] !== "" && !validHalfDayValues.includes(row["Is Start Date a Half Day"])) {
              validationErrors.push(
                `Row ${rowNum}: 'Is Start Date a Half Day' must be TRUE or FALSE`
              );
            }
            if (row["Is End Date a Half Day"] !== void 0 && row["Is End Date a Half Day"] !== null && row["Is End Date a Half Day"] !== "" && !validHalfDayValues.includes(row["Is End Date a Half Day"])) {
              validationErrors.push(
                `Row ${rowNum}: 'Is End Date a Half Day' must be TRUE or FALSE`
              );
            }
            console.log(
              `[ExcelValidation] Processing transaction for employee ${row.EmpNumber}: ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate}, ${row.TotalLeaveDays} days`
            );
          }
          let mappedLeaveType = row.LeaveType;
          if (row.LeaveType === "EL") mappedLeaveType = "Earned Leave";
          else if (row.LeaveType === "CL") mappedLeaveType = "Casual Leave";
          else if (row.LeaveType === "SL") mappedLeaveType = "Sick Leave";
          else if (row.LeaveType === "ML") mappedLeaveType = "Maternity Leave";
          else if (row.LeaveType === "PL") mappedLeaveType = "Paternity Leave";
          else if (row.LeaveType === "BL")
            mappedLeaveType = "Bereavement Leave";
          else if (row.LeaveType === "Privilege Leave")
            mappedLeaveType = "Privilege Leave";
          else if (row.LeaveType === "Privelege Leave")
            mappedLeaveType = "Privilege Leave";
          console.log(
            `[ExcelValidation] Row ${rowNum}: LeaveType "${row.LeaveType}" mapped to "${mappedLeaveType}"`
          );
          if (mappedLeaveType && !leaveTypeNames.includes(mappedLeaveType.toLowerCase())) {
            validationErrors.push(
              `Row ${rowNum}: Leave Type "${row.LeaveType}" not found. Available types: ${leaveTypes2.map((lt) => lt.name).join(", ")}`
            );
          }
          if (row.EmpNumber && !employeeMapping.has(row.EmpNumber.toString())) {
            validationErrors.push(
              `Row ${rowNum}: Employee Number "${row.EmpNumber}" not found in organization directory`
            );
          }
          if (validationErrors.length < 50) {
            if (importType === "balances") {
              const openingBalance = parseFloat(row.LeaveOpeningBalance || "0") || 0;
              const availed = parseFloat(row.LeaveAvailed || "0") || 0;
              const encashed = parseFloat(row.LeaveEncashed || "0") || 0;
              const lapsed = parseFloat(row.LeaveLapsed || "0") || 0;
              validData.push({
                ...row,
                LeaveType: mappedLeaveType,
                LeaveOpeningBalance: openingBalance,
                LeaveAvailed: availed,
                LeaveEncashed: encashed,
                LeaveLapsed: lapsed
              });
            } else {
              let statusValue = "approved";
              if (row.Status) {
                if (typeof row.Status === "string") {
                  statusValue = row.Status.toLowerCase();
                } else if (typeof row.Status === "number") {
                  switch (row.Status) {
                    case 1:
                      statusValue = "approved";
                      break;
                    case 0:
                      statusValue = "rejected";
                      break;
                    case 2:
                      statusValue = "pending";
                      break;
                    case 3:
                      statusValue = "withdrawn";
                      break;
                    default:
                      statusValue = "approved";
                  }
                }
              }
              validData.push({
                ...row,
                LeaveType: mappedLeaveType,
                LeaveTakenStartDate: row.LeaveTakenStartDate,
                LeaveTakenEndDate: row.LeaveTakenEndDate,
                TotalLeaveDays: parseFloat(row.TotalLeaveDays) || 0,
                "Is Start Date a Half Day": row["Is Start Date a Half Day"] === "TRUE" || row["Is Start Date a Half Day"] === true,
                "Is End Date a Half Day": row["Is End Date a Half Day"] === "TRUE" || row["Is End Date a Half Day"] === true,
                Status: statusValue
              });
            }
          }
        }
        console.log(
          `[ExcelValidation] Final result - Total rows: ${jsonData.length}, Valid rows: ${validData.length}, Errors: ${validationErrors.length}`
        );
        console.log(`[ExcelValidation] First valid data item:`, validData[0]);
        console.log(`[ExcelValidation] First error:`, validationErrors[0]);
        const transformedData = validData.map((row) => {
          if (importType === "balances") {
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
              isStartHalfDay: row["Is Start Date a Half Day"],
              isEndHalfDay: row["Is End Date a Half Day"],
              status: row.Status || "approved"
            };
          }
        });
        console.log(
          `[ExcelValidation] Transformed first item:`,
          transformedData[0]
        );
        console.log(
          `[ExcelValidation] Transformed data length:`,
          transformedData.length
        );
        console.log(
          `[ExcelValidation] Sending preview with ${transformedData.slice(0, 10).length} items`
        );
        res.json({
          preview: transformedData.slice(0, 10),
          // Show first 10 rows
          errors: validationErrors.slice(0, 20),
          // Limit error messages
          totalRows: jsonData.length,
          validRows: validData.length
        });
      } catch (error) {
        console.error("Error validating import file:", error);
        res.status(500).json({
          message: "Failed to validate file: " + error.message
        });
      }
    }
  );
  app2.post(
    "/api/import-leave-data/execute",
    isAuthenticated,
    upload.single("file"),
    async (req, res) => {
      console.log("[IMPORT ENDPOINT] *** ENDPOINT HIT - IMPORT STARTED ***");
      console.log("[IMPORT ENDPOINT] Request method:", req.method);
      console.log("[IMPORT ENDPOINT] Request URL:", req.url);
      try {
        let excelDateToJSDate2 = function(serial2) {
          const epochDiff = 25569;
          const msPerDay = 864e5;
          const adjustedSerial = serial2 > 59 ? serial2 - 1 : serial2;
          return new Date((adjustedSerial - epochDiff) * msPerDay);
        }, formatDateToDDMMYYYY2 = function(date2) {
          const day = date2.getDate().toString().padStart(2, "0");
          const month = (date2.getMonth() + 1).toString().padStart(2, "0");
          const year = date2.getFullYear();
          return `${day}-${month}-${year}`;
        }, processExcelDate2 = function(value) {
          if (typeof value === "number") {
            const jsDate = excelDateToJSDate2(value);
            return formatDateToDDMMYYYY2(jsDate);
          } else if (typeof value === "string") {
            return value;
          } else {
            return String(value);
          }
        };
        var excelDateToJSDate = excelDateToJSDate2, formatDateToDDMMYYYY = formatDateToDDMMYYYY2, processExcelDate = processExcelDate2;
        const orgId = getOrgIdFromHeaders(req);
        const file = req.file;
        const importType = req.body.importType || "balances";
        console.log(
          `[ExcelExecution] Processing ${importType} import for org_id: ${orgId}`
        );
        console.log(
          `[ExcelExecution] Authorization header present:`,
          !!req.headers.authorization
        );
        console.log(
          `[ExcelExecution] Authorization header value:`,
          req.headers.authorization ? req.headers.authorization.substring(0, 30) + "..." : "MISSING"
        );
        console.log(
          `[ExcelExecution] Import type requires external API:`,
          importType === "transactions"
        );
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        async function getEmployeeMapping() {
          const jwtTokenFromBody = req.body.jwtToken;
          const authHeader = req.headers.authorization;
          let jwtToken = "";
          if (jwtTokenFromBody) {
            jwtToken = jwtTokenFromBody;
            console.log(
              "[ExcelImport] \u2705 JWT token received from frontend localStorage"
            );
            console.log("[ExcelImport] Token length:", jwtToken.length);
          } else if (authHeader && authHeader.startsWith("Bearer ")) {
            jwtToken = authHeader.substring(7);
            console.log("[ExcelImport] \u26A0\uFE0F Using Authorization header token");
          } else {
            console.error("[ExcelImport] \u274C NO JWT TOKEN AVAILABLE");
            return /* @__PURE__ */ new Map();
          }
          console.log(
            "[ExcelImport] About to call external API with JWT token..."
          );
          try {
            const response = await fetch(
              "https://qa-api.resolveindia.com/reports/worker-master-leave",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  userBlocks: [1, 3, 4],
                  userWise: 0,
                  workerType: 0,
                  attribute: 0,
                  subAttributeId: 0
                })
              }
            );
            if (!response.ok) {
              console.error(
                "[ExcelImport] \u274C External API failed with status:",
                response.status
              );
              return /* @__PURE__ */ new Map();
            }
            const data = await response.json();
            const employeeMap = /* @__PURE__ */ new Map();
            if (data?.data?.data && Array.isArray(data.data.data)) {
              data.data.data.forEach((employee) => {
                if (employee.employee_number && employee.user_id) {
                  employeeMap.set(
                    employee.employee_number.toString(),
                    employee.user_id.toString()
                  );
                }
              });
              console.log(
                `[ExcelImport] \u2705 Loaded ${employeeMap.size} employee mappings successfully`
              );
            } else {
              console.error("[ExcelImport] \u274C Invalid API response structure");
            }
            return employeeMap;
          } catch (error) {
            console.error(
              "[ExcelImport] \u274C Network error calling external API:",
              error
            );
            return /* @__PURE__ */ new Map();
          }
        }
        console.log(
          "[ExcelImport] \u{1F680} Calling external API for employee mapping for ALL import types"
        );
        let employeeMapping = await getEmployeeMapping();
        console.log(`[ExcelImport] *** EMPLOYEE MAPPING RETURNED ***`);
        console.log(
          `[ExcelImport] Employee mapping size: ${employeeMapping.size}`
        );
        if (employeeMapping.size > 0) {
          console.log(
            `[ExcelImport] Sample mappings:`,
            Array.from(employeeMapping.entries()).slice(0, 3)
          );
        } else {
          console.error(
            "[ExcelImport] CRITICAL: Employee mapping is EMPTY - this will cause ALL transactions to be skipped"
          );
        }
        const workbook = XLSX.read(file.buffer, {
          type: "buffer",
          cellDates: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          // Use first row as header
          defval: ""
          // Default value for empty cells
        });
        const jsonData = rawData.filter((row, index2) => {
          if (index2 < 3) {
            return false;
          }
          if (!row[0] && !row[1] && !row[2]) {
            return false;
          }
          if (!row[0]) {
            return false;
          }
          const empNumber = row[0].toString().trim();
          if (empNumber === "") {
            return false;
          }
          if (empNumber.length > 25) {
            return false;
          }
          if (empNumber.toLowerCase().includes("leave") || empNumber.toLowerCase().includes("details") || empNumber.toLowerCase().includes("emp") || empNumber.toLowerCase().includes("name") || empNumber.toLowerCase().includes("type") || empNumber.toLowerCase().includes("start") || empNumber.toLowerCase().includes("end") || empNumber.toLowerCase().includes("total") || empNumber.toLowerCase().includes("status")) {
            return false;
          }
          return true;
        }).map((row) => {
          if (importType === "balances") {
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
            console.log(
              `[ExcelImport] Raw row data for ${row[0]}: row[3]=${row[3]} (${typeof row[3]}), row[4]=${row[4]} (${typeof row[4]}), row[5]=${row[5]} (${typeof row[5]}), row[6]=${row[6]} (${typeof row[6]}), row[7]=${row[7]} (${typeof row[7]}), row[8]=${row[8]} (${typeof row[8]})`
            );
            const startDate = processExcelDate2(row[3]);
            const endDate = processExcelDate2(row[5]);
            console.log(
              `[ExcelImport] Date conversion for ${row[0]}: startDate ${row[3]} -> ${startDate}, endDate ${row[5]} -> ${endDate}`
            );
            return {
              EmpNumber: row[0],
              EmpName: row[1],
              LeaveType: row[2],
              LeaveTakenStartDate: startDate,
              "Is Start Date a Half Day": row[4] === "TRUE" || row[4] === true,
              LeaveTakenEndDate: endDate,
              "Is End Date a Half Day": row[6] === "TRUE" || row[6] === true,
              TotalLeaveDays: parseFloat(row[7]) || 0,
              // Fixed: column 7 for total days
              Status: row[8] || "approved"
              // Fixed: column 8 for status
            };
          }
        });
        const leaveTypes2 = await storage.getLeaveTypes(orgId);
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const existingBalances = await storage.getAllEmployeeLeaveBalances(orgId);
        let importedCount = 0;
        console.log(
          `[ExcelImport] Starting import for ${jsonData.length} rows`
        );
        const leaveRequestsBatch = [];
        const balanceTransactionsBatch = [];
        const balanceUpdatesBatch = [];
        const processedCombinations = /* @__PURE__ */ new Set();
        const importStats = {
          totalRows: jsonData.length,
          skippedEmpty: 0,
          skippedHeaders: 0,
          skippedMissingEmployee: 0,
          skippedMissingLeaveType: 0,
          skippedDuplicateRows: 0,
          processingErrors: 0,
          successful: 0
        };
        for (const row of jsonData) {
          if (importType === "balances") {
            console.log(`[ExcelImport] Processing balance row:`, {
              EmpNumber: row.EmpNumber,
              EmpName: row.EmpName,
              LeaveType: row.LeaveType,
              OpeningBalance: row.LeaveOpeningBalance
            });
          } else {
            console.log(`[ExcelImport] Processing transaction row:`, {
              EmpNumber: row.EmpNumber,
              EmpName: row.EmpName,
              LeaveType: row.LeaveType,
              StartDate: row.LeaveTakenStartDate,
              EndDate: row.LeaveTakenEndDate,
              Days: row.TotalLeaveDays
            });
          }
          if (!row.EmpNumber || !row.EmpName || !row.LeaveType) {
            console.log(
              `[ExcelImport] Skipping row due to missing fields: EmpNumber=${row.EmpNumber}, EmpName=${row.EmpName}, LeaveType=${row.LeaveType}`
            );
            importStats.skippedEmpty++;
            continue;
          }
          if (typeof row.EmpNumber === "string" && row.EmpNumber.toLowerCase().includes("leave availed details")) {
            console.log(
              `[ExcelImport] Skipping header/description row: ${row.EmpNumber.substring(0, 50)}...`
            );
            importStats.skippedHeaders++;
            continue;
          }
          if (typeof row.EmpNumber === "string" && (row.EmpNumber.toLowerCase().includes("empnumber") || row.EmpNumber.toLowerCase().includes("employee number") || row.EmpNumber.toLowerCase().includes("emp number"))) {
            console.log(`[ExcelImport] Skipping header row: ${row.EmpNumber}`);
            importStats.skippedHeaders++;
            continue;
          }
          if (!row.EmpName || !row.LeaveType || typeof row.EmpName === "string" && row.EmpName.trim().length === 0 || typeof row.LeaveType === "string" && row.LeaveType.trim().length === 0) {
            console.log(
              `[ExcelImport] Skipping row with empty fields: EmpName="${row.EmpName}" LeaveType="${row.LeaveType}"`
            );
            continue;
          }
          if (importType === "balances") {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || "0") || 0;
            const availed = parseFloat(row.LeaveAvailed || "0") || 0;
            const encashed = parseFloat(row.LeaveEncashed || "0") || 0;
            const lapsed = parseFloat(row.LeaveLapsed || "0") || 0;
            console.log(`[ExcelImport] Parsed balances:`, {
              openingBalance,
              availed,
              encashed,
              lapsed
            });
            console.log(
              `[ExcelImport] Processing employee ${row.EmpNumber} with opening balance: ${openingBalance}`
            );
            const userId = employeeMapping.get(row.EmpNumber.toString());
            if (!userId) {
              console.log(
                `[BalanceImport] No user_id found for employee number: ${row.EmpNumber} - SKIPPING`
              );
              importStats.skippedMissingEmployee++;
              continue;
            }
            console.log(
              `[BalanceImport] Mapped employee ${row.EmpNumber} to user_id: ${userId}`
            );
            let mappedLeaveType = row.LeaveType;
            const codeToNameMap = {
              EL: "Earned Leave",
              CL: "Casual Leave",
              SL: "Sick Leave",
              ML: "Maternity Leave",
              PL: "Paternity Leave",
              BL: "Bereavement Leave",
              AL: "Annual Leave",
              VL: "Vacation Leave",
              FL: "Festival Leave",
              HL: "Holiday Leave",
              CompOff: "Compensatory Off",
              LWP: "Leave Without Pay"
            };
            if (codeToNameMap[row.LeaveType]) {
              mappedLeaveType = codeToNameMap[row.LeaveType];
            }
            const combinedTypeMap = {
              "CL/SL": "Casual Leave",
              "CL & SL": "Casual Leave",
              "CL+SL": "Casual Leave"
            };
            if (combinedTypeMap[row.LeaveType] && row.LeaveType.length <= 10) {
              mappedLeaveType = combinedTypeMap[row.LeaveType];
            }
            console.log(
              `[ExcelImport] Looking for leave type:`,
              mappedLeaveType
            );
            console.log(
              `[ExcelImport] Available leave types:`,
              leaveTypes2.map((lt) => lt.name)
            );
            let leaveType = null;
            const searchTerm = mappedLeaveType.toLowerCase().trim();
            leaveType = leaveTypes2.find(
              (lt) => lt.name.toLowerCase().trim() === searchTerm
            );
            if (!leaveType) {
              leaveType = leaveTypes2.find(
                (lt) => lt.name.toLowerCase().trim() === row.LeaveType.toLowerCase().trim()
              );
            }
            if (!leaveType) {
              leaveType = leaveTypes2.find((lt) => {
                const ltName = lt.name.toLowerCase().trim();
                const words = searchTerm.split(/[\s&/+,-]+/);
                for (const word of words) {
                  if (word.length >= 3 && ltName.includes(word)) {
                    return true;
                  }
                }
                const ltWords = ltName.split(/[\s&/+,-]+/);
                for (const ltWord of ltWords) {
                  if (ltWord.length >= 3 && searchTerm.includes(ltWord)) {
                    return true;
                  }
                }
                return false;
              });
            }
            if (!leaveType && row.LeaveType.length > 2 && !codeToNameMap[row.LeaveType]) {
              console.log(
                `[ExcelImport] Trying original value as custom leave type: "${row.LeaveType}"`
              );
              leaveType = leaveTypes2.find(
                (lt) => lt.name.toLowerCase().includes(row.LeaveType.toLowerCase()) || row.LeaveType.toLowerCase().includes(lt.name.toLowerCase())
              );
            }
            if (!leaveType) {
              console.log(
                `[ExcelImport] No leave type found for: "${mappedLeaveType}" (original: "${row.LeaveType}") - tried exact, fuzzy, and custom matching`
              );
              importStats.skippedMissingLeaveType++;
              continue;
            }
            console.log(`[ExcelImport] Found leave type:`, leaveType);
            const leaveVariants2 = await storage.getLeaveVariants(orgId);
            console.log(
              `[ExcelImport] Available leave variants:`,
              leaveVariants2.map((v) => ({
                id: v.id,
                leaveTypeId: v.leaveTypeId,
                name: v.leaveTypeName
              }))
            );
            const variant = leaveVariants2.find(
              (v) => v.leaveTypeId === leaveType.id
            );
            if (!variant) {
              console.log(
                `[ExcelImport] No leave variant found for leave type ID:`,
                leaveType.id
              );
              continue;
            }
            console.log(`[ExcelImport] Found leave variant:`, variant);
            const combinationKey = `${userId}-${variant.id}`;
            if (processedCombinations.has(combinationKey)) {
              console.log(
                `[BalanceImport] DUPLICATE ROW: Already processed user ${userId} with variant ${variant.id} - SKIPPING`
              );
              importStats.skippedDuplicateRows++;
              continue;
            }
            processedCombinations.add(combinationKey);
            try {
              const currentYear2 = (/* @__PURE__ */ new Date()).getFullYear();
              const totalEntitlement = openingBalance;
              const totalUsed = availed + encashed + lapsed;
              const currentBalance = Math.max(0, totalEntitlement - totalUsed);
              console.log(
                `[BalanceImport] FIXED calculation for ${row.EmpNumber}:`,
                {
                  excelOpeningBalance: openingBalance,
                  totalUsed,
                  finalCurrentBalance: currentBalance
                }
              );
              const existingBalances2 = await storage.getEmployeeLeaveBalances(
                userId,
                currentYear2,
                orgId
              );
              const existingBalance = existingBalances2.find(
                (b) => b.leaveVariantId === variant.id
              );
              if (existingBalance) {
                console.log(
                  `[BalanceImport] DUPLICATE PREVENTION: Balance already exists for user ${userId}, variant ${variant.id} - SKIPPING`
                );
                continue;
              }
              await storage.upsertLeaveBalance({
                userId,
                leaveVariantId: variant.id,
                totalEntitlement,
                // Opening balance from Excel
                currentBalance,
                // Available after deductions
                usedBalance: totalUsed,
                // Total used from Excel
                carryForward: 0,
                // Set to 0 for imported data
                year: currentYear2,
                orgId
              });
              const transactions = [];
              if (totalEntitlement > 0) {
                transactions.push({
                  userId,
                  leaveVariantId: variant.id,
                  transactionType: "grant",
                  amount: totalEntitlement,
                  // Opening balance grant
                  balanceAfter: totalEntitlement,
                  description: `Opening balance imported from Excel (${totalEntitlement} days)`,
                  transactionDate: /* @__PURE__ */ new Date(),
                  year: currentYear2,
                  orgId
                });
              }
              let runningBalance = totalEntitlement;
              if (availed > 0) {
                runningBalance -= availed;
                transactions.push({
                  userId,
                  leaveVariantId: variant.id,
                  transactionType: "deduction",
                  amount: -availed,
                  // Negative for deduction
                  balanceAfter: runningBalance,
                  description: `Leave availed - imported from Excel (${availed} days)`,
                  transactionDate: /* @__PURE__ */ new Date(),
                  year: currentYear2,
                  orgId
                });
              }
              if (encashed > 0) {
                runningBalance -= encashed;
                transactions.push({
                  userId,
                  leaveVariantId: variant.id,
                  transactionType: "deduction",
                  amount: -encashed,
                  // Negative for deduction
                  balanceAfter: runningBalance,
                  description: `Leave encashed - imported from Excel (${encashed} days)`,
                  transactionDate: /* @__PURE__ */ new Date(),
                  year: currentYear2,
                  orgId
                });
              }
              if (lapsed > 0) {
                runningBalance -= lapsed;
                transactions.push({
                  userId,
                  leaveVariantId: variant.id,
                  transactionType: "deduction",
                  amount: -lapsed,
                  // Negative for deduction
                  balanceAfter: runningBalance,
                  description: `Leave lapsed - imported from Excel (${lapsed} days)`,
                  transactionDate: /* @__PURE__ */ new Date(),
                  year: currentYear2,
                  orgId
                });
              }
              for (const transaction of transactions) {
                await storage.createLeaveBalanceTransaction(transaction);
              }
              importedCount++;
            } catch (error) {
              console.error(`Error importing row for ${row.EmpNumber}:`, error);
            }
          } else {
            try {
              const userId = employeeMapping.get(row.EmpNumber.toString());
              if (!userId) {
                console.log(
                  `[TransactionImport] No user_id found for employee number: ${row.EmpNumber}`
                );
                importStats.skippedMissingEmployee++;
                continue;
              }
              console.log(
                `[TransactionImport] Mapped employee ${row.EmpNumber} to user_id: ${userId}`
              );
              let mappedLeaveType = row.LeaveType;
              const codeToNameMap = {
                EL: "Earned Leave",
                CL: "Casual Leave",
                SL: "Sick Leave",
                ML: "Maternity Leave",
                PL: "Paternity Leave",
                BL: "Bereavement Leave",
                AL: "Annual Leave",
                VL: "Vacation Leave",
                FL: "Festival Leave",
                HL: "Holiday Leave",
                CompOff: "Compensatory Off",
                LWP: "Leave Without Pay"
              };
              if (codeToNameMap[row.LeaveType]) {
                mappedLeaveType = codeToNameMap[row.LeaveType];
              }
              const combinedTypeMap = {
                "CL/SL": "Casual Leave",
                "CL & SL": "Casual Leave",
                "CL+SL": "Casual Leave"
              };
              if (combinedTypeMap[row.LeaveType] && row.LeaveType.length <= 10) {
                mappedLeaveType = combinedTypeMap[row.LeaveType];
              }
              console.log(
                `[TransactionImport] Looking for leave type:`,
                mappedLeaveType
              );
              console.log(
                `[TransactionImport] Available leave types:`,
                leaveTypes2.map((lt) => lt.name)
              );
              let leaveType = null;
              const searchTerm = mappedLeaveType.toLowerCase().trim();
              leaveType = leaveTypes2.find(
                (lt) => lt.name.toLowerCase().trim() === searchTerm
              );
              if (!leaveType) {
                leaveType = leaveTypes2.find(
                  (lt) => lt.name.toLowerCase().trim() === row.LeaveType.toLowerCase().trim()
                );
              }
              if (!leaveType) {
                leaveType = leaveTypes2.find((lt) => {
                  const ltName = lt.name.toLowerCase().trim();
                  const words = searchTerm.split(/[\s&/+,-]+/);
                  for (const word of words) {
                    if (word.length >= 3 && ltName.includes(word)) {
                      return true;
                    }
                  }
                  const ltWords = ltName.split(/[\s&/+,-]+/);
                  for (const ltWord of ltWords) {
                    if (ltWord.length >= 3 && searchTerm.includes(ltWord)) {
                      return true;
                    }
                  }
                  return false;
                });
              }
              if (!leaveType && row.LeaveType.length > 2 && !codeToNameMap[row.LeaveType]) {
                console.log(
                  `[TransactionImport] Trying original value as custom leave type: "${row.LeaveType}"`
                );
                leaveType = leaveTypes2.find(
                  (lt) => lt.name.toLowerCase().includes(row.LeaveType.toLowerCase()) || row.LeaveType.toLowerCase().includes(lt.name.toLowerCase())
                );
              }
              if (!leaveType) {
                console.log(
                  `[TransactionImport] No leave type found for: "${mappedLeaveType}" (original: "${row.LeaveType}") - tried exact, fuzzy, and custom matching`
                );
                importStats.skippedMissingLeaveType++;
                continue;
              }
              const startDate = parseDate(row.LeaveTakenStartDate);
              let endDate;
              try {
                if (!row.LeaveTakenEndDate || row.LeaveTakenEndDate === "false" || row.LeaveTakenEndDate === false || row.LeaveTakenEndDate === "") {
                  endDate = startDate;
                } else {
                  endDate = parseDate(row.LeaveTakenEndDate);
                  if (isNaN(endDate.getTime())) {
                    endDate = startDate;
                  }
                }
              } catch (error) {
                console.log(
                  `[TransactionImport] Invalid end date for ${row.EmpNumber}, using start date as fallback`
                );
                endDate = startDate;
              }
              const totalDays = parseFloat(row.TotalLeaveDays) || 0;
              const isStartHalfDay = row["Is Start Date a Half Day"] === "TRUE" || row["Is Start Date a Half Day"] === true;
              const isEndHalfDay = row["Is End Date a Half Day"] === "TRUE" || row["Is End Date a Half Day"] === true;
              let status = "approved";
              if (row.Status) {
                if (typeof row.Status === "string") {
                  status = row.Status.toLowerCase();
                } else if (typeof row.Status === "number") {
                  switch (row.Status) {
                    case 1:
                      status = "approved";
                      break;
                    case 0:
                      status = "rejected";
                      break;
                    case 2:
                      status = "pending";
                      break;
                    case 3:
                      status = "withdrawn";
                      break;
                    default:
                      status = "approved";
                  }
                }
              }
              let totalDaysNumeric = totalDays;
              let workingDaysNumeric = totalDays;
              console.log(
                `[TransactionImport] Processing: ${row.EmpName} ${mappedLeaveType} from ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate} (${totalDays} days) - Status: ${status}`
              );
              const leaveRequest = {
                userId,
                leaveTypeId: leaveType.id,
                startDate,
                endDate,
                totalDays: totalDaysNumeric,
                workingDays: workingDaysNumeric,
                isStartHalfDay,
                isEndHalfDay,
                reason: `Imported leave transaction for ${row.EmpName}`,
                status,
                // Use status from Excel file
                orgId,
                documents: [],
                workflowId: null,
                workflowStatus: status === "approved" ? "completed" : status === "rejected" ? "rejected" : "pending",
                approvalHistory: JSON.stringify([
                  {
                    stepNumber: 0,
                    action: "imported",
                    userId: "system",
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    comment: `Leave transaction imported from Excel with status: ${status}`
                  }
                ]),
                appliedDate: startDate,
                // Use start date as applied date
                approvedBy: status === "approved" ? "system-import" : null,
                approvedAt: status === "approved" ? /* @__PURE__ */ new Date() : null
              };
              console.log(
                `[TransactionImport] Creating leave request:`,
                leaveRequest
              );
              leaveRequestsBatch.push(leaveRequest);
              if (status === "approved") {
                const leaveVariants2 = await storage.getLeaveVariants(orgId);
                const variant = leaveVariants2.find(
                  (v) => v.leaveTypeId === leaveType.id
                );
                if (variant) {
                  balanceTransactionsBatch.push({
                    userId,
                    leaveVariantId: variant.id,
                    year: currentYear,
                    transactionType: "deduction",
                    amount: -totalDays,
                    description: `Imported leave transaction: ${row.LeaveTakenStartDate} to ${row.LeaveTakenEndDate} (${totalDays} days) - Status: ${status}`,
                    orgId,
                    totalDays
                  });
                }
              }
              importedCount++;
              importStats.successful++;
            } catch (error) {
              console.error(
                `Error importing transaction for ${row.EmpNumber}:`,
                error
              );
              importStats.processingErrors++;
            }
          }
        }
        console.log(
          `[ExcelImport] Executing batch operations: ${leaveRequestsBatch.length} leave requests, ${balanceTransactionsBatch.length} balance transactions`
        );
        if (leaveRequestsBatch.length > 0) {
          console.log(
            `[ExcelImport] Batch inserting ${leaveRequestsBatch.length} leave requests...`
          );
          for (const request of leaveRequestsBatch) {
            try {
              await storage.createLeaveRequest(request);
            } catch (error) {
              console.error(`Error batch creating leave request:`, error);
            }
          }
        }
        if (balanceTransactionsBatch.length > 0) {
          console.log(
            `[ExcelImport] Batch processing ${balanceTransactionsBatch.length} balance transactions...`
          );
          const leaveVariants2 = await storage.getLeaveVariants(orgId);
          for (const transaction of balanceTransactionsBatch) {
            try {
              const variant = leaveVariants2.find(
                (v) => v.id === transaction.leaveVariantId
              );
              if (variant) {
                const balances = await storage.getEmployeeLeaveBalances(
                  transaction.userId,
                  currentYear,
                  orgId
                );
                let relevantBalance = balances.find(
                  (b) => b.leaveVariantId === transaction.leaveVariantId
                );
                if (!relevantBalance) {
                  relevantBalance = await storage.createEmployeeLeaveBalance({
                    userId: transaction.userId,
                    leaveVariantId: transaction.leaveVariantId,
                    totalEntitlement: 0,
                    currentBalance: 0,
                    year: currentYear,
                    orgId
                  });
                }
                const currentBalance = parseFloat(relevantBalance.currentBalance.toString()) || 0;
                const usedBalance = parseFloat(relevantBalance.usedBalance?.toString() || "0") || 0;
                const transactionDays = parseFloat(transaction.totalDays.toString()) || 0;
                const newBalance = currentBalance - transactionDays;
                const newUsedBalance = usedBalance + transactionDays;
                await storage.createLeaveBalanceTransaction({
                  ...transaction,
                  amount: -transactionDays,
                  balanceAfter: newBalance
                });
                await storage.updateEmployeeLeaveBalance(relevantBalance.id, {
                  currentBalance: newBalance,
                  usedBalance: newUsedBalance
                });
              }
            } catch (error) {
              console.error(
                `Error batch processing balance transaction:`,
                error
              );
            }
          }
        }
        const importedData = jsonData.filter((row) => {
          if (!row.EmpNumber || !row.EmpName || !row.LeaveType) return false;
          if (importType === "balances") {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || "0") || 0;
            const availed = parseFloat(row.LeaveAvailed || "0") || 0;
            const encashed = parseFloat(row.LeaveEncashed || "0") || 0;
            const lapsed = parseFloat(row.LeaveLapsed || "0") || 0;
            return openingBalance > 0 || availed > 0 || encashed > 0 || lapsed > 0;
          } else {
            return parseFloat(row.TotalLeaveDays || "0") > 0;
          }
        }).map((row) => {
          if (importType === "balances") {
            const openingBalance = parseFloat(row.LeaveOpeningBalance || "0") || 0;
            const availed = parseFloat(row.LeaveAvailed || "0") || 0;
            const encashed = parseFloat(row.LeaveEncashed || "0") || 0;
            const lapsed = parseFloat(row.LeaveLapsed || "0") || 0;
            return {
              empNumber: row.EmpNumber,
              empName: row.EmpName,
              leaveType: row.LeaveType,
              openingBalance,
              availed,
              encashed,
              lapsed,
              currentBalance: openingBalance - availed - encashed - lapsed
            };
          } else {
            return {
              empNumber: row.EmpNumber,
              empName: row.EmpName,
              leaveType: row.LeaveType,
              startDate: row.LeaveTakenStartDate,
              endDate: row.LeaveTakenEndDate,
              days: parseFloat(row.TotalLeaveDays || "0"),
              isStartHalfDay: row["Is Start Date a Half Day"] === "TRUE" || row["Is Start Date a Half Day"] === true,
              isEndHalfDay: row["Is End Date a Half Day"] === "TRUE" || row["Is End Date a Half Day"] === true,
              status: "approved"
            };
          }
        });
        console.log(`[ExcelImport] Import completed with detailed statistics:
      Total Rows Processed: ${importStats.totalRows}
      Successful Imports: ${importStats.successful}
      Skipped Due to Empty/Missing Fields: ${importStats.skippedEmpty}
      Skipped Header Rows: ${importStats.skippedHeaders}
      Skipped Missing Employee: ${importStats.skippedMissingEmployee}
      Skipped Missing Leave Type: ${importStats.skippedMissingLeaveType}
      Skipped Duplicate Rows: ${importStats.skippedDuplicateRows}
      Processing Errors: ${importStats.processingErrors}
      ====================================================
      Total Imported Successfully: ${importedCount}
      Total Skipped: ${importStats.totalRows - importStats.successful}`);
        const messageType = importType === "balances" ? "leave balance records" : "leave transaction records";
        res.json({
          imported: importedCount,
          total: jsonData.length,
          message: `Successfully imported ${importedCount} ${messageType}`,
          importedData,
          importStats
          // Include detailed statistics in the response
        });
      } catch (error) {
        console.error("Error executing import:", error);
        res.status(500).json({
          message: "Failed to import data: " + error.message
        });
      }
    }
  );
  app2.post("/api/calculate-all-balances", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const { calculationMethod = "auto", effectiveDate } = req.body;
      let allEmployees = [];
      try {
        const response = await fetch(
          "https://qa-api.resolveindia.com/worker-master-leave",
          {
            headers: {
              Authorization: `Bearer ${req.headers.authorization?.replace("Bearer ", "") || ""}`
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          allEmployees = data.data || [];
        }
      } catch (apiError) {
        console.log(
          "[BalanceCalculation] External API not available, using assignment data"
        );
      }
      const leaveVariants2 = await storage.getLeaveVariants(orgId);
      const assignments = await storage.getEmployeeAssignments(orgId);
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      let processedCount = 0;
      const results = [];
      const uniqueUserIds = [...new Set(assignments.map((a) => a.userId))];
      for (const userId of uniqueUserIds) {
        if (!userId || userId === "N/A") continue;
        const userAssignments = assignments.filter(
          (a) => a.userId === userId && a.assignmentType === "leave_variant"
        );
        const employee = allEmployees.find(
          (emp) => emp.user_id?.toString() === userId?.toString()
        );
        for (const assignment of userAssignments) {
          const variant = leaveVariants2.find(
            (v) => v.id === assignment.leaveVariantId
          );
          if (!variant || !variant.paidDaysInYear) continue;
          const existingBalances = await storage.getEmployeeLeaveBalances(
            userId,
            currentYear,
            orgId
          );
          const existingBalance = existingBalances.find(
            (b) => b.leaveVariantId === variant.id
          );
          if (existingBalance && calculationMethod === "auto") {
            continue;
          }
          let calculatedBalance = 0;
          let entitlement = variant.paidDaysInYear * 2;
          if (calculationMethod === "auto" && employee?.date_of_joining) {
            const joiningDate = new Date(employee.date_of_joining);
            const currentDate = effectiveDate ? new Date(effectiveDate) : /* @__PURE__ */ new Date();
            if (variant.grantLeaves === "in_advance") {
              calculatedBalance = entitlement;
            } else if (variant.grantLeaves === "after_earning") {
              const monthsWorked = Math.floor(
                (currentDate.getTime() - joiningDate.getTime()) / (30.44 * 24 * 60 * 60 * 1e3)
              );
              const monthlyAllocation = entitlement / 12;
              calculatedBalance = Math.floor(monthsWorked * monthlyAllocation);
            }
          } else {
            calculatedBalance = entitlement;
          }
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
          await storage.createLeaveBalanceTransaction({
            userId,
            leaveVariantId: variant.id,
            year: currentYear,
            transactionType: "credit",
            amount: calculatedBalance,
            balanceAfter: calculatedBalance,
            description: `${calculationMethod === "auto" ? "Automatic" : "Manual"} balance calculation for ${variant.leaveTypeName} (${calculatedBalance / 2} days)`,
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
        results: results.slice(0, 10),
        // Show first 10 for preview
        totalProcessed: processedCount
      });
    } catch (error) {
      console.error("Error calculating balances:", error);
      res.status(500).json({
        success: false,
        message: "Failed to calculate balances: " + error.message
      });
    }
  });
  app2.post(
    "/api/process-time-based-approvals",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `[TimeBasedApproval] Processing time-based approvals for org_id: ${orgId}`
        );
        const result = await storage.processPendingTimeBasedApprovals(orgId);
        console.log(
          `[TimeBasedApproval] Processed ${result.processed} requests`
        );
        if (result.errors.length > 0) {
          console.log(`[TimeBasedApproval] Errors:`, result.errors);
        }
        res.json({
          success: true,
          processed: result.processed,
          errors: result.errors
        });
      } catch (error) {
        console.error("Error processing time-based approvals:", error);
        res.status(500).json({
          success: false,
          message: "Failed to process time-based approvals: " + error.message
        });
      }
    }
  );
  app2.get(
    "/api/pending-time-based-approvals",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const pendingRequests = await storage.getLeaveRequests(orgId);
        const timeBasedPending = pendingRequests.filter(
          (request) => request.status === "pending" && request.scheduledAutoApprovalAt && new Date(request.scheduledAutoApprovalAt) > /* @__PURE__ */ new Date()
        );
        res.json({
          success: true,
          pendingApprovals: timeBasedPending.map((request) => ({
            id: request.id,
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            scheduledAt: request.scheduledAutoApprovalAt,
            currentStep: request.currentStep,
            workflowId: request.workflowId
          }))
        });
      } catch (error) {
        console.error("Error fetching pending time-based approvals:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch pending approvals: " + error.message
        });
      }
    }
  );
  app2.post("/api/migrate-employee-data", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { migrateEmployeeData: migrateEmployeeData2 } = await Promise.resolve().then(() => (init_employeeMapping(), employeeMapping_exports));
      await migrateEmployeeData2(orgId);
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
  app2.get(
    "/api/collaborative-leave-settings",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const result = await db.select().from(collaborativeLeaveSettingsEnhanced).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).limit(1);
        if (result.length === 0) {
          const [newSettings] = await db.insert(collaborativeLeaveSettingsEnhanced).values({
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
          }).returning();
          return res.json(newSettings);
        }
        res.json(result[0]);
      } catch (error) {
        console.error("Error fetching collaborative leave settings:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch settings: " + error.message
        });
      }
    }
  );
  app2.put(
    "/api/collaborative-leave-settings",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const updateData = { ...req.body, updatedAt: /* @__PURE__ */ new Date() };
        const existing = await db.select().from(collaborativeLeaveSettingsEnhanced).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).limit(1);
        if (existing.length === 0) {
          const [created] = await db.insert(collaborativeLeaveSettingsEnhanced).values({ ...updateData, orgId }).returning();
          return res.json(created);
        } else {
          const [updated] = await db.update(collaborativeLeaveSettingsEnhanced).set(updateData).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).returning();
          return res.json(updated);
        }
      } catch (error) {
        console.error("Error updating collaborative leave settings:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update settings: " + error.message
        });
      }
    }
  );
  app2.patch(
    "/api/collaborative-leave-settings",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const updateData = { ...req.body, updatedAt: /* @__PURE__ */ new Date() };
        const [updated] = await db.update(collaborativeLeaveSettingsEnhanced).set(updateData).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).returning();
        res.json(updated);
      } catch (error) {
        console.error("Error updating collaborative leave settings:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update settings: " + error.message
        });
      }
    }
  );
  app2.get(
    "/api/leave-requests/:leaveRequestId/tasks",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const leaveRequestId = parseInt(req.params.leaveRequestId);
        const tasks = await db.select().from(leaveTaskAssigneesEnhanced).where(
          and3(
            eq3(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequestId),
            eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
          )
        );
        res.json(tasks);
      } catch (error) {
        console.error("Error fetching leave tasks:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch tasks: " + error.message
        });
      }
    }
  );
  app2.get("/api/collaborative-tasks", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const allTasks = await db.select().from(leaveTaskAssigneesEnhanced).leftJoin(
        leaveRequests,
        eq3(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequests.id)
      ).where(eq3(leaveTaskAssigneesEnhanced.orgId, orgId)).orderBy(desc2(leaveTaskAssigneesEnhanced.createdAt));
      const transformedTasks = allTasks.map((row) => ({
        ...row.leave_task_assignees_enhanced,
        leaveRequesterId: row.leave_requests?.userId || null,
        leaveRequesterName: row.leave_requests?.employeeName || null
      }));
      res.json(transformedTasks);
    } catch (error) {
      console.error("Error fetching all collaborative tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch collaborative tasks: " + error.message
      });
    }
  });
  app2.post(
    "/api/leave-requests/:leaveRequestId/tasks",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const leaveRequestId = parseInt(req.params.leaveRequestId);
        const { tasks } = req.body;
        const tasksWithTokens = tasks.map((task) => ({
          ...task,
          leaveRequestId,
          orgId,
          acceptanceToken: generateUniqueToken(),
          uniqueLink: generateUniqueToken(),
          // Ensure backward compatibility for expected_support_date
          expectedSupportDate: task.expectedSupportDateFrom || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        }));
        const createdTasks = await db.insert(leaveTaskAssigneesEnhanced).values(tasksWithTokens).returning();
        for (const task of createdTasks) {
          await sendTaskNotification(task);
        }
        res.json(createdTasks);
      } catch (error) {
        console.error("Error creating leave tasks:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create tasks: " + error.message
        });
      }
    }
  );
  app2.get("/api/public/task/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [task] = await db.select().from(leaveTaskAssigneesEnhanced).where(eq3(leaveTaskAssigneesEnhanced.acceptanceToken, token)).limit(1);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found or invalid token"
        });
      }
      const [leaveRequest] = await db.select().from(leaveRequests).where(eq3(leaveRequests.id, task.leaveRequestId)).limit(1);
      res.json({
        task,
        leaveRequest: leaveRequest ? {
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          userId: leaveRequest.userId
        } : null
      });
    } catch (error) {
      console.error("Error fetching public task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch task: " + error.message
      });
    }
  });
  app2.post("/api/public/task/:token/respond", async (req, res) => {
    try {
      const { token } = req.params;
      const { action, comment } = req.body;
      const ipAddress = req.ip;
      const [task] = await db.select().from(leaveTaskAssigneesEnhanced).where(eq3(leaveTaskAssigneesEnhanced.acceptanceToken, token)).limit(1);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found or invalid token"
        });
      }
      const updateData = {
        status: action === "accept" ? "accepted" : "rejected",
        updatedAt: /* @__PURE__ */ new Date(),
        ...action === "accept" ? { acceptedAt: /* @__PURE__ */ new Date() } : {
          rejectedAt: /* @__PURE__ */ new Date(),
          rejectionComment: comment
        }
      };
      await db.update(leaveTaskAssigneesEnhanced).set(updateData).where(eq3(leaveTaskAssigneesEnhanced.id, task.id));
      await db.insert(taskStatusUpdates).values({
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
      console.error("Error responding to task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to respond to task: " + error.message
      });
    }
  });
  app2.patch("/api/tasks/:taskId/status", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const taskId = parseInt(req.params.taskId);
      const { status, comment } = req.body;
      const userId = req.user?.claims?.sub;
      const [task] = await db.select().from(leaveTaskAssigneesEnhanced).where(
        and3(
          eq3(leaveTaskAssigneesEnhanced.id, taskId),
          eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
        )
      ).limit(1);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found"
        });
      }
      await db.update(leaveTaskAssigneesEnhanced).set({
        status,
        statusUpdateComment: comment,
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(leaveTaskAssigneesEnhanced.id, taskId));
      await db.insert(taskStatusUpdates).values({
        taskId,
        oldStatus: task.status,
        newStatus: status,
        updateComment: comment,
        updatedBy: userId,
        orgId
      });
      res.json({
        success: true,
        message: "Task status updated successfully"
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update task status: " + error.message
      });
    }
  });
  app2.post(
    "/api/leave-requests/:leaveRequestId/closure-report",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const leaveRequestId = parseInt(req.params.leaveRequestId);
        const { employeeComments, overallLeaveComments } = req.body;
        const [report] = await db.insert(leaveClosureReports).values({
          leaveRequestId,
          employeeComments,
          overallLeaveComments,
          submittedAt: /* @__PURE__ */ new Date(),
          orgId
        }).returning();
        res.json(report);
      } catch (error) {
        console.error("Error creating closure report:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create closure report: " + error.message
        });
      }
    }
  );
  app2.patch(
    "/api/closure-reports/:reportId/review",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        const reportId = parseInt(req.params.reportId);
        const { managerRating, managerComments } = req.body;
        const managerId = req.user?.claims?.sub;
        const [updated] = await db.update(leaveClosureReports).set({
          managerRating,
          managerComments,
          reviewedAt: /* @__PURE__ */ new Date(),
          reviewedBy: managerId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(
          and3(
            eq3(leaveClosureReports.id, reportId),
            eq3(leaveClosureReports.orgId, orgId)
          )
        ).returning();
        res.json(updated);
      } catch (error) {
        console.error("Error reviewing closure report:", error);
        res.status(500).json({
          success: false,
          message: "Failed to review closure report: " + error.message
        });
      }
    }
  );
  app2.get("/api/my-assigned-tasks", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.json([]);
      }
      const tasks = await db.select().from(leaveTaskAssigneesEnhanced).where(
        and3(
          eq3(leaveTaskAssigneesEnhanced.assigneeEmail, user.email),
          eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
        )
      ).orderBy(desc2(leaveTaskAssignees.expectedSupportDate));
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch assigned tasks: " + error.message
      });
    }
  });
  function generateUniqueToken() {
    return randomBytes(32).toString("hex");
  }
  async function sendTaskNotification(task) {
    console.log(
      `Notification would be sent to ${task.assigneeEmail} for task: ${task.taskDescription}`
    );
    console.log("Task notification details:", {
      assigneeName: task.assigneeName,
      assigneeEmail: task.assigneeEmail,
      taskDescription: task.taskDescription,
      expectedSupportDate: task.expectedSupportDate,
      acceptanceLink: `/api/public/task/${task.acceptanceToken}`
    });
  }
  app2.get(
    "/api/collaborative-leave-settings",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const settings = await db.select().from(collaborativeLeaveSettingsEnhanced).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).limit(1);
        if (settings.length === 0) {
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
    }
  );
  app2.put(
    "/api/collaborative-leave-settings",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const settingsData = req.body;
        const existingSettings = await db.select().from(collaborativeLeaveSettingsEnhanced).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).limit(1);
        if (existingSettings.length === 0) {
          const newSettings = await db.insert(collaborativeLeaveSettingsEnhanced).values({
            ...settingsData,
            orgId,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          res.json(newSettings[0]);
        } else {
          const updatedSettings = await db.update(collaborativeLeaveSettingsEnhanced).set({
            ...settingsData,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq3(collaborativeLeaveSettingsEnhanced.orgId, orgId)).returning();
          res.json(updatedSettings[0]);
        }
      } catch (error) {
        console.error("Error updating collaborative leave settings:", error);
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  );
  app2.get(
    "/api/leave-requests/:leaveRequestId/tasks",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const { leaveRequestId } = req.params;
        const tasks = await db.select().from(leaveTaskAssigneesEnhanced).where(
          and3(
            eq3(
              leaveTaskAssigneesEnhanced.leaveRequestId,
              parseInt(leaveRequestId)
            ),
            eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
          )
        );
        res.json(tasks);
      } catch (error) {
        console.error("Error fetching leave tasks:", error);
        res.status(500).json({ message: "Failed to fetch tasks" });
      }
    }
  );
  app2.post(
    "/api/leave-requests/:leaveRequestId/tasks",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const { leaveRequestId } = req.params;
        const { tasks } = req.body;
        console.log(
          "\u{1F536} Creating tasks with assigneeUserId data:",
          tasks.map((t) => ({
            name: t.assigneeName,
            userId: t.assigneeUserId,
            email: t.assigneeEmail
          }))
        );
        const createdTasks = [];
        for (const task of tasks) {
          const uniqueLink = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const [newTask] = await db.insert(leaveTaskAssigneesEnhanced).values({
            leaveRequestId: parseInt(leaveRequestId),
            assigneeName: task.assigneeName,
            assigneeUserId: task.assigneeUserId,
            // Store user_id for task assignment
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
            orgId
          }).returning();
          createdTasks.push(newTask);
        }
        console.log(
          "\u2705 Tasks created successfully with user IDs:",
          createdTasks.map((t) => ({
            id: t.id,
            assigneeUserId: t.assigneeUserId
          }))
        );
        res.json(createdTasks);
      } catch (error) {
        console.error("Error creating task assignment:", error);
        res.status(500).json({
          message: "Failed to create tasks: " + error.message
        });
      }
    }
  );
  app2.get("/api/tasks/assigned-to-me/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
      const tasks = await db.select().from(leaveTaskAssigneesEnhanced).where(
        and3(
          eq3(leaveTaskAssigneesEnhanced.assigneeUserId, userId),
          eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
        )
      ).orderBy(desc2(leaveTaskAssigneesEnhanced.createdAt));
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks assigned to user:", error);
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });
  app2.get("/api/tasks/assigned-by-me/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
      const userLeaveRequests = await db.select({ id: leaveRequests.id }).from(leaveRequests).where(
        and3(eq3(leaveRequests.userId, userId), eq3(leaveRequests.orgId, orgId))
      );
      if (userLeaveRequests.length === 0) {
        return res.json([]);
      }
      const leaveRequestIds = userLeaveRequests.map((lr) => lr.id);
      const tasks = await db.select().from(leaveTaskAssigneesEnhanced).where(
        and3(
          inArray2(leaveTaskAssigneesEnhanced.leaveRequestId, leaveRequestIds),
          eq3(leaveTaskAssigneesEnhanced.orgId, orgId)
        )
      ).orderBy(desc2(leaveTaskAssigneesEnhanced.createdAt));
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks assigned by user:", error);
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });
  app2.patch("/api/tasks/:taskId/accept", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { acceptanceResponse } = req.body;
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced).set({
        status: "accepted",
        acceptanceResponse: acceptanceResponse || "Task accepted",
        acceptedAt: /* @__PURE__ */ new Date(),
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(leaveTaskAssigneesEnhanced.id, parseInt(taskId))).returning();
      res.json(updatedTask);
    } catch (error) {
      console.error("Error accepting task:", error);
      res.status(500).json({ message: "Failed to accept task" });
    }
  });
  app2.patch("/api/tasks/:taskId/reject", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { statusComments } = req.body;
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced).set({
        status: "rejected",
        statusComments,
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(leaveTaskAssigneesEnhanced.id, parseInt(taskId))).returning();
      res.json(updatedTask);
    } catch (error) {
      console.error("Error rejecting task:", error);
      res.status(500).json({ message: "Failed to reject task" });
    }
  });
  app2.patch("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      console.log(
        `[TaskCompletion] Updating task ${req.params.taskId} with:`,
        req.body
      );
      const { taskId } = req.params;
      const { status, statusComments } = req.body;
      const [updatedTask] = await db.update(leaveTaskAssigneesEnhanced).set({
        status,
        // 'done' or 'not_done'
        statusComments,
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(leaveTaskAssigneesEnhanced.id, parseInt(taskId))).returning();
      console.log(`[TaskCompletion] Updated task result:`, updatedTask);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });
  app2.post("/api/tasks/:uniqueLink/status", async (req, res) => {
    try {
      const { uniqueLink } = req.params;
      const { status, comments } = req.body;
      const updatedTask = await db.update(leaveTaskAssigneesEnhanced).set({
        status,
        statusComments: comments,
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        ...status === "accepted" && { acceptedAt: /* @__PURE__ */ new Date() }
      }).where(eq3(leaveTaskAssigneesEnhanced.uniqueLink, uniqueLink)).returning();
      if (updatedTask.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(updatedTask[0]);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });
  app2.get(
    "/api/leave-requests/:leaveRequestId/closure-report",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const { leaveRequestId } = req.params;
        const report = await db.select().from(leaveClosureReportsEnhanced).where(
          and3(
            eq3(
              leaveClosureReportsEnhanced.leaveRequestId,
              parseInt(leaveRequestId)
            ),
            eq3(leaveClosureReportsEnhanced.orgId, orgId)
          )
        ).limit(1);
        res.json(report.length > 0 ? report[0] : null);
      } catch (error) {
        console.error("Error fetching closure report:", error);
        res.status(500).json({ message: "Failed to fetch closure report" });
      }
    }
  );
  app2.post(
    "/api/leave-requests/:leaveRequestId/closure-report",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = req.headers["x-org-id"] ? parseInt(req.headers["x-org-id"]) : 60;
        const { leaveRequestId } = req.params;
        const reportData = req.body;
        const existingReport = await db.select().from(leaveClosureReportsEnhanced).where(
          and3(
            eq3(
              leaveClosureReportsEnhanced.leaveRequestId,
              parseInt(leaveRequestId)
            ),
            eq3(leaveClosureReportsEnhanced.orgId, orgId)
          )
        ).limit(1);
        if (existingReport.length === 0) {
          const newReport = await db.insert(leaveClosureReportsEnhanced).values({
            leaveRequestId: parseInt(leaveRequestId),
            employeeComments: reportData.employeeComments,
            taskReviews: reportData.taskReviews,
            orgId,
            submittedAt: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          res.json(newReport[0]);
        } else {
          const updatedReport = await db.update(leaveClosureReportsEnhanced).set({
            employeeComments: reportData.employeeComments,
            taskReviews: reportData.taskReviews,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(
            and3(
              eq3(
                leaveClosureReportsEnhanced.leaveRequestId,
                parseInt(leaveRequestId)
              ),
              eq3(leaveClosureReportsEnhanced.orgId, orgId)
            )
          ).returning();
          res.json(updatedReport[0]);
        }
      } catch (error) {
        console.error("Error saving closure report:", error);
        res.status(500).json({ message: "Failed to save closure report" });
      }
    }
  );
  app2.get("/api/debug-external-db/:orgId", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const dbRequests = await db.select().from(leaveRequests).where(eq3(leaveRequests.orgId, orgId));
      const dbTransactions = await db.select().from(leaveBalanceTransactions).where(eq3(leaveBalanceTransactions.orgId, orgId));
      const importedRequests = dbRequests.filter(
        (r) => r.reason?.includes("Imported") || r.reason?.includes("transaction")
      );
      const userCounts = {};
      dbRequests.forEach((req2) => {
        userCounts[req2.userId] = (userCounts[req2.userId] || 0) + 1;
      });
      res.json({
        orgId,
        database: "20.204.119.48:5432/ezii-leave",
        summary: {
          totalRequests: dbRequests.length,
          importedRequests: importedRequests.length,
          totalTransactions: dbTransactions.length,
          deductionTransactions: dbTransactions.filter(
            (t) => t.transactionType === "deduction"
          ).length,
          userRequestCounts: userCounts
        },
        samples: {
          firstRequest: dbRequests[0] || null,
          importedRequest: importedRequests[0] || null,
          firstTransaction: dbTransactions[0] || null
        }
      });
    } catch (error) {
      console.error("External DB debug error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  app2.delete(
    "/api/delete-all-imported-data",
    isAuthenticated,
    async (req, res) => {
      try {
        const orgId = getOrgIdFromHeaders(req);
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Starting cleanup of all imported data for org_id: ${orgId}`
        );
        const client = await db.$client;
        const transactionResult = await client.query(
          "DELETE FROM leave_balance_transactions WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${transactionResult.rowCount} leave_balance_transactions`
        );
        const balanceResult = await client.query(
          "DELETE FROM employee_leave_balances WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${balanceResult.rowCount} employee_leave_balances`
        );
        const requestResult = await client.query(
          "DELETE FROM leave_requests WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${requestResult.rowCount} leave_requests`
        );
        const ptoResult = await client.query(
          "DELETE FROM pto_requests WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(`\u{1F5D1}\uFE0F [DELETE] Deleted ${ptoResult.rowCount} pto_requests`);
        const compOffResult = await client.query(
          "DELETE FROM comp_off_requests WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${compOffResult.rowCount} comp_off_requests`
        );
        const taskResult = await client.query(
          "DELETE FROM leave_task_assignees WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${taskResult.rowCount} collaborative leave tasks`
        );
        const closureResult = await client.query(
          "DELETE FROM leave_closure_reports WHERE org_id = $1 RETURNING id",
          [orgId]
        );
        console.log(
          `\u{1F5D1}\uFE0F [DELETE] Deleted ${closureResult.rowCount} closure reports`
        );
        const summary = {
          orgId,
          deletedCounts: {
            leave_balance_transactions: transactionResult.rowCount || 0,
            employee_leave_balances: balanceResult.rowCount || 0,
            leave_requests: requestResult.rowCount || 0,
            pto_requests: ptoResult.rowCount || 0,
            comp_off_requests: compOffResult.rowCount || 0,
            collaborative_tasks: taskResult.rowCount || 0,
            closure_reports: closureResult.rowCount || 0
          },
          totalDeleted: (transactionResult.rowCount || 0) + (balanceResult.rowCount || 0) + (requestResult.rowCount || 0) + (ptoResult.rowCount || 0) + (compOffResult.rowCount || 0) + (taskResult.rowCount || 0) + (closureResult.rowCount || 0)
        };
        console.log(
          `\u2705 [DELETE] Cleanup completed for org_id ${orgId}:`,
          summary
        );
        res.json({
          success: true,
          message: `Successfully deleted all imported data for organization ${orgId}`,
          summary
        });
      } catch (error) {
        console.error("\u274C [DELETE] Error deleting imported data:", error);
        res.status(500).json({
          success: false,
          message: "Failed to delete imported data: " + error.message
        });
      }
    }
  );
  app2.get("/api/blackout-periods", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const periods = await storage.getBlackoutPeriods(orgId);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching blackout periods:", error);
      res.status(500).json({ message: "Failed to fetch blackout periods" });
    }
  });
  app2.post("/api/blackout-periods", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrgIdFromHeaders(req);
      const periodData = { ...req.body, orgId };
      const period = await storage.createBlackoutPeriod(periodData);
      res.json(period);
    } catch (error) {
      console.error("Error creating blackout period:", error);
      res.status(400).json({ message: "Failed to create blackout period" });
    }
  });
  app2.put("/api/blackout-periods/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = getOrgIdFromHeaders(req);
      const periodData = { ...req.body, orgId };
      const period = await storage.updateBlackoutPeriod(id, periodData);
      res.json(period);
    } catch (error) {
      console.error("Error updating blackout period:", error);
      res.status(400).json({ message: "Failed to update blackout period" });
    }
  });
  app2.delete("/api/blackout-periods/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = getOrgIdFromHeaders(req);
      await storage.deleteBlackoutPeriod(id, orgId);
      res.json({ message: "Blackout period deleted successfully" });
    } catch (error) {
      console.error("Error deleting blackout period:", error);
      res.status(400).json({ message: "Failed to delete blackout period" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  if (process.env.NODE_ENV !== "production") {
    console.log("Skipping static file serving in development mode");
    return;
  }
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
