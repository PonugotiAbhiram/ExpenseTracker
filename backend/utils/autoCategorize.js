const categoryMap = require("./categoryMap");

const autoCategorize = (description) => {
  if (!description) return "Other";

  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }

  return "Other";
};

module.exports = autoCategorize;
