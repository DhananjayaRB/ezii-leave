import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DancingLoader, FullPageDancingLoader, InlineDancingLoader } from "@/components/ui/dancing-loader";

export default function LoaderDemo() {
  const [showFullPage, setShowFullPage] = useState(false);
  const [showInline, setShowInline] = useState(false);

  const handleShowFullPage = () => {
    setShowFullPage(true);
    setTimeout(() => setShowFullPage(false), 3000);
  };

  const handleShowInline = () => {
    setShowInline(true);
    setTimeout(() => setShowInline(false), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dancing Loader Demo</h1>
          <p className="text-gray-600">Check out our animated dancing loader in action!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Small Loader */}
          <Card>
            <CardHeader>
              <CardTitle>Small Loader</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <DancingLoader size="sm" text="Small dancing loader" />
            </CardContent>
          </Card>

          {/* Medium Loader */}
          <Card>
            <CardHeader>
              <CardTitle>Medium Loader</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <DancingLoader size="md" text="Medium dancing loader" />
            </CardContent>
          </Card>

          {/* Large Loader */}
          <Card>
            <CardHeader>
              <CardTitle>Large Loader</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <DancingLoader size="lg" text="Large dancing loader" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Page Loader Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Full Page Loader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This loader covers the entire screen and is perfect for page transitions or major operations.
              </p>
              <Button onClick={handleShowFullPage} className="w-full">
                Show Full Page Loader (3s)
              </Button>
            </CardContent>
          </Card>

          {/* Inline Loader Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Inline Loader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This loader is perfect for loading content within a specific section.
              </p>
              <Button onClick={handleShowInline} className="w-full mb-4">
                Show Inline Loader (3s)
              </Button>
              {showInline && <InlineDancingLoader text="Loading content..." />}
            </CardContent>
          </Card>
        </div>

        {/* No Text Loader */}
        <Card>
          <CardHeader>
            <CardTitle>Loader Without Text</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <DancingLoader size="md" text="" />
          </CardContent>
        </Card>
      </div>

      {/* Full Page Loader */}
      {showFullPage && <FullPageDancingLoader text="Loading amazing content..." />}
    </div>
  );
}