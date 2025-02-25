import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

export default function SignPDFPage() {
  const [doc, setDoc] = useState();
  const [text, setText] = useState(
    "Jennifer STEPHAN\nresponsable Ruche numérique\nSG/SNUM",
  );
  const [name, setName] = useState("Jennifer STEPHAN");
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(undefined);
  const [clickEvent, setClickEvent] = useState(undefined);
  const [result, setResult] = useState();

  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
  const url = "BRB-177 (EJ).pdf";

  useEffect(() => {
    async function fetchDoc() {
      const existingPdfBytes = await fetch(url).then((res) =>
        res.arrayBuffer(),
      );

      setDoc(existingPdfBytes);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      setPageCount(pdfDoc.getPageCount());
      setPageNumber(0);
    }
    fetchDoc();
  }, []);

  useEffect(() => {
    if (!doc || pageNumber === undefined) {
      return;
    }
    updateDisplayedContent(clickEvent);
  }, [doc, pageNumber, clickEvent, result]);

  async function updateDisplayedContent(e) {
    if (!doc || pageNumber === undefined) {
      return;
    }
    const pdfDoc = await PDFDocument.load(doc);
    if (e) {
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const TimesRomanItalic = await pdfDoc.embedFont(
        StandardFonts.TimesRomanItalic,
      );
      const page = pdfDoc.getPage(pageNumber);
      const { width, height } = page.getSize();

      const fontSize = 20;
      const lineHeight = timesRomanFont.heightAtSize(fontSize) * 1.5;
      page.drawText(text, {
        x: e.pageX,
        y: height - e.pageY - fontSize / 2, // - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        lineHeight,
      });
      page.drawText(name, {
        x: e.pageX,
        y:
          height -
          e.pageY -
          fontSize / 2 -
          10 -
          lineHeight * text.split("\n").length,
        size: fontSize,
        font: TimesRomanItalic,
      });
    }

    const pdfDataUri = await pdfDoc.save();

    if (result) {
      const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      document.getElementById("pdf").src = pdfDataUri;
    }
    const pdf = await pdfjsLib.getDocument({ data: pdfDataUri }).promise;
    const page = await pdf.getPage(pageNumber + 1);
    var scale = 1;
    var viewport = page.getViewport({ scale: scale });

    var canvas = document.getElementById("the-canvas");
    var context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    var renderTask = page.render(renderContext).promise;
    renderTask.then(
      function () {
        console.log("Page rendered");
      },
      function (reason) {
        // PDF loading error
        console.error(reason);
      },
    );
  }

  function onMouseMove(e) {
    console.log(e);
  }

  function onClick(e) {
    setResult(false);
    setClickEvent(e);
  }

  function updatePageNumber(shift) {
    if (shift < 0) {
      if (pageNumber == 0) {
        return;
      }
    }
    if (shift > 0) {
      if (pageNumber === pageCount - 1) {
        return;
      }
    }

    setResult(false);
    setPageNumber(pageNumber + shift);
    setClickEvent();
  }

  function generateSignedDoc() {
    setResult(true);
  }

  return (
    <>
      <div className="h80p">
        <div>
          <button
            disabled={pageNumber === 0}
            onClick={() => updatePageNumber(-1)}
          >
            Page précédente
          </button>
          <button
            disabled={pageNumber === pageCount - 1}
            onClick={() => updatePageNumber(1)}
          >
            Page suivante
          </button>
          {clickEvent ? (
            <>
              <span>
                {clickEvent?.pageX} / {clickEvent?.pageY}
              </span>
              <button onClick={generateSignedDoc}>Valider</button>
            </>
          ) : (
            <></>
          )}
        </div>
        <canvas
          onMouseMove={onMouseMove}
          onClick={onClick}
          id="the-canvas"
        ></canvas>
        {result && (
          <iframe id="pdf" style={{ width: "100%", height: "100%" }}></iframe>
        )}
      </div>
    </>
  );
}
