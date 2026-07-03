export const BACKEND_ADDRESS = import.meta.env.VITE_BACKEND_ADDRESS || "http://localhost:8001";

export const MALE_NAMES = [
  "Muhammad",
  "Ali",
  "Omar",
  "Hassan",
  "Ahmed",
  "Yusuf",
  "Abdullah",
  "Ibrahim",
  "Mustafa",
  "Abdul",
  "Hamza",
  "Khalid",
  "Zaid",
  "Tariq",
  "Amir",
  "Bilal",
  "Nasir",
  "Rashid",
  "Sami",
  "Zakariya",
];

export const STAMP_TYPES = [
  { type: "urgent",    label: "URGENT",    emoji: "🔥", color: "crimson"     },
  { type: "done",      label: "DONE",      emoji: "✅", color: "green"        },
  { type: "bug",       label: "BUG",       emoji: "🐛", color: "orangered"   },
  { type: "ship",      label: "SHIP IT",   emoji: "🚀", color: "royalblue"   },
  { type: "idea",      label: "IDEA",      emoji: "💡", color: "goldenrod"   },
  { type: "blocked",   label: "BLOCKED",   emoji: "🔒", color: "slategray"   },
  { type: "quickwin",  label: "QUICK WIN", emoji: "⚡", color: "olive"        },
  { type: "dead",      label: "DEAD END",  emoji: "💀", color: "gray"        },
  { type: "review",    label: "REVIEW",    emoji: "👀", color: "teal"        },
  { type: "costly",    label: "NEEDS $$$", emoji: "💸", color: "darkorange"  },
];

export const COLORS = [
  "red",
  "orange",
  "green",
  "blue",
  "pink",
  "purple",
  "slate",
  "aqua",
  "lime",
];