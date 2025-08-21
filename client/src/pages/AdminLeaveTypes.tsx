import Layout from "@/components/Layout";
import LeaveTypesSetup from "@/components/Setup/LeaveTypesSetup";

export default function AdminLeaveTypes() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Types Configuration
          </h1>
          <p className="text-gray-600 mt-2">
            Manage leave types, variants, and employee assignments for your
            organization.
          </p>
        </div>

        {/* Reuse the LeaveTypesSetup component */}
<<<<<<< HEAD
        <LeaveTypesSetup
          onNext={() => {}}
          onPrevious={() => {}}
=======
        <LeaveTypesSetup 
          onNext={() => {}} 
          onPrevious={() => {}} 
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
          showNavigation={false}
        />
      </div>
    </Layout>
  );
}
