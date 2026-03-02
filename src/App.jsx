import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RSAOptimizer from "./pages/RSAOptimizer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsa" element={<RSAOptimizer />} />
      </Routes>
    </BrowserRouter>
  );
}
