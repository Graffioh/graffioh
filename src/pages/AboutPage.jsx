import about from "../../mds/aboutme.md?raw"
import ContentViewer from "../ContentViewer"

export default function AboutPage() {
    return <ContentViewer content={about}/>
}