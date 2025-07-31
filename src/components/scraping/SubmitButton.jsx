// src/components/scraping/SubmitButton.jsx
export default function SubmitButton({ isLoading }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-blue-300"
    >
      {isLoading ? "Starting..." : "Start Scraping"}
    </button>
  );
}
