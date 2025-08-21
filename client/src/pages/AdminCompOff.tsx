import Layout from "@/components/Layout";
import CompOffSetup from "@/components/Setup/CompOffSetup";

export default function AdminCompOff() {
  return (
    <Layout>
      <div className="p-6">
<<<<<<< HEAD
        <CompOffSetup
          onNext={() => {}}
          onPrevious={() => {}}
          isLast={false}
          isLoading={false}
=======
        <CompOffSetup 
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
