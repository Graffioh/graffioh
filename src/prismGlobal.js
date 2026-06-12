// prism-react-renderer ships its own Prism instance but bundles only ~50
// languages. The extra grammars the site uses (java, bash, …) come from
// prismjs's component files, which register themselves onto the *global*
// `Prism`. Point that global at prism-react-renderer's instance so its
// <Highlight> sees every language we add in prismLanguages.js.
import { Prism } from "prism-react-renderer";

if (typeof globalThis !== "undefined" && !globalThis.Prism) {
  globalThis.Prism = Prism;
}

export default Prism;
