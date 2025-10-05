import React from "react";
import AppLayout from "../components/layout/AppLayout";
import StudentManagement from "../components/layout/StudentManagement";

const Students: React.FC = () => {
  return (
    <AppLayout>
      <StudentManagement />
    </AppLayout>
  );
};

export default Students;
