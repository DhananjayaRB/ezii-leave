import React from 'react';

export default function TestEmployeeOverview() {
  console.log('[TestEmployeeOverview] Component loaded - SHOULD BE VISIBLE');
  
  return (
    <div className="p-8">
      <div className="bg-red-500 text-white p-6 rounded-lg text-center">
        <h1 className="text-3xl font-bold">🚨 TEST COMPONENT LOADED 🚨</h1>
        <p className="text-xl mt-2">If you can see this, the routing works</p>
        <p className="mt-2">This is TestEmployeeOverview.tsx</p>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-bold">Test Card 1</h3>
          <p>Basic content</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-bold">Test Card 2</h3>
          <p>More content</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-bold">Test Card 3</h3>
          <p>Final content</p>
        </div>
      </div>
    </div>
  );
}