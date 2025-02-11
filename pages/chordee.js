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
  const [csv, setCSV] = useState("");

  const direct = ["key", "type", "summary", "created", "reporter", "parent"];
  const custom = [
    "Année-mois",
    "Axe ministériel",
    "Centre de coût",
    "Centre de coût(complet)",
    "Centre financier",
    "Date EJ/SF",
    "Domaine fonctionnel",
    "Département-Bureau",
    "Etat ConsoPrevu",
    "Ligne budgétaire",
    "Montant EJ/SF TTC",
  ];

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

  function extractCustomField(item, name) {
    const m = item.getElementsByTagName("customfield");
    for (const cf of m) {
      const n = cf.getElementsByTagName("customfieldname")[0];
      if (n.innerHTML === name) {
        const collection = cf.getElementsByTagName("customfieldvalues")[0];
        const v = collection.getElementsByTagName("customfieldvalue")[0];
        return v.innerHTML;
      }
    }
  }

  function getGristData(matches, bc) {
    if (matches.length !== 1) {
      return {
        montant: "",
      };
    }
    const i = matches[0];
    return {
      montant: bc.Montant_AE[i],
    };
  }

  useEffect(() => {
    if (!xmlContent) {
      return;
    }

    let done = true;
    const newCommandes = [];
    const newPaiements = [];
    const list = xmlContent.children[0].children[0].children;

    const data = [];

    for (var i in list) {
      const element = list[i];
      if (element.tagName !== "item") {
        continue;
      }

      const directData = direct.map((field) => {
        const f = element.getElementsByTagName(field)[0];
        return f?.innerHTML;
      });

      const customData = [...custom];
      const cfs = element.getElementsByTagName("customfields")[0];
      const customs = cfs.getElementsByTagName("customfield");
      for (const cf of customs) {
        const cfn = cf.getElementsByTagName("customfieldname")[0];
        const idx = custom.indexOf(cfn.textContent);
        if (idx >= 0) {
          const cfv = cf
            .getElementsByTagName("customfieldvalues")[0]
            .getElementsByTagName("customfieldvalue")[0]; //.innerHTML
          customData[idx] = cfv?.textContent;
        }
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
        const gdata = getGristData(matches, bc);
        const montant = extractCustomField(element, "Montant EJ/SF TTC");
        obj.Montants = `${gdata.montant} / ${montant}`;
      } else {
        obj.OK = "Todo";
      }
      dest.push(obj);
      data.push([...directData, ...customData]);
    }

    setCSV(
      [[...direct, ...custom].join(";"), ...data.map((r) => r.join(";"))].join(
        "\n",
      ),
    );
    setCommandes(newCommandes);
    setPaiements(newPaiements);
  }, [xmlContent, bc]);

  function download(dataurl, filename) {
    const link = document.createElement("a");
    link.href = dataurl;
    link.download = filename;
    link.click();
  }

  function click() {
    const text = csv;
    const btxt = new Buffer(text).toString("base64");
    download("data:text/csv;charset=utf-8;base64," + btxt, "chordee.csv");
  }

  return (
    <>
      <div>
        <h1>{date}</h1>
        <div>Commandes</div>
        <HotTable
          ref={commandeRef}
          data={commandes}
          colHeaders={["ID", "Validation", "Montants"]}
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
        <button onClick={click}>Get CSV</button>
      </div>
    </>
  );
}
