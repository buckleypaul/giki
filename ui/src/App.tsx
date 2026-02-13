import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <Routes>
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BranchProvider>
    </BrowserRouter>
  );
}
