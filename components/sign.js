import { useEffect, useState } from "react";
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

  async function buildPdf() {
    const pdfDoc = await PDFDocument.load(inputPDF);
    pdfDoc.registerFontkit(fontkit);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const fontUrl = "ShadowsIntoLight-Regular.ttf";
    const fontBytes = await fetch(fontUrl).then((res) => res.arrayBuffer());
    const handWritingFont = await pdfDoc.embedFont(fontBytes);

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
          const font = meta.writing ? handWritingFont : timesRomanFont;
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
      setPreviewPDF();
      if (additions.length) {
        setAdditions([]);
      }
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
    if (props.postNew) {
      const pdf = await buildPdf();
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
      {props?.children}
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
    </>
  );
}
