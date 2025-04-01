const additionTypes = {
  date: {
    name: "Date",
    text: () => new Date().toLocaleDateString(),
  },
  signature: {
    name: "Signature",
    text: (config) => config.name,
  },
  title: {
    name: "Title",
    text: (config) => config.title,
  },
};

export default additionTypes;
