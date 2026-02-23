import { Phone } from "lucide-react";
import { motion } from "framer-motion";

const SOSButtons = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
    >
      <a
        href="tel:179"
        className="group flex items-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-white font-bold shadow-lg hover:bg-amber-600 transition-all hover:shadow-xl"
        aria-label="Appeler CIE au 179"
      >
        <Phone className="h-5 w-5" />
        <span className="text-sm">
          <span className="hidden sm:inline">CIE </span>179
        </span>
        <span className="text-xs opacity-80 hidden sm:inline">⚡</span>
      </a>
      <a
        href="tel:125"
        className="group flex items-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white font-bold shadow-lg hover:bg-blue-600 transition-all hover:shadow-xl"
        aria-label="Appeler SODECI au 125"
      >
        <Phone className="h-5 w-5" />
        <span className="text-sm">
          <span className="hidden sm:inline">SODECI </span>125
        </span>
        <span className="text-xs opacity-80 hidden sm:inline">💧</span>
      </a>
    </motion.div>
  );
};

export default SOSButtons;
