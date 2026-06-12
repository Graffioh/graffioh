// Side-effect module: register the grammars prism-react-renderer doesn't bundle
// but the site's markdown (java is the most-used fence) and CodeFile's arbitrary
// GitHub source files need. Importing prismGlobal FIRST guarantees
// `globalThis.Prism` is set before each prismjs component file runs (the files
// register onto that global). clike / c / cpp / css / markup are already bundled
// by prism-react-renderer, so the components below just extend them.
import "./prismGlobal";

import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-markup-templating"; // php depends on this
import "prismjs/components/prism-php";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-groovy";
import "prismjs/components/prism-lua";
import "prismjs/components/prism-r";
import "prismjs/components/prism-julia";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-haskell";
import "prismjs/components/prism-ocaml";
import "prismjs/components/prism-clojure";
import "prismjs/components/prism-elixir";
import "prismjs/components/prism-erlang";
import "prismjs/components/prism-perl";
import "prismjs/components/prism-powershell";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-ini";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-makefile";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-latex";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-less";
