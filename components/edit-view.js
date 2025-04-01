import { useEffect, useState } from "react";

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

export default EditView;
