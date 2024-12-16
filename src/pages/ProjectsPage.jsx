import projects from "../../mds/projects.md?raw";
import ContentViewer from "../ContentViewer";

export default function ProjectsPage() {
  return <ContentViewer content={projects} />;
}

