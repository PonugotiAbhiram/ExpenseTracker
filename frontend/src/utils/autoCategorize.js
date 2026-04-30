const categoryMap = {
  "Food & Dining": ["starbucks", "restaurant", "cafe", "pizza", "burger", "supermarket", "grocery", "dmart", "swiggy", "zomato", "mcdonalds", "kfc", "food"],
  "Transportation": ["uber", "ola", "bus", "taxi", "metro", "fuel", "petrol", "diesel", "gas", "toll", "parking"],
  "Travel": ["flight", "hotel", "airbnb", "train", "makemytrip", "booking", "agoda", "vacation"],
  "Entertainment": ["netflix", "movie", "spotify", "prime", "cinema", "game", "steam", "concert", "music", "hotstar"],
  "Utilities": ["electricity", "rent", "water", "internet", "wifi", "bill", "recharge", "jio", "airtel"],
  "Shopping": ["amazon", "flipkart", "myntra", "clothes", "shoes", "mall", "electronics", "phone"],
  "Healthcare": ["hospital", "pharmacy", "medicine", "doctor", "clinic", "apollo", "medplus"],
  "Education": ["course", "udemy", "coursera", "school", "college", "tuition", "books", "stationery", "smartinterviews"],
  "Housing": ["furniture", "plumber", "electrician", "maintenance"],
  "Investments": ["mutual fund", "stocks", "zerodha", "groww", "crypto"],
  "Personal Care": ["salon", "haircut", "spa", "gym", "fitness"]
};

export const autoCategorize = (description) => {
  if (!description) return null;

  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }

  return null; // Return null instead of "Other" to distinguish auto vs explicit
};
