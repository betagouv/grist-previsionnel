const additionTypes = {
  date: {
    name: "Date",
    text: () => new Date().toLocaleDateString(),
  },
  title: {
    name: "Title",
    text: (config) => config.title,
  },
  name: {
    name: "Name",
    text: (config) => config.name,
  },
  signature: {
    name: "Signature",
  },
};

export default additionTypes;
