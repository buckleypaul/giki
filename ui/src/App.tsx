import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BranchProvider } from './context/BranchContext';
import { PendingChangesProvider } from './context/PendingChangesContext';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <BranchProvider>
          <PendingChangesProvider>
            <Routes>
              <Route path="/*" element={<Layout />} />
            </Routes>
          </PendingChangesProvider>
        </BranchProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
