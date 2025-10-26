import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { IndexManagement } from "@/components/ai/IndexManagement";
import { SearchExplorer } from "@/components/ai/SearchExplorer";
import { ConversationWorkspace } from "@/components/ai/ConversationWorkspace";

export default function AI() {
  return (
    <motion.div
      className="container mx-auto px-4 py-8 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient-primary">AI Assistant</h1>
        </div>
        <p className="text-muted-foreground">
          Ask natural language questions about your data
        </p>
      </motion.div>

      {/* Layout: Left sidebar + Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar: Index + Search tools */}
        <motion.aside
          className="lg:col-span-4 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <IndexManagement />
          <SearchExplorer />
        </motion.aside>

        {/* Main conversation workspace */}
        <motion.section
          className="lg:col-span-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ConversationWorkspace />
        </motion.section>
      </div>
    </motion.div>
  );
}
