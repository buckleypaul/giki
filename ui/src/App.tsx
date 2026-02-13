import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { PendingChangesProvider } from './context/PendingChangesContext';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <PendingChangesProvider>
          <Routes>
            <Route path="/*" element={<Layout />} />
          </Routes>
        </PendingChangesProvider>
      </BranchProvider>
    </BrowserRouter>
  );
}
