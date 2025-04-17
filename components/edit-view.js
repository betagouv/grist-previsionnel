import { useEffect, useState } from "react";

function EditView(props) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [init, setInit] = useState(false);
  const [signatureImg, setSignatureImg] = useState();

  useEffect(() => {
    const config = EditView.getConfig();
    if (config) {
      setTitle(config.title);
      setName(config.name);
    }
    setSignatureImg(localStorage.getItem("signature"));
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

  function updateSignature(event) {
    const b = event.target.files[0];
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        localStorage.setItem("signature", reader.result);
        setSignatureImg(reader.result);
        event.target.value = null;
      },
      false,
    );
    reader.readAsDataURL(b);
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
          <img src={signatureImg} />
          <div>
            <input type="file" accept="image/*" onChange={updateSignature} />
          </div>
        </label>
      </div>
      <button onClick={() => props?.onClose?.({ title, name })}>Close</button>
    </div>
  );
}

EditView.getConfig = () => {
  return JSON.parse(window.localStorage.getItem("sign-config"));
};

export default EditView;
