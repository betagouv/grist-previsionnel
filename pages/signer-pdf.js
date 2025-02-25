import { useCallback, useEffect, useRef, useState, StrictMode } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

const key = "Piece_jointe";

function DocumentViewer(props) {
  const [pageCount, setPageCount] = useState();
  useEffect(() => {
    if (!props.document) {
      setPageCount();
    }

    setPageCount(props.document.numPages);
  }, [props.document]);

  return (
    <>
      <div>
        {[...Array(pageCount).keys()].map((i) => (
          <PageCanvas key={i} document={props.document} pageNumber={i} />
        ))}
      </div>
    </>
  );
}

function PageCanvas(props) {
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log({ props });
    if (
      !canvasRef.current ||
      !props.document ||
      props.pageNumber === undefined
    ) {
      return;
    }
    async function render() {
      const page = await props.document.getPage(props.pageNumber + 1);
      var scale = 1;
      var viewport = page.getViewport({ scale: scale });

      var canvas = canvasRef.current;
      var canvasContext = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext,
        viewport,
      };
      var renderTask = page.render(renderContext);
      renderTask.promise.then(
        function () {
          console.log(`Page ${props.pageNumber} rendered`);
        },
        function (reason) {},
      );
      return renderTask;
    }
    const promise = render();
    return () => {
      promise.then((task) => task.cancel());
    };
  }, [canvasRef, props.document, props.pageNumber]);

  return (
    <div>
      <canvas className="page" ref={canvasRef}></canvas>
    </div>
  );
}

export default function SignPDFPage() {
  const [mapping, setMapping] = useState({});
  const [record, setRecord] = useState();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState();
  const [inputPDF, setInputPDF] = useState();
  const [previewPDF, setPreviewPDF] = useState();
  const [pageCount, setPageCount] = useState();

  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";

  useEffect(() => {
    window.grist.ready({
      requiredAccess: "full",
      columns: [
        {
          name: key,
          type: "Attachments",
        },
      ],
    });

    window.grist.onRecord(async (record, mapping) => {
      setRecord(record);
      setMapping(mapping);
      setSelectedFile();
      setInputPDF();
      setPreviewPDF();

      const attachmentIds = record[mapping[key]] || [];

      const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true });
      const data = await Promise.all(
        attachmentIds.map(async (id) => {
          const url = `${tokenInfo.baseUrl}/attachments/${id}?auth=${tokenInfo.token}`;
          const response = await fetch(url);
          const fields = await response.json();
          return {
            id,
            fields,
          };
        }),
      );

      setFiles(data);
    });
  }, []);

  useEffect(() => {
    if (selectedFile === undefined) {
      setInputPDF();
      return;
    }
    async function fetchDoc() {
      const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true });
      const f = files.find((f) => f.id == selectedFile);
      const contentUrl = `${tokenInfo.baseUrl}/attachments/${f.id}/download?auth=${tokenInfo.token}`;
      const response = await fetch(contentUrl);

      const buffer = await response.arrayBuffer();
      setInputPDF(buffer);
    }
    fetchDoc();
  }, [selectedFile]);

  async function buildPdf() {
    const pdfDoc = await PDFDocument.load(inputPDF);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const fontSize = 30;
    const pageToEdit = await pdfDoc.getPage(0);
    const { width, height } = pageToEdit.getSize();
    pageToEdit.drawText("Update PDF in Grist is great!", {
      x: 50,
      y: height - 4 * fontSize,
      size: fontSize,
      font: timesRomanFont,
    });
    return pdfDoc.save();
  }

  useEffect(() => {
    if (!inputPDF) {
      return;
    }

    async function buildPdfEffect() {
      const data = await buildPdf();
      const previewPDF = await pdfjsLib.getDocument({ data }).promise;
      setPreviewPDF(previewPDF);
    }
    buildPdfEffect();
  }, [inputPDF]);

  async function postNew() {
    const f = files.find((f) => f.id == selectedFile);
    const pdf = await buildPdf();
    const suffixed_name = `${f.fields.fileName.slice(0, -4)}_signe.pdf`;
    const fileToSend = new File([pdf], suffixed_name);
    let body = new FormData();
    body.append("upload", fileToSend);

    const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false });
    const url = `${tokenInfo.baseUrl}/attachments?auth=${tokenInfo.token}`;
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const newIds = await response.json();

    const previousIds = record[mapping[key]];
    window.grist.getTable().update([
      {
        id: record.id,
        fields: {
          [mapping[key]]: ["L", ...previousIds, ...newIds],
        },
      },
    ]);
  }

  return (
    <>
      <div>Select a file</div>
      <div>
        {files.map((file) => (
          <div key={file.id}>
            <label>
              <input
                onChange={() => setSelectedFile(file.id)}
                type="radio"
                name="file"
                value={file.id}
                checked={selectedFile === file.id}
              />
              {file.fields.fileName}
            </label>
          </div>
        ))}
      </div>
      {previewPDF && <DocumentViewer document={previewPDF} />}
      <div>
        <button onClick={postNew} disabled={!previewPDF}>
          Create and add updated PDF
        </button>
      </div>
      <pre>
        {JSON.stringify(
          { pageCount, record, files, selectedFile, setMapping },
          null,
          2,
        )}
      </pre>
    </>
  );
}
