import { db } from "../db";
import { employeeLeaveBalances, leaveBalanceTransactions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function migrateEmployeeData(orgId: number) {
  console.log(`[EmployeeMapping] Starting data migration for org_id: ${orgId}`);
  
  // Known mappings from external API
  const employeeMappings = [
    { employee_number: "IN2005002", user_id: "1435" }, // Mangesh Mohite
    // Add more mappings as needed
  ];
  
  for (const mapping of employeeMappings) {
    const { employee_number, user_id } = mapping;
    
    try {
      console.log(`[EmployeeMapping] Migrating data from ${employee_number} to ${user_id}`);
      
      // 1. Update leave balances
      const balanceUpdateResult = await db
        .update(employeeLeaveBalances)
        .set({ userId: user_id })
        .where(and(
          eq(employeeLeaveBalances.userId, employee_number),
          eq(employeeLeaveBalances.orgId, orgId)
        ));
      
      console.log(`[EmployeeMapping] Updated ${balanceUpdateResult.rowCount || 0} balance records`);
      
      // 2. Update transactions
      const transactionUpdateResult = await db
        .update(leaveBalanceTransactions)
        .set({ userId: user_id })
        .where(and(
          eq(leaveBalanceTransactions.userId, employee_number),
          eq(leaveBalanceTransactions.orgId, orgId)
        ));
      
      console.log(`[EmployeeMapping] Updated ${transactionUpdateResult.rowCount || 0} transaction records`);
      
    } catch (error) {
      console.error(`[EmployeeMapping] Error migrating ${employee_number} to ${user_id}:`, error);
    }
  }
  
  console.log(`[EmployeeMapping] Migration completed for org_id: ${orgId}`);
}