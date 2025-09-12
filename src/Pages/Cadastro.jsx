import React from "react";
import { motion } from "framer-motion";
import FormularioCadastro from "../components/cadastro/FormularioCadastro";

export default function Cadastro() {
  const handleSuccess = () => {
    // Aqui pode adicionar lógica adicional após salvar com sucesso
    console.log("Serviço cadastrado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Programação de Serviços Elétricos
          </h1>
          <p className="text-gray-600 text-lg">
            Sistema integrado para gestão e controle de obras elétricas
          </p>
        </motion.div>

        <FormularioCadastro onSuccess={handleSuccess} />
      </div>
    </div>
  );
}