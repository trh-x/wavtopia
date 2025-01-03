export const styles = {
  button: {
    base: "px-4 py-2 rounded-lg",
    active: "bg-primary-600 text-white",
    inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    small:
      "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200",
  },
  container: {
    card: "bg-white p-4 rounded-lg shadow",
    section: "mb-8",
    flexRow: "flex items-center gap-6",
    flexBetween: "flex justify-between items-center",
  },
  text: {
    title: "text-3xl font-bold",
    subtitle: "text-xl text-gray-600",
    heading: "text-2xl font-semibold",
    label: "text-sm text-gray-500",
  },
  layout: {
    grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
    stack: "space-y-4",
  },
};
