import Layout from "@/components/Layout";
import PTOSetup from "@/components/Setup/PTOSetup";

export default function AdminPTO() {
  return (
    <Layout>
      <div className="p-6">
<<<<<<< HEAD
        <PTOSetup
          onNext={() => {}}
          onPrevious={() => {}}
          isLast={false}
          isLoading={false}
=======
        <PTOSetup 
          onNext={() => {}} 
          onPrevious={() => {}} 
          isLast={false} 
          isLoading={false} 
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
          showNavigation={false}
        />
      </div>
    </Layout>
  );
}
