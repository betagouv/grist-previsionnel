import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

export default function SignPDFPage() {
  const [doc, setDoc] = useState();
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(undefined);
  const [clickEvent, setClickEvent] = useState(undefined);

  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
  const url = "BRB-177 (EJ).pdf";

  useEffect(() => {
    async function fetchDoc() {
      const existingPdfBytes = await fetch(url).then((res) =>
        res.arrayBuffer(),
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      setDoc(pdfDoc);
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
  }, [doc, pageNumber, clickEvent]);

  async function updateDisplayedContent(e) {
    if (!doc || pageNumber === undefined) {
      return;
    }
    console.log({ e });
    if (e) {
      const timesRomanFont = await doc.embedFont(StandardFonts.TimesRoman);
      const page = doc.getPage(pageNumber);
      const { width, height } = page.getSize();

      // Draw a string of text toward the top of the page
      const fontSize = 30;
      page.drawText("Thomas Guillet", {
        x: e.pageX,
        y: height - e.pageY - fontSize / 2, // - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0.53, 0.71),
      });
    }

    const pdfDataUri = await doc.save();

    var loadingTask = pdfjsLib.getDocument({ data: pdfDataUri });
    // Asynchronous download of PDF
    loadingTask.promise.then(
      function (pdf) {
        console.log("PDF loaded");
        console.log(pdf);
        console.log(pageNumber);

        // Fetch the first page
        pdf.getPage(pageNumber + 1).then(function (page) {
          console.log("Page loaded");

          var scale = 1;
          var viewport = page.getViewport({ scale: scale });

          // Prepare canvas using PDF page dimensions
          var canvas = document.getElementById("the-canvas");
          var context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render PDF page into canvas context
          var renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          var renderTask = page.render(renderContext);
          renderTask.promise.then(function () {
            console.log("Page rendered");
          });
        });
      },
      function (reason) {
        // PDF loading error
        console.error(reason);
      },
    );
  }

  useEffect(() => {
    console.log(pdfjsLib);

    async function createPdf() {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([350, 400]);
      page.moveTo(110, 200);
      page.drawText("Hello World!");
      const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      document.getElementById("pdf").src = pdfDataUri;
    }
    //createPdf();

    async function fetchPdf() {
      const existingPdfBytes = await fetch(url).then((res) =>
        res.arrayBuffer(),
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      document.getElementById("pdf").src = pdfDataUri;
    }
    //fetchPdf()

    function showPdf() {
      // Asynchronous download of PDF
      var loadingTask = pdfjsLib.getDocument(url);
      loadingTask.promise.then(
        function (pdf) {
          console.log("PDF loaded");
          console.log(pdf);

          // Fetch the first page
          var pageNumber = 1;
          pdf.getPage(pageNumber).then(function (page) {
            console.log("Page loaded");

            var scale = 1.5;
            var viewport = page.getViewport({ scale: scale });

            // Prepare canvas using PDF page dimensions
            var canvas = document.getElementById("the-canvas");
            var context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            var renderTask = page.render(renderContext);
            renderTask.promise.then(function () {
              console.log("Page rendered");
            });
          });
        },
        function (reason) {
          // PDF loading error
          console.error(reason);
        },
      );
    }
    //showPdf()

    updateDisplayedContent();
  }, []);

  function onMouseMove(e) {
    console.log(e);
  }

  function onClick(e) {
    setClickEvent(e);
  }

  return (
    <>
      <div className="h80p">
        {false && (
          <iframe id="pdf" style={{ width: "100%", height: "100%" }}></iframe>
        )}
        <div>
          <button onClick={() => setPageNumber(pageNumber - 1)}>
            Page précédente
          </button>
          <button onClick={() => setPageNumber(pageNumber + 1)}>
            Page suivante
          </button>
        </div>
        <canvas
          onMouseMove={onMouseMove}
          onClick={onClick}
          id="the-canvas"
        ></canvas>
        <p>
          Les nombres de jours en <i>italique</i> sont calculés en sommant
          plusieurs consommations mensuelles. Pour cette raison, ils ne sont pas
          modifiables.
        </p>
        <p>
          Les nombres de jours en <b>gras</b> sont indiqués comme « Réalisé ».
          Pour cette raison, ils ne sont pas modifiables.
        </p>
      </div>
    </>
  );
}
