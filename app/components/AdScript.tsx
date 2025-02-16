// app/components/AdScript.tsx

import { useEffect } from "react";

export default function AdScript() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2697408594586054";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
