import notes from "../../mds/notes.md?raw"
import ContentViewer from "../components/ContentViewer"

export default function NotesPage() {
    return <ContentViewer content={notes}/>
}