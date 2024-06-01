import ContentViewer from "../components/contentViewer"
import about from "../../mds/aboutme.md?raw"

export default function AboutPage() {
    return <ContentViewer content={about}/>
}