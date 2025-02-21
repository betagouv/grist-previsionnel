import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

export default function SignPDFPage() {
  const [doc, setDoc] = useState();
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(undefined);
  const [clickEvent, setClickEvent] = useState(undefined);
  const [result, setResult] = useState();
  const [edit, setEdit] = useState(false)


  const [options, setOptions] = useState()

  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
  const url = "BRB-177 (EJ).pdf";

  useEffect(() => {
    window.grist.ready({
      requiredAccess: "full",
      columns: [{
        name: "Piece_jointe",
        type: "Attachments"
      }],
      onEditOptions: function() {
        setEdit(true)
      }
    })

    window.grist.onRecord((record) => {
      console.log({record});
    });

    window.grist.onOptions((options) => {
      setOptions(options)
    });

  }, []);

  useEffect(() => {
    if (!options) {
      return
    }
    if (options.signatures.length == 0) {
      setEdit(true)
    }
  }, [options])


  function EditView() {
    const [text, setText] = useState("")
    const [name, setName] = useState("")
    const [selectedSignature, setSelectedSignature] = useState()

    function removeSignature() {
      const newSignatures = options.signatures.filter((v, i) => i != selectedSignature)
      if (options.signatures.length != newSignatures.length) {
        window.grist.setOption('signatures', newSignatures)
      }
    }

    function addSignature() {
      window.grist.setOption('signatures', [
        ...(options?.signatures || []),
        {
        name,
        text
      }])
    }

    return (<>
      <div>
        <label>Rôle</label>
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} />
        <label>Nom</label>
        <input value={name} onChange={e => setName(e.target.value)} />
        <button onClick={addSignature}>Ajouter une signature</button>
      </div>
      {options?.signatures?.length ?
      <div>
      selectedSignature {selectedSignature}
      <SignatureSelect value={selectedSignature} onChange={setSelectedSignature} />
      <button onClick={removeSignature}>Supprimer la signature</button>
      </div> : <></>}
      <button onClick={() => setEdit(false)}>Terminer</button>
    </>
    )
  }

  function SignatureSelect(props) {
    return <select value={props.value} onChange={e => props?.onChange?.(e.target.value)}>
      <option value="null">Sélectionnez une signature</option>
        {options?.signatures?.map((s, i) => {
          return <option key={s.name} value={i}>{s.name}</option>
        })}
      </select>
  }

  return (edit ? <EditView /> :
    <>
      <SignatureSelect />
    </>);

/*
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
      const TimesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const page = pdfDoc.getPage(pageNumber);
      const { width, height } = page.getSize();

      const fontSize = 20;
      const lineHeight = timesRomanFont.heightAtSize(fontSize)*1.5
      page.drawText(text, {
        x: e.pageX,
        y: height - e.pageY - fontSize / 2, // - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        lineHeight
        });
      page.drawText(name, {
        x: e.pageX,
        y: height - e.pageY - fontSize / 2 - 10 - lineHeight * text.split('\n').length,
        size: fontSize,
        font: TimesRomanItalic
        });
    }

    const pdfDataUri = await pdfDoc.save();

    if (result) {
      const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      document.getElementById("pdf").src = pdfDataUri;
    }

    var loadingTask = pdfjsLib.getDocument({ data: pdfDataUri });
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageNumber + 1)
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
    var renderTask = page.render(renderContext);
    renderTask.promise.then(function () {
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
        return
      }
    }
    if (shift > 0) {
      if (pageNumber === pageCount - 1) {
        return
      }
    }

    setResult(false);
    setPageNumber(pageNumber + shift)
    setClickEvent()
  }

  function generateSignedDoc() {
    setResult(true)
  }

  return (
    <>
      <div>
        <div>
          <button disabled={pageNumber === 0} onClick={() => updatePageNumber(-1)}>
            Page précédente
          </button>
          <button disabled={pageNumber === pageCount - 1} onClick={() => updatePageNumber(1)}>
            Page suivante
          </button>
          {clickEvent ? <>
            <span>{clickEvent?.pageX} / {clickEvent?.pageY}</span>
            <button onClick={generateSignedDoc}>Valider</button>
            </> : <></>}
        </div>
        <canvas
          onMouseMove={onMouseMove}
          onClick={onClick}
          id="the-canvas"
        ></canvas>
      </div>
    </>
  );//*/
}
