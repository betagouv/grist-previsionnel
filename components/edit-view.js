import { useEffect, useState } from "react";

function EditView(props) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [init, setInit] = useState(false);

  useEffect(() => {
    const config = EditView.getConfig();
    if (config) {
      setTitle(config.title);
      setName(config.name);
      setSignature(config.signature);
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
      signature,
    };
    window.localStorage.setItem("sign-config", JSON.stringify(config));
  }, [title, name, signature]);

  function updateSignature(event) {
    const b = event.target.files[0];
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        setSignature(reader.result);
        event.target.value = null;
      },
      false,
    );
    reader.readAsDataURL(b);
  }

  function resetSignature() {
    setSignature("");
  }

  return (
    <div>
      <div>
        <label>
          <div>Title:</div>
          <textarea
            rows={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>{" "}
      </div>
      <div>
        <label>
          <div>Name:</div>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          <div>Signature:</div>
        </label>
        {signature?.length ? (
          <>
            <img src={signature} />
            <div>
              <button onClick={resetSignature}>Reset signature</button>
            </div>
          </>
        ) : (
          <div>
            <input type="file" accept="image/*" onChange={updateSignature} />
          </div>
        )}
      </div>
      <button onClick={() => props?.onClose?.({ title, name })}>Close</button>
    </div>
  );
}

EditView.getConfig = () => {
  const config = JSON.parse(window.localStorage.getItem("sign-config"));
  return config;
};

export default EditView;
