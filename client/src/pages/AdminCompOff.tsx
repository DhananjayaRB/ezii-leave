import Layout from "@/components/Layout";
import CompOffSetup from "@/components/Setup/CompOffSetup";

export default function AdminCompOff() {
  return (
    <Layout>
      <div className="p-6">
        <CompOffSetup
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
