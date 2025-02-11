import { useCallback, useEffect, useRef, useState } from "react";
import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";

registerAllModules();

export default function PreviewPage() {
  const commandeRef = useRef(null);
  const paiementRef = useRef(null);
  const [date, setDate] = useState();
  const [xmlContent, setXmlContent] = useState();
  const [commandes, setCommandes] = useState([]);
  const [paiements, setPaiements] = useState([]);

  const [bc, setBC] = useState({ No_DA: [] });
  const [sf, setSF] = useState({});

  useEffect(() => {
    window.grist.ready({});
    window.grist.onRecord(async (record) => {
      setDate(record.Date.toISOString());

      if (!record.Fichier.length) {
        return;
      }
      const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true });
      const id = record.Fichier[0];
      const src = `${tokenInfo.baseUrl}/attachments/${id}/download?auth=${tokenInfo.token}`;
      const response = await fetch(src);
      const data = await response.text();
      const p = new DOMParser();
      const xml = p.parseFromString(data, "application/xml");
      setXmlContent(xml);
    });

    async function fetchData() {
      const bcRecordData =
        await window.grist.docApi.fetchTable("Bons_de_commande");
      const sfRecordData =
        await window.grist.docApi.fetchTable("Services_Faits");
      setBC(bcRecordData);
      setSF(sfRecordData);
    }
    fetchData();
  }, []);

  function setOK(matches) {
    if (matches.length === 0) {
      return "Absent";
    }
    if (matches.length > 1) {
      return "Multiple";
    }
    return "OK";
  }

  useEffect(() => {
    if (!xmlContent) {
      return;
    }

    const newCommandes = [];
    const newPaiements = [];
    const list = xmlContent.children[0].children[0].children;
    for (var i in list) {
      const element = list[i];
      if (element.tagName !== "item") {
        continue;
      }
      const type = element.getElementsByTagName("type")[0].innerHTML;
      const dest = type === "Commande" ? newCommandes : newPaiements;

      const name = element.getElementsByTagName("title")[0].innerHTML;
      const obj = {
        nom: name,
      };
      if (type === "Commande") {
        const key = element.getElementsByTagName("key")[0].innerHTML.slice(3);
        const matches = bc.No_DA.map((v, i) => {
          if (v === key) {
            return i;
          }
          return null;
        }).filter((v) => v);
        obj.OK = setOK(matches);
        if (matches.length === 1) {
          const i = matches[0];
          obj.Montant = bc.Montant_AE[i];
        }
      } else {
        obj.OK = "Todo";
      }
      dest.push(obj);
    }

    setCommandes(newCommandes);
    setPaiements(newPaiements);
  }, [xmlContent, bc]);

  return (
    <>
      <div>
        <h1>{date}</h1>
        <div>Commandes</div>
        <HotTable
          ref={commandeRef}
          data={commandes}
          colHeaders={["ID", "Validation", "Montant"]}
          readOnly={true}
          height="auto"
          licenseKey="non-commercial-and-evaluation"
        />
        <div>Services faits</div>
        <HotTable
          ref={paiementRef}
          data={paiements}
          colHeaders={["ID", "Validation"]}
          readOnly={true}
          height="auto"
          licenseKey="non-commercial-and-evaluation"
        />
      </div>
    </>
  );
}
