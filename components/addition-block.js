import additionTypes from "../lib/addition-types.js";

function AdditionBlock({
  selectedAdditionType,
  setSelectedAdditionType,
  setShowEdit,
  additions,
  onRemoveAddition,
  children,
}) {
  const additionOptions = [
    { name: "None" },
    ...Object.keys(additionTypes).map((additionType) => {
      return {
        value: additionType,
        name: additionTypes[additionType].name,
      };
    }),
  ];

  return (
    <div className="addition-block">
      <div>Addition</div>
      {additionOptions.map((o) => (
        <div key={o.value || o.name}>
          <label>
            <input
              type="radio"
              name="addition"
              value={o.value}
              onChange={() => setSelectedAdditionType(o.value)}
              checked={selectedAdditionType == o.value}
            />
            {o.name}
          </label>
        </div>
      ))}
      <button onClick={() => setShowEdit(true)}>Edit</button>
      <div>Additions</div>
      {additions.map((a, i) => (
        <div key={[a.pageNumber, a.x, a.y, a.pageNumber].join("-")}>
          <button onClick={() => onRemoveAddition(i)}>
            Remove {a.type} {a.x} {a.y} {a.pageNumber}
          </button>
        </div>
      ))}
      <div>Finish</div>
      <div>{children}</div>
    </div>
  );
}

export default AdditionBlock;
