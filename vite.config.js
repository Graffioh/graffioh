import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdsEditorApi from "./mdsEditorPlugin.js";

export default defineConfig({
  plugins: [react(), mdsEditorApi()],
});
