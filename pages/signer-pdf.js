"use client";
import { useEffect, useState } from "react";

import SignPDFComponent from "../components/sign.js";

const key = "Piece_jointe";

export default function SignPDFPage() {
  const [mapping, setMapping] = useState({});
  const [record, setRecord] = useState();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState();
  const [inputPDF, setInputPDF] = useState();

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

  async function postNew(pdf) {
    const f = files.find((f) => f.id == selectedFile);
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
    <SignPDFComponent inputPDF={inputPDF} postNew={postNew}>
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
    </SignPDFComponent>
  );
}
