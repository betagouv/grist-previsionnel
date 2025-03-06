import { useCallback, useEffect, useRef, useState, StrictMode } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import Debug from "../components/debug.js";
const key = "Piece_jointe";

function DocumentViewer(props) {
  const [pageCount, setPageCount] = useState();
  useEffect(() => {
    if (!props.document) {
      setPageCount();
    }

    setPageCount(props.document.numPages);
  }, [props.document]);

  function onClick({ pageNumber, e }) {
    props?.onClick({ pageNumber, x: e.x, y: e.y });
  }
  function onMouseMove({ pageNumber, e }) {
    props?.onMouseMove({ pageNumber, x: e.x, y: e.y });
  }

  return (
    <>
      <div>
        {[...Array(pageCount).keys()].map((pageNumber) => (
          <PageCanvas
            key={pageNumber}
            document={props.document}
            pageNumber={pageNumber}
            onClick={(e) => onClick({ pageNumber, e })}
            onMouseMove={(e) => onMouseMove({ pageNumber, e })}
            onMouseOut={() => props?.onMouseOut?.()}
          />
        ))}
      </div>
    </>
  );
}

function PageCanvas(props) {
  const canvasRef = useRef(null);

  const paddingOffset = { x: 20, y: 20 };

  useEffect(() => {
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
        function () {},
        function () {},
      );
      return renderTask;
    }
    const promise = render();
    return () => {
      promise.then((task) => task.cancel());
    };
  }, [canvasRef, props.document, props.pageNumber]);

  function onClick(e) {
    props?.onClick?.({
      x: e.nativeEvent.offsetX - paddingOffset.x,
      y: e.nativeEvent.offsetY - paddingOffset.y,
    });
  }

  function onMouseMove(e) {
    props?.onMouseMove?.({
      x: e.nativeEvent.offsetX - paddingOffset.x,
      y: e.nativeEvent.offsetY - paddingOffset.y,
    });
  }

  return (
    <div>
      <canvas
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseOut={() => props?.onMouseOut?.()}
        className="page"
        ref={canvasRef}
      ></canvas>
    </div>
  );
}

function EditView(props) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [init, setInit] = useState(false);

  useEffect(() => {
    const config = EditView.getConfig();
    if (config) {
      setTitle(config.title);
      setName(config.name);
    }
    setInit(true);
  }, []);

  useEffect(() => {
    if (!init) {
      return;
    }
    const config = {
      title,
      name,
    };
    window.localStorage.setItem("sign-config", JSON.stringify(config));
  }, [title, name]);

  return (
    <div>
      <div>
        <label>
          Title:
          <br />
          <textarea
            rows={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>{" "}
      </div>
      <div>
        <label>
          Name:
          <br />
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <button onClick={() => props?.onClose?.({ title, name })}>Close</button>
    </div>
  );
}

EditView.getConfig = () => {
  return JSON.parse(window.localStorage.getItem("sign-config"));
};

pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
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

  const additionTypes = {
    date: {
      name: "Date",
      text: () => new Date().toLocaleDateString(),
    },
    signature: {
      name: "Signature",
      text: () => config.name,
    },
    title: {
      name: "Title",
      text: () => config.title,
    },
  };

  const additionOptions = [
    { name: "None" },
    ...Object.keys(additionTypes).map((additionType) => {
      return {
        value: additionType,
        name: additionTypes[additionType].name,
      };
    }),
    ,
  ];

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
          const text = meta.text();
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

  function AdditionBlock() {
    return (
      <div className="addition-block">
        <div>Addition</div>
        {additionOptions.map((o) => (
          <div key={o.value}>
            <label>
              <input
                type="radio"
                name="addition"
                value={o.value}
                checked={selectedAdditionType == o.value}
                onChange={() => setSelectedAdditionType(o.value)}
              />
              {o.name}
            </label>
          </div>
        ))}
        <button onClick={() => setShowEdit(true)}>Edit</button>
        <div>Additions</div>
        {additions.map((a, i) => (
          <div key={[a.pageNumber, a.x, a.y].join("-")}>
            <button onClick={() => onRemoveAddition(i)}>Remove {a.type}</button>
          </div>
        ))}
      </div>
    );
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
      <AdditionBlock />
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
