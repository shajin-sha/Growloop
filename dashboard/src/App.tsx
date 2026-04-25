import { Route, Routes } from "react-router-dom";

import { ExperimentsPage } from "@/features/experiments/components/ExperimentsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ExperimentsPage />} />
    </Routes>
  );
}
