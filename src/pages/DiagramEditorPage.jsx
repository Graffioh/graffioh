import { useContext } from "react";
import DiagramEditor from "../diagrams/DiagramEditor";
import { ThemeContext } from "../ThemeContext";

export default function DiagramEditorPage() {
  const { theme } = useContext(ThemeContext);

  return <DiagramEditor theme={theme} />;
}
