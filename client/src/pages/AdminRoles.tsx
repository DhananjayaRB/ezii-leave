import Layout from "@/components/Layout";
import RolesSetup from "@/components/Setup/RolesSetup";

export default function AdminRoles() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-2">
            Manage roles and permissions for your organization.
          </p>
        </div>
        
        {/* Reuse the RolesSetup component */}
        <RolesSetup 
          onNext={() => {}} 
          onPrevious={() => {}} 
          showNavigation={false}
        />
      </div>
    </Layout>
  );
}