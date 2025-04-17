import { useEffect, useState, useCallback } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import DocumentViewer from "../components/document-viewer.js";
import EditView from "../components/edit-view.js";
import additionTypes from "../lib/addition-types.js";
import AdditionBlock from "../components/addition-block.js";

const key = "Piece_jointe";

export default function SignPDFPage(props) {
  const inputPDF = props.inputPDF;
  const [previewPDF, setPreviewPDF] = useState();

  const [mouseMove, setMouseMove] = useState();
  const [additions, setAdditions] = useState([]);
  const [selectedAdditionType, setSelectedAdditionType] = useState();

  const [showEdit, setShowEdit] = useState(false);

  const [config, setConfig] = useState();

  useEffect(() => {
    setConfig(EditView.getConfig());
  }, []);

  async function buildPdf(additions) {
    const pdfDoc = await PDFDocument.load(inputPDF);
    pdfDoc.registerFontkit(fontkit);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const additionsByPage = pdfDoc.getPages().map(() => []);
    additions.forEach((addition) => {
      additionsByPage[addition.pageNumber].push(addition);
    });

    const done = await Promise.all(
      additionsByPage.map(async (pageAdditions, pageNumber) => {
        const pageToEdit = await pdfDoc.getPage(pageNumber);
        return await Promise.all(
          pageAdditions.map(async (addition) => {
            const meta = additionTypes[addition.type];

            const { width, height } = pageToEdit.getSize();
            if (meta.writing) {
              const raw = localStorage.getItem("signature");
              const signatureBlob = await fetch(raw);
              const pngImageBytes = await signatureBlob.arrayBuffer();
              const pngImage = await pdfDoc.embedPng(pngImageBytes);
              const pngDims = pngImage.scale(1);

              pageToEdit.drawImage(pngImage, {
                x: addition.x,
                y: height - addition.y - pngDims.height / 2,
                height: pngDims.height / 2,
                width: pngDims.width / 2,
              });
            } else {
              const text = meta.text(config);
              const font = timesRomanFont;
              const fontSize = 15;
              const lineHeight = font.heightAtSize(fontSize) * 1.5;

              pageToEdit.drawText(text, {
                x: addition.x,
                y: height - addition.y - font.heightAtSize(fontSize),
                size: fontSize,
                lineHeight,
                font,
              });
            }
          }),
        );
      }),
    );

    return pdfDoc.save();
  }

  useEffect(() => {
    if (!inputPDF || !config) {
      setPreviewPDF();
      return;
    }

    async function buildPdfEffect() {
      const data = await buildPdf([]);
      const previewPDF = await pdfjsLib.getDocument({ data }).promise;
      setPreviewPDF(previewPDF);
    }
    buildPdfEffect();
  }, [inputPDF, config]);

  async function postNew() {
    if (props.postNew) {
      const pdf = await buildPdf(additions);
      props.postNew(pdf);
    }
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

  function onMouseMove(value) {
    setMouseMove(value);
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
    <div className="sign-view">
      <div>
        {props?.children}
        <AdditionBlock
          selectedAdditionType={selectedAdditionType}
          setSelectedAdditionType={setSelectedAdditionType}
          setShowEdit={setShowEdit}
          additions={additions}
          onRemoveAddition={onRemoveAddition}
        >
          <button className="submit" onClick={postNew} disabled={!previewPDF}>
            Create and add updated PDF
          </button>
        </AdditionBlock>
      </div>
      {previewPDF && (
        <DocumentViewer
          document={previewPDF}
          config={config}
          additions={additions}
          onClick={onClick}
          onMouseMove={onMouseMove}
          onMouseOut={() => setMouseMove()}
        />
      )}
    </div>
  );
}
