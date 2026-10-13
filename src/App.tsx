import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HSSocial from "./pages/HSSocial";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota da sua página inicial */}
        <Route path="/" element={<Index />} />
        
        {/* Rota do seu novo aplicativo de mensagem */}
        <Route path="/social" element={<HSSocial />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

