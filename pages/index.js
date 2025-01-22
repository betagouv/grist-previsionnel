import { useState, useEffect, useRef } from "react";
import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";

import data from "./data.json";

registerAllModules();

function filterRowRecords(data) {
  const names = Object.keys(data);
  const years = data.Annualite_budgetaire;

  const filteredData = years.reduce((a, y, i) => {
    if (y === 2025) {
      a.push(
        names.reduce((res, n) => {
          res[n] = data[n][i];
          return res;
        }, {}),
      );
    }
    return a;
  }, []);

  return filteredData.toSorted((a, b) => a.c1er_du_mois - b.c1er_du_mois);
}

export default function PreviewPage() {
  const hotRef = useRef(null);
  const [months, setMonths] = useState();
  const [data, setData] = useState();
  const [rowData, setRowData] = useState();
  const [log, setLog] = useState("");

  useEffect(() => {
    window.grist.ready({
      allowSelectBy: true,
    });
    window.grist.onRecord((record) => {
      console.log("record", record);
    });
    window.grist.onRecords((records) => {
      console.log("records", records);
      setData(records);
    });
    async function fetchMonths() {
      const recordData = await window.grist.docApi.fetchTable(
        "Mois_de_facturation",
      );
      setMonths(filterRowRecords(recordData));
    }
    fetchMonths();
  }, []);

  useEffect(() => {
    if (!data?.length) {
      setRowData([]);
      return;
    }
    const dataByNames = {};
    data.forEach((r) => {
      dataByNames[r.Personne] = dataByNames[r.Personne] || {
        Personne: r.Personne,
        values: {},
      };
      dataByNames[r.Personne].values[r.Mois] =
        dataByNames[r.Personne].values[r.Mois] || [];
      dataByNames[r.Personne].values[r.Mois].push(r);
    });
    const names = Object.keys(dataByNames);
    names.sort();
    setRowData(names.map((n) => dataByNames[n]));
  }, [data]);

  useEffect(() => {
    console.log("rowData", rowData);
  }, [rowData]);

  function columnFunction(column) {
    let columnMeta = {
      //readOnly: true,
    };
    if (column === 0) {
      columnMeta.data = "Personne";
      columnMeta.readOnly = true;
    } else if (column <= 12) {
      const fct = (row) => {
        return row.values[months?.[column - 1].Mois_de_facturation]?.[0]
          ?.Nb_jours_factures;
      };
      fct.column = column;
      columnMeta.data = fct;
    }
    return columnMeta;
  }

  function afterSelectionEnd(...args) {
    if (args[0] < 0) {
      return;
    }
    const rowDetails = rowData[args[0]];
    const rowId =
      rowDetails.values[months[args[1] - 1]?.Mois_de_facturation]?.[0]?.id ||
      "new";
    grist.setCursorPos({ rowId });
  }

  function afterChange(changes, source) {
    console.log('changes', {changes, source})
    if (source !== "edit" && source !== "Autofill.fill") {
      console.info(`Ignore change from ${source}`);
      console.log(changes);
      return;
    }
    const updatesOrAdditions = changes.filter(([row, prop, oldValue, newValue]) => {
      if (oldValue === undefined) {
        return newValue !== null
      }
      if (oldValue === 0) {
        return newValue !== null
      }
      return true
    }).map((change) => {
      const row = change[0];
      const columnInfo = change[1];
      const column = columnInfo.column;
      const newValue = change[3] || 0

      const rowDetails = rowData[row];
      const rowId =
        rowDetails.values[months[column - 1]?.Mois_de_facturation]?.[0]?.id;
        console.log({column, i: months[column - 1]?.Mois_de_facturation, rowId, rowDetails})

      if (rowId) {
        return {
          require: {id: rowId},
          fields: {
            Nb_jours_factures: newValue,
          },
        };
      }
      const mm = Object.keys(rowDetails.values);
      const p = rowDetails.values[mm[0]][0].ProchainContrat.rowIds[0];
      const m = months[column - 1].id;
      return {
        fields: {
          Contrat_Freelance: p,
          Mois: m,
          Nb_jours_factures: newValue,
          Statut: "Estimation principale",
        },
        require: {
          Contrat_Freelance: p,
          Mois: m,
        }
      };
    });

    const table = window.grist.getTable();
    console.log({updatesOrAdditions})
    //return
    table
      .upsert(updatesOrAdditions)
      .then((r) => {
        console.log(r);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally((f) => {
        console.log('f', f);
      });
  }

  return (
    <>
      <HotTable
        ref={hotRef}
        data={rowData}
        rowHeaders={false}
        colHeaders={[
          "Personne",
          ...(months?.map?.((m) => m.Mois_de_facturation) || []),
        ]}
        columns={columnFunction}
        height="auto"
        licenseKey="non-commercial-and-evaluation"
        afterSelectionEnd={afterSelectionEnd}
        afterChange={afterChange}
        copyPaste={true}
      />
      <div>{data?.length}</div>
      <button onClick={() => window.location.reload()}>Refresh Page</button>
      <button onClick={() => console.log(rowData)}>Log raw</button>
      <div>
        <code>{log}</code>
      </div>
    </>
  );
}
