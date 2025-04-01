import { useEffect, useState } from "react";

import SignPDFComponent from "../components/sign.js";

export default function TestPage() {
  const [inputPDF, setInputPDF] = useState();

  useEffect(() => {
    async function get() {
      const contentUrl = `blank.pdf`;
      const response = await fetch(contentUrl);
      const buffer = await response.arrayBuffer();
      setInputPDF(buffer);
    }
    get();
  }, []);

  return <SignPDFComponent inputPDF={inputPDF} />;
}
