import ContentViewer from "../components/ContentViewer"
import projects from "../../mds/projects.md?raw"

export default function ProjectsPage() {
    return <ContentViewer content={projects}/>
}