import about from "../../mds/aboutme.md?raw"
import ContentViewer from "../components/ContentViewer"

export default function AboutPage() {
    return <ContentViewer content={about}/>
}