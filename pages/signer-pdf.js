"use client";
import { useCallback, useEffect, useRef, useState, StrictMode } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";

import Debug from "../components/debug.js";
import DocumentViewer from "../components/document-viewer.js";
import EditView from "../components/edit-view.js";
import additionTypes from "../lib/addition-types.js";
import AdditionBlock from "../components/addition-block.js";

const key = "Piece_jointe";

export default function SignPDFPage() {
  const [mapping, setMapping] = useState({});
  const [record, setRecord] = useState();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState();
  const [inputPDF, setInputPDF] = useState();
  const [previewPDF, setPreviewPDF] = useState();

  const [mouseMove, setMouseMove] = useState();
  const [additions, setAdditions] = useState([]);
  const [selectedAdditionType, setSelectedAdditionType] = useState();

  const [showEdit, setShowEdit] = useState(false);

  const [config, setConfig] = useState();

  useEffect(() => {
    setConfig(EditView.getConfig());
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
      setAdditions([]);

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
      if (data.length == 1) {
        setSelectedFile(data[0].id);
      }
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

    const additionsByPage = pdfDoc.getPages().map(() => []);
    additions.forEach((addition) => {
      additionsByPage[addition.pageNumber].push(addition);
    });

    const done = await Promise.all(
      additionsByPage.map(async (pageAdditions, pageNumber) => {
        const pageToEdit = await pdfDoc.getPage(pageNumber);
        pageAdditions.forEach((addition) => {
          const meta = additionTypes[addition.type];
          const text = meta.text(config);
          const font = timesRomanFont;
          const fontSize = 15;
          const { width, height } = pageToEdit.getSize();
          const lineHeight = font.heightAtSize(fontSize) * 1.5;
          pageToEdit.drawText(text, {
            x: addition.x,
            y: height - addition.y - fontSize / 2,
            size: fontSize,
            lineHeight,
            font,
          });
        });
      }),
    );

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
  }, [inputPDF, additions]);

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

  function onClick({ pageNumber, x, y }) {
    if (!selectedAdditionType) {
      return;
    }
    setMouseMove();
    setAdditions([
      ...additions,
      { type: selectedAdditionType, pageNumber, x, y },
    ]);
  }

  function onRemoveAddition(indexToDrop) {
    setAdditions([...additions.filter((a, i) => i != indexToDrop)]);
  }

  function onCloseEdit(config) {
    setConfig(config);
    setShowEdit(false);
  }

  return showEdit ? (
    <EditView onClose={onCloseEdit} />
  ) : (
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
      <AdditionBlock
        selectedAdditionType={selectedAdditionType}
        setSelectedAdditionType={setSelectedAdditionType}
        setShowEdit={setShowEdit}
        additions={additions}
        onRemoveAddition={onRemoveAddition}
      />
      {previewPDF && (
        <DocumentViewer
          document={previewPDF}
          onClick={onClick}
          onMouseMove={setMouseMove}
          onMouseOut={() => setMouseMove()}
        />
      )}
      <div>
        <button onClick={postNew} disabled={!previewPDF}>
          Create and add updated PDF
        </button>
      </div>
      <Debug data={{ config, record, files, selectedFile, setMapping }} />
    </>
  );
}
