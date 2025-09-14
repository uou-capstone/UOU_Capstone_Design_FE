import React from "react";
import TopNav from "./TopNav";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

const AppLayout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gray-900">
          {children}
        </main>
        <RightSidebar />
      </div>
    </div>
  );
};

export default AppLayout;
