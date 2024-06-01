import ContentViewer from "../components/ContentViewer"
import about from "../../mds/aboutme.md?raw"

export default function AboutPage() {
    return <ContentViewer content={about}/>
}