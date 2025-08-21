import Layout from "@/components/Layout";
import PTOSetup from "@/components/Setup/PTOSetup";

export default function AdminPTO() {
  return (
    <Layout>
      <div className="p-6">
        <PTOSetup
          onNext={() => {}}
          onPrevious={() => {}}
          isLast={false}
          isLoading={false}
          showNavigation={false}
        />
      </div>
    </Layout>
  );
}
