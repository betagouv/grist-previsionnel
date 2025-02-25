import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

const key = "Piece_jointe";

export default function SignPDFPage() {
  const [mapping, setMapping] = useState({});
  const [record, setRecord] = useState();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState();
  const [doc, setDoc] = useState();

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
      setDoc();
      return;
    }
    async function fetchDoc() {
      const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true });
      const f = files.find((f) => f.id == selectedFile);
      const contentUrl = `${tokenInfo.baseUrl}/attachments/${f.id}/download?auth=${tokenInfo.token}`;
      const response = await fetch(contentUrl);
      setDoc(await response.arrayBuffer());
    }
    fetchDoc();
  }, [selectedFile]);

  async function buildPdf() {
    const pdfDoc = await PDFDocument.load(doc);
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
    if (!doc) {
      return;
    }

    async function render() {
      const data = await buildPdf();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const page = await pdf.getPage(1);
      var scale = 1;
      var viewport = page.getViewport({ scale: scale });

      var canvas = document.getElementById("the-canvas");
      var canvasContext = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext,
        viewport,
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
    render();
  }, [doc]);

  async function postNew() {
    const f = files.find((f) => f.id == selectedFile);
    const pdf = await buildPdf();
    const suffixed_name = `${f.fields.fileName.slice(0, -4)}_signe.pdf`;
    const fileToSend = new File([pdf], suffixed_name);
    let body = new FormData();
    body.append("upload", fileToSend);

    const tokenInfo = await grist.docApi.getAccessToken({readOnly: false});
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
      {doc && <canvas id="the-canvas"></canvas>}
      <div>
        <button onClick={postNew} disabled={!doc}>
          Create and add updated PDF
        </button>
      </div>
      <pre>
        {JSON.stringify({ record, files, selectedFile, setMapping }, null, 2)}
      </pre>
    </>
  );
}
